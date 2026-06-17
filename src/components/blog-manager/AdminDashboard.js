'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Head from 'next/head'; // 🟢 引入 Head 组件控制浏览器标签
import { GalleryManager } from './GalleryManager';
import { GalleryStorageBar } from './GalleryStorageBar';
import {
  flushGalleryUploads,
  revokePendingGalleryItems,
  countPendingGalleryItems,
} from '@/src/lib/admin/galleryFlush';
import { uploadImageToLsky } from '@/src/lib/admin/lskyClientUpload';
import {
  createPendingImageBlock,
  countPendingEditorMedia,
  flushEditorBlocksMedia,
  isLockImagePending,
  isImageBlockPending,
  revokeBlockPendingMedia,
  revokePendingEditorMedia,
  blocksToMarkdown,
  resolveAutoCover,
  findCoverImageBlock,
  hasEditorImageBlock,
  isVideoImageContent,
  serializeBlocksForSave,
} from '@/src/lib/admin/contentMediaFlush';
import {
  parseSmartPostBySelection,
  inferRulesFromExample,
  findExistingOption,
} from '@/src/lib/blog/smartPostParse';
import { generateAdminPostSlug } from '@/src/lib/blog/generateAdminPostSlug';
import {
  getAllSmartParseTemplates,
  addSmartParseTemplate,
  deleteSmartParseTemplate,
  SMART_PARSE_TEMPLATE_AUTO,
  BUILTIN_STANDARD_TEMPLATE_ID,
} from '@/src/lib/blog/smartParseTemplates';

async function triggerContentRevalidation(payload = {}) {
  try {
    const res = await fetch('/api/admin/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return {
      ok: res.ok && data.success !== false,
      status: res.status,
      data,
      succeeded: typeof data.succeeded === 'number' ? data.succeeded : null,
      failed: typeof data.failed === 'number' ? data.failed : null,
      total: typeof data.total === 'number' ? data.total : null,
    };
  } catch (e) {
    console.warn('页面增量刷新请求失败', e);
    return { ok: false, data: null, succeeded: 0, failed: 0, total: 0 };
  }
}

/** 与右上角「刷新BLOG」相同：壳层列表 + 首页预热 */
function triggerShellBlogRefresh(extra = {}) {
  return triggerContentRevalidation({
    scope: 'shell',
    clearCaches: true,
    freshTheme: true,
    warmPaths: true,
    ...extra,
  });
}

function showRevalidateFeedback(result, showAdminToastFn) {
  if (!result || !showAdminToastFn) return;
  const { ok, succeeded, failed, total } = result;
  if (ok && (failed === 0 || failed === null)) {
    showAdminToastFn(
      total != null && succeeded != null
        ? `前台已更新 ${succeeded} 个页面`
        : '前台页面已更新'
    );
    return;
  }
  if (succeeded != null && failed != null && failed > 0) {
    showAdminToastFn(`部分页面更新失败（${failed}/${total ?? succeeded + failed}）`);
    return;
  }
  if (!ok) {
    showAdminToastFn('前台更新未完成，请稍后重试');
  }
}

const SPECIAL_PAGE_SLUGS = new Set(['announcement', 'about', 'download', 'theme-config']);

function resolveSaveRevalidateScope(type, slug) {
  if (type === 'Widget') {
    return slug === 'gallery-ad' ? 'gallery-ad' : 'widget';
  }
  if (type === 'Page' || SPECIAL_PAGE_SLUGS.has(slug)) {
    return 'page';
  }
  return 'post';
}

const REVALIDATE_BATCH_SIZE = 12;
/** 手动「刷新BLOG」完成后冷却（防连点 / 狂点） */
const BLOG_SHELL_REFRESH_COOLDOWN_MS = 60_000;
/** 发布队列：各阶段「无进度心跳」超过此时长才视为卡住（非总时长） */
const PUBLISH_QUEUE_IDLE_STALL_MS = {
  gallery: 180_000,
  media: 120_000,
  post: 90_000,
  refresh: 120_000,
  default: 120_000,
};

function resolvePublishIdleStallMs(job) {
  const ms = PUBLISH_QUEUE_IDLE_STALL_MS[job?.phase];
  return typeof ms === 'number' ? ms : PUBLISH_QUEUE_IDLE_STALL_MS.default;
}

function formatJobElapsed(startedAt) {
  if (!startedAt) return '';
  const sec = Math.floor((Date.now() - startedAt) / 1000);
  if (sec < 60) return `${sec} 秒`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${min} 分 ${rem} 秒` : `${min} 分`;
}
/** 发布 API 请求超时 */
const PUBLISH_POST_FETCH_TIMEOUT_MS = 90_000;
/** 爬虫入库：Notion + 图库 + 多页 revalidate，允许较长等待 */
const CRAWLER_INGEST_FETCH_TIMEOUT_MS = 300_000;
const PUBLISH_QUEUE_META_KEY = 'admin_publish_queue_meta';

async function fetchWithTimeout(url, options = {}, timeoutMs = PUBLISH_POST_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    if (e?.name === 'AbortError') {
      throw new Error('请求超时，请检查网络后重试');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** 分批按需刷新，避免单次 Serverless 超时并降低峰值 CPU */
async function runBatchedRevalidation(options = {}) {
  const {
    freshTheme = false,
    listScope = 'shell',
    warmPaths = false,
    contentChange = false,
    onProgress,
    progressLabels = {},
  } = options;
  const {
    listing = '正在统计需要更新的页面…',
    running = '',
    doneOk = '更新完成',
    donePartial = '部分页面需稍后自动更新',
    hintPartial = '个页面未能更新，可点右上角按钮重试',
    hintOk = '前台页面已全部更新',
  } = progressLabels;

  if (onProgress) {
    onProgress({
      step: 2,
      totalSteps: 3,
      label: listing,
      done: 0,
      total: 0,
      hint: '正在读取站点页面列表',
    });
  }

  const listRes = await fetch('/api/admin/revalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope: 'list', listScope: options.listScope || 'shell' }),
  });
  const listData = await listRes.json();
  if (!listRes.ok || !listData.success) {
    throw new Error(listData.error || '无法获取页面列表');
  }

  const paths = listData.paths || [];
  const total = paths.length;
  let done = 0;
  let failedCount = 0;

  if (onProgress) {
    onProgress({
      step: 2,
      totalSteps: 3,
      label: running,
      done: 0,
      total,
      hint: '',
    });
  }

  for (let i = 0; i < paths.length; i += REVALIDATE_BATCH_SIZE) {
    const batch = paths.slice(i, i + REVALIDATE_BATCH_SIZE);
    const isLastBatch = i + REVALIDATE_BATCH_SIZE >= paths.length;
    const batchRes = await fetch('/api/admin/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'batch',
        paths: batch,
        clearCaches: i === 0,
        freshTheme,
        warmPaths: warmPaths && isLastBatch,
        contentChange,
      }),
    });
    const batchData = await batchRes.json();
    const batchOk = batchRes.ok && batchData.success !== false;
    const batchSucceeded =
      typeof batchData.succeeded === 'number'
        ? batchData.succeeded
        : batchOk
          ? batch.length
          : 0;
    const batchFailed =
      typeof batchData.failed === 'number'
        ? batchData.failed
        : batchOk
          ? 0
          : batch.length;

    failedCount += batchFailed;
    done += batchSucceeded;

    if (onProgress) {
      onProgress({
        step: 2,
        totalSteps: 3,
        label: running,
        done,
        total,
        hint: '',
      });
    }
  }

  if (warmPaths && paths.includes('/')) {
    try {
      await fetch('/api/admin/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'batch',
          paths: ['/'],
          clearCaches: false,
          warmPaths: true,
          contentChange,
        }),
      });
    } catch (e) {
      console.warn('首页预热失败', e);
    }
  }

  if (onProgress) {
    onProgress({
      step: 3,
      totalSteps: 3,
      label: failedCount > 0 ? donePartial : doneOk,
      done: total,
      total,
      hint: failedCount > 0 ? `${failedCount} ${hintPartial}` : hintOk,
    });
  }

  return { total, failed: failedCount, succeeded: done };
}

/** 主题切换：与右上角刷新按钮相同（壳层 + 预热）；内页后台异步更新 */
async function runThemeRevalidation(onProgress, expectedTheme) {
  if (onProgress) {
    onProgress({
      step: 2,
      totalSteps: 3,
      label: '正在更新首页与列表页…',
      done: 0,
      total: 7,
      hint: '与手动刷新相同流程',
    });
  }

  const shellResult = await triggerContentRevalidation({
    scope: 'shell',
    clearCaches: true,
    freshTheme: true,
    warmPaths: true,
    expectedTheme: expectedTheme || null,
  });

  void runBatchedRevalidation({
    freshTheme: true,
    listScope: 'theme-posts',
    progressLabels: {
      listing: '',
      running: '',
      doneOk: '',
      donePartial: '',
      hintOk: '',
      hintPartial: '',
    },
  }).catch((e) => console.warn('[runThemeRevalidation] theme-posts async failed', e));

  const shellFailed = shellResult.ok ? 0 : 1;
  const shellSucceeded = shellResult.ok ? (shellResult.succeeded ?? 7) : 0;

  if (onProgress) {
    onProgress({
      step: 3,
      totalSteps: 3,
      label: shellFailed > 0 ? '主题已保存，部分列表页需稍后更新' : '主题切换完成',
      done: 7,
      total: 7,
      hint: shellFailed > 0 ? '可点右上角刷新重试' : '最新文章内页将在后台逐步更新',
    });
  }

  return {
    total: shellSucceeded,
    failed: shellFailed,
    succeeded: shellSucceeded,
    shellOk: shellResult.ok,
  };
}

// ================= 1. 图标库 =================
const Icons = {
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  Edit: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>,
  Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Pin: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="9" />
      <polyline points="8 13 12 9 16 13" />
      <line x1="7" y1="5" x2="17" y2="5" />
    </svg>
  ),
  Settings: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  ArrowUp: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>,
  ArrowDown: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>,
  Top: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 11 12 5 6 11"></polyline><polyline points="18 18 12 12 6 18"></polyline></svg>,
  Bottom: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 6 12 12 18 6"></polyline><polyline points="6 13 12 19 18 13"></polyline></svg>,
  Refresh: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>,
  FolderIcon: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff" style={{opacity:0.8}}><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path></svg>,
  ChevronDown: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>,
  FolderMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  CoverMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
  TextMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
  GridMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  Calendar: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  Tutorial: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
};

// ================= 2. 全局样式 =================
const GlobalStyle = () => (
  <style dangerouslySetInnerHTML={{__html: `
    body { background-color: #303030; color: #ffffff; margin: 0; font-family: system-ui, sans-serif; overflow-x: hidden; }
    .card-item { position: relative; background: #424242; border-radius: 12px; margin-bottom: 12px; border: 1px solid transparent; cursor: pointer; transition: 0.3s; overflow: hidden; display: flex !important; flex-direction: row !important; align-items: stretch; }
    .card-item:hover { border-color: greenyellow; transform: translateY(-2px); background: #4d4d4d; box-shadow: 0 0 10px rgba(173, 255, 47, 0.1); }
    .drawer { position: absolute; right: -180px; top: 0; bottom: 0; width: 180px; display: flex; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 10; }
    .card-item:hover .drawer { right: 0; }
    .pin-divider { display: flex; align-items: center; gap: 12px; margin: 16px 0 20px; color: #888; font-size: 11px; letter-spacing: 0.5px; }
    .pin-divider::before, .pin-divider::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, #666, transparent); }
    .pin-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; background: rgba(251, 191, 36, 0.2); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.45); margin-right: 6px; }
    .dr-btn { flex: 1; display: flex; align-items: center; justify-content: center; color: #fff; transition: 0.2s; }
    .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
    .modal-box { background: #202024; width: 90%; maxWidth: 900px; height: 90vh; border-radius: 24px; border: 1px solid #333; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    .modal-body { flex: 1; overflow-y: auto; padding: 40px; scroll-behavior: smooth; }
    input, select, textarea { width: 100%; padding: 14px; background: #18181c; border: 1px solid #333; border-radius: 10px; color: #fff; box-sizing: border-box; font-size: 15px; outline: none; transition: 0.3s; }
    .glow-input:focus, .glow-input:hover { border-color: greenyellow; box-shadow: 0 0 12px rgba(173, 255, 47, 0.3); background: #1f1f23; }
    .tag-chip { background: #333; padding: 4px 10px; border-radius: 4px; font-size: 11px; color: #bbb; margin: 0 5px 5px 0; cursor: pointer; position: relative; }
    .tag-del { position: absolute; top: -5px; right: -5px; background: #ff4d4f; color: white; border-radius: 50%; width: 14px; height: 14px; display: none; align-items: center; justify-content: center; font-size: 10px; }
    .tag-chip:hover .tag-del { display: flex; }
    .loader-overlay { position: fixed; inset: 0; background: rgba(20, 20, 23, 0.95); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); flex-direction: column; padding: 24px; box-sizing: border-box; }
    .loader-text { margin-top: 20px; font-family: monospace; color: #888; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; }
    .loader-phase { margin-top: 28px; font-size: 16px; font-weight: 600; color: #fff; text-align: center; letter-spacing: 0.5px; max-width: 520px; line-height: 1.45; }
    .loader-step { font-size: 12px; color: greenyellow; letter-spacing: 0.12em; margin-top: 8px; font-weight: 700; text-align: center; }
    .loader-detail { margin-top: 10px; font-size: 13px; color: greenyellow; text-align: center; min-height: 20px; }
    .loader-hint { margin-top: 8px; font-size: 11px; color: #666; text-align: center; max-width: 420px; line-height: 1.6; }
    .loader-lock-hint { font-size: 12px; color: #888; margin-top: 18px; text-align: center; max-width: 420px; line-height: 1.6; }
    .loader-progress-track { margin-top: 18px; width: min(320px, 80vw); height: 6px; background: #2a2a2e; border-radius: 999px; overflow: hidden; border: 1px solid #333; }
    .loader-progress-bar { height: 100%; background: linear-gradient(90deg, #adff2f, #84cc16); border-radius: 999px; transition: width 0.35s ease; }
    .pubq { position: fixed; top: 88px; right: 20px; z-index: 99998; width: min(360px, calc(100vw - 32px)); display: flex; flex-direction: column; gap: 8px; }
    .pubq-head { display: flex; align-items: center; justify-content: space-between; background: #18181c; border: 1px solid #333; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #bbb; letter-spacing: 0.2px; }
    .pubq-head b { color: #fff; font-size: 13px; font-weight: 700; }
    .pubq-list { display: flex; flex-direction: column; gap: 8px; max-height: calc(100vh - 120px); overflow-y: auto; padding-right: 2px; }
    .pubq-card { background: #202024; border: 1px solid #333; border-radius: 12px; padding: 12px 14px; box-shadow: 0 10px 28px rgba(0,0,0,0.45); }
    .pubq-card.is-err { border-color: rgba(255,77,79,0.5); }
    .pubq-card.is-ok { border-color: rgba(173,255,47,0.4); }
    .pubq-row { display: flex; align-items: center; gap: 8px; }
    .pubq-title { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.35; }
    .pubq-state { font-size: 12px; line-height: 1.4; color: #aaa; margin-top: 6px; }
    .pubq-actions { display: flex; align-items: center; gap: 6px; flex: none; }
    .pubq-x { background: none; border: none; color: #777; font-size: 18px; line-height: 1; cursor: pointer; padding: 2px 4px; width: auto; }
    .pubq-x:hover { color: #fff; }
    .pubq-retry { background: none; border: 1px solid #555; color: #ddd; font-size: 12px; border-radius: 6px; padding: 3px 10px; cursor: pointer; width: auto; }
    .pubq-retry:hover { border-color: greenyellow; color: greenyellow; }
    .pubq-spin { width: 14px; height: 14px; border: 2px solid #333; border-top-color: greenyellow; border-radius: 50%; animation: imgspin 0.8s linear infinite; flex: none; }
    .pubq-detail { margin-top: 8px; font-size: 12px; color: #999; line-height: 1.45; }
    .pubq-detail.is-err { color: #ff6b6d; word-break: break-word; }
    .pubq-bar-track { margin-top: 8px; height: 5px; background: #2a2a2e; border-radius: 999px; overflow: hidden; }
    .pubq-bar { height: 100%; background: linear-gradient(90deg, #adff2f, #84cc16); border-radius: 999px; transition: width 0.3s ease; }
    .pubq-bar.is-err { background: #ff4d4f; }
    .pubq-bar-indet { height: 100%; width: 40%; background: linear-gradient(90deg, #adff2f, #84cc16); border-radius: 999px; animation: pubqIndet 1.15s ease-in-out infinite; }
    .pubq-warn { flex: none; width: 14px; height: 14px; border-radius: 50%; background: #fbbf24; color: #1a1a1a; font-size: 10px; font-weight: 800; line-height: 14px; text-align: center; }
    .pubq-stall-hint { margin-top: 8px; font-size: 12px; color: #fbbf24; line-height: 1.45; }
    .pubq-stall-row { margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    @keyframes pubqIndet { 0% { margin-left: -42%; } 100% { margin-left: 102%; } }
    .loader { display: flex; margin: 0.25em 0; }
    .dash { animation: dashArray 2s ease-in-out infinite, dashOffset 2s linear infinite; }
    @keyframes dashArray { 0% { stroke-dasharray: 0 1 359 0; } 50% { stroke-dasharray: 0 359 1 0; } 100% { stroke-dasharray: 359 1 0 0; } }
    @keyframes dashOffset { 0% { stroke-dashoffset: 365; } 100% { stroke-dashoffset: 5; } }
    .animated-button { position: relative; display: flex; align-items: center; gap: 4px; padding: 12px 36px; border: 2px solid; border-color: transparent; font-size: 14px; background-color: inherit; border-radius: 100px; font-weight: 600; color: greenyellow; box-shadow: 0 0 0 2px greenyellow; cursor: pointer; overflow: hidden; transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1); }
    .animated-button svg { position: absolute; width: 20px; fill: greenyellow; z-index: 9; transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1); }
    .animated-button .arr-1 { right: 16px; }
    .animated-button .arr-2 { left: -25%; }
    .animated-button .circle { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20px; height: 20px; background-color: greenyellow; border-radius: 50%; opacity: 0; transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1); }
    .animated-button .text { position: relative; z-index: 1; transform: translateX(-12px); transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1); }
    .animated-button:hover { box-shadow: 0 0 0 12px transparent; color: #212121; border-radius: 12px; }
    .animated-button:hover .arr-1 { right: -25%; }
    .animated-button:hover .arr-2 { left: 16px; }
    .animated-button:hover .text { transform: translateX(12px); }
    .animated-button:hover svg { fill: #212121; }
    .animated-button:active { scale: 0.95; box-shadow: 0 0 0 4px greenyellow; }
    .animated-button:hover .circle { width: 220px; height: 220px; opacity: 1; }
    .nav-container { position: relative; background: #202024; border-radius: 50px; padding: 5px; display: flex; align-items: center; gap: 5px; border: 1px solid #333; width: fit-content; }
    .nav-glider { position: absolute; top: 5px; bottom: 5px; background: greenyellow; border-radius: 40px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 1; }
    .nav-item { position: relative; z-index: 2; padding: 8px 16px; cursor: pointer; color: #888; transition: color 0.3s; display: flex; align-items: center; justify-content: center; width: 40px; }
    .nav-item.active { color: #000; font-weight: bold; }
    .gallery-only-tag { display: inline; color: #1a1500; font-weight: 600; background: linear-gradient(180deg, #ffe566 0%, #ffd400 100%); padding: 1px 7px; border-radius: 4px; font-size: 10px; letter-spacing: 0.3px; box-shadow: 0 0 0 1px rgba(255, 200, 0, 0.35); vertical-align: baseline; }
    .block-card-wrap { display: grid; grid-template-columns: 1fr 40px; column-gap: 4px; margin-bottom: 0; align-items: stretch; }
    .block-card { background: #2a2a2e; border: 1px solid #333; border-radius: 10px; padding: 15px 15px 15px 55px; margin-bottom: 0; position: relative; transition: border 0.2s; min-width: 0; }
    .block-card-wrap:hover .block-card { border-color: greenyellow; }
    .block-card.just-moved { animation: moveHighlight 0.6s ease-out; }
    @keyframes moveHighlight { 0% { box-shadow: 0 0 0 0 rgba(173, 255, 47, 0); border-color: #333; } 30% { box-shadow: 0 0 15px 2px rgba(173, 255, 47, 0.4); border-color: greenyellow; background: #2f2f33; } 100% { box-shadow: 0 0 0 0 rgba(173, 255, 47, 0); border-color: #333; background: #2a2a2e; } }
    .block-left-ctrl { position: absolute; left: 0; top: 0; bottom: 0; width: 45px; background: rgba(0,0,0,0.2); border-right: 1px solid #333; border-radius: 10px 0 0 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
    .move-btn { cursor: pointer; color: #888; width: 30px; height: 30px; border-radius: 6px; transition: 0.2s; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); }
    .move-btn:hover { background: greenyellow; color: #000; box-shadow: 0 0 10px greenyellow; }
    .move-btn:active { transform: scale(0.9); }
    .block-label { font-size: 12px; color: greenyellow; margin-bottom: 8px; fontWeight: bold; text-transform: uppercase; letter-spacing: 1px; }
    .block-del { width: 40px; background: #ff4d4f; border-radius: 10px; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.2s; cursor: pointer; color: white; align-self: stretch; }
    .block-card-wrap:hover .block-del { opacity: 1; pointer-events: auto; }
    .block-add-btn-wrap { position: absolute; left: 50%; bottom: -52px; transform: translateX(-50%); z-index: 6; display: flex; flex-direction: column; align-items: center; }
    .block-add-btn-wrap.is-open { z-index: 10052; }
    .block-add-btn { position: relative; height: 36px; padding: 0 24px; border-radius: 10px; background: greenyellow; color: #000; display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: bold; line-height: 1; cursor: pointer; box-shadow: 0 3px 12px rgba(0,0,0,0.4); transition: transform 0.15s, background 0.15s, box-shadow 0.15s; }
    .block-add-btn:hover { transform: translateY(-2px); background: #c4f74a; box-shadow: 0 5px 16px rgba(0,0,0,0.45); }
    .block-add-btn.open { background: #c4f74a; }
    .block-add-menu-backdrop { position: fixed; inset: 0; z-index: 10050; background: transparent; }
    .block-type-menu { background: #1f1f24; border: 1px solid #3a3a42; border-radius: 12px; padding: 8px; box-shadow: 0 12px 36px rgba(0,0,0,0.6); display: flex; flex-direction: column; gap: 4px; min-width: 210px; }
    .block-type-menu-floating { position: fixed; z-index: 10051; max-height: min(calc(100vh - 24px), 420px); overflow-y: auto; }
    .block-type-menu .bt-item { padding: 12px 18px; border-radius: 8px; font-size: 15px; color: #ddd; cursor: pointer; white-space: nowrap; transition: background 0.15s; line-height: 1.3; }
    .block-type-menu .bt-item:hover { background: #2f7cf6; color: #fff; }
    .block-empty-add { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 26px; border: 2px dashed #555; border-radius: 12px; background: transparent; color: #ccc; font-size: 15px; font-weight: bold; cursor: pointer; transition: border-color 0.2s, color 0.2s, background 0.2s, box-shadow 0.2s; }
    .block-empty-add:hover { border-color: greenyellow; color: greenyellow; }
    .block-empty-add.is-file-drop-target { border-color: greenyellow; color: greenyellow; background: rgba(173, 255, 47, 0.1); box-shadow: 0 0 0 2px rgba(173, 255, 47, 0.45), 0 0 28px rgba(173, 255, 47, 0.35), inset 0 0 48px rgba(173, 255, 47, 0.08); }
    .block-cover-hint { margin-bottom: 16px; font-size: 12px; color: #999; background: #202024; border-radius: 8px; padding: 12px 14px; line-height: 1.7; border: 1px solid #333; }
    .block-card-wrap.is-file-drop-before .block-card { border-color: greenyellow; box-shadow: inset 0 4px 0 0 greenyellow, 0 0 18px rgba(173, 255, 47, 0.4); }
    .block-card-wrap.is-file-drop-after .block-card { border-color: greenyellow; box-shadow: inset 0 -4px 0 0 greenyellow, 0 0 18px rgba(173, 255, 47, 0.4); }
    .block-minimap.is-file-drop-empty { border-color: greenyellow; box-shadow: 0 0 0 2px rgba(173, 255, 47, 0.35), inset 0 0 40px rgba(173, 255, 47, 0.06); }
    .block-view-toolbar { display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
    .block-view-toggle { display: inline-flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; }
    .block-minimap-toolbar { display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 12px; margin-bottom: 12px; flex-shrink: 0; }
    .block-compact-select-toggle { border: 1px solid #555; min-height: 38px; padding: 10px 22px; border-radius: 10px; display: inline-flex; justify-content: center; align-items: center; background: #1c1c1f; cursor: pointer; transition: all 0.2s ease; font-family: inherit; font-size: 13px; font-weight: bold; color: #ccc; white-space: nowrap; line-height: 1.2; }
    .block-compact-select-toggle:hover { border-color: greenyellow; color: greenyellow; background: rgba(173,255,47,0.08); }
    .block-compact-select-toggle.is-active { border-color: greenyellow; background: greenyellow; color: #000; box-shadow: 0 0 0 2px rgba(173,255,47,0.35), 0 0 18px rgba(173,255,47,0.3); }
    .block-compact-select-toggle.is-active:hover { background: #c4f74a; color: #000; }
    .block-compact-multiselect-del { border: none; border-radius: 10px; min-height: 38px; padding: 10px 22px; font-size: 13px; font-weight: bold; cursor: pointer; background: #ff4d4f; color: #fff; transition: background 0.15s, opacity 0.15s, transform 0.15s; white-space: nowrap; line-height: 1.2; }
    .block-compact-multiselect-del:hover:not(:disabled) { background: #ff7875; transform: translateY(-1px); }
    .block-compact-multiselect-del:disabled { opacity: 0.4; cursor: not-allowed; }
    .block-minimap-item.is-select-mode { cursor: pointer; }
    .block-minimap-item.is-select-mode:active { cursor: pointer; }
    .block-minimap-item.is-selected { border-color: greenyellow; box-shadow: 0 0 0 2px rgba(173,255,47,0.55), 0 0 18px rgba(173,255,47,0.3); }
    .block-minimap-item.is-selected::after { content: '✓'; position: absolute; bottom: 6px; right: 6px; width: 22px; height: 22px; border-radius: 50%; background: greenyellow; color: #000; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; z-index: 2; box-shadow: 0 2px 8px rgba(173,255,47,0.45); line-height: 1; }
    .block-view-toggle .view-mode-btn { border: none; min-width: 0; height: 2.1em; padding: 0 0.85em; border-radius: 999px; display: inline-flex; justify-content: center; align-items: center; gap: 5px; background: #1C1A1C; cursor: pointer; transition: all 450ms ease-in-out; font-family: inherit; }
    .block-view-toggle .view-mode-btn .view-mode-sparkle { width: 11px; height: 11px; fill: #AAAAAA; transition: all 800ms ease; flex-shrink: 0; }
    .block-view-toggle .view-mode-btn .view-mode-text { font-weight: 600; color: #AAAAAA; font-size: 11px; transition: color 450ms ease; white-space: nowrap; line-height: 1; }
    .block-view-toggle .view-mode-btn:hover, .block-view-toggle .view-mode-btn.is-active { background: linear-gradient(0deg,#A47CF3,#683FEA); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -2px 0 rgba(0, 0, 0, 0.2), 0 0 0 2px rgba(255, 255, 255, 0.15), 0 0 28px rgba(153, 23, 255, 0.55); transform: translateY(-1px); }
    .block-view-toggle .view-mode-btn:hover .view-mode-text, .block-view-toggle .view-mode-btn.is-active .view-mode-text { color: white; }
    .block-view-toggle .view-mode-btn:hover .view-mode-sparkle, .block-view-toggle .view-mode-btn.is-active .view-mode-sparkle { fill: white; transform: scale(1.15); }
    .block-view-toggle .view-mode-btn:active { transform: translateY(0); }
    .block-minimap { display: flex; flex-direction: column; align-items: center; padding: 14px; background: #252528; border: 1px solid #333; border-radius: 12px; max-height: min(72vh, 680px); overflow: hidden; }
    .block-minimap-scroll { flex: 1; min-height: 0; width: 100%; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #555 #252528; }
    .block-minimap-scroll::-webkit-scrollbar { width: 8px; }
    .block-minimap-scroll::-webkit-scrollbar-track { background: #252528; border-radius: 4px; }
    .block-minimap-scroll::-webkit-scrollbar-thumb { background: #555; border-radius: 4px; }
    .block-minimap-scroll::-webkit-scrollbar-thumb:hover { background: #777; }
    .block-minimap-list { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 100%; }
    .block-minimap-add-wrap { position: relative; display: flex; justify-content: center; align-items: center; padding: 2px 0; flex-shrink: 0; width: 100%; }
    .block-minimap-add-btn { width: 34px; height: 34px; border-radius: 50%; border: 1px dashed #555; background: #1c1c1f; color: greenyellow; font-size: 20px; font-weight: 700; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: border-color 0.15s, background 0.15s, transform 0.15s, box-shadow 0.15s; box-shadow: 0 2px 8px rgba(0,0,0,0.25); }
    .block-minimap-add-btn:hover, .block-minimap-add-btn.open { border-color: greenyellow; background: rgba(173,255,47,0.14); box-shadow: 0 3px 12px rgba(173,255,47,0.2); transform: scale(1.05); }
    .block-builder-expanded { display: flex; flex-direction: column; gap: 72px; padding-bottom: 28px; }
    .block-minimap-item { position: relative; display: flex; flex-direction: column; width: 140px; min-height: 118px; flex-shrink: 0; border: 1px solid #444; border-radius: 8px; background: #1c1c1f; overflow: hidden; transition: border-color 0.15s, box-shadow 0.15s, opacity 0.15s; user-select: none; cursor: grab; touch-action: none; }
    .block-minimap-item:active { cursor: grabbing; }
    .block-minimap-item:hover { border-color: #666; }
    .block-minimap-item.is-dragging { opacity: 0.45; transform: scale(0.97); cursor: grabbing; }
    .block-minimap-item.is-drop-before { border-color: greenyellow; box-shadow: inset 0 3px 0 0 greenyellow, 0 0 0 1px rgba(173,255,47,0.35); }
    .block-minimap-item.is-drop-after { border-color: greenyellow; box-shadow: inset 0 -3px 0 0 greenyellow, 0 0 0 1px rgba(173,255,47,0.35); }
    .block-minimap-item.is-cover { border-color: rgba(173,255,47,0.55); }
    .block-minimap-item.is-cover.is-drop-before, .block-minimap-item.is-cover.is-drop-after { border-color: greenyellow; }
    .block-minimap-item.just-moved { animation: moveHighlight 0.6s ease-out; }
    .block-minimap-main { flex: 1; min-height: 0; padding: 8px 8px 8px; display: flex; flex-direction: column; gap: 6px; pointer-events: none; }
    .block-minimap-index { position: absolute; top: 6px; left: 6px; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 4px; background: rgba(0,0,0,0.65); color: greenyellow; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; z-index: 1; }
    .block-minimap-type-row { display: flex; align-items: center; gap: 5px; margin-top: 18px; flex-wrap: wrap; min-height: 16px; }
    .block-minimap-type { font-size: 10px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .block-minimap-cover { font-size: 9px; padding: 1px 5px; border-radius: 3px; background: greenyellow; color: #000; font-weight: 700; flex-shrink: 0; }
    .block-minimap-preview { flex: 1; font-size: 11px; line-height: 1.35; color: #ccc; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; word-break: break-word; background: #141416; border-radius: 4px; padding: 6px 8px; min-height: 48px; }
    .block-minimap-preview.is-h1 { font-weight: 700; color: #eee; -webkit-line-clamp: 2; }
    .block-minimap-preview.is-quote { font-style: italic; color: #bbb; border-left: 2px solid greenyellow; padding-left: 6px; }
    .block-minimap-preview.is-note { font-family: monospace; font-size: 10px; color: #ff8a8a; }
    .block-minimap-preview.is-empty { color: #666; font-style: italic; }
    .block-minimap-thumb { flex: 1; min-height: 48px; max-height: 72px; border-radius: 4px; overflow: hidden; background: #111; display: flex; align-items: center; justify-content: center; }
    .block-minimap-thumb img, .block-minimap-thumb video { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
    .block-minimap-del { position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; border-radius: 50%; background: #ff4d4f; color: #fff; border: none; opacity: 0; pointer-events: none; z-index: 2; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; line-height: 1; font-weight: 700; transition: opacity 0.15s, transform 0.15s; box-shadow: 0 2px 6px rgba(0,0,0,0.35); padding: 0; }
    .block-minimap-item:hover .block-minimap-del { opacity: 1; pointer-events: auto; }
    .block-minimap-del:hover { transform: scale(1.08); background: #ff7875; }
    .acc-btn { width: 100%; background: #424242; padding: 15px 20px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border: 1px solid #555; color: #fff; margin-bottom: 10px; transition: 0.2s; }
    .acc-btn:hover { border-color: greenyellow; color: greenyellow; }
    .acc-content { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.32s ease; padding: 0 10px; }
    .acc-content.open { grid-template-rows: 1fr; padding-bottom: 20px; }
    .acc-content-inner { overflow: hidden; min-height: 0; }
    .acc-content.open .acc-content-inner { overflow: visible; }
    .neo-btn { --bg: #000; --hover-bg: #ff90e8; --hover-text: #000; color: #fff; cursor: pointer; border: 1px solid var(--bg); border-radius: 4px; padding: 0.8em 2em; background: var(--bg); transition: 0.2s; display: flex; justify-content: center; align-items: center; font-weight: bold; gap: 8px; }
    .neo-btn:hover { color: var(--hover-text); transform: translate(-0.25rem, -0.25rem); background: var(--hover-bg); box-shadow: 0.25rem 0.25rem var(--bg); border-color: var(--hover-bg); }
    .neo-btn:active { transform: translate(0); box-shadow: none; }
    .group { display: flex; line-height: 28px; align-items: center; position: relative; max-width: 240px; }
    .input { font-family: "Montserrat", sans-serif; width: 100%; height: 45px; padding-left: 2.5rem; box-shadow: 0 0 0 1.5px #2b2c37, 0 0 25px -17px #000; border: 0; border-radius: 12px; background-color: #16171d; outline: none; color: #bdbecb; transition: all 0.25s cubic-bezier(0.19, 1, 0.22, 1); cursor: text; z-index: 0; }
    .input::placeholder { color: #bdbecb; }
    .input:hover { box-shadow: 0 0 0 2.5px #2f303d, 0px 0px 25px -15px #000; }
    .input:active { transform: scale(0.95); }
    .input:focus { box-shadow: 0 0 0 2.5px #2f303d; }
    .search-icon { position: absolute; left: 1rem; fill: #bdbecb; width: 1rem; height: 1rem; pointer-events: none; z-index: 1; }
    .fab-scroll { position: fixed; right: 30px; bottom: 150px; display: flex; flex-direction: column; gap: 10px; z-index: 99; }
    .fab-btn { width: 45px; height: 45px; background: greenyellow; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer; transition: 0.2s; }
    .fab-btn:hover { transform: scale(1.1); box-shadow: 0 6px 16px rgba(173, 255, 47, 0.4); }
    .category-picker-dropdown { max-height: 220px; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #555 #2a2a2e; }
    .category-picker-dropdown::-webkit-scrollbar { width: 8px; }
    .category-picker-dropdown::-webkit-scrollbar-track { background: #2a2a2e; border-radius: 4px; }
    .category-picker-dropdown::-webkit-scrollbar-thumb { background: #555; border-radius: 4px; }
    .category-picker-dropdown::-webkit-scrollbar-thumb:hover { background: #777; }
    .cover-modal-backdrop { position: fixed; inset: 0; z-index: 10001; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0,0,0,0); backdrop-filter: blur(0px); pointer-events: none; transition: background 0.28s ease, backdrop-filter 0.28s ease; }
    .cover-modal-backdrop.is-visible { background: rgba(0,0,0,0.72); backdrop-filter: blur(6px); pointer-events: auto; }
    .cover-modal-backdrop.is-closing { background: rgba(0,0,0,0); backdrop-filter: blur(0px); pointer-events: none; }
    .cover-modal-panel { width: min(420px, 92vw); background: #202024; border: 1px solid #444; border-radius: 18px; padding: 28px 26px 22px; box-shadow: 0 24px 60px rgba(0,0,0,0.55); transform: scale(0.88) translateY(16px); opacity: 0; transition: transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.26s ease; }
    .cover-modal-backdrop.is-visible .cover-modal-panel { transform: scale(1) translateY(0); opacity: 1; }
    .cover-modal-backdrop.is-closing .cover-modal-panel { transform: scale(0.94) translateY(8px); opacity: 0; transition: transform 0.22s ease, opacity 0.2s ease; }
    .cover-modal-icon { width: 48px; height: 48px; border-radius: 14px; background: rgba(173,255,47,0.12); border: 1px solid rgba(173,255,47,0.35); display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 16px; }
    .cover-modal-title { font-size: 17px; font-weight: 700; color: #fff; margin: 0 0 10px; letter-spacing: 0.2px; }
    .cover-modal-desc { font-size: 13px; line-height: 1.75; color: #aaa; margin: 0 0 22px; }
    .cover-modal-actions { display: flex; gap: 10px; }
    .cover-modal-btn { flex: 1; padding: 13px 16px; border-radius: 11px; font-size: 14px; font-weight: 700; cursor: pointer; border: 1px solid transparent; transition: transform 0.16s cubic-bezier(0.34, 1.3, 0.64, 1), background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease; }
    .cover-modal-btn:active { transform: scale(0.96); }
    .cover-modal-btn-secondary { background: #2a2a2e; border-color: #444; color: #ccc; }
    .cover-modal-btn-secondary:hover { background: #333; border-color: #666; color: #fff; box-shadow: 0 4px 14px rgba(0,0,0,0.25); }
    .cover-modal-btn-primary { background: greenyellow; color: #000; box-shadow: 0 0 0 0 rgba(173,255,47,0); }
    .cover-modal-btn-primary:hover { box-shadow: 0 6px 20px rgba(173,255,47,0.35); transform: translateY(-1px); }
    .cover-modal-btn-primary:active { transform: scale(0.96) translateY(0); box-shadow: 0 2px 8px rgba(173,255,47,0.2); }
    .btn-disabled { opacity: 0.5; cursor: not-allowed; }
    .img-drop { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 160px; border: 2px dashed #555; border-radius: 10px; background: #202024; cursor: pointer; transition: 0.2s; padding: 18px; text-align: center; color: #888; }
    .img-drop:hover { border-color: greenyellow; color: greenyellow; background: #1f261b; }
    .img-drop.err { border-color: #ff4d4f; }
    .img-preview { max-width: 100%; max-height: 360px; border-radius: 8px; object-fit: contain; }
    .img-url { font-size: 11px; color: #666; margin-top: 8px; word-break: break-all; font-family: monospace; }
    .img-uploading { display: flex; flex-direction: column; align-items: center; gap: 12px; color: greenyellow; }
    .img-spin { width: 32px; height: 32px; border: 3px solid #333; border-top-color: greenyellow; border-radius: 50%; animation: imgspin 0.8s linear infinite; }
    @keyframes imgspin { to { transform: rotate(360deg); } }
    .img-err { color: #ff4d4f; font-size: 12px; margin-top: 8px; }
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #202024; }
    ::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #555; }
    .admin-toast { position: fixed; top: 24px; left: 50%; transform: translateX(-50%) translateY(-12px); z-index: 10002; padding: 12px 22px; border-radius: 12px; background: #202024; border: 1px solid rgba(173,255,47,0.45); color: #eee; font-size: 14px; font-weight: 600; box-shadow: 0 12px 36px rgba(0,0,0,0.45); opacity: 0; pointer-events: none; transition: opacity 0.26s ease, transform 0.26s ease; white-space: nowrap; }
    .admin-toast.is-visible { opacity: 1; transform: translateX(-50%) translateY(0); }
    .admin-toast.is-closing { opacity: 0; transform: translateX(-50%) translateY(-8px); }
  `}} />
);

// --- 3. 辅助组件 ---
const SearchInput = ({ value, onChange }) => (
  <div className="group">
    <svg className="search-icon" aria-hidden="true" viewBox="0 0 24 24"><g><path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z"></path></g></svg>
    <input placeholder="Search" type="search" className="input" value={value} onChange={onChange} />
  </div>
);

const GalleryOnlyTag = () => (
  <span className="gallery-only-tag">(Gallery主题专用)</span>
);

const ViewModeButton = ({ label, active, onClick }) => (
  <button
    type="button"
    className={`view-mode-btn ${active ? 'is-active' : ''}`}
    onClick={onClick}
    aria-pressed={active}
  >
    <svg className="view-mode-sparkle" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M14.187 8.096L15 5.25L15.813 8.096C16.0231 8.83114 16.4171 9.50062 16.9577 10.0413C17.4984 10.5819 18.1679 10.9759 18.903 11.186L21.75 12L18.904 12.813C18.1689 13.0231 17.4994 13.4171 16.9587 13.9577C16.4181 14.4984 16.0241 15.1679 15.814 15.903L15 18.75L14.187 15.904C13.9769 15.1689 13.5829 14.4994 13.0423 13.9587C12.5016 13.4181 11.8321 13.0241 11.097 12.814L8.25 12L11.096 11.187C11.8311 10.9769 12.5006 10.5829 13.0413 10.0423C13.5819 9.50162 13.9759 8.83214 14.186 8.097L14.187 8.096Z" />
    </svg>
    <span className="view-mode-text">{label}</span>
  </button>
);

const AdminToast = ({ message, visible, closing }) => {
  if (!visible && !closing) return null;
  return (
    <div
      className={`admin-toast ${visible && !closing ? 'is-visible' : ''} ${closing ? 'is-closing' : ''}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
};

const StepAccordion = ({ step, title, isOpen, onToggle, children }) => (
  <div>
    <div className="acc-btn" onClick={onToggle}>
      <div style={{fontWeight:'bold'}}><span style={{color:'greenyellow', marginRight:'10px'}}>Step {step}</span>{title}</div>
      <div style={{transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition:'0.3s'}}><Icons.ChevronDown /></div>
    </div>
    <div className={`acc-content ${isOpen ? 'open' : ''}`}>
      <div className="acc-content-inner">{children}</div>
    </div>
  </div>
);

const AnimatedBtn = ({ text, onClick, style }) => (
  <button className="animated-button" onClick={onClick} style={style}>
    <svg viewBox="0 0 24 24" className="arr-2" xmlns="http://www.w3.org/2000/svg"><path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path></svg>
    <span className="text">{text}</span>
    <span className="circle"></span>
    <svg viewBox="0 0 24 24" className="arr-1" xmlns="http://www.w3.org/2000/svg"><path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path></svg>
  </button>
);

const SlidingNav = ({ activeIdx, onSelect }) => {
  const icons = [Icons.FolderMode, Icons.CoverMode, Icons.TextMode, Icons.GridMode];
  return (
    <div className="nav-container">
      <div className="nav-glider" style={{ left: `${activeIdx * 45 + 5}px`, width: '40px' }} />
      {icons.map((Icon, i) => (<div key={i} className={`nav-item ${activeIdx === i ? 'active' : ''}`} onClick={() => onSelect(i)}><Icon /></div>))}
    </div>
  );
};

function toDateKey(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const CAL_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const AdminPublishCalendar = ({ month, publishedDates, selectedDate, onMonthChange, onSelectDate }) => {
  const year = month.getFullYear();
  const mon = month.getMonth();
  const firstDow = new Date(year, mon, 1).getDay();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthLabel = `${year}年${mon + 1}月`;

  return (
    <div
      className="admin-date-calendar"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 0,
        width: '280px',
        background: '#2a2a2e',
        border: '1px solid #555',
        borderRadius: '14px',
        padding: '14px',
        zIndex: 60,
        boxShadow: '0 16px 40px rgba(0,0,0,0.55)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, mon - 1, 1))}
          style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '18px', padding: '4px 8px' }}
        >
          ‹
        </button>
        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{monthLabel}</span>
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, mon + 1, 1))}
          style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '18px', padding: '4px 8px' }}
        >
          ›
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
        {CAL_WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: 'center', fontSize: '11px', color: '#777', padding: '4px 0' }}>{w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {cells.map((day, idx) => {
          if (day == null) return <div key={`e-${idx}`} />;
          const key = `${year}-${String(mon + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const hasPosts = publishedDates.has(key);
          const isSelected = selectedDate === key;
          const clickable = hasPosts;
          return (
            <button
              key={key}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSelectDate(key)}
              style={{
                aspectRatio: '1',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: isSelected ? 'bold' : 'normal',
                cursor: clickable ? 'pointer' : 'default',
                background: isSelected ? 'greenyellow' : clickable ? 'rgba(173,255,47,0.12)' : 'transparent',
                color: isSelected ? '#000' : clickable ? '#eee' : '#555',
                opacity: clickable ? 1 : 0.45,
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
      {selectedDate ? (
        <button
          type="button"
          onClick={() => onSelectDate(null)}
          style={{
            marginTop: '12px',
            width: '100%',
            padding: '8px',
            borderRadius: '8px',
            border: '1px solid #555',
            background: 'transparent',
            color: '#aaa',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          清除日期筛选
        </button>
      ) : (
        <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#666', textAlign: 'center', lineHeight: 1.5 }}>
          高亮日期为已发布文章，点击筛选
        </p>
      )}
    </div>
  );
};

/** 分类搜索 + 可滚动下拉列表（fixed 定位，避免被 accordion overflow 裁剪） */
const CategoryPicker = ({ value, categories, onChange }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [menuRect, setMenuRect] = useState(null);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const inputRef = useRef(null);

  const hasSelection = !!(value && value.trim());

  useEffect(() => {
    if (!hasSelection) return;
    // 选中分类后清空搜索框文字（仅在“搜索态”使用）
    setQuery('');
  }, [hasSelection]);

  const updateMenuRect = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuRect({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setMenuRect(null);
      return;
    }
    updateMenuRect();
    const onReposition = () => updateMenuRect();
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [open, updateMenuRect]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  const allCategories = useMemo(() => {
    const list = [...(categories || [])];
    if (value && !list.includes(value)) list.unshift(value);
    return list.sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [categories, value]);

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCategories;
    return allCategories.filter((c) => c.toLowerCase().includes(q));
  }, [allCategories, query]);

  const listCategories = showAll ? allCategories : filteredCategories;

  const pickCategory = (cat) => {
    onChange(cat);
    setQuery('');
    setOpen(false);
    setShowAll(false);
  };

  const clearSelection = () => {
    onChange('');
    setQuery('');
    setOpen(true);
    setShowAll(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const toggleDropdown = () => {
    setOpen((prev) => {
      if (!prev) setShowAll(true);
      return !prev;
    });
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', marginBottom: '10px' }}>
      <div ref={triggerRef} style={{ display: 'flex', alignItems: 'stretch' }}>
        {hasSelection ? (
          <div
            onClick={() => { setOpen(true); setShowAll(true); }}
            title="点击浏览全部分类，或点 × 重新搜索"
            style={{
              flex: 1,
              minHeight: '50px',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: '#18181c',
              border: '1px solid #333',
              borderRight: 'none',
              borderTopLeftRadius: '10px',
              borderBottomLeftRadius: '10px',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                maxWidth: '100%',
                background: 'rgba(173,255,47,0.14)',
                border: '1px solid rgba(173,255,47,0.45)',
                color: 'greenyellow',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {value}
              </span>
              <span
                onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                title="清除分类，重新搜索"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: 'rgba(173,255,47,0.25)',
                  color: '#eaffd0',
                  fontSize: '12px',
                  lineHeight: 1,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                ×
              </span>
            </span>
          </div>
        ) : (
          <input
            ref={inputRef}
            className="glow-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowAll(false);
              setOpen(true);
              const trimmed = e.target.value.trim();
              if (!trimmed) onChange('');
              else if (allCategories.includes(trimmed)) onChange(trimmed);
            }}
            onFocus={() => { setOpen(true); setShowAll(false); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (listCategories.length === 1) pickCategory(listCategories[0]);
                else {
                  const exact = listCategories.find((c) => c === query.trim());
                  if (exact) pickCategory(exact);
                }
              } else if (e.key === 'Escape') {
                setOpen(false);
                setShowAll(false);
                setQuery('');
              }
            }}
            placeholder="搜索分类"
            style={{
              flex: 1,
              marginBottom: 0,
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
              borderRight: 'none',
            }}
          />
        )}
        <button
          type="button"
          onClick={toggleDropdown}
          title={open ? '收起分类列表' : '展开全部分类'}
          style={{
            width: '44px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: open ? 'rgba(173,255,47,0.12)' : '#18181c',
            border: '1px solid #333',
            borderLeft: '1px solid #444',
            borderTopRightRadius: '10px',
            borderBottomRightRadius: '10px',
            color: open ? 'greenyellow' : '#aaa',
            cursor: 'pointer',
            transition: '0.2s',
          }}
        >
          <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'flex' }}>
            <Icons.ChevronDown />
          </span>
        </button>
      </div>

      {open && menuRect ? (
        <div
          className="category-picker-dropdown"
          style={{
            position: 'fixed',
            top: menuRect.top,
            left: menuRect.left,
            width: menuRect.width,
            zIndex: 1200,
            background: '#2a2a2e',
            border: '1px solid #555',
            borderRadius: '10px',
            boxShadow: '0 12px 28px rgba(0,0,0,0.55)',
          }}
        >
          {listCategories.length > 0 ? (
            listCategories.map((cat) => {
              const active = cat === value;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => pickCategory(cat)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    border: 'none',
                    borderBottom: '1px solid #3a3a3f',
                    background: active ? 'rgba(173,255,47,0.12)' : 'transparent',
                    color: active ? 'greenyellow' : '#eee',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {cat}
                </button>
              );
            })
          ) : (
            <div style={{ padding: '14px', fontSize: '12px', color: '#888', textAlign: 'center' }}>
              无匹配分类
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

const SAVE_PHASE_META = {
  media: {
    title: '正在上传图片块',
    hint: '图片处理上传中，请稍候',
  },
  post: {
    title: '正在保存文章',
    hint: '正在保存文章与正文内容…',
  },
  gallery: {
    title: '正在上传图库',
    hint: '批量处理中，请稍候',
  },
};

function getGalleryLoaderHint(phase, progress) {
  if (phase !== 'gallery') return SAVE_PHASE_META[phase]?.hint || '';
  if (progress?.total > 0) return SAVE_PHASE_META.gallery.hint;
  return '正在同步图库内容…';
}

const FullScreenLoader = ({ phase, progress }) => {
  const isTheme = phase === 'theme';
  const meta = SAVE_PHASE_META[phase];
  const hasProgress = progress && progress.total > 0;
  const title = isTheme
    ? (hasProgress && progress?.step === 2
        ? ''
        : (progress?.label || '正在切换主题…'))
    : phase === 'gallery' && !(progress?.total > 0)
      ? '正在同步图库'
      : meta?.title || '加载中…';
  const hint = isTheme
    ? (hasProgress && progress?.step === 2 ? '' : (progress?.hint || ''))
    : getGalleryLoaderHint(phase, progress);
  const pct = hasProgress
    ? Math.min(100, Math.round((progress.done / progress.total) * 100))
    : 0;
  const stepLine = isTheme && progress?.totalSteps
    ? `步骤 ${progress.step} / ${progress.totalSteps}`
    : null;

  return (
    <div className="loader-overlay" role="alertdialog" aria-modal="true" aria-busy="true">
      <div className="loader">
        <svg viewBox="0 0 200 60" width="200" height="60">
          <path className="dash" fill="none" stroke="greenyellow" strokeWidth="3" d="M20,50 L20,10 L50,10 C65,10 65,30 50,30 L20,30" />
          <path className="dash" fill="none" stroke="greenyellow" strokeWidth="3" d="M80,50 L80,10 L110,10 C125,10 125,30 110,30 L80,30 M100,30 L120,50" />
          <path className="dash" fill="none" stroke="greenyellow" strokeWidth="3" d="M140,30 A20,20 0 1,0 180,30 A20,20 0 1,0 140,30" />
        </svg>
      </div>
      <div className="loader-text">处理中</div>
      {stepLine ? <div className="loader-step">{stepLine}</div> : null}
      {title ? <div className="loader-phase">{title}</div> : null}
      {hasProgress ? (
        <div className="loader-detail">
          已完成 {progress.done} / {progress.total} 页（{pct}%）
        </div>
      ) : (
        <div className="loader-detail">{isTheme || phase === 'post' ? '请稍候…' : ''}</div>
      )}
      {hasProgress || isTheme ? (
        <div className="loader-progress-track">
          <div
            className="loader-progress-bar"
            style={{ width: `${hasProgress ? pct : (isTheme && progress?.step ? Math.round((progress.step / progress.totalSteps) * 100) : 0)}%` }}
          />
        </div>
      ) : null}
      {hint ? <div className="loader-hint">{hint}</div> : null}
      {isTheme ? (
        <div className="loader-lock-hint">主题切换期间请勿操作后台，以免数据冲突</div>
      ) : null}
    </div>
  );
};

/** 发布队列：每篇任务的阶段文案 */
function pubqStateText(job) {
  const elapsed = formatJobElapsed(job.startedAt);
  const elapsedSuffix = elapsed ? ` · 已运行 ${elapsed}` : '';

  if (job.status === 'queued') return '队列中';
  if (job.status === 'success') return '已完成';
  if (job.status === 'error') return '发布失败';
  if (job.stalled) {
    return `长时间无进度更新${elapsed ? `（已运行 ${elapsed}）` : ''}`;
  }
  // running
  if (job.phase === 'media') {
    const base = job.progress
      ? `上传正文内容 ${job.progress.done}/${job.progress.total}`
      : '准备上传图片…';
    return base + elapsedSuffix;
  }
  if (job.phase === 'gallery') {
    const base = job.progress?.total
      ? `上传图库 ${job.progress.done}/${job.progress.total}`
      : '同步图库…';
    return base + elapsedSuffix;
  }
  if (job.phase === 'refresh') return '正在更新前台页面…' + elapsedSuffix;
  if (job.phase === 'post') return '正在写入文章…' + elapsedSuffix;
  return '处理中…' + elapsedSuffix;
}

/** 发布队列面板：固定在右上角，后台逐条处理，不阻塞编辑 */
const PublishQueuePanel = ({ jobs, onRetry, onRemove, onForceComplete }) => {
  const [, setElapsedTick] = useState(0);

  useEffect(() => {
    const hasRunning = jobs.some((j) => j.status === 'running');
    if (!hasRunning) return;
    const timer = setInterval(() => setElapsedTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [jobs]);
  if (!jobs || jobs.length === 0) return null;
  const active = jobs.filter((j) => j.status === 'queued' || j.status === 'running').length;

  return (
    <div className="pubq">
      <div className="pubq-head">
        <span>发布队列{active > 0 ? ` · 进行中 ${active}` : ''}</span>
        <b>{jobs.length}</b>
      </div>
      <div className="pubq-list">
        {jobs.map((job) => {
          const determinate = job.progress && job.progress.total > 0;
          const pct = determinate
            ? Math.min(100, Math.round((job.progress.done / job.progress.total) * 100))
            : 0;
          const stateColor =
            job.status === 'error' ? '#ff6b6d'
            : job.status === 'success' ? 'greenyellow'
            : job.status === 'queued' ? '#999'
            : job.stalled ? '#fbbf24'
            : 'greenyellow';
          return (
            <div
              key={job.id}
              className={`pubq-card${job.status === 'error' ? ' is-err' : job.status === 'success' ? ' is-ok' : job.stalled ? ' is-err' : ''}`}
            >
              <div className="pubq-row">
                {job.status === 'running' && !job.stalled && <span className="pubq-spin" />}
                {job.status === 'running' && job.stalled && <span className="pubq-warn" aria-hidden>!</span>}
                <span className="pubq-title" title={job.title}>{job.title}</span>
                <div className="pubq-actions">
                  {job.status === 'error' && (
                    <button className="pubq-retry" onClick={() => onRetry(job.id)}>重试</button>
                  )}
                  {job.status === 'running' && job.stalled && onForceComplete && (
                    <button className="pubq-retry" onClick={() => onForceComplete(job.id)}>标记完成</button>
                  )}
                  <button
                    className="pubq-x"
                    title={job.status === 'queued' || job.status === 'running' ? '取消发布' : '移除'}
                    onClick={() => onRemove(job)}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="pubq-state" style={{ color: stateColor }}>{pubqStateText(job)}</div>
              {job.status === 'running' && job.stalled && (
                <div className="pubq-stall-hint">
                  已连续较长时间未收到进度更新。若内容列表已有该条目，可点「标记完成」继续后续队列。
                </div>
              )}
              {job.status === 'running' && (
                <div className="pubq-bar-track">
                  {determinate ? (
                    <div className="pubq-bar" style={{ width: `${pct}%` }} />
                  ) : (
                    <div className="pubq-bar-indet" />
                  )}
                </div>
              )}
              {job.status === 'success' && (
                <div className="pubq-bar-track">
                  <div className="pubq-bar" style={{ width: '100%' }} />
                </div>
              )}
              {job.status === 'error' && job.error && (
                <div className="pubq-detail is-err">{job.error}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** 无图片块时的封面确认弹窗（替代浏览器 confirm） */
const CoverMissingModal = ({ open, closing, onConfirm, onCancel }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open && !closing) {
      setVisible(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
    if (!open || closing) setVisible(false);
  }, [open, closing]);

  if (!open && !closing) return null;

  return (
    <div
      className={`cover-modal-backdrop ${visible && !closing ? 'is-visible' : ''} ${closing ? 'is-closing' : ''}`}
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="cover-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cover-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cover-modal-icon" aria-hidden>🖼️</div>
        <h3 id="cover-modal-title" className="cover-modal-title">尚未添加图片块</h3>
        <p className="cover-modal-desc">
          当前文章没有任何图片块，发布后将使用<strong style={{ color: '#ddd' }}>默认封面</strong>。
          你可以继续发布，或返回编辑添加图片块。
        </p>
        <div className="cover-modal-actions">
          <button type="button" className="cover-modal-btn cover-modal-btn-secondary" onClick={onCancel}>
            继续编辑
          </button>
          <button type="button" className="cover-modal-btn cover-modal-btn-primary" onClick={onConfirm}>
            确认发布
          </button>
        </div>
      </div>
    </div>
  );
};

/** 发布/保存前的确认弹窗（避免误点底部发布按钮） */
const PublishConfirmModal = ({ open, closing, isUpdate, onConfirm, onCancel }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open && !closing) {
      setVisible(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
    if (!open || closing) setVisible(false);
  }, [open, closing]);

  if (!open && !closing) return null;

  const title = isUpdate ? '确认保存修改？' : '确认发布？';
  const confirmLabel = isUpdate ? '确认保存' : '确认发布';
  const desc = isUpdate
    ? '请确认内容已编辑完成，确认无误后再继续。'
    : '请确认内容已编辑完成，确认无误后再继续。';

  return (
    <div
      className={`cover-modal-backdrop ${visible && !closing ? 'is-visible' : ''} ${closing ? 'is-closing' : ''}`}
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="cover-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-confirm-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cover-modal-icon" aria-hidden>📤</div>
        <h3 id="publish-confirm-modal-title" className="cover-modal-title">{title}</h3>
        <p className="cover-modal-desc">{desc}</p>
        <div className="cover-modal-actions">
          <button type="button" className="cover-modal-btn cover-modal-btn-secondary" onClick={onCancel}>
            继续编辑
          </button>
          <button type="button" className="cover-modal-btn cover-modal-btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/** 爬虫入库队列弹窗 */
const CRAWLER_INGEST_STATUS_META = {
  pending: { label: '待入库', color: '#7ee8fc' },
  processing: { label: '处理中', color: '#fbbf24' },
  done: { label: '已完成', color: '#4ade80' },
  failed: { label: '失败', color: '#f87171' },
  skipped: { label: '跳过', color: '#a3a3a3' },
};

const CrawlerIngestModal = ({
  open,
  closing,
  busy,
  configured,
  summary,
  items,
  onRun,
  onRetry,
  onRefresh,
  onClose,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open && !closing) {
      setVisible(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
    if (!open || closing) setVisible(false);
  }, [open, closing]);

  if (!open && !closing) return null;

  const formatQueueTime = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 19);
    return d.toLocaleString('zh-CN', { hour12: false });
  };

  return (
    <div
      className={`cover-modal-backdrop ${visible && !closing ? 'is-visible' : ''} ${closing ? 'is-closing' : ''}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="cover-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crawler-ingest-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '720px', width: 'min(720px, 94vw)' }}
      >
        <div className="cover-modal-icon" aria-hidden>📥</div>
        <h3 id="crawler-ingest-modal-title" className="cover-modal-title">爬虫入库队列</h3>
        <p className="cover-modal-desc" style={{ marginBottom: '12px' }}>
          {configured
            ? `待入库 ${summary?.pending ?? 0} · 处理中 ${summary?.processing ?? 0} · 已完成 ${summary?.done ?? 0} · 失败 ${summary?.failed ?? 0}`
            : '未配置 Supabase 图库租户（BLOG_SITE_ID）'}
          <br />
          <span style={{ fontSize: '12px', color: '#888' }}>
            入库后 slug 由 BLOG 自动生成（p- 时间戳），不使用爬虫源站 ID；列表中 slug 为博客地址。
          </span>
        </p>
        <div
          style={{
            maxHeight: '360px',
            overflow: 'auto',
            border: '1px solid #444',
            borderRadius: '8px',
            background: '#2a2a2e',
          }}
        >
          {(!items || items.length === 0) ? (
            <p style={{ padding: '16px', color: '#888', fontSize: '13px', textAlign: 'center' }}>
              暂无队列记录
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#333', color: '#ccc', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>状态</th>
                  <th style={{ padding: '8px 10px' }}>标题</th>
                  <th style={{ padding: '8px 10px' }}>slug</th>
                  <th style={{ padding: '8px 10px' }}>图</th>
                  <th style={{ padding: '8px 10px' }}>更新时间</th>
                  <th style={{ padding: '8px 10px' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const meta = CRAWLER_INGEST_STATUS_META[row.status] || CRAWLER_INGEST_STATUS_META.pending;
                  return (
                    <tr key={row.id} style={{ borderTop: '1px solid #3a3a3f' }}>
                      <td style={{ padding: '8px 10px', color: meta.color, fontWeight: 600 }}>
                        {meta.label}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#eee', maxWidth: '180px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.title || '—'}
                        </div>
                        {row.error_message ? (
                          <div style={{ color: '#f87171', fontSize: '11px', marginTop: '4px', lineHeight: 1.4 }}>
                            {row.error_message}
                          </div>
                        ) : null}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#bbb' }}>{row.slug}</td>
                      <td style={{ padding: '8px 10px', color: '#bbb' }}>
                        {(row.image_urls && row.image_urls.length) || 0}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#888', whiteSpace: 'nowrap' }}>
                        {formatQueueTime(row.updated_at)}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {row.status === 'failed' || row.status === 'done' ? (
                          <button
                            type="button"
                            onClick={() => onRetry(row.id)}
                            disabled={busy}
                            style={{
                              background: 'none',
                              border: row.status === 'failed' ? '1px solid #f87171' : '1px solid #3db8d9',
                              color: row.status === 'failed' ? '#f87171' : '#7ee8fc',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              cursor: busy ? 'not-allowed' : 'pointer',
                              fontSize: '11px',
                            }}
                          >
                            {row.status === 'failed' ? '重试' : '重新入库'}
                          </button>
                        ) : (
                          <span style={{ color: '#666' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="cover-modal-actions" style={{ marginTop: '16px' }}>
          <button type="button" className="cover-modal-btn cover-modal-btn-secondary" onClick={onRefresh} disabled={busy}>
            刷新列表
          </button>
          <button
            type="button"
            className="cover-modal-btn"
            onClick={onRun}
            disabled={busy || !configured}
            style={{
              background: busy ? '#1a4d5c' : '#3db8d9',
              color: '#fff',
              boxShadow: busy ? 'none' : '0 4px 14px rgba(61,184,217,0.35)',
            }}
          >
            {busy ? '入库中…' : '立即入库'}
          </button>
          <button type="button" className="cover-modal-btn cover-modal-btn-secondary" onClick={onClose} disabled={busy}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

/** 全量刷新确认弹窗 */
const FullRedeployConfirmModal = ({ open, closing, busy, onConfirm, onCancel }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open && !closing) {
      setVisible(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
    if (!open || closing) setVisible(false);
  }, [open, closing]);

  if (!open && !closing) return null;

  return (
    <div
      className={`cover-modal-backdrop ${visible && !closing ? 'is-visible' : ''} ${closing ? 'is-closing' : ''}`}
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="cover-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="full-redeploy-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cover-modal-icon" aria-hidden>🔄</div>
        <h3 id="full-redeploy-modal-title" className="cover-modal-title">确认全量更新</h3>
        <p className="cover-modal-desc">
          是否确定执行全量更新，24h仅支持执行1次
        </p>
        <div className="cover-modal-actions">
          <button type="button" className="cover-modal-btn cover-modal-btn-secondary" onClick={onCancel} disabled={busy}>
            取消
          </button>
          <button
            type="button"
            className="cover-modal-btn"
            onClick={onConfirm}
            disabled={busy}
            style={{
              background: busy ? '#5a4a6e' : '#9a6dd7',
              color: '#fff',
              boxShadow: busy ? 'none' : '0 4px 14px rgba(154,109,215,0.35)',
            }}
          >
            {busy ? '执行中…' : '执行'}
          </button>
        </div>
      </div>
    </div>
  );
};

/** 主题切换完成提示（替代浏览器 alert） */
const ThemeSwitchDoneModal = ({ open, closing, extraNote, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open && !closing) {
      setVisible(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
    if (!open || closing) setVisible(false);
  }, [open, closing]);

  if (!open && !closing) return null;

  return (
    <div
      className={`cover-modal-backdrop ${visible && !closing ? 'is-visible' : ''} ${closing ? 'is-closing' : ''}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="cover-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-done-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cover-modal-icon" aria-hidden>🎨</div>
        <h3 id="theme-done-modal-title" className="cover-modal-title">主题切换完成</h3>
        <p className="cover-modal-desc">
          BLOG主题已切换。
          <br /><br />
          若博客首页仍显示旧主题，请在博客页按 <strong>Ctrl+Shift+R</strong>（Mac：<strong>Cmd+Shift+R</strong>）强制刷新，或新开标签页访问。
          <br /><br />
          各篇<strong>内页</strong>会逐步完成更新（通常 1 小时内）；也可直接打开该篇内页触发立即更新。
          {extraNote ? (
            <>
              <br /><br />
              <span style={{ color: '#ccc' }}>{extraNote}</span>
            </>
          ) : null}
        </p>
        <div className="cover-modal-actions">
          <button type="button" className="cover-modal-btn cover-modal-btn-primary" onClick={onClose} style={{ flex: 1 }}>
            知道了
          </button>
        </div>
      </div>
    </div>
  );
};

// 工具函数：清洗 URL1
// 🟢 修复版：AdminDashboard 顶部的洗链逻辑
const cleanAndFormat = (input) => {
  if (!input) return "";
  const lines = input.split('\n').map(line => {
    let raw = line.trim();
    if (!raw) return ""; 
    
    // 1. 提取 URL
    const mdMatch = raw.match(/\[.*?\]\((.*?)\)/);
    let urlCandidate = mdMatch ? mdMatch[1] : raw;
    const urlMatch = urlCandidate.match(/https?:\/\/[^\s"']+/);
    
    if(urlMatch) {
      let finalUrl = urlMatch[0];
      
      // 2. 强制转义中括号，防止 Notion 报错
      if (/[\[\]]/.test(finalUrl)) {
        try {
          finalUrl = encodeURI(decodeURI(finalUrl));
        } catch(e) {
          finalUrl = encodeURI(finalUrl);
        }
      }
      
      // 3. 包装成标准格式
      if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|mp4|mov|webm|ogg|mkv)(\?|$)/i.test(finalUrl)) {
         return `![](${finalUrl})`;
      }
      return finalUrl;
    }
    return raw;
  });
  return lines.filter(l=>l).join('\n');
};

// 工具函数：判断某一行是否为「纯图片」(markdown 图片或裸图片链接)，是则返回 URL
const extractImageUrl = (str) => {
  if (!str) return null;
  let s = str.trim();
  const md = s.match(/^!\[.*?\]\((.*?)\)$/);
  if (md) s = md[1].trim();
  const um = s.match(/^https?:\/\/[^\s"']+$/);
  if (!um) return null;
  const url = um[0];
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url) ? url : null;
};

// Notion 文字颜色 -> 编辑器预览用的 CSS 色值
const NOTION_TEXT_COLORS = [
  { key: 'default', label: '默认', css: '#e1e1e3' },
  { key: 'gray', label: '灰', css: '#9b9b9b' },
  { key: 'brown', label: '棕', css: '#b08968' },
  { key: 'orange', label: '橙', css: '#e9954e' },
  { key: 'yellow', label: '黄', css: '#d4b53d' },
  { key: 'green', label: '绿', css: '#4dab6d' },
  { key: 'blue', label: '蓝', css: '#5b9bd5' },
  { key: 'purple', label: '紫', css: '#9a6dd7' },
  { key: 'pink', label: '粉', css: '#e255a1' },
  { key: 'red', label: '红', css: '#ff6b6b' },
];
const colorCss = (key) => (NOTION_TEXT_COLORS.find(c => c.key === key) || NOTION_TEXT_COLORS[0]).css;
const btnSpinStyle = { width: '13px', height: '13px', border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#000', borderRadius: '50%', display: 'inline-block', animation: 'imgspin 0.8s linear infinite', verticalAlign: 'middle' };
// 可选主题列表（目前用现有的 v1/v2 排版作为主题，后续上新主题往这里加即可）
const ADMIN_THEMES = [
  { id: 'v1', label: 'Standard V1', color: '#3b82f6', desc: '标准排版 · 经典风格' },
  { id: 'v2', label: 'Standard V2', color: '#a855f7', desc: '标准排版 · 现代风格' },
  { id: 'gallery', label: 'Gallery', color: '#f97316', desc: '图库风格 · 卡片直链下载' },
];
const lightSpinStyle = { width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'imgspin 0.8s linear infinite', verticalAlign: 'middle' };
const blogRefreshSpinStyle = { width: '13px', height: '13px', border: '2px solid rgba(173,255,47,0.25)', borderTopColor: 'greenyellow', borderRadius: '50%', display: 'inline-block', animation: 'imgspin 0.8s linear infinite', verticalAlign: 'middle', flexShrink: 0 };
const fmtStyle = (b) => ({
  fontWeight: b.bold ? 'bold' : 'normal',
  fontStyle: b.italic ? 'italic' : 'normal',
  color: colorCss(b.color),
});

// 块内文字格式工具条 (整块加粗/斜体/颜色)
const FormatBar = ({ b, onChange, onInsertLink }) => (
  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
    <button onClick={() => onChange('bold', !b.bold)} title="加粗" style={{ width: '30px', height: '28px', borderRadius: '6px', cursor: 'pointer', border: '1px solid', borderColor: b.bold ? 'greenyellow' : '#444', background: b.bold ? 'greenyellow' : '#2a2a2e', color: b.bold ? '#000' : '#ccc', fontWeight: 'bold' }}>B</button>
    <button onClick={() => onChange('italic', !b.italic)} title="斜体" style={{ width: '30px', height: '28px', borderRadius: '6px', cursor: 'pointer', border: '1px solid', borderColor: b.italic ? 'greenyellow' : '#444', background: b.italic ? 'greenyellow' : '#2a2a2e', color: b.italic ? '#000' : '#ccc', fontStyle: 'italic' }}>I</button>
    {onInsertLink && (
      <button onClick={onInsertLink} title="给选中的文字添加超链接" style={{ height: '28px', padding: '0 8px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #444', background: '#2a2a2e', color: '#7cb3ff', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>🔗 链接</button>
    )}
    <div style={{ width: '1px', height: '20px', background: '#444', margin: '0 4px' }} />
    {NOTION_TEXT_COLORS.map(c => (
      <div key={c.key} onClick={() => onChange('color', c.key)} title={c.label}
        style={{ width: '18px', height: '18px', borderRadius: '50%', background: c.css, cursor: 'pointer', border: (b.color || 'default') === c.key ? '2px solid greenyellow' : '2px solid #333', boxSizing: 'border-box' }} />
    ))}
  </div>
);

// 工具函数：把加密块正文拆成「纯文本」与「图片URL数组」两部分
const splitLockBody = (body) => {
  const images = [];
  const textLines = [];
  (body || '').split(/\r?\n/).forEach((line) => {
    const u = extractImageUrl(line.trim());
    if (u) images.push(u);
    else textLines.push(line);
  });
  return { text: textLines.join('\n').trim(), images };
};

// ==========================================
// 4. 积木编辑器
// ==========================================
const BLOCK_TYPE_SHORT = {
  h1: 'H1 标题',
  text: '正文',
  image: '图片',
  quote: '引用',
  link: '链接',
  note: '注释',
  lock: '加密',
};

const BlockMinimapItem = ({
  block,
  index,
  isCover,
  isDragging,
  isDropBefore,
  isDropAfter,
  justMoved,
  selectMode,
  isSelected,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onClick,
  onRemove,
}) => {
  const previewText = (() => {
    const raw = (block.content || '').trim();
    if (block.type === 'link') return raw || block.url || '';
    if (block.type === 'lock') return raw || (block.images?.length ? `${block.images.length} 张加密图片` : '');
    return raw;
  })();
  const thumbUrl =
    block.type === 'image' && block.content
      ? block.content
      : block.type === 'lock' && block.images?.length
        ? block.images[0]
        : null;
  const isVideoThumb = thumbUrl && isVideoImageContent(thumbUrl);
  const previewClass = [
    'block-minimap-preview',
    block.type === 'h1' ? 'is-h1' : '',
    block.type === 'quote' ? 'is-quote' : '',
    block.type === 'note' ? 'is-note' : '',
    !previewText && !thumbUrl ? 'is-empty' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={`block-minimap-item ${isDragging ? 'is-dragging' : ''} ${isDropBefore ? 'is-drop-before' : ''} ${isDropAfter ? 'is-drop-after' : ''} ${isCover ? 'is-cover' : ''} ${justMoved ? 'just-moved' : ''} ${selectMode ? 'is-select-mode' : ''} ${isSelected ? 'is-selected' : ''}`}
      draggable={!selectMode}
      onDragStart={(e) => { if (selectMode) { e.preventDefault(); return; } onDragStart(e, index); }}
      onDragOver={(e) => { if (selectMode) return; onDragOver(e, index); }}
      onDrop={(e) => { if (selectMode) return; onDrop(e, index); }}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        if (e.target.closest('.block-minimap-del')) return;
        onClick(block.id);
      }}
      title={selectMode ? `第 ${index + 1} 块 · 点击选择/取消` : `第 ${index + 1} 块 · 拖拽排序 · 点击放大编辑`}
    >
      <span className="block-minimap-index">{index + 1}</span>
      {!selectMode ? (
        <button
          type="button"
          className="block-minimap-del"
          draggable={false}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onRemove(block.id); }}
          title="删除此块"
          aria-label="删除此块"
        >
          ×
        </button>
      ) : null}
      <div className="block-minimap-main">
        <div className="block-minimap-type-row">
          <span className="block-minimap-type">{BLOCK_TYPE_SHORT[block.type] || block.type}</span>
          {isCover ? <span className="block-minimap-cover">封面</span> : null}
        </div>
        {thumbUrl ? (
          <div className="block-minimap-thumb">
            {isVideoThumb ? <video src={thumbUrl} muted playsInline draggable={false} /> : <img src={thumbUrl} alt="" draggable={false} />}
          </div>
        ) : (
          <div className={previewClass}>{previewText || '（空）'}</div>
        )}
      </div>
    </div>
  );
};

// 后台被包裹在 #admin-container（position:fixed; overflow:auto）中，
// 真正的滚动容器是它而非 window，所以这里直接滚该容器。
// 提升为模块级函数，供主组件右下角悬浮按钮直接调用（避免跨组件作用域报错）。
function scrollEditView(where) {
  if (typeof document === 'undefined') return;
  const container =
    document.getElementById('admin-container') ||
    document.scrollingElement ||
    document.documentElement;
  if (!container) return;
  container.scrollTo({
    top: where === 'top' ? 0 : container.scrollHeight,
    behavior: 'smooth',
  });
}

// 块类型选项（与顶部「添加块」按钮保持一致），用于行内「+添加块」菜单
const BLOCK_TYPE_OPTIONS = [
  { type: 'h1', label: '✨标题块' },
  { type: 'text', label: '📝 内容块' },
  { type: 'image', label: '🖼️ 图片块' },
  { type: 'quote', label: '💭❝引用块' },
  { type: 'link', label: '🔗 超链文字' },
  { type: 'note', label: '💬 注释块' },
  { type: 'lock', label: '🔒 加密块' },
];

/** 块类型菜单预估高度，用于判断向上/向下弹出 */
const BLOCK_TYPE_MENU_EST_HEIGHT = 400;
const BLOCK_TYPE_MENU_MIN_WIDTH = 210;

const BlockCoverHint = () => (
  <div className="block-cover-hint">
    🖼️ <b style={{ color: 'greenyellow' }}>封面说明</b>：系统会将正文中的第一个图片块设为文章封面，请把用作封面的图片块放在最前。
  </div>
);

const isFileDragEvent = (e) => {
  const dt = e.dataTransfer;
  if (!dt?.types) return false;
  return Array.from(dt.types).includes('Files');
};

const BlockBuilder = ({ blocks, setBlocks }) => {
  const [movingId, setMovingId] = useState(null);
  const [blockViewMode, setBlockViewMode] = useState('expanded');
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [dropPosition, setDropPosition] = useState(null);
  const [fileDropIndex, setFileDropIndex] = useState(null);
  const [fileDropPosition, setFileDropPosition] = useState(null);
  const [fileDropEmpty, setFileDropEmpty] = useState(false);
  const [compactMultiSelect, setCompactMultiSelect] = useState(false);
  const [compactSelectedIds, setCompactSelectedIds] = useState([]);
  const minimapDragMovedRef = useRef(false);
  const coverImageBlockId = findCoverImageBlock(blocks)?.id ?? null;
  // 行内超链接弹窗：{ blockId, start, end, label, url }，为 null 时关闭
  const [linkModal, setLinkModal] = useState(null);

  const scrollToBlock = (id, delay = 100) => {
    setTimeout(() => {
       const el = document.getElementById(`block-${id}`);
       if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, delay);
  };

  const focusBlockInExpandedView = (blockId) => {
    setBlockViewMode('expanded');
    setMovingId(blockId);
    scrollToBlock(blockId, 180);
    setTimeout(() => setMovingId(null), 700);
  };

  const addBlock = (type) => {
    const newId = Date.now() + Math.random();
    setBlocks([...blocks, { id: newId, type, content: '', pwd: '', url: '', images: [], bold: false, italic: false, color: 'default' }]);
    setBlockViewMode('expanded');
    scrollToBlock(newId);
  };

  // 行内「+添加块」菜单：值为菜单 key（插入位置由 toggle 时传入的回调决定）
  const [addMenuFor, setAddMenuFor] = useState(null);
  const [addMenuLayout, setAddMenuLayout] = useState(null);
  const addMenuPickRef = useRef(null);

  const closeAddMenu = () => {
    setAddMenuFor(null);
    setAddMenuLayout(null);
    addMenuPickRef.current = null;
  };

  const toggleAddMenu = (menuKey, event, onPick) => {
    event.stopPropagation();
    if (addMenuFor === menuKey) {
      closeAddMenu();
      return;
    }
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openAbove =
      spaceBelow < BLOCK_TYPE_MENU_EST_HEIGHT && spaceAbove >= spaceBelow;
    const anchorY = openAbove ? rect.top - 8 : rect.bottom + 8;
    const halfW = BLOCK_TYPE_MENU_MIN_WIDTH / 2;
    const left = Math.max(
      halfW + 8,
      Math.min(rect.left + rect.width / 2, window.innerWidth - halfW - 8)
    );
    addMenuPickRef.current = onPick;
    setAddMenuLayout({ left, anchorY, openAbove });
    setAddMenuFor(menuKey);
  };

  const pickBlockType = (type) => {
    const pick = addMenuPickRef.current;
    closeAddMenu();
    if (pick) pick(type);
  };

  // 在指定下标之后插入新块；index 传 -1 表示插到最前
  const addBlockAfter = (index, type, options = {}) => {
    const newId = Date.now() + Math.random();
    const newBlock = { id: newId, type, content: '', pwd: '', url: '', images: [], bold: false, italic: false, color: 'default' };
    setBlocks([...blocks.slice(0, index + 1), newBlock, ...blocks.slice(index + 1)]);
    closeAddMenu();
    if (options.stayCompact || blockViewMode === 'compact') {
      setMovingId(newId);
      setTimeout(() => setMovingId(null), 600);
    } else {
      setBlockViewMode('expanded');
      scrollToBlock(newId);
    }
  };

  const renderMinimapAddBtn = (menuKey, afterIndex) => (
    <div key={menuKey} className="block-minimap-add-wrap">
      <button
        type="button"
        className={`block-minimap-add-btn ${addMenuFor === menuKey ? 'open' : ''}`}
        title="在此处添加块"
        onClick={(e) =>
          toggleAddMenu(menuKey, e, (type) =>
            addBlockAfter(afterIndex, type, { stayCompact: true })
          )
        }
      >
        ＋
      </button>
    </div>
  );

  const renderCompactMinimapToolbar = () => (
    <div className="block-minimap-toolbar">
      <button
        type="button"
        className={`block-compact-select-toggle${compactMultiSelect ? ' is-active' : ''}`}
        onClick={toggleCompactMultiSelect}
        aria-pressed={compactMultiSelect}
        title={compactMultiSelect ? '退出多选模式' : '多选内容块以批量删除'}
      >
        {compactMultiSelect
          ? compactSelectedIds.length
            ? `多选中 · 已选 ${compactSelectedIds.length} 项`
            : '多选中'
          : '多选'}
      </button>
      {compactMultiSelect ? (
        <button
          type="button"
          className="block-compact-multiselect-del"
          disabled={!compactSelectedIds.length}
          onClick={removeSelectedBlocks}
        >
          删除选中
        </button>
      ) : (
        <span />
      )}
    </div>
  );

  const renderFloatingBlockTypeMenu = () => {
    if (!addMenuFor || !addMenuLayout) return null;
    const { left, anchorY, openAbove } = addMenuLayout;
    const menuStyle = {
      left,
      transform: 'translateX(-50%)',
      ...(openAbove
        ? { bottom: window.innerHeight - anchorY }
        : { top: anchorY }),
    };
    return (
      <>
        <div className="block-add-menu-backdrop" onClick={closeAddMenu} />
        <div
          className="block-type-menu block-type-menu-floating"
          style={menuStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {BLOCK_TYPE_OPTIONS.map((opt) => (
            <div
              key={opt.type}
              className="bt-item"
              onClick={() => pickBlockType(opt.type)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      </>
    );
  };
  const updateBlock = (id, val, key='content') => { setBlocks(blocks.map(b => b.id === id ? { ...b, [key]: val } : b)); };

  // 给当前块（h1/正文/引用/注释）选中的文字插入行内超链接，写成 [文字](url)
  // 点击「🔗 链接」时先捕获当前选区，再弹出页内弹窗（而非浏览器 prompt）
  const insertLinkForBlock = (b) => {
    const el = typeof document !== 'undefined' ? document.getElementById('editfield-' + b.id) : null;
    const content = b.content || '';
    let start = content.length;
    let end = content.length;
    if (el && typeof el.selectionStart === 'number') {
      start = el.selectionStart;
      end = el.selectionEnd;
    }
    const selected = content.slice(start, end);
    setLinkModal({ blockId: b.id, start, end, label: selected || '', url: 'https://' });
  };

  // 弹窗「确认」：把 [文字](url) 写回对应块，并恢复光标位置
  const confirmLinkModal = () => {
    if (!linkModal) return;
    const { blockId, start, end } = linkModal;
    const label = (linkModal.label || '').trim();
    let url = (linkModal.url || '').trim();
    if (!label || !url || url === 'https://') return;
    const block = blocks.find(x => x.id === blockId);
    if (!block) { setLinkModal(null); return; }
    const content = block.content || '';
    const snippet = `[${label}](${url})`;
    const next = content.slice(0, start) + snippet + content.slice(end);
    updateBlock(blockId, next);
    setLinkModal(null);
    setTimeout(() => {
      const el2 = document.getElementById('editfield-' + blockId);
      if (el2) {
        const pos = start + snippet.length;
        el2.focus();
        try { el2.setSelectionRange(pos, pos); } catch (e) {}
      }
    }, 0);
  };
  const removeBlock = (id) => {
    setBlocks(prev => {
      const block = prev.find(b => b.id === id);
      if (block) revokeBlockPendingMedia(block);
      return prev.filter(b => b.id !== id);
    });
    setCompactSelectedIds(prev => prev.filter(x => x !== id));
  };

  const toggleCompactMultiSelect = () => {
    clearFileDrop();
    setCompactMultiSelect(prev => {
      if (prev) setCompactSelectedIds([]);
      return !prev;
    });
  };

  const toggleCompactBlockSelect = (id) => {
    setCompactSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const removeSelectedBlocks = () => {
    if (!compactSelectedIds.length) return;
    const idSet = new Set(compactSelectedIds);
    setBlocks(prev => {
      prev.forEach(b => {
        if (idSet.has(b.id)) revokeBlockPendingMedia(b);
      });
      return prev.filter(b => !idSet.has(b.id));
    });
    setCompactSelectedIds([]);
  };

  const exitCompactMultiSelect = () => {
    setCompactMultiSelect(false);
    setCompactSelectedIds([]);
  };

  // === 🖼️ 图片：本地预览，发布/保存时再上传图床 ===
  const assignPendingToBlock = (blockId, file) => {
    const previewUrl = URL.createObjectURL(file);
    setBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      if (b.pendingFile && b.content?.startsWith('blob:')) URL.revokeObjectURL(b.content);
      return {
        ...b,
        content: previewUrl,
        pendingFile: file,
        uploading: false,
        error: '',
      };
    }));
  };

  const insertImageBlocksAfter = (blockId, fileList) => {
    const files = Array.from(fileList || []).filter(f => /^(image|video)\//i.test(f.type));
    if (!files.length) return;
    const created = files.map(createPendingImageBlock);
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === blockId);
      const next = [...prev];
      next.splice(idx === -1 ? next.length : idx + 1, 0, ...created);
      return next;
    });
    scrollToBlock(created[created.length - 1].id);
  };

  const clearFileDrop = () => {
    setFileDropIndex(null);
    setFileDropPosition(null);
    setFileDropEmpty(false);
  };

  const insertImageBlocksAt = (insertIndex, fileList) => {
    const files = Array.from(fileList || []).filter(f => /^(image|video)\//i.test(f.type));
    if (!files.length) return;
    const created = files.map(createPendingImageBlock);
    setBlocks(prev => {
      const idx = Math.max(0, Math.min(insertIndex, prev.length));
      const next = [...prev];
      next.splice(idx, 0, ...created);
      return next;
    });
    setBlockViewMode('expanded');
    scrollToBlock(created[created.length - 1].id);
  };

  const handleFileDropAt = (e, insertIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const files = extractImageFilesFromDataTransfer(e.dataTransfer);
    if (!files.length) {
      clearFileDrop();
      return;
    }
    insertImageBlocksAt(insertIndex, files);
    clearFileDrop();
  };

  const handleEmptyFileDragOver = (e) => {
    if (compactMultiSelect) return;
    if (!isFileDragEvent(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setFileDropEmpty(true);
    setFileDropIndex(null);
    setFileDropPosition(null);
  };

  const handleExpandedFileDragOver = (e, index) => {
    if (!isFileDragEvent(e)) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setFileDropIndex(index);
    setFileDropPosition(position);
    setFileDropEmpty(false);
  };

  const handleExpandedFileDrop = (e, index) => {
    const files = extractImageFilesFromDataTransfer(e.dataTransfer);
    if (!files.length) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    const insertAt = position === 'after' ? index + 1 : index;
    handleFileDropAt(e, insertAt);
  };

  const resolveExpandedFileInsertFromY = (containerEl, clientY) => {
    const wraps = containerEl?.querySelectorAll?.('.block-card-wrap');
    if (!wraps?.length) return { index: 0, position: 'before' };
    for (let i = 0; i < wraps.length; i++) {
      const rect = wraps[i].getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (clientY < mid) {
        return { index: i, position: 'before' };
      }
    }
    return { index: wraps.length - 1, position: 'after' };
  };

  const applyExpandedFileDropHighlight = (containerEl, clientY) => {
    const { index, position } = resolveExpandedFileInsertFromY(containerEl, clientY);
    setFileDropIndex(index);
    setFileDropPosition(position);
    setFileDropEmpty(false);
  };

  const isBlockDropBefore = (index) =>
    (dropIndex === index && dropPosition === 'before') ||
    (fileDropIndex === index && fileDropPosition === 'before');

  const isBlockDropAfter = (index) =>
    (dropIndex === index && dropPosition === 'after') ||
    (fileDropIndex === index && fileDropPosition === 'after');

  const handleFilesForBlock = (blockId, fileList) => {
    const files = Array.from(fileList || []).filter(f => /^(image|video)\//i.test(f.type));
    if (!files.length) return;
    const [first, ...rest] = files;
    const restBlocks = rest.map(createPendingImageBlock);
    if (restBlocks.length) {
      setBlocks(prev => {
        const idx = prev.findIndex(b => b.id === blockId);
        const next = [...prev];
        next.splice(idx === -1 ? next.length : idx + 1, 0, ...restBlocks);
        return next;
      });
    }
    assignPendingToBlock(blockId, first);
    if (restBlocks.length) scrollToBlock(restBlocks[restBlocks.length - 1].id);
  };

  const extractImageFilesFromDataTransfer = (dt) => {
    if (!dt) return [];
    const out = [];
    if (dt.files?.length) {
      Array.from(dt.files).forEach(f => {
        if (/^(image|video)\//i.test(f.type)) out.push(f);
      });
    }
    if (dt.items?.length) {
      Array.from(dt.items).forEach(item => {
        if (item.kind === 'file' && /^(image|video)\//i.test(item.type)) {
          const f = item.getAsFile();
          if (f && !out.includes(f)) out.push(f);
        }
      });
    }
    return out;
  };

  const extractImageFilesFromClipboard = (clipboardData) => {
    if (!clipboardData?.items) return [];
    const out = [];
    for (let i = 0; i < clipboardData.items.length; i++) {
      const it = clipboardData.items[i];
      if (it.kind === 'file' && /^image\//i.test(it.type)) {
        const f = it.getAsFile();
        if (f) out.push(f);
      }
    }
    return out;
  };

  const appendAndUpload = (fileList) => {
    const files = Array.from(fileList || []).filter(f => /^image\//i.test(f.type));
    if (!files.length) return;
    const created = files.map(createPendingImageBlock);
    setBlocks(prev => [...prev, ...created]);
    scrollToBlock(created[created.length - 1].id);
  };

  const assignPendingToLock = (blockId, fileList) => {
    const files = Array.from(fileList || []).filter(f => /^image\//i.test(f.type));
    if (!files.length) return;
    setBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      const additions = files.map(file => ({ url: URL.createObjectURL(file), file }));
      return {
        ...b,
        error: '',
        images: [...(b.images || []), ...additions.map(a => a.url)],
        pendingImageFiles: [...(b.pendingImageFiles || []), ...additions],
      };
    }));
  };

  const removeLockImage = (blockId, idx) => {
    setBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      const url = (b.images || [])[idx];
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
      return {
        ...b,
        images: (b.images || []).filter((_, i) => i !== idx),
        pendingImageFiles: (b.pendingImageFiles || []).filter(p => p.url !== url),
      };
    }));
  };

  // 全局监听：Ctrl+V 粘贴截图（非内容块时追加到文末）
  useEffect(() => {
    const onPaste = (e) => {
      const imgs = extractImageFilesFromClipboard(e.clipboardData);
      if (!imgs.length) return;
      const active = document.activeElement;
      if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) return;
      e.preventDefault();
      appendAndUpload(imgs);
    };
    const prevent = (e) => { e.preventDefault(); };
    const onDragEnd = () => clearFileDrop();
    document.addEventListener('paste', onPaste);
    document.addEventListener('dragend', onDragEnd);
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('dragend', onDragEnd);
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  const moveBlock = (index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === blocks.length - 1) return;
    const newBlocks = [...blocks];
    const targetIndex = index + direction;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setBlocks(newBlocks);
    setMovingId(newBlocks[targetIndex].id);
    setTimeout(() => setMovingId(null), 600);
    scrollToBlock(newBlocks[targetIndex].id);
  };

  const moveToTop = (index) => {
    if (index === 0) return;
    const newBlocks = [...blocks];
    const [item] = newBlocks.splice(index, 1);
    newBlocks.unshift(item);
    setBlocks(newBlocks);
    setMovingId(item.id);
    setTimeout(() => setMovingId(null), 600);
    scrollToBlock(item.id);
  };

  const moveToBottom = (index) => {
    if (index === blocks.length - 1) return;
    const newBlocks = [...blocks];
    const [item] = newBlocks.splice(index, 1);
    newBlocks.push(item);
    setBlocks(newBlocks);
    setMovingId(item.id);
    setTimeout(() => setMovingId(null), 600);
    scrollToBlock(item.id);
  };

  const reorderBlocks = (fromIndex, insertAt) => {
    if (fromIndex < 0 || insertAt < 0 || insertAt > blocks.length) return;
    if (fromIndex === insertAt || fromIndex + 1 === insertAt) return;
    const newBlocks = [...blocks];
    const [item] = newBlocks.splice(fromIndex, 1);
    let target = insertAt;
    if (fromIndex < insertAt) target -= 1;
    newBlocks.splice(target, 0, item);
    setBlocks(newBlocks);
    setMovingId(item.id);
    setTimeout(() => setMovingId(null), 600);
  };

  const handleMinimapDragStart = (e, index) => {
    if (e.target.closest('.block-minimap-del')) {
      e.preventDefault();
      return;
    }
    clearFileDrop();
    minimapDragMovedRef.current = false;
    setDragIndex(index);
    setDropIndex(null);
    setDropPosition(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    const row = e.currentTarget;
    if (row) e.dataTransfer.setDragImage(row, row.offsetWidth / 2, row.offsetHeight / 2);
  };

  const handleMinimapDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    if (compactMultiSelect) return;
    if (isFileDragEvent(e) && dragIndex === null) {
      const rect = e.currentTarget.getBoundingClientRect();
      const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
      setFileDropIndex(index);
      setFileDropPosition(position);
      setFileDropEmpty(false);
      return;
    }
    if (dragIndex === null) return;
    minimapDragMovedRef.current = true;
    if (dragIndex === index) {
      setDropIndex(null);
      setDropPosition(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setDropIndex(index);
    setDropPosition(position);
  };

  const handleMinimapContainerDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (compactMultiSelect) return;
    if (isFileDragEvent(e) && dragIndex === null) {
      if (!blocks.length) {
        setFileDropEmpty(true);
        setFileDropIndex(null);
        setFileDropPosition(null);
        return;
      }
      setFileDropIndex(blocks.length - 1);
      setFileDropPosition('after');
      setFileDropEmpty(false);
      return;
    }
    if (dragIndex === null || !blocks.length) return;
    minimapDragMovedRef.current = true;
    setDropIndex(blocks.length - 1);
    setDropPosition('after');
  };

  const handleMinimapDrop = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    const fileList = extractImageFilesFromDataTransfer(e.dataTransfer);
    if (fileList.length && dragIndex === null) {
      const rect = e.currentTarget.getBoundingClientRect();
      const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
      const insertAt = position === 'after' ? index + 1 : index;
      handleFileDropAt(e, insertAt);
      return;
    }
    const from = dragIndex ?? parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (Number.isNaN(from)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    const insertAt = position === 'after' ? index + 1 : index;
    reorderBlocks(from, insertAt);
    setDragIndex(null);
    setDropIndex(null);
    setDropPosition(null);
  };

  const handleMinimapContainerDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const fileList = extractImageFilesFromDataTransfer(e.dataTransfer);
    if (fileList.length && dragIndex === null) {
      if (!blocks.length) {
        handleFileDropAt(e, 0);
      } else {
        handleFileDropAt(e, blocks.length);
      }
      return;
    }
    const from = dragIndex ?? parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (Number.isNaN(from)) return;
    reorderBlocks(from, blocks.length);
    setDragIndex(null);
    setDropIndex(null);
    setDropPosition(null);
  };

  const handleMinimapDragEnd = () => {
    setDragIndex(null);
    setDropIndex(null);
    setDropPosition(null);
    setTimeout(() => { minimapDragMovedRef.current = false; }, 0);
  };

  const handleMinimapClick = (blockId) => {
    if (minimapDragMovedRef.current) return;
    if (compactMultiSelect) {
      toggleCompactBlockSelect(blockId);
      return;
    }
    focusBlockInExpandedView(blockId);
  };

  const getBlockLabel = (type) => {
      if (type === 'h1') return 'H1 标题';
      if (type === 'lock') return '🔒 加密块';
      if (type === 'note') return '💬 注释块';
      if (type === 'image') return '🖼️ 图片块';
      if (type === 'quote') return '❝ 引用';
      if (type === 'link') return '🔗 超链文字';
      return '📄 内容块';
  };
  const linkModalValid = !!(linkModal && (linkModal.label || '').trim() && (linkModal.url || '').trim() && (linkModal.url || '').trim() !== 'https://');
  return (
    <div style={{marginTop:'30px'}}>
      {renderFloatingBlockTypeMenu()}
      {linkModal && (
        <div
          onMouseDown={(e) => { if (e.target === e.currentTarget) setLinkModal(null); }}
          style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(2px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
        >
          <div style={{ width:'100%', maxWidth:'420px', background:'#1f1f24', border:'1px solid #3a3a42', borderRadius:'14px', boxShadow:'0 12px 40px rgba(0,0,0,0.5)', padding:'22px' }}>
            <div style={{ fontSize:'16px', fontWeight:'bold', color:'#fff', marginBottom:'4px', display:'flex', alignItems:'center', gap:'6px' }}>🔗 添加超链接</div>
            <div style={{ fontSize:'12px', color:'#999', marginBottom:'18px' }}>将选中文字转为超链接；未选中时可手动填写显示文字。</div>
            <label style={{ display:'block', fontSize:'12px', color:'#bbb', marginBottom:'6px' }}>显示文字</label>
            <input
              className="glow-input"
              autoFocus
              value={linkModal.label}
              onChange={(e) => setLinkModal({ ...linkModal, label: e.target.value })}
              placeholder="例如：贩售机"
              style={{ marginBottom:'14px', fontSize:'14px' }}
            />
            <label style={{ display:'block', fontSize:'12px', color:'#bbb', marginBottom:'6px' }}>链接地址</label>
            <input
              className="glow-input"
              value={linkModal.url}
              onChange={(e) => setLinkModal({ ...linkModal, url: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter' && linkModalValid) confirmLinkModal(); if (e.key === 'Escape') setLinkModal(null); }}
              placeholder="https://..."
              style={{ marginBottom:'22px', fontSize:'14px', color:'#7cb3ff' }}
            />
            <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px' }}>
              <button
                onClick={() => setLinkModal(null)}
                style={{ height:'36px', padding:'0 16px', borderRadius:'8px', cursor:'pointer', border:'1px solid #444', background:'transparent', color:'#ccc', fontSize:'13px' }}
              >取消</button>
              <button
                onClick={confirmLinkModal}
                disabled={!linkModalValid}
                style={{ height:'36px', padding:'0 18px', borderRadius:'8px', cursor: linkModalValid ? 'pointer' : 'not-allowed', border:'none', background: linkModalValid ? '#2f7cf6' : '#33384a', color: linkModalValid ? '#fff' : '#7a7f8c', fontSize:'13px', fontWeight:'bold' }}
              >确认</button>
            </div>
          </div>
        </div>
      )}
      <div style={{display:'flex', gap:'15px', marginBottom:'25px', justifyContent:'center', flexWrap:'wrap'}}>
          <div className="neo-btn" onClick={()=>addBlock('h1')}>正文标题</div>
          <div className="neo-btn" onClick={()=>addBlock('text')}>📝 内容块</div>
          <div className="neo-btn" onClick={()=>addBlock('image')}>🖼️ 图片块</div>
          <div className="neo-btn" onClick={()=>addBlock('quote')}>❝ 引用</div>
          <div className="neo-btn" onClick={()=>addBlock('link')}>🔗 超链文字</div>
          <div className="neo-btn" onClick={()=>addBlock('note')}>💬 注释块</div>
          <div className="neo-btn" onClick={()=>addBlock('lock')}>🔒 加密块</div>
      </div>
      <div className="block-view-toolbar">
        <div className="block-view-toggle">
          <ViewModeButton
            label="放大视图"
            active={blockViewMode === 'expanded'}
            onClick={() => {
              exitCompactMultiSelect();
              setBlockViewMode('expanded');
            }}
          />
          <ViewModeButton
            label="缩小视图"
            active={blockViewMode === 'compact'}
            onClick={() => setBlockViewMode('compact')}
          />
        </div>
      </div>
      <BlockCoverHint />
      {blockViewMode === 'compact' ? (
        blocks.length === 0 ? (
          <div style={{ position: 'relative' }}>
            <div
              className={`block-empty-add${fileDropEmpty ? ' is-file-drop-target' : ''}`}
              onClick={(e) =>
                toggleAddMenu('empty-compact', e, (type) =>
                  addBlockAfter(-1, type, { stayCompact: true })
                )
              }
              onDragOver={handleEmptyFileDragOver}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) clearFileDrop();
              }}
              onDrop={(e) => {
                if (!isFileDragEvent(e)) return;
                handleFileDropAt(e, 0);
              }}
            >
              <span style={{ fontSize:'22px' }}>＋</span> 点击添加第一个内容块
            </div>
          </div>
        ) : (
          <div
            className={`block-minimap${fileDropEmpty ? ' is-file-drop-empty' : ''}`}
          >
            {renderCompactMinimapToolbar()}
            <div
              className="block-minimap-scroll"
              onDragOver={handleMinimapContainerDragOver}
              onDrop={handleMinimapContainerDrop}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) clearFileDrop();
              }}
            >
              <div className="block-minimap-list">
              {blocks.map((b, index) => (
                <React.Fragment key={b.id}>
                  <BlockMinimapItem
                    block={b}
                    index={index}
                    isCover={b.id === coverImageBlockId}
                    isDragging={dragIndex === index}
                    isDropBefore={!compactMultiSelect && isBlockDropBefore(index)}
                    isDropAfter={!compactMultiSelect && isBlockDropAfter(index)}
                    justMoved={movingId === b.id}
                    selectMode={compactMultiSelect}
                    isSelected={compactSelectedIds.includes(b.id)}
                    onDragStart={handleMinimapDragStart}
                    onDragOver={handleMinimapDragOver}
                    onDrop={handleMinimapDrop}
                    onDragEnd={handleMinimapDragEnd}
                    onClick={handleMinimapClick}
                    onRemove={removeBlock}
                  />
                  {renderMinimapAddBtn(`compact-after-${b.id}`, index)}
                </React.Fragment>
              ))}
            </div>
            </div>
          </div>
        )
      ) : (
      <div
        className="block-builder-expanded"
        onDragOver={(e) => {
          if (!isFileDragEvent(e) || !blocks.length) return;
          e.preventDefault();
          applyExpandedFileDropHighlight(e.currentTarget, e.clientY);
        }}
        onDrop={(e) => {
          const files = extractImageFilesFromDataTransfer(e.dataTransfer);
          if (!files.length || dragIndex !== null) return;
          e.preventDefault();
          e.stopPropagation();
          const { index, position } = resolveExpandedFileInsertFromY(e.currentTarget, e.clientY);
          const insertAt = position === 'after' ? index + 1 : index;
          handleFileDropAt(e, insertAt);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) clearFileDrop();
        }}
      >
        {blocks.map((b, index) => (
          <div
            key={b.id}
            className={`block-card-wrap${isBlockDropBefore(index) ? ' is-file-drop-before' : ''}${isBlockDropAfter(index) ? ' is-file-drop-after' : ''}`}
            onDragOver={(e) => handleExpandedFileDragOver(e, index)}
            onDrop={(e) => handleExpandedFileDrop(e, index)}
          >
          <div id={`block-${b.id}`} className={`block-card ${movingId === b.id ? 'just-moved' : ''}`}>
            <div className="block-left-ctrl">
               <div className="move-btn" onClick={() => moveToTop(index)} title="置顶"><Icons.Top /></div>
               <div className="move-btn" onClick={() => moveBlock(index, -1)}><Icons.ArrowUp /></div>
               <div className="move-btn" onClick={() => moveBlock(index, 1)}><Icons.ArrowDown /></div>
               <div className="move-btn" onClick={() => moveToBottom(index)} title="置底"><Icons.Bottom /></div>
            </div>
            <div className="block-label">{getBlockLabel(b.type)}</div>
            {b.type !== 'image' && <FormatBar b={b} onChange={(key, val) => updateBlock(b.id, val, key)} onInsertLink={['text','h1','quote','note'].includes(b.type) ? () => insertLinkForBlock(b) : undefined} />}
            {b.type === 'h1' && <input id={'editfield-' + b.id} className="glow-input" placeholder="输入大标题..." value={b.content} onChange={e=>updateBlock(b.id, e.target.value)} style={{fontSize:'20px', ...fmtStyle(b), fontWeight:'bold'}} />}
            {b.type === 'text' && (
              <textarea
                id={'editfield-' + b.id}
                className="glow-input"
                placeholder="在此处输入正文，如需超链文字请选中文字后点击上方“链接”按钮"
                value={b.content}
                onChange={e=>updateBlock(b.id, e.target.value)}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  const files = extractImageFilesFromDataTransfer(e.dataTransfer);
                  if (files.length) insertImageBlocksAfter(b.id, files);
                }}
                onPaste={e => {
                  const imgs = extractImageFilesFromClipboard(e.clipboardData);
                  if (!imgs.length) return;
                  e.preventDefault();
                  e.stopPropagation();
                  insertImageBlocksAfter(b.id, imgs);
                }}
                style={{minHeight:'200px', ...fmtStyle(b)}}
              />
            )}
            {b.type === 'note' && <textarea id={'editfield-' + b.id} className="glow-input" placeholder="输入注释内容..." value={b.content} onChange={e=>updateBlock(b.id, e.target.value)} style={{minHeight:'80px', fontFamily: 'monospace', fontSize: '13px', ...fmtStyle(b), color: (b.color && b.color !== 'default') ? colorCss(b.color) : '#ff6b6b'}} />}
            {b.type === 'quote' && <textarea id={'editfield-' + b.id} className="glow-input" placeholder="输入引用内容..." value={b.content} onChange={e=>updateBlock(b.id, e.target.value)} style={{minHeight:'90px', borderLeft:'4px solid greenyellow', paddingLeft:'12px', ...fmtStyle(b)}} />}
            {b.type === 'link' && (
               <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                 <input className="glow-input" placeholder="显示文字（如：点此查看官网）" value={b.content} onChange={e=>updateBlock(b.id, e.target.value)} style={{...fmtStyle(b)}} />
                 <input className="glow-input" placeholder="链接地址 https://..." value={b.url || ''} onChange={e=>updateBlock(b.id, e.target.value, 'url')} style={{fontSize:'13px', color:'#7cb3ff'}} />
               </div>
            )}
            {b.type === 'lock' && (
               <div style={{background:'#202024', padding:'10px', borderRadius:'8px'}}>
                 <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px'}}><span>🔑</span><input className="glow-input" placeholder="留空则无密码" value={b.pwd} onChange={e=>updateBlock(b.id, e.target.value, 'pwd')} style={{width:'150px'}} /></div>
                 <textarea className="glow-input" placeholder="输入被加密的文本内容（可选）..." value={b.content} onChange={e=>updateBlock(b.id, e.target.value)} style={{minHeight:'140px', border:'1px dashed #555'}} />
                 {(b.images && b.images.length > 0) && (
                    <div style={{display:'flex', flexWrap:'wrap', gap:'8px', marginTop:'12px'}}>
                      {b.images.map((url, idx) => (
                         <div key={idx} style={{position:'relative', width:'72px', height:'72px', borderRadius:'6px', overflow:'hidden', border: isLockImagePending(b, url) ? '1px dashed #f59e0b' : '1px solid #444'}}>
                           <img src={url} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="" />
                           {isLockImagePending(b, url) ? (
                             <span style={{position:'absolute', bottom:'2px', left:'2px', fontSize:'8px', color:'#fbbf24', background:'rgba(0,0,0,0.65)', padding:'1px 3px', borderRadius:'2px'}}>待发布</span>
                           ) : null}
                           <div onClick={()=>removeLockImage(b.id, idx)} style={{position:'absolute', top:'2px', right:'2px', background:'#ff4d4f', color:'#fff', width:'16px', height:'16px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', cursor:'pointer', lineHeight:1}}>×</div>
                         </div>
                      ))}
                    </div>
                 )}
                 <label className="img-drop" style={{minHeight:'72px', marginTop:'12px', padding:'12px'}}
                   onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                   onDrop={e => { e.preventDefault(); e.stopPropagation(); assignPendingToLock(b.id, e.dataTransfer.files); }}>
                   <input type="file" accept="image/*" multiple style={{display:'none'}} onChange={e => { assignPendingToLock(b.id, e.target.files); e.target.value=''; }} />
                   <div style={{pointerEvents:'none', fontSize:'13px'}}>🔒 拖拽 / 点击 添加加密图片（本地预览，保存后上传）</div>
                 </label>
                 {b.error && <div className="img-err">⚠ {b.error}</div>}
               </div>
            )}
            {b.type === 'image' && (
               <label
                 className={`img-drop ${b.error ? 'err' : ''}`}
                 onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                 onDrop={e => { e.preventDefault(); e.stopPropagation(); handleFilesForBlock(b.id, e.dataTransfer.files); }}
               >
                 <input type="file" accept="image/*,video/*" multiple style={{display:'none'}} onChange={e => { handleFilesForBlock(b.id, e.target.files); e.target.value=''; }} />
                 {b.uploading ? (
                    <div className="img-uploading"><div className="img-spin"></div><div>上传中...</div></div>
                 ) : b.content ? (
                    <>
                      {isVideoImageContent(b.content)
                        ? <video src={b.content} controls className="img-preview" />
                        : <img src={b.content} className="img-preview" alt="" />}
                      {b.id === coverImageBlockId && !isVideoImageContent(b.content) ? (
                        <div style={{
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: '#000',
                          background: 'greenyellow',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          marginTop: '8px',
                          textAlign: 'center',
                        }}>
                          当前图片将被作为封面
                        </div>
                      ) : null}
                      {isImageBlockPending(b) ? (
                        <div style={{fontSize:'11px', color:'#f59e0b', marginTop:'6px', fontWeight:'bold'}}>待发布</div>
                      ) : (
                        <div className="img-url">{b.content}</div>
                      )}
                      <div style={{fontSize:'11px', color:'greenyellow', marginTop:'6px'}}>点击 / 拖拽 以更换</div>
                    </>
                 ) : (
                    <div style={{pointerEvents:'none'}}>
                      <div style={{fontSize:'34px', marginBottom:'8px'}}>🖼️</div>
                      <div style={{fontWeight:'bold', color:'#ccc'}}>拖拽图片到此 · 点击选择 · 直接粘贴</div>
                      <div style={{fontSize:'12px', marginTop:'4px'}}>本地预览，保存/发布时自动压缩并上传</div>
                    </div>
                 )}
                 {b.error && <div className="img-err">⚠ {b.error}</div>}
               </label>
            )}
            <div className={`block-add-btn-wrap${addMenuFor === `expanded-after-${b.id}` ? ' is-open' : ''}`}>
              <div
                className={`block-add-btn ${addMenuFor === `expanded-after-${b.id}` ? 'open' : ''}`}
                title="在此块下方添加新块"
                onClick={(e) =>
                  toggleAddMenu(`expanded-after-${b.id}`, e, (type) =>
                    addBlockAfter(index, type)
                  )
                }
              ><span style={{ fontSize: '16px', lineHeight: 1 }}>＋</span> 添加块</div>
            </div>
            </div>
            <div className="block-del" onClick={()=>removeBlock(b.id)} title="删除此块"><Icons.Trash /></div>
          </div>
        ))}
        {blocks.length === 0 && (
          <div style={{ position:'relative' }}>
            <div
              className={`block-empty-add${fileDropEmpty ? ' is-file-drop-target' : ''}`}
              onClick={(e) =>
                toggleAddMenu('empty-expanded', e, (type) => addBlockAfter(-1, type))
              }
              onDragOver={handleEmptyFileDragOver}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) clearFileDrop();
              }}
              onDrop={(e) => {
                if (!isFileDragEvent(e)) return;
                handleFileDropAt(e, 0);
              }}
            >
              <span style={{ fontSize:'22px' }}>＋</span> 点击添加第一个内容块
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

const NOTION_COLOR_CSS = {
  default: '#e1e1e3', gray: '#9b9b9b', brown: '#b08968', orange: '#e9954e', yellow: '#d4b53d',
  green: '#4dab6d', blue: '#5b9bd5', purple: '#9a6dd7', pink: '#e255a1', red: '#ff6b6b',
};
const richStyle = (ann) => {
  const s = {};
  if (!ann) return s;
  if (ann.bold) s.fontWeight = 'bold';
  if (ann.italic) s.fontStyle = 'italic';
  const deco = [];
  if (ann.strikethrough) deco.push('line-through');
  if (ann.underline) deco.push('underline');
  if (deco.length) s.textDecoration = deco.join(' ');
  if (ann.color && ann.color !== 'default') {
    if (ann.color.endsWith('_background')) s.background = NOTION_COLOR_CSS[ann.color.replace('_background', '')] || 'transparent';
    else s.color = NOTION_COLOR_CSS[ann.color] || ann.color;
  }
  return s;
};
const RichText = ({ rich }) => (
  <>{(rich || []).map((r, j) => {
    const content = r.plain_text || r.text?.content || '';
    const url = r.text?.link?.url || r.href;
    const ann = r.annotations || {};
    const style = { ...richStyle(ann), ...(ann.code ? { fontFamily: 'monospace', background: '#333', padding: '1px 5px', borderRadius: '4px' } : {}) };
    if (url) return <a key={j} href={url} target="_blank" rel="noreferrer" style={{ ...style, color: style.color || '#7cb3ff', textDecoration: 'underline' }}>{content}</a>;
    return <span key={j} style={style}>{content}</span>;
  })}</>
);

const NotionView = ({ blocks }) => {
  if (!blocks || !Array.isArray(blocks)) return <div style={{padding:20, color:'#666'}}>暂无预览内容</div>;
  return (
    <div style={{color:'#e1e1e3', fontSize:'15px', lineHeight:'1.8'}}>
      {blocks.map((b, i) => {
        const type = b.type; const data = b[type]; const text = data?.rich_text?.[0]?.plain_text || "";
        if(type==='heading_1') return <h1 key={i} style={{fontSize:'1.8em', borderBottom:'1px solid #333', paddingBottom:'8px', margin:'24px 0 12px'}}><RichText rich={data?.rich_text} /></h1>;
        if(type==='heading_2') return <h2 key={i} style={{fontSize:'1.4em', margin:'20px 0 10px'}}><RichText rich={data?.rich_text} /></h2>;
        if(type==='heading_3') return <h3 key={i} style={{fontSize:'1.2em', margin:'18px 0 8px'}}><RichText rich={data?.rich_text} /></h3>;
        if(type==='paragraph') return <p key={i} style={{margin:'10px 0', minHeight:'1em'}}><RichText rich={data?.rich_text} /></p>;
        if(type==='quote') return <blockquote key={i} style={{margin:'16px 0', padding:'8px 0 8px 16px', borderLeft:'4px solid greenyellow', color:'#cfcfcf', fontStyle:'italic'}}><RichText rich={data?.rich_text} /></blockquote>;
        if(type==='divider') return <hr key={i} style={{border:'none', borderTop:'1px solid #444', margin:'24px 0'}} />;
        if(type==='image') { const url = data?.file?.url || data?.external?.url; if (!url) return null; const isVideo = url.match(/\.(mp4|mov|webm|ogg)(\?|$)/i); if(isVideo) return <div key={i} style={{display:'flex', justifyContent:'center', margin:'20px 0'}}><div style={{width:'100%', maxHeight:'500px', borderRadius:'8px', background:'#000', display:'flex', justifyContent:'center'}}><video src={url} controls preload="metadata" style={{maxWidth:'100%', maxHeight:'100%'}} /></div></div>; return <div key={i} style={{display:'flex', justifyContent:'center', margin:'20px 0'}}><div style={{width: '100%', height: '500px', background: '#000', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}><img src={url} style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'}} alt="" /></div></div>; }
        if(type==='video' || type==='embed') { let url = data?.file?.url || data?.external?.url || data?.url; if(!url) return null; const isY = url.includes('youtube')||url.includes('youtu.be'); if(isY){if(url.includes('watch?v='))url=url.replace('watch?v=','embed/');if(url.includes('youtu.be/'))url=url.replace('youtu.be/','www.youtube.com/embed/');} return <div key={i} style={{display:'flex', justifyContent:'center', margin:'20px 0'}}>{(type==='embed'||isY)?<iframe src={url} style={{width:'100%',maxWidth:'800px',height:'450px',border:'none',borderRadius:'8px',background:'#000'}} allowFullScreen />:<video src={url} controls style={{width:'100%',maxHeight:'500px',borderRadius:'8px',background:'#000'}}/>}</div>; }
        if(type==='callout') return <div key={i} style={{background:'#2d2d30', padding:'20px', borderRadius:'12px', border:'1px solid #3e3e42', display:'flex', gap:'15px', margin:'20px 0'}}><div style={{fontSize:'1.4em'}}>{b.callout.icon?.emoji || '🔒'}</div><div style={{flex:1}}><div style={{fontWeight:'bold', color:'greenyellow', marginBottom:'4px'}}>{text}</div><div style={{fontSize:'12px', opacity:0.5}}>[ 加密内容已受保护 ]</div></div></div>;
        return null;
      })}
    </div>
  );
};

// ==========================================
// 5. 主组件
// ==========================================
const ANNOUNCEMENT_SLUG = 'announcement';
const SIMPLE_CUSTOM_PAGE_SLUGS = new Set(['announcement', 'about', 'download']);

function isSimpleCustomPage(slug) {
  return SIMPLE_CUSTOM_PAGE_SLUGS.has(String(slug || '').trim());
}

export default function AdminDashboard() {
    // 🟢 1. 所有的 Hook (useState) 必须严格排在函数最顶部
const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [isThemeLoading, setIsThemeLoading] = useState(false);
  const [themeSwitchProgress, setThemeSwitchProgress] = useState(null);
  const [activeThemeLocal, setActiveThemeLocal] = useState(null);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const [view, setView] = useState('list');
  const [viewMode, setViewMode] = useState('covered');
  const [options, setOptions] = useState({ categories: [], tags: [] });
  const [activeTab, setActiveTab] = useState('Post');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: 'Post', date: '', download: '', download_size: '', download_count: '' });
  const [currentId, setCurrentId] = useState(null);
  const [siteTitle, setSiteTitle] = useState('PROBLOG');
  const [navIdx, setNavIdx] = useState(1); 
  const [expandedStep, setExpandedStep] = useState(1);
  const [editorBlocks, setEditorBlocks] = useState([]);
  const editorBlocksRef = useRef(editorBlocks);
  editorBlocksRef.current = editorBlocks;
  const editingSlugRef = useRef(null);
  const [blogRefreshBusy, setBlogRefreshBusy] = useState(false);
  const [blogRefreshCooldownSec, setBlogRefreshCooldownSec] = useState(0);
  const blogRefreshCooldownUntilRef = useRef(0);
  const [fullRedeployBusy, setFullRedeployBusy] = useState(false);
  const [fullRedeployCooldownSec, setFullRedeployCooldownSec] = useState(0);
  const fullRedeployCooldownUntilRef = useRef(0);
  const [fullRedeployConfigured, setFullRedeployConfigured] = useState(true);
  const [crawlerIngestBusy, setCrawlerIngestBusy] = useState(false);
  const [crawlerIngestConfigured, setCrawlerIngestConfigured] = useState(false);
  const [crawlerIngestSummary, setCrawlerIngestSummary] = useState(null);
  const [crawlerIngestList, setCrawlerIngestList] = useState([]);
  const [crawlerIngestModalOpen, setCrawlerIngestModalOpen] = useState(false);
  const [crawlerIngestModalClosing, setCrawlerIngestModalClosing] = useState(false);
  const crawlerIngestModalTimerRef = useRef(null);
  const adminToastTimerRef = useRef(null);
  const [adminToast, setAdminToast] = useState({ message: '', visible: false, closing: false });
  const [smartParseText, setSmartParseText] = useState('');
  const [smartParsePreview, setSmartParsePreview] = useState(null);
  const [smartParseUsedTemplate, setSmartParseUsedTemplate] = useState('');
  const [smartParseTemplates, setSmartParseTemplates] = useState([]);
  const [smartParseTemplateId, setSmartParseTemplateId] = useState(SMART_PARSE_TEMPLATE_AUTO);
  const [tagDraft, setTagDraft] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [catDraft, setCatDraft] = useState('');
  const [showCatInput, setShowCatInput] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedPublishDate, setSelectedPublishDate] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [galleryAd, setGalleryAd] = useState({ id: null, url: '', promoText: '', cover: '' });
  const [galleryAdLoading, setGalleryAdLoading] = useState(false);
  const [galleryAdSaving, setGalleryAdSaving] = useState(false);
  const [galleryAdCoverUploading, setGalleryAdCoverUploading] = useState(false);
  const [friendDraft, setFriendDraft] = useState({ name: '', url: '', avatar: '' });
  const [friendDraftUploading, setFriendDraftUploading] = useState(false);
  const [friendBtnStatus, setFriendBtnStatus] = useState({}); // { [id|'draft']: 'saving' | 'done' }
  const [coverUploading, setCoverUploading] = useState(false);
  const [galleryItems, setGalleryItems] = useState([]);
  const [galleryDirty, setGalleryDirty] = useState(false);
  const [savePhase, setSavePhase] = useState(''); // '' | 'media' | 'post' | 'gallery'
  const [saveProgress, setSaveProgress] = useState(null); // { done, total }
  const [publishQueue, setPublishQueue] = useState([]); // 后台发布队列
  const queueRunningRef = useRef(false);
  const cancelledJobsRef = useRef(new Set()); // 已请求取消的任务 id
  const [galleryStorageStats, setGalleryStorageStats] = useState(null);
  const [galleryStorageLoading, setGalleryStorageLoading] = useState(false);
  const [galleryStorageError, setGalleryStorageError] = useState('');
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [coverModalClosing, setCoverModalClosing] = useState(false);
  const coverModalTimerRef = useRef(null);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [publishConfirmClosing, setPublishConfirmClosing] = useState(false);
  const publishConfirmTimerRef = useRef(null);
  const [fullRedeployConfirmOpen, setFullRedeployConfirmOpen] = useState(false);
  const [fullRedeployConfirmClosing, setFullRedeployConfirmClosing] = useState(false);
  const fullRedeployConfirmTimerRef = useRef(null);
  const [themeDoneModalOpen, setThemeDoneModalOpen] = useState(false);
  const [themeDoneModalClosing, setThemeDoneModalClosing] = useState(false);
  const [themeDoneModalNote, setThemeDoneModalNote] = useState('');
  const themeDoneModalTimerRef = useRef(null);

  const resetGalleryItems = () => {
    setGalleryItems((prev) => {
      revokePendingGalleryItems(prev);
      return [];
    });
    setGalleryDirty(false);
  };

  const leaveEditView = () => {
    resetGalleryItems();
    setEditorBlocks((prev) => {
      revokePendingEditorMedia(prev);
      return [];
    });
    setView('list');
  };

  // 🟢 2. 增强表单校验逻辑：安全处理空值
  const isFormValid = (form?.type === 'Widget')
    ? (form?.title?.trim() || '') !== ''
    : isSimpleCustomPage(form?.slug) || form?.type === 'Page'
      ? ((form?.title?.trim() || '') !== '' && (form?.date || '') !== '')
      : ((form?.title?.trim() || '') !== '' &&
         (form?.category?.trim() || '') !== '' &&
         (form?.date || '') !== '');

  // 找出第一个未完成的必填项，用于灰色按钮被点击时的提示
  const getMissingFieldMsg = () => {
    if ((form?.title?.trim() || '') === '') return form?.type === 'Widget' ? '请填写组件标题' : '请填写文章标题';
    if (form?.type === 'Widget') return '';
    if (isSimpleCustomPage(form?.slug) || form?.type === 'Page') {
      if ((form?.date || '') === '') return '请选择发布日期';
      return '';
    }
    if ((form?.category?.trim() || '') === '') return '请填写文章分类';
    if ((form?.date || '') === '') return '请选择发布日期';
    return '';
  };
  // 统一的"尝试保存"：无效时弹出具体缺失项提示，有效时才真正保存
  const closeCoverModal = () => {
    if (coverModalTimerRef.current) clearTimeout(coverModalTimerRef.current);
    setCoverModalClosing(true);
    coverModalTimerRef.current = setTimeout(() => {
      setCoverModalOpen(false);
      setCoverModalClosing(false);
    }, 240);
  };

  const closePublishConfirmModal = () => {
    if (publishConfirmTimerRef.current) clearTimeout(publishConfirmTimerRef.current);
    setPublishConfirmClosing(true);
    publishConfirmTimerRef.current = setTimeout(() => {
      setPublishConfirmOpen(false);
      setPublishConfirmClosing(false);
    }, 240);
  };

  const closeFullRedeployConfirmModal = () => {
    if (fullRedeployConfirmTimerRef.current) clearTimeout(fullRedeployConfirmTimerRef.current);
    setFullRedeployConfirmClosing(true);
    fullRedeployConfirmTimerRef.current = setTimeout(() => {
      setFullRedeployConfirmOpen(false);
      setFullRedeployConfirmClosing(false);
    }, 240);
  };

  const proceedPublishAfterConfirm = () => {
    closePublishConfirmModal();
    setTimeout(() => {
      const isPostArticle =
        form?.type !== 'Widget' &&
        form?.type !== 'Page' &&
        !isSimpleCustomPage(form?.slug) &&
        (form?.type === 'Post' || !form?.type);
      if (isPostArticle && !hasEditorImageBlock(editorBlocksRef.current || [])) {
        setCoverModalClosing(false);
        setCoverModalOpen(true);
        return;
      }
      enqueuePublish();
    }, 260);
  };

  const openThemeDoneModal = (extraNote = '') => {
    if (themeDoneModalTimerRef.current) clearTimeout(themeDoneModalTimerRef.current);
    setThemeDoneModalNote(extraNote);
    setThemeDoneModalClosing(false);
    setThemeDoneModalOpen(true);
  };

  const closeThemeDoneModal = () => {
    if (themeDoneModalTimerRef.current) clearTimeout(themeDoneModalTimerRef.current);
    setThemeDoneModalClosing(true);
    themeDoneModalTimerRef.current = setTimeout(() => {
      setThemeDoneModalOpen(false);
      setThemeDoneModalClosing(false);
      setThemeDoneModalNote('');
    }, 240);
  };

  const showAdminToast = (message) => {
    if (adminToastTimerRef.current) clearTimeout(adminToastTimerRef.current);
    setAdminToast({ message, visible: true, closing: false });
    adminToastTimerRef.current = setTimeout(() => {
      setAdminToast((prev) => ({ ...prev, closing: true }));
      adminToastTimerRef.current = setTimeout(() => {
        setAdminToast({ message: '', visible: false, closing: false });
      }, 280);
    }, 2800);
  };

  // 刷新后提示：上次会话中可能有未完成的发布任务
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PUBLISH_QUEUE_META_KEY);
      if (!raw) return;
      const meta = JSON.parse(raw);
      if (!Array.isArray(meta)) return;
      const unfinished = meta.filter(
        (j) => j.status === 'queued' || j.status === 'running'
      );
      if (unfinished.length > 0) {
        showAdminToast(
          `检测到 ${unfinished.length} 个发布任务可能未完成，请核对内容列表后决定是否重新发布`
        );
      }
    } catch {
      // ignore
    } finally {
      sessionStorage.removeItem(PUBLISH_QUEUE_META_KEY);
    }
  }, []);

  useEffect(() => {
    if (!publishQueue.length) {
      sessionStorage.removeItem(PUBLISH_QUEUE_META_KEY);
      return;
    }
    try {
      sessionStorage.setItem(
        PUBLISH_QUEUE_META_KEY,
        JSON.stringify(
          publishQueue.map((j) => ({
            id: j.id,
            title: j.title,
            status: j.status,
            phase: j.phase,
            startedAt: j.startedAt,
          }))
        )
      );
    } catch {
      // ignore quota / private mode
    }
  }, [publishQueue]);

  const attemptSave = () => {
    const msg = getMissingFieldMsg();
    if (msg) { alert('⚠️ ' + msg); return; }
    setPublishConfirmClosing(false);
    setPublishConfirmOpen(true);
  };

  const confirmCoverAndSave = () => {
    closeCoverModal();
    setTimeout(() => enqueuePublish(), 260);
  };

  // 🟢 3. 主题状态计算
  const themeConfig = posts?.find(p => p.slug === 'theme-config');
  const currentActiveTheme = activeThemeLocal || themeConfig?.excerpt?.trim() || 'v1';
  const currentTheme = ADMIN_THEMES.find(t => t.id === currentActiveTheme) || ADMIN_THEMES[0];

  async function loadGalleryStorage() {
    setGalleryStorageLoading(true);
    setGalleryStorageError('');
    try {
      const r = await fetch('/api/admin/gallery-storage');
      const d = await r.json();
      if (!d.success) throw new Error(d.error || '读取图库容量失败');
      setGalleryStorageStats(d);
    } catch (e) {
      setGalleryStorageStats(null);
      setGalleryStorageError(e.message);
    } finally {
      setGalleryStorageLoading(false);
    }
  }

  // 🟢 4. 数据拉取函数 (提前定义)
  async function fetchPosts({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try { 
       const r = await fetch('/api/admin/posts');
       if (!r.ok) throw new Error(`API Error: ${r.status}`);
       const d = await r.json(); 
       if (d.success) { 
         setPosts(d.posts || []); 
         setOptions(d.options || { categories: [], tags: [] });
         const remote = d.posts.find(p => p.slug === 'theme-config')?.excerpt?.trim();
         if (remote) setActiveThemeLocal(remote);
       }
       const rConf = await fetch('/api/admin/config');
       if (rConf.ok) {
           const dConf = await rConf.json(); 
           if (dConf.success && dConf.siteInfo) setSiteTitle(dConf.siteInfo.title);
       }
    } catch(e) { console.warn(e); } 
    finally { if (!silent) setLoading(false); } 
  }

  // 🟢 5. 处理函数
  const handleThemeChange = async (version) => {
    if (isThemeLoading || loading || version === currentActiveTheme) return;
    const configItem = themeConfig || posts.find(p => p.slug === 'theme-config');
    if (!configItem) { alert("未找到配置页"); return; }
    const previousTheme = currentActiveTheme;
    setThemeMenuOpen(false);
    setIsThemeLoading(true);
    setThemeSwitchProgress({
      step: 1,
      totalSteps: 3,
      label: '正在保存主题设置…',
      done: 0,
      total: 0,
      hint: `切换至 ${ADMIN_THEMES.find(t => t.id === version)?.label || version}`,
    });
    setActiveThemeLocal(version);
    try {
      const payload = { id: configItem.id, title: configItem.title || '主题配置', slug: 'theme-config', excerpt: version };
      const res = await fetch('/api/admin/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('保存主题配置失败');

      let confirmed = false;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        await new Promise((r) => setTimeout(r, attempt === 0 ? 800 : 1200));
        try {
          const checkRes = await fetch('/api/admin/posts');
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            const remote = checkData.posts?.find((p) => p.slug === 'theme-config')?.excerpt?.trim();
            if (remote === version) {
              confirmed = true;
              break;
            }
          }
        } catch {
          /* 下一轮重试 */
        }
      }
      if (!confirmed) {
        console.warn('[handleThemeChange] theme-config read-back not confirmed, revalidating anyway');
      }

      const refreshResult = await runThemeRevalidation(setThemeSwitchProgress, version);
      await fetchPosts();

      openThemeDoneModal(
        refreshResult.failed > 0
          ? `另有 ${refreshResult.failed} 个列表页未能及时更新，不影响已保存的主题设置；内页仍会在访问后或 1 小时内自动切换。`
          : ''
      );
    } catch (err) {
      setActiveThemeLocal(previousTheme);
      alert('切换失败：' + (err.message || '未知错误'));
    } finally {
      setIsThemeLoading(false);
      setThemeSwitchProgress(null);
    }
  };

  // 🟢 6. useEffect 挂载
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    setSmartParseTemplates(getAllSmartParseTemplates());
  }, [mounted]);
  useEffect(() => {
    const tick = () => {
      const left = Math.ceil((blogRefreshCooldownUntilRef.current - Date.now()) / 1000);
      setBlogRefreshCooldownSec(left > 0 ? left : 0);
      const fullLeft = Math.ceil(
        (fullRedeployCooldownUntilRef.current - Date.now()) / 1000
      );
      setFullRedeployCooldownSec(fullLeft > 0 ? fullLeft : 0);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, []);
  const fetchFullRedeployStatus = async () => {
    try {
      const res = await fetch('/api/admin/full-redeploy');
      const data = await res.json();
      if (!res.ok || !data.success) return;
      setFullRedeployConfigured(Boolean(data.configured));
      if (data.retryAfterSec > 0) {
        fullRedeployCooldownUntilRef.current =
          Date.now() + data.retryAfterSec * 1000;
        setFullRedeployCooldownSec(data.retryAfterSec);
      }
    } catch (e) {
      console.warn('读取全量刷新状态失败', e);
    }
  };

  const fetchCrawlerIngestStatus = async () => {
    try {
      const res = await fetch('/api/admin/crawler-ingest');
      const data = await res.json();
      if (!res.ok || !data.success) return;
      setCrawlerIngestConfigured(Boolean(data.configured));
      if (data.summary) setCrawlerIngestSummary(data.summary);
      if (data.items) setCrawlerIngestList(data.items);
      return data;
    } catch (e) {
      console.warn('读取爬虫队列状态失败', e);
      return null;
    }
  };

  const closeCrawlerIngestModal = () => {
    if (crawlerIngestModalTimerRef.current) clearTimeout(crawlerIngestModalTimerRef.current);
    setCrawlerIngestModalClosing(true);
    crawlerIngestModalTimerRef.current = setTimeout(() => {
      setCrawlerIngestModalOpen(false);
      setCrawlerIngestModalClosing(false);
    }, 220);
  };

  const openCrawlerIngestModal = async () => {
    if (crawlerIngestModalTimerRef.current) clearTimeout(crawlerIngestModalTimerRef.current);
    setCrawlerIngestModalClosing(false);
    setCrawlerIngestModalOpen(true);
    await fetchCrawlerIngestStatus();
  };
  useEffect(() => {
    if (!mounted) return;
    fetchFullRedeployStatus();
    fetchCrawlerIngestStatus();
  }, [mounted]);
  useEffect(() => { if (mounted) fetchPosts(); }, [mounted]);
  useEffect(() => {
    if (mounted && view === 'list') loadGalleryStorage();
  }, [mounted, view]);

  useEffect(() => {
    if (view === 'edit') {
      window.history.pushState({ view: 'edit' }, '', '?mode=edit');
    } else {
      if (window.location.search.includes('mode=edit')) window.history.back();
    }
    const onPopState = () => { if (view === 'edit') leaveEditView(); };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [view]);

  // 双模状态机解析
  const parseContentToBlocks = (md) => {
    if(!md) return [];
    const lines = md.split(/\r?\n/);
    const res = [];
    let buffer = []; let isLocking = false; let lockPwd = ''; let lockBuffer = [];  
    let lockMode = null;

    const stripMd = (str) => { const match = str.match(/(?:!|)?\[.*?\]\((.*?)\)/); return match ? match[1] : str; };
    const flushBuffer = () => {
      if (buffer.length > 0) {
        // 正文行保留原样（含行内 [文字](url)），不要洗成纯 URL
        const joined = buffer.join('\n').trim();
        if (joined) {
           if (joined.startsWith('`') && joined.endsWith('`') && joined.length > 1) {
              res.push({ id: Date.now() + Math.random(), type: 'note', content: joined.slice(1, -1) });
           } else {
              res.push({ id: Date.now() + Math.random(), type: 'text', content: joined });
           }
        }
        buffer = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!isLocking && trimmed.startsWith(':::lock')) {
        flushBuffer(); isLocking = true; lockMode = 'explicit';
        lockPwd = trimmed.replace(':::lock', '').replace(/[>*\s🔒]/g, '').trim();
        continue;
      }

      if (!isLocking && trimmed.match(/^>\s*🔒\s*(\*\*)?LOCK:(.*?)(\*\*)?/)) {
        flushBuffer(); isLocking = true; lockMode = 'implicit';
        const match = trimmed.match(/LOCK:(.*?)(\*|$)/);
        lockPwd = match ? match[1].trim() : '';
        continue;
      }
      
      if (isLocking) {
        if (lockMode === 'explicit' && trimmed === ':::') {
           isLocking = false;
           const joinedLock = lockBuffer.map(stripMd).join('\n').trim();
           const lb = splitLockBody(joinedLock);
           res.push({ id: Date.now() + Math.random(), type: 'lock', pwd: lockPwd, content: lb.text, images: lb.images });
           lockBuffer = [];
           continue;
        }
        if (lockMode === 'implicit' && !trimmed.startsWith('>') && trimmed !== '') {
           isLocking = false;
           const joinedLock = lockBuffer.join('\n').trim();
           const lb = splitLockBody(joinedLock);
           res.push({ id: Date.now() + Math.random(), type: 'lock', pwd: lockPwd, content: lb.text, images: lb.images });
           lockBuffer = [];
           i--;
           continue;
        }

        let contentLine = line;
        if (lockMode === 'implicit') {
            if (contentLine.startsWith('> ')) contentLine = contentLine.substring(2);
            else if (contentLine.startsWith('>')) contentLine = contentLine.substring(1);
        }
        if (contentLine.trim() === '---') continue;
        if (contentLine.trim() === '') continue;
        lockBuffer.push(contentLine);
        continue;
      }

      if (trimmed.startsWith('# ')) { flushBuffer(); res.push({ id: Date.now() + Math.random(), type: 'h1', content: trimmed.replace('# ', '') }); continue; }
      const imgUrl = extractImageUrl(trimmed);
      if (imgUrl) { flushBuffer(); res.push({ id: Date.now() + Math.random(), type: 'image', content: imgUrl }); continue; }
      if (!trimmed) { flushBuffer(); continue; }
      buffer.push(line);
    }
    
    if (isLocking) {
        const joinedLock = lockMode === 'implicit' ? lockBuffer.join('\n').trim() : lockBuffer.map(stripMd).join('\n').trim();
        const lb = splitLockBody(joinedLock);
        res.push({ id: Date.now() + Math.random(), type: 'lock', pwd: lockPwd, content: lb.text, images: lb.images });
    } else {
        flushBuffer();
    }
    return res;
  };

  // 🟢 带自动重试的取数：规避 dev 模式 API 路由「首次访问即时编译」导致的首点失败
  const fetchPostById = async (id) => {
    let lastErr;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch('/api/admin/post?id=' + id);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json();
        if (!d.success) throw new Error(d.error || '加载失败');
        return d.post;
      } catch (e) {
        lastErr = e;
        if (attempt === 0) await new Promise(res => setTimeout(res, 400));
      }
    }
    throw lastErr;
  };

  const handlePreview = async (p) => {
    setLoading(true);
    try {
      const post = await fetchPostById(p.id);
      if (post && post.rawBlocks) setPreviewData(post);
    } catch (e) {
      alert('加载预览失败：' + e.message);
    } finally { setLoading(false); }
  };

  const handleEdit = async (p) => {
    setLoading(true);
    resetGalleryItems();
    setEditorBlocks((prev) => {
      revokePendingEditorMedia(prev);
      return [];
    });
    try {
      const post = await fetchPostById(p.id);
      if (post) {
        setForm(post);
        resetSmartParseState();
        // 优先使用后端按 Notion 原生块重建的结构化块(保留格式)，否则回退到 Markdown 解析
        const eb = (Array.isArray(post.editorBlocks) && post.editorBlocks.length)
          ? post.editorBlocks.map((b, i) => ({ ...b, id: Date.now() + i + Math.random() }))
          : parseContentToBlocks(post.content);
        setEditorBlocks(eb);
        setCurrentId(p.id);
        editingSlugRef.current = post.slug || null;
        setView('edit');
        setExpandedStep(1);
      }
    } catch (e) {
      alert('加载文章失败：' + e.message);
    } finally { setLoading(false); }
  };
  
  // 🟢 修复：新建时默认 Published
  const handleCreate = () => {
    resetGalleryItems();
    setEditorBlocks((prev) => {
      revokePendingEditorMedia(prev);
      return [];
    });
    setForm({ title: '', slug: generateAdminPostSlug(), excerpt:'', content:'', category:'', tags:'', cover:'', status:'Published', type: 'Post', date: new Date().toISOString().split('T')[0], download: '', download_size: '', download_count: '' });
    resetSmartParseState();
    setCurrentId(null);
    editingSlugRef.current = null;
    setView('edit');
    setExpandedStep(1);
  };

  // === 🔗 友链管理 ===
  const uploadAvatarFile = (file) => uploadImageToLsky(file);
  const loadFriends = async () => {
    setFriendsLoading(true);
    try {
      const r = await fetch('/api/admin/friends');
      const d = await r.json();
      if (d.success) setFriends(d.friends || []);
      else alert('加载友链失败：' + (d.error || '未知错误'));
    } catch (e) { alert('加载友链失败：' + e.message); }
    finally { setFriendsLoading(false); }
  };
  const openFriends = () => { setView('friends'); loadFriends(); };

  // === 📢 Gallery 广告位 ===
  const loadGalleryAd = async () => {
    setGalleryAdLoading(true);
    try {
      const r = await fetch('/api/admin/gallery-ad');
      const d = await r.json();
      if (d.success) setGalleryAd(d.ad || { id: null, url: '', promoText: '', cover: '' });
      else alert('加载广告位失败：' + (d.error || '未知错误'));
    } catch (e) { alert('加载广告位失败：' + e.message); }
    finally { setGalleryAdLoading(false); }
  };
  const openGalleryAd = () => { setView('gallery-ad'); loadGalleryAd(); };
  const saveGalleryAd = async () => {
    const url = (galleryAd.url || '').trim();
    if (!url.startsWith('http')) { alert('请填写有效的广告链接（需以 http 开头）'); return; }
    setGalleryAdSaving(true);
    try {
      const r = await fetch('/api/admin/gallery-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: galleryAd.id,
          url,
          promoText: (galleryAd.promoText || '').trim(),
          cover: (galleryAd.cover || '').trim(),
        }),
      });
      const d = await r.json();
      if (d.success) {
        alert('✓ 广告位已保存');
        await loadGalleryAd();
        await fetchPosts();
        void runBatchedRevalidation({
          listScope: 'gallery-ad',
          freshTheme: true,
          contentChange: true,
          progressLabels: {
            listing: '正在统计文章页…',
            running: '正在更新广告位…',
            doneOk: '广告位已同步到全部文章页',
            donePartial: '部分页面需稍后自动更新',
            hintPartial: '个页面未能更新，可重新保存广告位',
            hintOk: '全部文章页与下载页已更新',
          },
        }).then((rev) => {
          if (rev.failed > 0) showAdminToast(`部分页面更新失败（${rev.failed}/${rev.total}）`);
        }).catch((e) => console.warn('Gallery 广告增量刷新失败', e));
      }
      else alert('保存失败：' + (d.error || '未知错误'));
    } catch (e) { alert('保存失败：' + e.message); }
    finally { setGalleryAdSaving(false); }
  };
  const clearGalleryAd = async () => {
    if (!confirm('确定清空广告位配置？前台将不再显示底部横幅。')) return;
    setGalleryAdSaving(true);
    try {
      const r = await fetch('/api/admin/gallery-ad', { method: 'DELETE' });
      const d = await r.json();
      if (d.success) {
        setGalleryAd({ id: null, url: '', promoText: '', cover: '' });
        alert('✓ 广告位已清空');
        await fetchPosts();
        void runBatchedRevalidation({
          listScope: 'gallery-ad',
          freshTheme: true,
          contentChange: true,
        }).catch((e) => console.warn('Gallery 广告增量刷新失败', e));
      } else alert('清空失败：' + (d.error || '未知错误'));
    } catch (e) { alert('清空失败：' + e.message); }
    finally { setGalleryAdSaving(false); }
  };
  const uploadGalleryAdCover = async (file) => {
    if (!file) return;
    setGalleryAdCoverUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (d.success && d.url) setGalleryAd(prev => ({ ...prev, cover: d.url }));
      else alert('封面上传失败：' + (d.error || '未知错误'));
    } catch (e) { alert('封面上传失败：' + e.message); }
    finally { setGalleryAdCoverUploading(false); }
  };
  const updateFriendField = (id, key, val) => setFriends(prev => prev.map(f => f.id === id ? { ...f, [key]: val } : f));
  const clearFriendBtn = (key) => setFriendBtnStatus(prev => { const n = { ...prev }; delete n[key]; return n; });
  const saveFriend = async (friend) => {
    if (!friend.name || !friend.name.trim()) return alert('请填写站点名称');
    if (!friend.url || !friend.url.trim()) return alert('请填写站点链接');
    const key = friend.id || 'draft';
    setFriendBtnStatus(prev => ({ ...prev, [key]: 'saving' }));
    try {
      const r = await fetch('/api/admin/friends', { method: 'POST', body: JSON.stringify({ id: friend.id, name: friend.name, url: friend.url, avatar: friend.avatar }) });
      const d = await r.json();
      if (!d.success) { alert('保存失败：' + (d.error || '未知错误')); clearFriendBtn(key); return; }
      if (!friend.id) setFriendDraft({ name: '', url: '', avatar: '' });
      await loadFriends();
      await triggerContentRevalidation({ scope: 'friends' });
      setFriendBtnStatus(prev => ({ ...prev, [key]: 'done' }));
      setTimeout(() => clearFriendBtn(key), 1600);
    } catch (e) { alert('保存失败：' + e.message); clearFriendBtn(key); }
  };
  const deleteFriend = async (id) => {
    if (!confirm('确定删除该友链？')) return;
    setFriendsLoading(true);
    try {
      const r = await fetch('/api/admin/friends?id=' + id, { method: 'DELETE' });
      const d = await r.json();
      if (!d.success) alert('删除失败：' + (d.error || '未知错误'));
      await loadFriends();
      await triggerContentRevalidation({ scope: 'friends' });
    } catch (e) { alert('删除失败：' + e.message); }
    finally { setFriendsLoading(false); }
  };
  const uploadFriendAvatar = async (id, file) => {
    if (!file) return;
    updateFriendField(id, '_uploading', true);
    try { const url = await uploadAvatarFile(file); updateFriendField(id, 'avatar', url); }
    catch (e) { alert('头像上传失败：' + e.message); }
    finally { updateFriendField(id, '_uploading', false); }
  };
  const uploadDraftAvatar = async (file) => {
    if (!file) return;
    setFriendDraftUploading(true);
    try { const url = await uploadAvatarFile(file); setFriendDraft(prev => ({ ...prev, avatar: url })); }
    catch (e) { alert('头像上传失败：' + e.message); }
    finally { setFriendDraftUploading(false); }
  };
  // 组件头像(cover)上传
  const uploadCover = async (file) => {
    if (!file) return;
    setCoverUploading(true);
    try { const url = await uploadAvatarFile(file); setForm(prev => ({ ...prev, cover: url })); }
    catch (e) { alert('头像上传失败：' + e.message); }
    finally { setCoverUploading(false); }
  };
  
  // ============ 后台发布队列 ============
  // 更新队列中某条任务的状态/进度
  const updateJob = useCallback((id, patch) => {
    setPublishQueue((q) =>
      q.map((job) => {
        if (job.id !== id) return job;
        const merged = { ...job, ...patch };
        if (merged.status === 'running') {
          merged.lastActivityAt = Date.now();
          if (!patch.stalled) merged.stalled = false;
        }
        return merged;
      })
    );
  }, []);

  const dismissJob = useCallback((id) => {
    setPublishQueue((q) => q.filter((job) => job.id !== id));
  }, []);

  const retryJob = useCallback((id) => {
    cancelledJobsRef.current.delete(id);
    setPublishQueue((q) =>
      q.map((job) =>
        job.id === id
          ? {
              ...job,
              status: 'queued',
              phase: '',
              progress: null,
              error: '',
              stalled: false,
              startedAt: null,
              lastActivityAt: null,
            }
          : job
      )
    );
  }, []);

  // 取消/移除某条任务：排队中或进行中则标记取消（进行中为协作式取消，到下个阶段停止）
  const removeJob = useCallback((job) => {
    if (job.status === 'queued' || job.status === 'running') {
      cancelledJobsRef.current.add(job.id);
      if (job.status === 'running') {
        queueRunningRef.current = false;
        setTimeout(() => setPublishQueue((q) => [...q]), 0);
      }
    }
    setPublishQueue((q) => q.filter((j) => j.id !== job.id));
  }, []);

  const forceCompleteJob = useCallback((id) => {
    cancelledJobsRef.current.delete(id);
    queueRunningRef.current = false;
    updateJob(id, {
      status: 'success',
      phase: '',
      progress: null,
      error: '',
      stalled: false,
    });
    fetchPosts({ silent: true });
    loadGalleryStorage();
    showAdminToast('已标记完成，将继续处理队列中其余任务');
    setTimeout(() => dismissJob(id), 4000);
    setTimeout(() => setPublishQueue((q) => [...q]), 0);
  }, [updateJob, dismissJob]);

  // 实际执行一条发布任务：完全基于任务快照 payload，不依赖当前编辑器状态
  const runPublishJob = useCallback(async (job) => {
    const { payload } = job;
    const isCancelled = () => cancelledJobsRef.current.has(job.id);
    const bailIfCancelled = () => {
      if (!isCancelled()) return false;
      cancelledJobsRef.current.delete(job.id);
      return true;
    };

    updateJob(job.id, {
      status: 'running',
      phase: '',
      progress: null,
      error: '',
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      stalled: false,
    });

    try {
      // 🧩 组件(Widget)：仅更新 标题/摘要/头像(cover)
      if (payload.isWidget) {
        updateJob(job.id, { phase: 'post' });
        const res = await fetchWithTimeout('/api/admin/post', {
          method: 'POST',
          body: JSON.stringify({
            id: payload.currentId,
            title: payload.form.title,
            excerpt: payload.form.excerpt,
            cover: payload.form.cover || '',
            slug: payload.form.slug,
            type: 'Widget',
            status: payload.form.status || 'Published',
          }),
        });
        const d = await res.json();
        if (bailIfCancelled()) return;
        if (!d.success) throw new Error(d.error || '保存失败');
        updateJob(job.id, { status: 'success', phase: '', progress: null });
        fetchPosts({ silent: true });
        void triggerShellBlogRefresh().then((rev) =>
          showRevalidateFeedback(rev, showAdminToast)
        );
        setTimeout(() => dismissJob(job.id), 6000);
        return;
      }

      let blocksForSave = payload.blocks;

      // 1) 上传正文图片
      if (payload.pendingMediaCount > 0) {
        updateJob(job.id, {
          phase: 'media',
          progress: { done: 0, total: payload.pendingMediaCount },
        });
        blocksForSave = await flushEditorBlocksMedia(blocksForSave, {
          onProgress: ({ done, total }) =>
            updateJob(job.id, { progress: { done, total } }),
        });
      }
      if (bailIfCancelled()) return;

      // 2) 写入 Notion 文章
      updateJob(job.id, { phase: 'post', progress: null });
      const fullContent = blocksToMarkdown(blocksForSave);
      const blocksData = serializeBlocksForSave(blocksForSave);
      const autoCover = resolveAutoCover(blocksForSave);
      const coverForSave =
        autoCover ||
        (typeof payload.form.cover === 'string' ? payload.form.cover.trim() : '');

      const res = await fetchWithTimeout('/api/admin/post', {
        method: 'POST',
        body: JSON.stringify({
          ...payload.form,
          cover: coverForSave,
          status: 'Published',
          content: fullContent,
          blocksData,
          id: payload.currentId,
          type: payload.form.type || 'Post',
          previousSlug: payload.previousSlug || '',
        }),
      });
      const d = await res.json();
      if (bailIfCancelled()) return;
      if (!d.success) throw new Error(d.error || '保存失败');

      const newId = d.id || payload.currentId;
      const saveSlug = payload.form.slug || '';
      const saveType = payload.form.type || 'Post';
      const saveScope = resolveSaveRevalidateScope(saveType, saveSlug);
      const previousSlug = payload.previousSlug || '';

      // 3) 上传图库
      if (payload.willSyncGallery) {
        if (bailIfCancelled()) return;
        updateJob(job.id, {
          phase: 'gallery',
          progress:
            payload.pendingGalleryCount > 0
              ? { done: 0, total: payload.pendingGalleryCount }
              : null,
        });
        await flushGalleryUploads({
          slug: payload.form.slug,
          postTitle: payload.form.title,
          postNotionId: newId,
          items: payload.galleryItems,
          onProgress: ({ done, total }) =>
            updateJob(job.id, { progress: { done, total } }),
        });
      }
      if (bailIfCancelled()) return;

      updateJob(job.id, { phase: 'refresh', progress: null });

      try {
        if (saveScope === 'post') {
          void triggerShellBlogRefresh({ contentChange: true }).then((rev) =>
            showRevalidateFeedback(rev, showAdminToast)
          );
          void triggerContentRevalidation({
            scope: 'post',
            slug: saveSlug,
            category: payload.form.category || '',
            tags: payload.form.tags || '',
            previousSlug,
          }).catch((e) => console.warn('文章内页增量刷新失败', e));
        } else if (saveScope === 'page' && saveSlug === 'download') {
          void runBatchedRevalidation({
            listScope: 'download-instructions',
            freshTheme: true,
            contentChange: true,
            progressLabels: {
              listing: '正在统计文章下载页…',
              running: '正在更新下载说明与文章下载页…',
              doneOk: '下载说明已同步到全部文章下载页',
              donePartial: '部分文章下载页需稍后自动更新',
              hintPartial: '个页面未能更新，可重新保存下载说明或点右上角刷新',
              hintOk: '全部文章下载页已更新',
            },
          }).catch((e) => console.warn('下载说明增量刷新失败', e));
        } else if (saveScope === 'page') {
          const rev = await triggerContentRevalidation({
            scope: 'page',
            slug: saveSlug,
            previousSlug,
            warmPaths: true,
            contentChange: true,
          });
          showRevalidateFeedback(rev, showAdminToast);
        } else if (saveScope === 'gallery-ad') {
          void runBatchedRevalidation({
            listScope: 'gallery-ad',
            freshTheme: true,
            contentChange: true,
          }).catch((e) => console.warn('Gallery 广告增量刷新失败', e));
        } else if (saveScope === 'widget') {
          const rev = await triggerContentRevalidation({
            scope: 'widget',
            warmPaths: true,
            contentChange: true,
          });
          showRevalidateFeedback(rev, showAdminToast);
        }
      } catch (revErr) {
        console.warn('发布增量刷新失败', revErr);
        showAdminToast('内容已保存，但前台刷新未完成，请点右上角「刷新BLOG」');
      }

      updateJob(job.id, { status: 'success', phase: '', progress: null });
      // 后台静默刷新列表，完成的文章无感知出现在内容列表中
      fetchPosts({ silent: true });
      loadGalleryStorage();

      // 成功项稍后自动移除，保持队列整洁
      setTimeout(() => dismissJob(job.id), 6000);
    } catch (e) {
      if (bailIfCancelled()) return;
      updateJob(job.id, {
        status: 'error',
        phase: '',
        progress: null,
        error: e?.message || '发布失败',
      });
    }
  }, [updateJob, dismissJob]);

  // 检测长时间无进度心跳的任务（图库大批量上传可持续数分钟，不误判）
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setPublishQueue((q) => {
        let changed = false;
        const next = q.map((job) => {
          if (job.status !== 'running' || !job.lastActivityAt || job.stalled) return job;
          const idleMs = now - job.lastActivityAt;
          if (idleMs > resolvePublishIdleStallMs(job)) {
            changed = true;
            return { ...job, stalled: true };
          }
          return job;
        });
        return changed ? next : q;
      });
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // 队列调度：一次只跑一条，跑完自动取下一条
  useEffect(() => {
    if (queueRunningRef.current) return;
    const next = publishQueue.find((job) => job.status === 'queued');
    if (!next) return;
    queueRunningRef.current = true;
    runPublishJob(next).finally(() => {
      queueRunningRef.current = false;
      // 触发一次状态更新，让 effect 重新评估下一条
      setPublishQueue((q) => [...q]);
    });
  }, [publishQueue, runPublishJob]);

  // 点击发布：抓取当前编辑器快照入队，立刻清空编辑器以便继续下一篇
  const enqueuePublish = () => {
    if (isThemeLoading) return alert('请等待当前任务完成...');

    const isWidget = form.type === 'Widget';
    const blocks = editorBlocksRef.current || [];
    const pendingMediaCount = isWidget ? 0 : countPendingEditorMedia(blocks);
    const pendingGalleryCount = isWidget ? 0 : countPendingGalleryItems(galleryItems);
    const willSyncGallery =
      !isWidget &&
      !isSimpleCustomPage(form?.slug) &&
      (galleryDirty || pendingGalleryCount > 0);

    const job = {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: (form.title || '').trim() || '未命名',
      status: 'queued',
      phase: '',
      progress: null,
      error: '',
      payload: {
        isWidget,
        // 注意：保留对象/File 引用，不做 JSON 克隆（pending 图片含 File，无法序列化）
        form: { ...form },
        blocks: isWidget ? [] : blocks.slice(),
        galleryItems: isWidget ? [] : galleryItems.slice(),
        currentId,
        previousSlug: editingSlugRef.current || '',
        willSyncGallery,
        pendingMediaCount,
        pendingGalleryCount,
      },
    };

    setPublishQueue((q) => [...q, job]);
    showAdminToast(`已加入发布队列：${job.title}`);

    // 清空编辑器，准备下一篇。
    // 不撤销 blob 预览 URL：后台任务仍持有这些 File/预览引用，撤销会影响兜底读取。
    setGalleryItems([]);
    setGalleryDirty(false);
    setEditorBlocks([]);
    editingSlugRef.current = null;
    setCurrentId(null);
    setForm({ title: '', slug: '', excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: 'Post', date: '', download: '', download_size: '', download_count: '' });
    resetSmartParseState();
    setView('list');
  };

  const updateSiteTitle = async () => {
    const newTitle = prompt("请输入新的网站标题:", siteTitle);
    if (newTitle && newTitle !== siteTitle) {
        setLoading(true);
        await fetch('/api/admin/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle }),
        });
        setSiteTitle(newTitle);
        const rev = await triggerShellBlogRefresh();
        showRevalidateFeedback(rev, showAdminToast);
        setLoading(false);
    }
  };

  const handleManualDeploy = () => {
    if (isThemeLoading || blogRefreshBusy) return;
    const now = Date.now();
    if (now < blogRefreshCooldownUntilRef.current) {
      const sec = Math.ceil((blogRefreshCooldownUntilRef.current - now) / 1000);
      showAdminToast(`刷新过于频繁，请 ${sec} 秒后再试`);
      return;
    }
    setBlogRefreshBusy(true);
    showAdminToast('正在刷新 BLOG…');
    triggerShellBlogRefresh({ manualShell: true })
      .then((rev) => {
        if (rev.status === 429) {
          const retrySec = rev.data?.retryAfterSec || 60;
          blogRefreshCooldownUntilRef.current = Date.now() + retrySec * 1000;
          setBlogRefreshCooldownSec(retrySec);
          showAdminToast(rev.data?.error || `刷新过于频繁，请 ${retrySec} 秒后再试`);
          return;
        }
        blogRefreshCooldownUntilRef.current = Date.now() + BLOG_SHELL_REFRESH_COOLDOWN_MS;
        setBlogRefreshCooldownSec(Math.ceil(BLOG_SHELL_REFRESH_COOLDOWN_MS / 1000));
        showRevalidateFeedback(rev, showAdminToast);
      })
      .catch((e) => console.warn('BLOG 刷新失败', e))
      .finally(() => { setBlogRefreshBusy(false); });
  };

  const handleCrawlerIngestRetry = async (queueId) => {
    if (crawlerIngestBusy || !queueId) return;
    setCrawlerIngestBusy(true);
    try {
      const res = await fetch('/api/admin/crawler-ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', id: queueId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || '重试失败');
      if (data.summary) setCrawlerIngestSummary(data.summary);
      if (data.items) setCrawlerIngestList(data.items);
      showAdminToast('已重新加入待入库队列');
    } catch (e) {
      showAdminToast(e?.message || '重试失败');
    } finally {
      setCrawlerIngestBusy(false);
    }
  };

  const handleCrawlerIngestRun = async () => {
    if (isThemeLoading || crawlerIngestBusy) return;
    if (!crawlerIngestConfigured) {
      showAdminToast('爬虫入库未配置（Supabase + BLOG_SITE_ID）');
      return;
    }
    setCrawlerIngestBusy(true);
    try {
      const statusRes = await fetch('/api/admin/crawler-ingest');
      const statusData = await statusRes.json();
      if (!statusRes.ok || !statusData.success) {
        throw new Error(statusData.error || '无法读取爬虫队列');
      }
      if (statusData.summary) setCrawlerIngestSummary(statusData.summary);
      const pendingCount = statusData.summary?.pending ?? 0;
      if (pendingCount <= 0) {
        showAdminToast('队列中暂无待入库内容（pending 为 0）');
        return;
      }
      showAdminToast(`正在入库 ${pendingCount} 篇待处理内容…`);
      const res = await fetchWithTimeout(
        '/api/admin/crawler-ingest',
        { method: 'POST' },
        CRAWLER_INGEST_FETCH_TIMEOUT_MS
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '爬虫入库失败');
      }
      if (data.summary) setCrawlerIngestSummary(data.summary);
      if (data.items) setCrawlerIngestList(data.items);
      await fetchPosts();
      const failedItems = (data.items || []).filter((it) => it.status === 'failed');
      if (data.failed > 0 && failedItems.length > 0) {
        const firstErr = failedItems[0]?.error || '';
        showAdminToast(
          `入库完成：成功 ${data.succeeded}，失败 ${data.failed}。${firstErr ? ` 例：${firstErr}` : ''}`
        );
      } else if (data.processed === 0) {
        showAdminToast('没有待入库内容');
      } else {
        showAdminToast(
          `爬虫入库完成：成功 ${data.succeeded} 篇，已更新前台页面`
        );
      }
    } catch (e) {
      showAdminToast(e?.message || '爬虫入库失败');
    } finally {
      setCrawlerIngestBusy(false);
    }
  };

  const executeFullRedeploy = async () => {
    setFullRedeployBusy(true);
    try {
      const res = await fetch('/api/admin/full-redeploy', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '触发失败');
      }
      if (data.retryAfterSec > 0) {
        fullRedeployCooldownUntilRef.current =
          Date.now() + data.retryAfterSec * 1000;
        setFullRedeployCooldownSec(data.retryAfterSec);
      } else {
        fullRedeployCooldownUntilRef.current =
          Date.now() + 24 * 60 * 60 * 1000;
        setFullRedeployCooldownSec(24 * 60 * 60);
      }
      closeFullRedeployConfirmModal();
      showAdminToast(
        data.message ||
          '全量更新已触发，请等待3分钟后刷新BLOG，如存在问题请联系管理'
      );
    } catch (e) {
      showAdminToast(e?.message || '全量刷新失败');
    } finally {
      setFullRedeployBusy(false);
    }
  };

  const proceedFullRedeployAfterConfirm = () => {
    if (fullRedeployBusy) return;
    executeFullRedeploy();
  };

  const openFullRedeployConfirm = () => {
    if (isThemeLoading || fullRedeployBusy || fullRedeployCooldownSec > 0) return;
    if (!fullRedeployConfigured) {
      showAdminToast('全量刷新未配置，请联系管理');
      return;
    }
    if (fullRedeployConfirmTimerRef.current) clearTimeout(fullRedeployConfirmTimerRef.current);
    setFullRedeployConfirmClosing(false);
    setFullRedeployConfirmOpen(true);
  };

  const deleteTagOption = (e, tagToDelete) => {
    e.stopPropagation();
    const currentTags = form.tags ? form.tags.split(',').filter(t => t.trim()) : [];
    const newTags = currentTags.filter(t => t.trim() !== tagToDelete).join(',');
    setForm({ ...form, tags: newTags });
  };

  const handleNavClick = (idx) => { setNavIdx(idx); const modes = ['folder','covered','text','gallery']; setViewMode(modes[idx]); setSelectedFolder(null); };

  const editingSimplePage = isSimpleCustomPage(form?.slug);

  const sortAdminPosts = (list) => {
    return [...list].sort((a, b) => {
      const ap = a.pinned ? 1 : 0;
      const bp = b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
  };

  const handleTogglePin = async (e, p) => {
    e.stopPropagation();
    const nextPinned = !p.pinned;
    setLoading(true);
    try {
      const r = await fetch('/api/admin/post?id=' + p.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: nextPinned }),
      });
      const d = await r.json();
      if (!d.success) alert(d.error || '置顶操作失败');
      else {
        await fetchPosts();
        const rev = await triggerShellBlogRefresh();
        showRevalidateFeedback(rev, showAdminToast);
      }
    } catch (err) {
      alert(err.message || '置顶操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (p) => {
    if (!confirm('彻底删除？')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/post?id=' + p.id, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '删除失败');
      }
      await fetchPosts();
      const rev = await triggerShellBlogRefresh();
      showRevalidateFeedback(rev, showAdminToast);
    } catch (e) {
      alert('删除失败：' + (e.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const renderCardDrawer = (p, { showPin = false } = {}) => (
    <div className="drawer">
      {showPin ? (
        <div
          onClick={(e) => handleTogglePin(e, p)}
          style={{ background: p.pinned ? '#fbbf24' : '#5c5c62', color: p.pinned ? '#000' : '#fff' }}
          className="dr-btn"
          title={p.pinned ? '取消置顶' : '置顶（博客首页首条显示）'}
        >
          <Icons.Pin />
        </div>
      ) : null}
      <div onClick={(e) => { e.stopPropagation(); handleEdit(p); }} style={{ background: 'greenyellow', color: '#000' }} className="dr-btn"><Icons.Edit /></div>
      <div onClick={(e) => { e.stopPropagation(); handleDeletePost(p); }} style={{ background: '#ff4d4f' }} className="dr-btn"><Icons.Trash /></div>
    </div>
  );

  const getFilteredPosts = () => {
     let list = posts;
     if (activeTab === 'Page') {
        list = list.filter(p =>
          (p.type === 'Page' && ['about', 'download'].includes(p.slug)) ||
          (p.type === 'Post' && p.slug === ANNOUNCEMENT_SLUG)
        );
        const ann = list.find(p => p.slug === ANNOUNCEMENT_SLUG);
        const rest = list.filter(p => p.slug !== ANNOUNCEMENT_SLUG);
        list = ann ? [ann, ...rest] : rest;
     }
     else if (activeTab === 'Widget') {
        list = [];
     }
     else {
        list = list.filter(p => p.type === 'Post' && p.status !== 'Draft' && p.slug !== ANNOUNCEMENT_SLUG);
        list = sortAdminPosts(list);
     }

     if (searchQuery) list = list.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
     if (selectedFolder) list = list.filter(p => p.category === selectedFolder);
     if (selectedPublishDate && activeTab === 'Post') {
       list = list.filter(p => toDateKey(p.date) === selectedPublishDate);
     }
     return list;
  };
  const filtered = getFilteredPosts();
  const siteInfoWidget = posts.find(p => p.type === 'Widget' && p.slug !== 'gallery-ad');
  const pinnedDividerIndex = activeTab === 'Post' ? filtered.findIndex(p => !p.pinned) : -1;
  const publishDatesSet = (() => {
    const s = new Set();
    posts
      .filter(p => p.type === 'Post' && p.status !== 'Draft' && p.slug !== ANNOUNCEMENT_SLUG)
      .forEach(p => {
        const k = toDateKey(p.date);
        if (k) s.add(k);
      });
    return s;
  })();
  const displayTags = (options.tags && options.tags.length > 0) ? (showAllTags ? options.tags : options.tags.slice(0, 12)) : [];
  const selectedTags = (form.tags || '').split(',').map(t => t.trim()).filter(Boolean);
  const addTag = (name) => { const n = (name || '').trim(); if (!n || selectedTags.includes(n)) return; setForm({ ...form, tags: [...selectedTags, n].join(',') }); };
  const removeTag = (name) => { setForm({ ...form, tags: selectedTags.filter(t => t !== name).join(',') }); };
  const setCategory = (name) => {
    const n = (name || '').trim();
    if (!n) return;
    setForm({ ...form, category: n });
    setOptions(o => ({
      ...o,
      categories: o.categories.includes(n) ? o.categories : [...o.categories, n].sort((a, b) => a.localeCompare(b, 'zh-CN')),
    }));
  };
  const addCategoryFromDraft = () => {
    const n = catDraft.trim();
    if (n) setCategory(n);
    setCatDraft('');
    setShowCatInput(false);
  };

  const resetSmartParseState = () => {
    setSmartParseText('');
    setSmartParsePreview(null);
    setSmartParseUsedTemplate('');
  };

  const refreshSmartParseTemplates = () => {
    const all = getAllSmartParseTemplates();
    setSmartParseTemplates(all);
    return all;
  };

  const runSmartParse = (textOverride) => {
    const input = (textOverride ?? smartParseText).trim();
    if (!input) return;

    const templates = smartParseTemplates.length
      ? smartParseTemplates
      : refreshSmartParseTemplates();
    const outcome = parseSmartPostBySelection(
      input,
      templates,
      smartParseTemplateId
    );
    const parsed = outcome.result;

    setSmartParsePreview(parsed);
    setSmartParseUsedTemplate(outcome.templateName);

    const formUpdates = {};
    if (parsed.title) formUpdates.title = parsed.title;
    if (parsed.downloadSize) formUpdates.download_size = parsed.downloadSize;
    if (parsed.downloadCount) formUpdates.download_count = parsed.downloadCount;

    if (parsed.category) {
      const cat =
        findExistingOption(parsed.category, options.categories) ||
        parsed.category.trim();
      formUpdates.category = cat;
      if (cat && !options.categories.includes(cat)) {
        setOptions((o) => ({
          ...o,
          categories: [...o.categories, cat].sort((a, b) =>
            a.localeCompare(b, 'zh-CN')
          ),
        }));
      }
    }

    if (parsed.tags?.length) {
      const current = (form.tags || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const merged = [...current];
      const newTagNames = [];

      parsed.tags.forEach((tag) => {
        const raw = (tag || '').trim();
        if (!raw) return;
        const existing = findExistingOption(raw, options.tags);
        const name = existing || raw;
        const dup = merged.some((m) => m.toLowerCase() === name.toLowerCase());
        if (!dup) merged.push(name);
        if (!existing && !options.tags.some((o) => o.toLowerCase() === name.toLowerCase())) {
          newTagNames.push(name);
        }
      });

      formUpdates.tags = merged.join(',');
      if (newTagNames.length) {
        setOptions((o) => ({
          ...o,
          tags: [...o.tags, ...newTagNames].sort((a, b) =>
            a.localeCompare(b, 'zh-CN')
          ),
        }));
      }
    }

    if (Object.keys(formUpdates).length > 0) {
      setForm((f) => ({ ...f, ...formUpdates }));
    }
  };

  const handleSmartParsePaste = (e) => {
    const pasted = e.clipboardData.getData('text').trim();
    if (!pasted) return;
    e.preventDefault();
    setSmartParseText(pasted);
    runSmartParse(pasted);
  };

  const saveSmartParseAsTemplate = () => {
    const example = smartParseText.trim();
    if (!example) {
      showAdminToast('请先粘贴或输入示例标题串');
      return;
    }
    const defaultName =
      example.length > 36 ? `${example.slice(0, 36)}…` : example;
    const name = prompt('模板名称（便于在下拉框中识别）', defaultName);
    if (!name || !name.trim()) return;
    const rules = inferRulesFromExample(example);
    const tpl = addSmartParseTemplate(name.trim(), example, rules);
    refreshSmartParseTemplates();
    setSmartParseTemplateId(tpl.id);
    showAdminToast(`已保存模板「${tpl.name}」`);
  };

  const removeSelectedSmartParseTemplate = () => {
    if (
      smartParseTemplateId === SMART_PARSE_TEMPLATE_AUTO ||
      smartParseTemplateId === BUILTIN_STANDARD_TEMPLATE_ID
    ) {
      showAdminToast('内置模板与自动匹配不可删除');
      return;
    }
    const tpl = smartParseTemplates.find((t) => t.id === smartParseTemplateId);
    if (!tpl) return;
    if (!confirm(`确定删除模板「${tpl.name}」？`)) return;
    deleteSmartParseTemplate(smartParseTemplateId);
    refreshSmartParseTemplates();
    setSmartParseTemplateId(SMART_PARSE_TEMPLATE_AUTO);
    showAdminToast('模板已删除');
  };
  const handlePublishDateSelect = (key) => {
    if (key == null) {
      setSelectedPublishDate(null);
      return;
    }
    setSelectedPublishDate(prev => (prev === key ? null : key));
    setDatePickerOpen(false);
  };

  if (!mounted) return null;

  const adminLocked = isThemeLoading;

  return (
    <div style={{ minHeight: '100vh', background: '#303030', padding: '40px 20px' }}>
      <Head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="shortcut icon" href="/favicon-32x32.png" />
      </Head>
      <GlobalStyle />
      {loading && !isThemeLoading && <FullScreenLoader phase={savePhase} progress={saveProgress} />}
      {isThemeLoading && <FullScreenLoader phase="theme" progress={themeSwitchProgress} />}
      <CoverMissingModal
        open={coverModalOpen}
        closing={coverModalClosing}
        onConfirm={confirmCoverAndSave}
        onCancel={closeCoverModal}
      />
      <PublishConfirmModal
        open={publishConfirmOpen}
        closing={publishConfirmClosing}
        isUpdate={!!currentId}
        onConfirm={proceedPublishAfterConfirm}
        onCancel={closePublishConfirmModal}
      />
      <ThemeSwitchDoneModal
        open={themeDoneModalOpen}
        closing={themeDoneModalClosing}
        extraNote={themeDoneModalNote}
        onClose={closeThemeDoneModal}
      />
      <FullRedeployConfirmModal
        open={fullRedeployConfirmOpen}
        closing={fullRedeployConfirmClosing}
        busy={fullRedeployBusy}
        onConfirm={proceedFullRedeployAfterConfirm}
        onCancel={closeFullRedeployConfirmModal}
      />
      <CrawlerIngestModal
        open={crawlerIngestModalOpen}
        closing={crawlerIngestModalClosing}
        busy={crawlerIngestBusy}
        configured={crawlerIngestConfigured}
        summary={crawlerIngestSummary}
        items={crawlerIngestList}
        onRun={handleCrawlerIngestRun}
        onRetry={handleCrawlerIngestRetry}
        onRefresh={fetchCrawlerIngestStatus}
        onClose={closeCrawlerIngestModal}
      />
      <AdminToast message={adminToast.message} visible={adminToast.visible} closing={adminToast.closing} />
      <PublishQueuePanel
        jobs={publishQueue}
        onRetry={retryJob}
        onRemove={removeJob}
        onForceComplete={forceCompleteJob}
      />
      <div style={{ maxWidth: 900, margin: '0 auto', opacity: adminLocked ? 0.45 : 1, pointerEvents: adminLocked ? 'none' : 'auto', transition: 'opacity 0.25s ease' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
           <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
             {view === 'list' && <SearchInput value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />}
             <div style={{display:'flex', flexDirection:'column', justifyContent:'center'}}>
                <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '1px', display:'flex', alignItems:'center', gap:'10px' }}>
                   {siteTitle} <span onClick={updateSiteTitle} style={{cursor:'pointer', opacity:0.5}} title="修改网站标题"><Icons.Settings /></span>
                </div>
             </div>
           </div>
           
           <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
               <button
                 type="button"
                 onClick={handleCrawlerIngestRun}
                 disabled={
                   isThemeLoading ||
                   crawlerIngestBusy ||
                   !crawlerIngestConfigured
                 }
                 style={{
                   background: '#1a4d5c',
                   border: '1px solid #3db8d9',
                   padding: '10px 16px',
                   borderRadius: '8px',
                   color: '#7ee8fc',
                   cursor:
                     isThemeLoading ||
                     crawlerIngestBusy ||
                     !crawlerIngestConfigured
                       ? 'not-allowed'
                       : 'pointer',
                   opacity:
                     isThemeLoading ||
                     crawlerIngestBusy ||
                     !crawlerIngestConfigured
                       ? 0.45
                       : 1,
                   fontSize: '13px',
                   fontWeight: 'bold',
                   whiteSpace: 'nowrap',
                   boxShadow: '0 2px 8px rgba(61,184,217,0.25)',
                 }}
                 title={
                   !crawlerIngestConfigured
                     ? '未配置 Supabase 图库租户，请联系管理'
                     : '立即消费 Supabase 爬虫队列：写入 Notion + 图库并刷新相关前台页面'
                 }
               >
                 {crawlerIngestBusy ? '入库中…' : '爬虫入库'}
               </button>
               {crawlerIngestConfigured && crawlerIngestSummary && (
                 <button
                   type="button"
                   onClick={openCrawlerIngestModal}
                   style={{
                     fontSize: '11px',
                     color: '#888',
                     lineHeight: 1.3,
                     whiteSpace: 'nowrap',
                     background: 'none',
                     border: 'none',
                     cursor: 'pointer',
                     padding: 0,
                     textDecoration: 'underline',
                   }}
                   title="查看爬虫入库队列与任务进度"
                 >
                   待入库 {crawlerIngestSummary.pending ?? 0} · 已完成 {crawlerIngestSummary.done ?? 0} · 记录
                 </button>
               )}
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
               <button
                 type="button"
                 onClick={openFullRedeployConfirm}
                 disabled={
                   isThemeLoading ||
                   fullRedeployBusy ||
                   fullRedeployCooldownSec > 0 ||
                   !fullRedeployConfigured
                 }
                 style={{
                   background: fullRedeployCooldownSec > 0 ? '#424242' : '#9a6dd7',
                   border: fullRedeployCooldownSec > 0 ? '1px solid #666' : '1px solid #9a6dd7',
                   padding: '10px 16px',
                   borderRadius: '8px',
                   color: fullRedeployCooldownSec > 0 ? '#888' : '#fff',
                   cursor:
                     isThemeLoading ||
                     fullRedeployBusy ||
                     fullRedeployCooldownSec > 0 ||
                     !fullRedeployConfigured
                       ? 'not-allowed'
                       : 'pointer',
                   opacity:
                     isThemeLoading ||
                     fullRedeployBusy ||
                     fullRedeployCooldownSec > 0 ||
                     !fullRedeployConfigured
                       ? 0.45
                       : 1,
                   fontSize: '13px',
                   fontWeight: 'bold',
                   whiteSpace: 'nowrap',
                   boxShadow: fullRedeployCooldownSec > 0 ? 'none' : '0 2px 8px rgba(154,109,215,0.3)',
                 }}
                 title={
                   !fullRedeployConfigured
                     ? '未配置 Vercel 部署钩子，请联系管理'
                     : fullRedeployCooldownSec > 0
                       ? '今日已执行全量更新，请等待24h后尝试'
                       : '触发 Vercel 全量重部署（24 小时内仅一次）'
                 }
               >
                 {fullRedeployBusy ? '触发中…' : '全量刷新'}
               </button>
               {fullRedeployCooldownSec > 0 && (
                 <span style={{ fontSize: '11px', color: '#888', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                   今日已执行全量更新，请等待24h后尝试
                 </span>
               )}
             </div>
             <button
               type="button"
               onClick={handleManualDeploy}
               disabled={isThemeLoading || blogRefreshBusy || blogRefreshCooldownSec > 0}
               style={{
                 background: '#424242',
                 border: '1px solid greenyellow',
                 padding: '10px 12px',
                 borderRadius: '8px',
                 color: 'greenyellow',
                 cursor: (isThemeLoading || blogRefreshBusy || blogRefreshCooldownSec > 0) ? 'not-allowed' : 'pointer',
                 opacity: (isThemeLoading || blogRefreshBusy || blogRefreshCooldownSec > 0) ? 0.45 : 1,
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 minWidth: '40px',
                 minHeight: '40px',
               }}
               title={
                 blogRefreshCooldownSec > 0
                   ? `刷新冷却中（${blogRefreshCooldownSec}s）`
                   : '刷新首页、自定义页面、归档与分类/标签列表（不重建全部文章内页）'
               }
             >
               {blogRefreshBusy ? (
                 <span style={blogRefreshSpinStyle} aria-hidden />
               ) : (
                 <Icons.Refresh />
               )}
             </button>
             {view === 'list' ? <AnimatedBtn text="发布新内容" onClick={handleCreate} /> : <AnimatedBtn text="返回列表" onClick={leaveEditView} />}
           </div>
        </header>

{view === 'list' ? (
          <main>
            <GalleryStorageBar
              stats={galleryStorageStats}
              loading={galleryStorageLoading}
              error={galleryStorageError}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {/* 1. 分类标签组 */}
                <div style={{ background: '#424242', padding: '5px', borderRadius: '12px', display: 'flex' }}>
                  {['Post', 'Widget', 'Page'].map(t => (
                    <button
                      key={t}
                      onClick={() => { setActiveTab(t); setSelectedFolder(null); setSelectedPublishDate(null); setDatePickerOpen(false); }}
                      style={activeTab === t ? { padding: '8px 20px', border: 'none', background: '#555', color: '#fff', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' } : { padding: '8px 20px', border: 'none', background: 'none', color: '#888', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                    >
                      {t === 'Page' ? '自定义页面' : t === 'Post' ? '已发布' : '组件'}
                    </button>
                  ))}
                </div>

                {/* 2. 🎨 主题切换器 */}
                <div style={{ marginLeft: '16px', position: 'relative' }}>
                  <button
                    disabled={isThemeLoading}
                    onClick={() => setThemeMenuOpen(o => !o)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '10px', border: `1px solid ${currentTheme.color}`, background: 'rgba(0,0,0,0.3)', color: '#eee', cursor: isThemeLoading ? 'wait' : 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: currentTheme.color, boxShadow: `0 0 8px ${currentTheme.color}`, flexShrink: 0 }} />
                    {isThemeLoading
                      ? <><span style={lightSpinStyle}></span>切换中...</>
                      : <>主题：{currentTheme.label}</>}
                    <span style={{ fontSize: '10px', color: '#999', transform: themeMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                  </button>
                  {themeMenuOpen && (
                    <>
                      <div onClick={() => setThemeMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                      <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, minWidth: '240px', background: '#2a2a2e', border: '1px solid #555', borderRadius: '12px', padding: '8px', zIndex: 50, boxShadow: '0 12px 32px rgba(0,0,0,0.55)' }}>
                        <div style={{ fontSize: '10px', color: '#777', padding: '6px 10px 8px', letterSpacing: '0.5px' }}>选择主题</div>
                        {ADMIN_THEMES.map(t => {
                          const active = currentActiveTheme === t.id;
                          return (
                            <div key={t.id}
                              onClick={() => { setThemeMenuOpen(false); if (!active) handleThemeChange(t.id); }}
                              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', cursor: active ? 'default' : 'pointer', background: active ? 'rgba(255,255,255,0.06)' : 'transparent', border: `1px solid ${active ? t.color : 'transparent'}`, marginBottom: '4px' }}
                              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                            >
                              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.color, flexShrink: 0, boxShadow: active ? `0 0 8px ${t.color}` : 'none' }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{t.label}</div>
                                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{t.desc}</div>
                              </div>
                              {active && <span style={{ color: t.color, fontSize: '11px', fontWeight: 'bold', flexShrink: 0 }}>● 生效中</span>}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 右侧视图栏 + 发布日期筛选 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
                <SlidingNav activeIdx={navIdx} onSelect={handleNavClick} />
                {activeTab === 'Post' && (
                  <>
                    <button
                      type="button"
                      title={selectedPublishDate ? `筛选：${selectedPublishDate}` : '按发布日期筛选'}
                      onClick={() => {
                        setDatePickerOpen((o) => {
                          if (!o && selectedPublishDate) {
                            const parts = selectedPublishDate.split('-').map(Number);
                            if (parts.length === 3) setCalendarMonth(new Date(parts[0], parts[1] - 1, 1));
                          } else if (!o) {
                            setCalendarMonth(new Date());
                          }
                          return !o;
                        });
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        border: selectedPublishDate ? '1px solid greenyellow' : '1px solid #444',
                        background: selectedPublishDate ? 'rgba(173,255,47,0.12)' : '#202024',
                        color: selectedPublishDate ? 'greenyellow' : '#aaa',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <Icons.Calendar />
                    </button>
                    {datePickerOpen && (
                      <>
                        <div
                          onClick={() => setDatePickerOpen(false)}
                          style={{ position: 'fixed', inset: 0, zIndex: 50 }}
                        />
                        <AdminPublishCalendar
                          month={calendarMonth}
                          publishedDates={publishDatesSet}
                          selectedDate={selectedPublishDate}
                          onMonthChange={setCalendarMonth}
                          onSelectDate={handlePublishDateSelect}
                        />
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 4. 列表渲染区域 */}
            <div style={viewMode === 'gallery' || viewMode === 'folder' ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' } : {}}>
              {activeTab === 'Page' && viewMode !== 'folder' && (
                <div onClick={openFriends} className="card-item" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 24px', background: 'linear-gradient(90deg,#3a3a3f,#2c2c30)', borderRadius: '12px', marginBottom: '12px', border: '1px solid greenyellow', cursor: 'pointer' }}>
                  <div style={{ fontSize: '28px' }}>🔗</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '17px', color: '#fff' }}>友链管理</div>
                    <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>添加 / 编辑 / 删除友情链接</div>
                  </div>
                  <div style={{ color: 'greenyellow', fontSize: '13px', fontWeight: 'bold' }}>进入 →</div>
                </div>
              )}
              {activeTab === 'Widget' && viewMode !== 'folder' && (
                <div onClick={openGalleryAd} className="card-item" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 24px', background: 'linear-gradient(90deg,#3a3a3f,#2c2c30)', borderRadius: '12px', marginBottom: '12px', border: '1px solid #f59e0b', cursor: 'pointer' }}>
                  <div style={{ fontSize: '28px' }}>📢</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '17px', color: '#fff' }}>广告位编辑</div>
                    <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>页底横幅banner</div>
                  </div>
                  <div style={{ color: '#f59e0b', fontSize: '13px', fontWeight: 'bold' }}>进入 →</div>
                </div>
              )}
              {activeTab === 'Widget' && viewMode !== 'folder' && siteInfoWidget && (
                <div onClick={() => handleEdit(siteInfoWidget)} className="card-item" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 24px', background: 'linear-gradient(90deg,#3a3a3f,#2c2c30)', borderRadius: '12px', marginBottom: '12px', border: '1px solid greenyellow', cursor: 'pointer' }}>
                  <div style={{ fontSize: '28px' }}>🧩</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '17px', color: '#fff' }}>网站信息编辑</div>
                    <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>站点头像、标题与简介</div>
                  </div>
                  <div style={{ color: 'greenyellow', fontSize: '13px', fontWeight: 'bold' }}>进入 →</div>
                </div>
              )}
              {viewMode === 'folder' && options.categories.map(cat => (
                <div key={cat} onClick={() => { setSelectedFolder(cat); handleNavClick(1); }} style={{ padding: '15px', background: '#424242', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #555', cursor: 'pointer' }} className="btn-ia">
                  <Icons.FolderIcon />{cat}
                </div>
              ))}
              {viewMode !== 'folder' && filtered.map((p, index) => {
                const st = (p.status === 'Draft') ? { borderColor: '#f97316', color: '#f97316', label: '📝 草稿' } : { borderColor: 'transparent', color: 'greenyellow', label: '🚀 已发布' };
                // 自定义页面：用横幅样式(与「友链管理」一致)，不依赖封面图，避免 cover 为图标路径(如 me.svg)时的破图
                if (activeTab === 'Page') {
                  return (
                    <div key={p.id} onClick={() => handlePreview(p)} className="card-item" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 24px', background: 'linear-gradient(90deg,#3a3a3f,#2c2c30)', borderRadius: '12px', marginBottom: '12px', border: `1px solid ${st.borderColor}`, cursor: 'pointer' }}>
                      <div style={{ fontSize: '28px' }}>📄</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '17px', color: '#fff' }}>{p.title}</div>
                        <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ border: `1px solid ${st.color}`, color: st.color, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>{st.label}</span>
                          {p.date ? <span>{p.date}</span> : null}
                        </div>
                      </div>
                      {renderCardDrawer(p)}
                    </div>
                  );
                }
                const pinBadge = p.pinned ? <span className="pin-badge">📌 置顶</span> : null;
                return (
                  <React.Fragment key={p.id}>
                    {activeTab === 'Post' && pinnedDividerIndex > 0 && index === pinnedDividerIndex ? (
                      <div className="pin-divider" style={viewMode === 'gallery' ? { gridColumn: '1 / -1' } : {}}>
                        <span>置顶分割线</span>
                      </div>
                    ) : null}
                  <div onClick={() => handlePreview(p)} className="card-item" style={{ ...(viewMode === 'text' ? { display: 'flex', alignItems: 'center', padding: '16px 20px' } : viewMode === 'gallery' ? { display: 'flex', flexDirection: 'column', height: 'auto' } : {}), background: p.pinned ? '#4a4638' : '#424242', borderRadius: '12px', marginBottom: '8px', border: p.pinned ? '1px solid rgba(251, 191, 36, 0.45)' : `1px solid ${st.borderColor}` }}>
                    {viewMode === 'covered' && <><div style={{ width: '160px', flexShrink: 0, background: '#303030', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.cover ? <img src={p.cover} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: '28px', color: '#444' }}>{activeTab[0]}</div>}</div><div style={{ padding: '20px 35px', flex: 1 }}><div style={{ fontWeight: 'bold', fontSize: '20px', color: '#fff', marginBottom: '8px' }}>{pinBadge}{p.title}</div><div style={{ color: '#fff', fontSize: '12px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ border: `1px solid ${st.color}`, color: st.color, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>{st.label}</span>{p.category} · {p.date}</div></div></>}
                    {viewMode === 'text' && <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}><div style={{ flex: 1, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.pinned ? '#fbbf24' : st.color }}></span>{pinBadge}{p.title}</div><div style={{ color: '#fff', fontSize: '12px', opacity: 0.8 }}>{p.category} · {p.date}</div></div>}
                    {viewMode === 'gallery' && <><div style={{ height: '140px', background: '#303030', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}><div style={{ position: 'absolute', top: '10px', left: '10px', background: p.pinned ? '#fbbf24' : 'transparent', color: '#000', padding: p.pinned ? '2px 6px' : 0, borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>{p.pinned ? 'PIN' : ''}</div><div style={{ position: 'absolute', top: '10px', right: '10px', background: st.color, color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>{p.status === 'Draft' ? 'DRAFT' : 'PUB'}</div>{p.cover ? <img src={p.cover} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: '40px', color: '#444' }}>{activeTab[0]}</div>}</div><div style={{ padding: '15px' }}><div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{p.title}</div><div style={{ color: '#fff', fontSize: '12px', opacity: 0.8 }}>{p.category} · {p.date}</div></div></>}
                    {renderCardDrawer(p, { showPin: activeTab === 'Post' })}
                  </div>
                  </React.Fragment>
                );
              })}
            </div>
          </main>
        ) : view === 'gallery-ad' ? (
          <div style={{background: '#424242', padding: 30, borderRadius: 20}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'22px'}}>
              <div style={{fontSize:'20px', fontWeight:'bold', color:'#fff'}}>📢 广告位编辑</div>
              <div style={{fontSize:'12px', color:'#888'}}>文章内页底部 + 下载页右栏顶部</div>
            </div>

            {galleryAdLoading ? (
              <div style={{color:'#888', textAlign:'center', padding:'30px'}}>加载中...</div>
            ) : (
              <>
                <div style={{fontSize:'12px', color:'#aaa', marginBottom:'20px', lineHeight:1.8}}>
                  横幅显示在 Gallery 文章内页底部（猜你喜欢下方）。链接必填；未配置时不显示。背景图优先使用下方上传的 Banner，未上传则自动抓取链接预览图。
                </div>
                <div style={{display:'flex', gap:'24px', alignItems:'flex-start', flexWrap:'wrap'}}>
                  <div>
                    <label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'8px'}}>Banner 背景图 <span style={{color:'#777', fontWeight:'normal'}}>(选填)</span></label>
                    <label className="img-drop" style={{width:'280px', height:'56px', minHeight:'56px', padding:0, borderRadius:'8px', overflow:'hidden', border:'1px dashed #555'}}
                      onDragOver={e=>{e.preventDefault(); e.stopPropagation();}}
                      onDrop={e=>{e.preventDefault(); e.stopPropagation(); uploadGalleryAdCover(e.dataTransfer.files[0]);}}>
                      <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{ uploadGalleryAdCover(e.target.files[0]); e.target.value=''; }} />
                      {galleryAdCoverUploading
                        ? <div className="img-uploading"><div className="img-spin"></div></div>
                        : galleryAd.cover
                          ? <img src={galleryAd.cover} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="" />
                          : <div style={{pointerEvents:'none', fontSize:'11px', textAlign:'center', color:'#999', padding:'10px'}}>拖拽 / 点击上传横版 Banner<br/><span style={{color:'#666'}}>建议宽图，前台高度约 40px</span></div>}
                    </label>
                    {galleryAd.cover ? (
                      <button type="button" onClick={()=>setGalleryAd(prev=>({...prev, cover:''}))} style={{marginTop:'8px', fontSize:'11px', color:'#ff7875', background:'none', border:'none', cursor:'pointer', padding:0}}>移除 Banner 图</button>
                    ) : null}
                  </div>
                  <div style={{flex:1, minWidth:'280px', display:'flex', flexDirection:'column', gap:'16px'}}>
                    <div>
                      <label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'5px'}}>广告链接 <span style={{color:'#ff4d4f'}}>*</span></label>
                      <input className="glow-input" value={galleryAd.url} onChange={e=>setGalleryAd({...galleryAd, url: e.target.value})} placeholder="https://example.com" />
                    </div>
                    <div>
                      <label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'5px'}}>宣传文字（选填）</label>
                      <input className="glow-input" value={galleryAd.promoText} onChange={e=>setGalleryAd({...galleryAd, promoText: e.target.value})} placeholder="留空则仅显示链接预览背景图" />
                    </div>
                  </div>
                </div>
                <div style={{display:'flex', gap:'12px', marginTop:'32px'}}>
                  <button onClick={saveGalleryAd} disabled={galleryAdSaving} style={{flex:1, padding:'18px', background: galleryAdSaving ? '#333' : '#fff', color: galleryAdSaving ? '#666' : '#000', border:'none', borderRadius:'12px', fontWeight:'bold', fontSize:'15px', cursor: galleryAdSaving ? 'wait' : 'pointer'}}>
                    {galleryAdSaving ? '保存中...' : '保存广告位'}
                  </button>
                  {galleryAd.id ? (
                    <button onClick={clearGalleryAd} disabled={galleryAdSaving} style={{padding:'18px 24px', background:'transparent', color:'#ff7875', border:'1px solid #ff7875', borderRadius:'12px', fontWeight:'bold', fontSize:'14px', cursor:'pointer'}}>清空</button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        ) : view === 'friends' ? (
          <div style={{background: '#424242', padding: 30, borderRadius: 20}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'22px'}}>
              <div style={{fontSize:'20px', fontWeight:'bold', color:'#fff'}}>🔗 友链管理</div>
              <div style={{fontSize:'12px', color:'#888'}}>共 {friends.length} 个友链</div>
            </div>

            {/* 添加新友链 */}
            <div style={{background:'#333', padding:'20px', borderRadius:'12px', marginBottom:'25px'}}>
              <div style={{fontSize:'13px', color:'greenyellow', marginBottom:'14px', fontWeight:'bold'}}>＋ 添加新友链</div>
              <div style={{display:'flex', gap:'16px', alignItems:'flex-start', flexWrap:'wrap'}}>
                <label className="img-drop" style={{width:'88px', height:'88px', minHeight:'88px', flexShrink:0, padding:0, borderRadius:'50%', overflow:'hidden'}}
                  onDragOver={e=>{e.preventDefault(); e.stopPropagation();}}
                  onDrop={e=>{e.preventDefault(); e.stopPropagation(); uploadDraftAvatar(e.dataTransfer.files[0]);}}>
                  <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{ uploadDraftAvatar(e.target.files[0]); e.target.value=''; }} />
                  {friendDraftUploading
                    ? <div className="img-uploading"><div className="img-spin"></div></div>
                    : friendDraft.avatar
                      ? <img src={friendDraft.avatar} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="" />
                      : <div style={{pointerEvents:'none', fontSize:'11px', textAlign:'center', color:'#999'}}>拖拽/点击<br/>上传图标</div>}
                </label>
                <div style={{flex:1, minWidth:'240px', display:'flex', flexDirection:'column', gap:'10px'}}>
                  <input className="glow-input" placeholder="站点名称" value={friendDraft.name} onChange={e=>setFriendDraft({...friendDraft, name:e.target.value})} />
                  <input className="glow-input" placeholder="站点链接 https://..." value={friendDraft.url} onChange={e=>setFriendDraft({...friendDraft, url:e.target.value})} style={{fontSize:'13px'}} />
                  <div><button onClick={()=>saveFriend(friendDraft)} disabled={friendBtnStatus['draft']==='saving'} style={{background: friendBtnStatus['draft']==='done' ? '#4dab6d' : 'greenyellow', color: friendBtnStatus['draft']==='done' ? '#fff' : '#000', border:'none', padding:'9px 22px', borderRadius:'8px', fontWeight:'bold', cursor: friendBtnStatus['draft']==='saving'?'not-allowed':'pointer', minWidth:'130px', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'8px', transition:'background 0.3s'}}>
                    {friendBtnStatus['draft']==='saving' ? <><span style={btnSpinStyle}></span>处理中...</> : friendBtnStatus['draft']==='done' ? '✓ 添加成功' : '添加友链'}
                  </button></div>
                </div>
              </div>
            </div>

            {/* 现有友链列表 */}
            {friendsLoading && friends.length === 0 && <div style={{color:'#888', textAlign:'center', padding:'20px'}}>加载中...</div>}
            <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
              {friends.map(f => (
                <div key={f.id} style={{display:'flex', gap:'14px', alignItems:'center', background:'#333', padding:'14px', borderRadius:'10px'}}>
                  <label className="img-drop" style={{width:'64px', height:'64px', minHeight:'64px', flexShrink:0, padding:0, borderRadius:'50%', overflow:'hidden'}}
                    onDragOver={e=>{e.preventDefault(); e.stopPropagation();}}
                    onDrop={e=>{e.preventDefault(); e.stopPropagation(); uploadFriendAvatar(f.id, e.dataTransfer.files[0]);}}>
                    <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{ uploadFriendAvatar(f.id, e.target.files[0]); e.target.value=''; }} />
                    {f._uploading
                      ? <div className="img-uploading"><div className="img-spin"></div></div>
                      : f.avatar
                        ? <img src={f.avatar} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="" />
                        : <div style={{pointerEvents:'none', fontSize:'10px', textAlign:'center', color:'#999'}}>无图标</div>}
                  </label>
                  <div style={{flex:1, display:'flex', flexDirection:'column', gap:'8px'}}>
                    <input className="glow-input" value={f.name} onChange={e=>updateFriendField(f.id, 'name', e.target.value)} placeholder="站点名称" />
                    <input className="glow-input" value={f.url} onChange={e=>updateFriendField(f.id, 'url', e.target.value)} placeholder="站点链接" style={{fontSize:'13px'}} />
                  </div>
                  <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                    <button onClick={()=>saveFriend(f)} disabled={friendBtnStatus[f.id]==='saving'} style={{background: friendBtnStatus[f.id]==='done' ? '#4dab6d' : 'greenyellow', color: friendBtnStatus[f.id]==='done' ? '#fff' : '#000', border:'none', padding:'7px 16px', borderRadius:'8px', fontWeight:'bold', cursor: friendBtnStatus[f.id]==='saving'?'not-allowed':'pointer', minWidth:'92px', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'6px', transition:'background 0.3s'}}>
                      {friendBtnStatus[f.id]==='saving' ? <><span style={btnSpinStyle}></span>保存中</> : friendBtnStatus[f.id]==='done' ? '✓ 已保存' : '保存'}
                    </button>
                    <button onClick={()=>deleteFriend(f.id)} style={{background:'#ff4d4f', color:'#fff', border:'none', padding:'7px 16px', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>删除</button>
                  </div>
                </div>
              ))}
              {!friendsLoading && friends.length === 0 && <div style={{textAlign:'center', color:'#666', padding:'40px', border:'2px dashed #444', borderRadius:'12px'}}>还没有友链，在上方添加吧</div>}
            </div>
          </div>
        ) : form.type === 'Widget' ? (
          /* 🧩 组件编辑：精简界面，仅 标题 / 摘要 / 头像 */
          <div style={{background: '#424242', padding: 30, borderRadius: 20}}>
            <div style={{fontSize:'20px', fontWeight:'bold', color:'#fff', marginBottom:'6px'}}>🧩 网站信息编辑</div>
            <div style={{fontSize:'12px', color:'#888', marginBottom:'26px', lineHeight:1.7}}>该组件用于展示站点头像、标题与简介。</div>
            <div style={{display:'flex', gap:'26px', alignItems:'flex-start', flexWrap:'wrap'}}>
              <div>
                <label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'8px'}}>站点头像</label>
                <label className="img-drop" style={{width:'120px', height:'120px', minHeight:'120px', padding:0, borderRadius:'16px', overflow:'hidden'}}
                  onDragOver={e=>{e.preventDefault(); e.stopPropagation();}}
                  onDrop={e=>{e.preventDefault(); e.stopPropagation(); uploadCover(e.dataTransfer.files[0]);}}>
                  <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{ uploadCover(e.target.files[0]); e.target.value=''; }} />
                  {coverUploading
                    ? <div className="img-uploading"><div className="img-spin"></div></div>
                    : form.cover
                      ? <img src={form.cover} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="" />
                      : <div style={{pointerEvents:'none', fontSize:'12px', textAlign:'center', color:'#999'}}>拖拽 / 点击<br/>上传头像</div>}
                </label>
              </div>
              <div style={{flex:1, minWidth:'260px', display:'flex', flexDirection:'column', gap:'16px'}}>
                <div><label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'5px'}}>标题 <span style={{color:'#ff4d4f'}}>*</span></label><input className="glow-input" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} placeholder="组件标题..." /></div>
                <div><label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'5px'}}>摘要</label><textarea className="glow-input" value={form.excerpt} onChange={e=>setForm({...form, excerpt:e.target.value})} placeholder="组件简介..." style={{minHeight:'90px'}} /></div>
              </div>
            </div>
            <button onClick={attemptSave} title={isFormValid ? '' : (getMissingFieldMsg() || '')} style={{width:'100%', padding:'20px', background:isFormValid?'#fff':'#222', color:isFormValid?'#000':'#666', border:'none', borderRadius:'12px', fontWeight:'bold', fontSize:'16px', marginTop:'40px', cursor:'pointer', transition:'0.3s'}}>保存修改</button>
          </div>
        ) : (
          /* 这里是之前的表单编辑代码... */
          <div style={{background: '#424242', padding: 30, borderRadius: 20}}>
            <StepAccordion step={1} title="基础信息" isOpen={expandedStep === 1} onToggle={()=>setExpandedStep(expandedStep===1?0:1)}>
               {!editingSimplePage ? (
                 <div style={{ marginBottom: '18px', padding: '14px', borderRadius: '10px', border: '1px solid #3a3a42', background: '#1a1a1e' }}>
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                     <label style={{ fontSize: '12px', color: '#ccc', fontWeight: 'bold' }}>智能识别</label>
                     <button
                       type="button"
                       onClick={runSmartParse}
                       disabled={!smartParseText.trim()}
                       style={{
                         padding: '6px 14px',
                         borderRadius: '8px',
                         border: 'none',
                         background: smartParseText.trim() ? 'greenyellow' : '#333',
                         color: smartParseText.trim() ? '#000' : '#666',
                         fontSize: '12px',
                         fontWeight: 'bold',
                         cursor: smartParseText.trim() ? 'pointer' : 'not-allowed',
                       }}
                     >
                       识别并填入
                     </button>
                   </div>
                   <p style={{ fontSize: '11px', color: '#777', margin: '0 0 10px', lineHeight: 1.55 }}>
                     粘贴整行标题串将自动识别并填入标题、分类、标签、资源数量与大小；也可手动编辑后点「识别并填入」。分类与标签会直接写入对应栏位，有误可自行修改。
                   </p>
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                     <label style={{ fontSize: '11px', color: '#888' }}>识别模板</label>
                     <select
                       className="glow-input"
                       value={smartParseTemplateId}
                       onChange={(e) => setSmartParseTemplateId(e.target.value)}
                       style={{ flex: '1 1 200px', minWidth: '180px', fontSize: '12px', padding: '6px 10px' }}
                     >
                       <option value={SMART_PARSE_TEMPLATE_AUTO}>自动匹配（推荐）</option>
                       {smartParseTemplates.map((tpl) => (
                         <option key={tpl.id} value={tpl.id}>
                           {tpl.builtIn ? '★ ' : ''}{tpl.name}
                         </option>
                       ))}
                     </select>
                     <button
                       type="button"
                       onClick={saveSmartParseAsTemplate}
                       style={{
                         padding: '6px 12px',
                         borderRadius: '8px',
                         border: '1px solid #555',
                         background: '#2a2a2e',
                         color: '#ccc',
                         fontSize: '11px',
                         cursor: 'pointer',
                       }}
                     >
                       存为模板
                     </button>
                     <button
                       type="button"
                       onClick={removeSelectedSmartParseTemplate}
                       style={{
                         padding: '6px 12px',
                         borderRadius: '8px',
                         border: '1px solid #555',
                         background: 'transparent',
                         color: '#888',
                         fontSize: '11px',
                         cursor: 'pointer',
                       }}
                     >
                       删除所选
                     </button>
                   </div>
                   <p style={{ fontSize: '10px', color: '#666', margin: '0 0 10px', lineHeight: 1.5 }}>
                     添加模板：在下方输入框粘贴一条符合该站点格式的示例标题，点「存为模板」并命名。之后选该模板或「自动匹配」即可复用规则。
                   </p>
                   <textarea
                     className="glow-input"
                     value={smartParseText}
                     onChange={(e) => setSmartParseText(e.target.value)}
                     onPaste={handleSmartParsePaste}
                     placeholder="粘贴到此处，将智能填入分类及标签信息，请注意手动调整"
                     style={{ minHeight: '72px', fontSize: '13px', lineHeight: 1.5 }}
                   />
                   {smartParsePreview && (
                     <div style={{ marginTop: '10px', fontSize: '11px', color: '#888', lineHeight: 1.6 }}>
                       识别结果：
                       {smartParsePreview.title ? <span> 标题「{smartParsePreview.title}」</span> : null}
                       {smartParsePreview.category ? <span> · 分类「{smartParsePreview.category}」</span> : null}
                       {smartParsePreview.tags?.length ? <span> · 标签「{smartParsePreview.tags.join('、')}」</span> : null}
                       {smartParsePreview.downloadCount ? <span> · 数量 {smartParsePreview.downloadCount}</span> : null}
                       {smartParsePreview.downloadSize ? <span> · 大小 {smartParsePreview.downloadSize}</span> : null}
                       {smartParseUsedTemplate ? <span style={{ color: '#666' }}> · 模板「{smartParseUsedTemplate}」</span> : null}
                       <span style={{ color: '#555' }}> （{smartParsePreview.confidence === 'high' ? '格式匹配度高' : smartParsePreview.confidence === 'medium' ? '部分匹配' : '请核对'}）</span>
                     </div>
                   )}
                 </div>
               ) : null}
               <div style={{marginBottom:'15px'}}><label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'5px'}}>标题 <span style={{color: '#ff4d4f'}}>*</span></label><input className="glow-input" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} placeholder="输入标题" /></div>
               <div style={{marginBottom:'15px'}}><label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'5px'}}>摘要</label><input className="glow-input" value={form.excerpt} onChange={e=>setForm({...form, excerpt:e.target.value})} placeholder="输入摘要" /></div>
               {!editingSimplePage ? (
               <div style={{marginTop:'4px', paddingTop:'16px', borderTop:'1px solid #333'}}>
                 <label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'6px'}}>下载链接 <GalleryOnlyTag /></label>
                 <p style={{fontSize:'11px', color:'#777', margin:'0 0 8px', lineHeight:1.5}}>Gallery 主题下载弹窗中展示的链接内容，留空则显示「暂无下载」。</p>
                 <input className="glow-input" value={form.download || ''} onChange={e=>setForm({...form, download:e.target.value})} placeholder="例如：https://xxx.xxpan.com" style={{fontSize:'13px'}} />
                 <div style={{marginTop:'12px'}}>
                   <label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'6px'}}>下载信息（数量） <GalleryOnlyTag /></label>
                   <input className="glow-input" value={form.download_count || ''} onChange={e=>setForm({...form, download_count:e.target.value})} placeholder="例如：82P、50P+2v" style={{fontSize:'13px'}} />
                   <p style={{fontSize:'11px', color:'#777', margin:'6px 0 0', lineHeight:1.5}}>填写后显示在首页卡片封面右下角，留空则不显示。</p>
                 </div>
                 <div style={{marginTop:'12px'}}>
                   <label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'6px'}}>资源包大小 <GalleryOnlyTag /></label>
                   <input className="glow-input" value={form.download_size || ''} onChange={e=>setForm({...form, download_size:e.target.value})} placeholder="例如：639 MB、1.2 GB" style={{fontSize:'13px'}} />
                   <p style={{fontSize:'11px', color:'#777', margin:'6px 0 0', lineHeight:1.5}}>填写后显示在下载页标题栏右侧，留空则不显示。</p>
               </div>
               </div>
               ) : null}
            </StepAccordion>
            <StepAccordion step={2} title={editingSimplePage ? '发布时间' : '分类与时间'} isOpen={expandedStep === 2} onToggle={()=>setExpandedStep(expandedStep===2?0:2)}>
               <div style={{display:'grid', gridTemplateColumns: editingSimplePage ? '1fr' : '1fr 1fr', gap:'20px', alignItems:'start'}}>
                 {!editingSimplePage ? (
                 <div>
                   <label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'5px'}}>分类 <span style={{color: '#ff4d4f'}}>*</span></label>
                   <CategoryPicker
                     value={form.category || ''}
                     categories={options.categories}
                     onChange={(cat) => setForm({ ...form, category: cat })}
                   />
                   {showCatInput ? (
                     <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                       <input autoFocus className="glow-input" style={{ flex: 1, padding: '8px 10px', fontSize: '13px' }} value={catDraft}
                         onChange={e=>setCatDraft(e.target.value)}
                         onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addCategoryFromDraft(); } else if(e.key==='Escape'){ setShowCatInput(false); setCatDraft(''); } }}
                         placeholder="输入新分类名" />
                       <button type="button" onClick={addCategoryFromDraft} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid greenyellow', background: 'rgba(173,255,47,0.12)', color: 'greenyellow', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>添加</button>
                       <button type="button" onClick={()=>{ setShowCatInput(false); setCatDraft(''); }} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #555', background: 'transparent', color: '#888', fontSize: '12px', cursor: 'pointer' }}>取消</button>
                     </div>
                   ) : (
                     <span onClick={()=>setShowCatInput(true)} style={{ display: 'inline-block', cursor:'pointer', border:'1px dashed #666', color:'greenyellow', padding:'6px 12px', borderRadius:'6px', fontSize:'13px' }}>＋ 创建分类</span>
                   )}
                 </div>
                 ) : null}
                 <div><label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'5px'}}>发布日期 <span style={{color: '#ff4d4f'}}>*</span></label><input className="glow-input" type="date" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} /></div>
               </div>
            </StepAccordion>
{!editingSimplePage ? (
<StepAccordion step={3} title="标签" isOpen={expandedStep === 3} onToggle={()=>setExpandedStep(expandedStep===3?0:3)}>
               <div style={{marginBottom:'15px'}}>
                 <label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'5px'}}>标签</label>
                 <div style={{display:'flex', flexWrap:'wrap', gap:'8px', alignItems:'center'}}>
                   {selectedTags.map(t => (
                     <span key={t} style={{display:'inline-flex', alignItems:'center', gap:'6px', background:'#333', padding:'6px 10px', borderRadius:'6px', fontSize:'13px', color:'#fff'}}>
                       {t}
                       <span onClick={()=>removeTag(t)} style={{cursor:'pointer', color:'#ff7875', fontWeight:'bold'}}>×</span>
                     </span>
                   ))}
                   {showTagInput ? (
                     <input autoFocus className="glow-input" style={{width:'150px', padding:'6px 10px'}} value={tagDraft}
                       onChange={e=>setTagDraft(e.target.value)}
                       onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addTag(tagDraft); setTagDraft(''); } else if(e.key==='Escape'){ setShowTagInput(false); setTagDraft(''); } }}
                       onBlur={()=>{ if(tagDraft.trim()) addTag(tagDraft); setTagDraft(''); setShowTagInput(false); }}
                       placeholder="输入标签后回车" />
                   ) : (
                     <span onClick={()=>setShowTagInput(true)} style={{cursor:'pointer', border:'1px dashed #666', color:'greenyellow', padding:'6px 12px', borderRadius:'6px', fontSize:'13px'}}>＋ 添加标签</span>
                   )}
                 </div>
                 {displayTags.filter(t=>!selectedTags.includes(t)).length > 0 && (
                   <div style={{marginTop:'12px'}}>
                     <div style={{fontSize:'11px', color:'#777', marginBottom:'6px'}}>点击已有标签快速添加：</div>
                     <div style={{display:'flex', flexWrap:'wrap', gap:'6px', alignItems:'center'}}>
                       {displayTags.filter(t=>!selectedTags.includes(t)).map(t => (
                         <span key={t} onClick={()=>addTag(t)} style={{cursor:'pointer', background:'#2a2a2e', border:'1px solid #444', color:'#bbb', padding:'4px 10px', borderRadius:'6px', fontSize:'12px'}}>{t}</span>
                       ))}
                       {options.tags.length > 12 && <span onClick={()=>setShowAllTags(!showAllTags)} style={{fontSize:'12px', color:'greenyellow', cursor:'pointer', fontWeight:'bold'}}>{showAllTags ? '收起' : '更多...'}</span>}
                     </div>
                   </div>
                 )}
               </div>
            </StepAccordion>
) : null}

            {!editingSimplePage ? (
            <StepAccordion step={4} title={<>图库 <GalleryOnlyTag /></>} isOpen={expandedStep === 4} onToggle={()=>setExpandedStep(expandedStep===4?0:4)}>
              <GalleryManager
                postSlug={form.slug}
                postTitle={form.title}
                postNotionId={currentId}
                items={galleryItems}
                onItemsChange={setGalleryItems}
                onGalleryMutated={() => setGalleryDirty(true)}
              />
            </StepAccordion>
            ) : null}
            
            <BlockBuilder blocks={editorBlocks} setBlocks={setEditorBlocks} />
            
            <div className="fab-scroll">
              <div className="fab-btn" onClick={() => scrollEditView('top')}><Icons.ArrowUp /></div>
              <div className="fab-btn" onClick={() => scrollEditView('bottom')}><Icons.ArrowDown /></div>
            </div>

            <button onClick={attemptSave} disabled={loading} title={isFormValid ? '' : (getMissingFieldMsg() || '')} style={{width:'100%', padding:'20px', background:isFormValid && !loading?'#fff':'#222', color:isFormValid && !loading?'#000':'#666', border:'none', borderRadius:'12px', fontWeight:'bold', fontSize:'16px', marginTop:'56px', cursor: loading ? 'wait' : 'pointer', transition:'0.3s'}}>
              {currentId ? '保存修改' : '确认发布'}
            </button>
          </div>
        )}
        {previewData && <div className="modal-bg" onClick={()=>setPreviewData(null)}><div className="modal-box" onClick={e=>e.stopPropagation()}><div style={{padding:'20px 25px', borderBottom:'1px solid #333', display:'flex', justifyContent:'space-between', alignItems:'center'}}><strong>预览: {previewData.title}</strong><button onClick={()=>setPreviewData(null)} style={{background:'none', border:'none', color:'#666', fontSize:'24px', cursor:'pointer'}}>×</button></div><div className="modal-body"><NotionView blocks={previewData.rawBlocks} /></div></div></div>}
      </div>
    </div>
  );
}
