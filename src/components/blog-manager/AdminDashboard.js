'use client';
import React, { useState, useEffect, useRef } from 'react';
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
  serializeBlocksForSave,
} from '@/src/lib/admin/contentMediaFlush';

// ================= 1. 图标库 =================
const Icons = {
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  Edit: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>,
  Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Pin: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"></path></svg>,
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
    .loader-phase { margin-top: 28px; font-size: 16px; font-weight: 600; color: #fff; text-align: center; letter-spacing: 0.5px; }
    .loader-detail { margin-top: 10px; font-size: 13px; color: greenyellow; text-align: center; min-height: 20px; }
    .loader-hint { margin-top: 8px; font-size: 11px; color: #666; text-align: center; max-width: 320px; line-height: 1.6; }
    .loader-progress-track { margin-top: 18px; width: min(320px, 80vw); height: 6px; background: #2a2a2e; border-radius: 999px; overflow: hidden; border: 1px solid #333; }
    .loader-progress-bar { height: 100%; background: linear-gradient(90deg, #adff2f, #84cc16); border-radius: 999px; transition: width 0.35s ease; }
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
    .block-card { background: #2a2a2e; border: 1px solid #333; border-radius: 10px; padding: 15px 15px 15px 55px; margin-bottom: 12px; position: relative; transition: border 0.2s; }
    .block-card:hover { border-color: greenyellow; }
    .block-card.just-moved { animation: moveHighlight 0.6s ease-out; }
    @keyframes moveHighlight { 0% { box-shadow: 0 0 0 0 rgba(173, 255, 47, 0); border-color: #333; } 30% { box-shadow: 0 0 15px 2px rgba(173, 255, 47, 0.4); border-color: greenyellow; background: #2f2f33; } 100% { box-shadow: 0 0 0 0 rgba(173, 255, 47, 0); border-color: #333; background: #2a2a2e; } }
    .block-left-ctrl { position: absolute; left: 0; top: 0; bottom: 0; width: 45px; background: rgba(0,0,0,0.2); border-right: 1px solid #333; border-radius: 10px 0 0 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
    .move-btn { cursor: pointer; color: #888; width: 30px; height: 30px; border-radius: 6px; transition: 0.2s; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); }
    .move-btn:hover { background: greenyellow; color: #000; box-shadow: 0 0 10px greenyellow; }
    .move-btn:active { transform: scale(0.9); }
    .block-label { font-size: 12px; color: greenyellow; margin-bottom: 8px; fontWeight: bold; text-transform: uppercase; letter-spacing: 1px; }
    .block-del { position: absolute; right: 0; top: 0; bottom: 0; width: 40px; background: #ff4d4f; border-radius: 0 10px 10px 0; display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.2s; cursor: pointer; color: white; }
    .block-card:hover .block-del { opacity: 1; right: -40px; }
    .block-card:hover { margin-right: 40px; }
    .acc-btn { width: 100%; background: #424242; padding: 15px 20px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border: 1px solid #555; color: #fff; margin-bottom: 10px; transition: 0.2s; }
    .acc-btn:hover { border-color: greenyellow; color: greenyellow; }
    .acc-content { overflow: hidden; transition: max-height 0.3s ease; max-height: 0; padding: 0 10px; }
    .acc-content.open { max-height: 500px; padding-bottom: 20px; }
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
  `}} />
);

// --- 3. 辅助组件 ---
const SearchInput = ({ value, onChange }) => (
  <div className="group">
    <svg className="search-icon" aria-hidden="true" viewBox="0 0 24 24"><g><path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z"></path></g></svg>
    <input placeholder="Search" type="search" className="input" value={value} onChange={onChange} />
  </div>
);

const StepAccordion = ({ step, title, isOpen, onToggle, children }) => (
  <div>
    <div className="acc-btn" onClick={onToggle}>
      <div style={{fontWeight:'bold'}}><span style={{color:'greenyellow', marginRight:'10px'}}>Step {step}</span>{title}</div>
      <div style={{transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition:'0.3s'}}><Icons.ChevronDown /></div>
    </div>
    <div className={`acc-content ${isOpen ? 'open' : ''}`}>{children}</div>
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

const SAVE_PHASE_META = {
  media: {
    title: '正在上传图片块',
    hint: '每张会先压缩到约几百 KB，再上传图床',
  },
  post: {
    title: '正在保存文章',
    hint: '写入 Notion 页面与正文块…',
  },
  gallery: {
    title: '正在上传图库',
    hint: '批量处理中，请稍候',
  },
};

function getGalleryLoaderHint(phase, progress) {
  if (phase !== 'gallery') return SAVE_PHASE_META[phase]?.hint || '';
  if (progress?.total > 0) return SAVE_PHASE_META.gallery.hint;
  return '正在同步图库到数据库…';
}

const FullScreenLoader = ({ phase, progress }) => {
  const meta = SAVE_PHASE_META[phase];
  const title =
    phase === 'gallery' && !(progress?.total > 0)
      ? '正在同步图库'
      : meta?.title || '加载中…';
  const hint = getGalleryLoaderHint(phase, progress);
  const hasProgress = progress && progress.total > 0;
  const pct = hasProgress
    ? Math.min(100, Math.round((progress.done / progress.total) * 100))
    : 0;

  return (
    <div className="loader-overlay">
      <div className="loader">
        <svg viewBox="0 0 200 60" width="200" height="60">
          <path className="dash" fill="none" stroke="greenyellow" strokeWidth="3" d="M20,50 L20,10 L50,10 C65,10 65,30 50,30 L20,30" />
          <path className="dash" fill="none" stroke="greenyellow" strokeWidth="3" d="M80,50 L80,10 L110,10 C125,10 125,30 110,30 L80,30 M100,30 L120,50" />
          <path className="dash" fill="none" stroke="greenyellow" strokeWidth="3" d="M140,30 A20,20 0 1,0 180,30 A20,20 0 1,0 140,30" />
        </svg>
      </div>
      <div className="loader-text">SYSTEM PROCESSING</div>
      <div className="loader-phase">{title}</div>
      {hasProgress ? (
        <div className="loader-detail">
          已完成 {progress.done} / {progress.total} 张（{pct}%）
        </div>
      ) : (
        <div className="loader-detail">{phase === 'post' ? '请稍候…' : ''}</div>
      )}
      {hasProgress ? (
        <div className="loader-progress-track">
          <div className="loader-progress-bar" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      {hint ? <div className="loader-hint">{hint}</div> : null}
    </div>
  );
};

// 工具函数：清洗 URL
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
const fmtStyle = (b) => ({
  fontWeight: b.bold ? 'bold' : 'normal',
  fontStyle: b.italic ? 'italic' : 'normal',
  color: colorCss(b.color),
});

// 块内文字格式工具条 (整块加粗/斜体/颜色)
const FormatBar = ({ b, onChange }) => (
  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
    <button onClick={() => onChange('bold', !b.bold)} title="加粗" style={{ width: '30px', height: '28px', borderRadius: '6px', cursor: 'pointer', border: '1px solid', borderColor: b.bold ? 'greenyellow' : '#444', background: b.bold ? 'greenyellow' : '#2a2a2e', color: b.bold ? '#000' : '#ccc', fontWeight: 'bold' }}>B</button>
    <button onClick={() => onChange('italic', !b.italic)} title="斜体" style={{ width: '30px', height: '28px', borderRadius: '6px', cursor: 'pointer', border: '1px solid', borderColor: b.italic ? 'greenyellow' : '#444', background: b.italic ? 'greenyellow' : '#2a2a2e', color: b.italic ? '#000' : '#ccc', fontStyle: 'italic' }}>I</button>
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
const BlockBuilder = ({ blocks, setBlocks }) => {
  const [movingId, setMovingId] = useState(null);

  const scrollToBlock = (id) => {
    setTimeout(() => {
       const el = document.getElementById(`block-${id}`);
       if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const addBlock = (type) => {
    const newId = Date.now() + Math.random();
    setBlocks([...blocks, { id: newId, type, content: '', pwd: '', url: '', images: [], bold: false, italic: false, color: 'default' }]);
    scrollToBlock(newId);
  };
  const updateBlock = (id, val, key='content') => { setBlocks(blocks.map(b => b.id === id ? { ...b, [key]: val } : b)); };
  const removeBlock = (id) => {
    setBlocks(prev => {
      const block = prev.find(b => b.id === id);
      if (block) revokeBlockPendingMedia(block);
      return prev.filter(b => b.id !== id);
    });
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
    document.addEventListener('paste', onPaste);
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      document.removeEventListener('paste', onPaste);
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

  const getBlockLabel = (type) => {
      if (type === 'h1') return 'H1 标题';
      if (type === 'lock') return '🔒 加密块';
      if (type === 'note') return '💬 注释块';
      if (type === 'image') return '🖼️ 图片块';
      if (type === 'quote') return '❝ 引用';
      if (type === 'link') return '🔗 超链文字';
      return '📄 内容块';
  };
  return (
    <div style={{marginTop:'30px'}}>
      <div style={{display:'flex', gap:'15px', marginBottom:'25px', justifyContent:'center', flexWrap:'wrap'}}>
          <div className="neo-btn" onClick={()=>addBlock('h1')}>H1 标题</div>
          <div className="neo-btn" onClick={()=>addBlock('text')}>📝 内容块</div>
          <div className="neo-btn" onClick={()=>addBlock('image')}>🖼️ 图片块</div>
          <div className="neo-btn" onClick={()=>addBlock('quote')}>❝ 引用</div>
          <div className="neo-btn" onClick={()=>addBlock('link')}>🔗 超链文字</div>
          <div className="neo-btn" onClick={()=>addBlock('note')}>💬 注释块</div>
          <div className="neo-btn" onClick={()=>addBlock('lock')}>🔒 加密块</div>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
        {blocks.map((b, index) => (
          <div key={b.id} id={`block-${b.id}`} className={`block-card ${movingId === b.id ? 'just-moved' : ''}`}>
            <div className="block-left-ctrl">
               <div className="move-btn" onClick={() => moveToTop(index)} title="置顶"><Icons.Top /></div>
               <div className="move-btn" onClick={() => moveBlock(index, -1)}><Icons.ArrowUp /></div>
               <div className="move-btn" onClick={() => moveBlock(index, 1)}><Icons.ArrowDown /></div>
               <div className="move-btn" onClick={() => moveToBottom(index)} title="置底"><Icons.Bottom /></div>
            </div>
            <div className="block-label">{getBlockLabel(b.type)}</div>
            {b.type !== 'image' && <FormatBar b={b} onChange={(key, val) => updateBlock(b.id, val, key)} />}
            {b.type === 'h1' && <input className="glow-input" placeholder="输入大标题..." value={b.content} onChange={e=>updateBlock(b.id, e.target.value)} style={{fontSize:'20px', ...fmtStyle(b), fontWeight:'bold'}} />}
            {b.type === 'text' && (
              <textarea
                className="glow-input"
                placeholder="输入正文；拖入或粘贴图片将自动在下方生成图片块，不影响本文"
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
            {b.type === 'note' && <textarea className="glow-input" placeholder="输入注释内容..." value={b.content} onChange={e=>updateBlock(b.id, e.target.value)} style={{minHeight:'80px', fontFamily: 'monospace', fontSize: '13px', ...fmtStyle(b), color: (b.color && b.color !== 'default') ? colorCss(b.color) : '#ff6b6b'}} />}
            {b.type === 'quote' && <textarea className="glow-input" placeholder="输入引用内容..." value={b.content} onChange={e=>updateBlock(b.id, e.target.value)} style={{minHeight:'90px', borderLeft:'4px solid greenyellow', paddingLeft:'12px', ...fmtStyle(b)}} />}
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
                      {/\.(mp4|mov|webm|ogg|mkv)(\?|$)/i.test(b.content)
                        ? <video src={b.content} controls className="img-preview" />
                        : <img src={b.content} className="img-preview" alt="" />}
                      {isImageBlockPending(b) ? (
                        <div style={{fontSize:'11px', color:'#f59e0b', marginTop:'6px', fontWeight:'bold'}}>待发布 · 保存后上传至图床</div>
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
            <div className="block-del" onClick={()=>removeBlock(b.id)}><Icons.Trash /></div>
          </div>
        ))}
        {blocks.length === 0 && <div style={{textAlign:'center', color:'#666', padding:'40px', border:'2px dashed #444', borderRadius:'12px'}}>👋 暂无内容，请点击上方按钮添加模块</div>}
      </div>
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
export default function AdminDashboard() {
    // 🟢 1. 所有的 Hook (useState) 必须严格排在函数最顶部
const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [isThemeLoading, setIsThemeLoading] = useState(false);
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
  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: 'Post', date: '' });
  const [currentId, setCurrentId] = useState(null);
  const [siteTitle, setSiteTitle] = useState('PROBLOG');
  const [navIdx, setNavIdx] = useState(1); 
  const [expandedStep, setExpandedStep] = useState(1);
  const [editorBlocks, setEditorBlocks] = useState([]);
  const editorBlocksRef = useRef(editorBlocks);
  editorBlocksRef.current = editorBlocks;
  const [isDeploying, setIsDeploying] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
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
  const [galleryStorageStats, setGalleryStorageStats] = useState(null);
  const [galleryStorageLoading, setGalleryStorageLoading] = useState(false);
  const [galleryStorageError, setGalleryStorageError] = useState('');

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
    : ((form?.title?.trim() || '') !== '' &&
       (form?.category?.trim() || '') !== '' &&
       (form?.date || '') !== '');

  // 找出第一个未完成的必填项，用于灰色按钮被点击时的提示
  const getMissingFieldMsg = () => {
    if ((form?.title?.trim() || '') === '') return form?.type === 'Widget' ? '请填写组件标题' : '请填写文章标题';
    if (form?.type === 'Widget') return '';
    if ((form?.category?.trim() || '') === '') return '请填写文章分类';
    if ((form?.date || '') === '') return '请选择发布日期';
    return '';
  };
  // 统一的"尝试保存"：无效时弹出具体缺失项提示，有效时才真正保存
  const attemptSave = () => {
    const msg = getMissingFieldMsg();
    if (msg) { alert('⚠️ ' + msg); return; }
    handleSave();
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
  async function fetchPosts() {
    setLoading(true); 
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
    finally { setLoading(false); } 
  }

  // 🟢 5. 处理函数
  const handleThemeChange = async (version) => {
    if (isThemeLoading || version === currentActiveTheme) return;
    const configItem = themeConfig || posts.find(p => p.slug === 'theme-config');
    if (!configItem) { alert("未找到配置页"); return; }
    setIsThemeLoading(true);
    setActiveThemeLocal(version);
    try {
      const payload = { id: configItem.id, title: configItem.title || '主题配置', slug: 'theme-config', excerpt: version };
      const res = await fetch('/api/admin/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) await fetchPosts();
    } catch (err) {
      setActiveThemeLocal(themeConfig?.excerpt?.trim() || 'v1');
      alert("切换失败");
    } finally { setIsThemeLoading(false); }
  };

  // 🟢 6. useEffect 挂载
  useEffect(() => { setMounted(true); }, []);
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
        const joined = buffer.map(stripMd).join('\n').trim();
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
        // 优先使用后端按 Notion 原生块重建的结构化块(保留格式)，否则回退到 Markdown 解析
        const eb = (Array.isArray(post.editorBlocks) && post.editorBlocks.length)
          ? post.editorBlocks.map((b, i) => ({ ...b, id: Date.now() + i + Math.random() }))
          : parseContentToBlocks(post.content);
        setEditorBlocks(eb);
        setCurrentId(p.id);
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
    setForm({ title: '', slug: 'p-'+Date.now().toString(36), excerpt:'', content:'', category:'', tags:'', cover:'', status:'Published', type: 'Post', date: new Date().toISOString().split('T')[0] });
    setCurrentId(null);
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
      if (d.success) { alert('✓ 广告位已保存'); await loadGalleryAd(); await fetchPosts(); }
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
  
  const handleSave = async () => {
    if (isDeploying) return alert("请等待更新完成...");

    // 🧩 组件(Widget)：仅更新 标题/摘要/头像(cover)，不触碰正文块，避免误改导致部署失败
    if (form.type === 'Widget') {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/post', {
          method: 'POST',
          body: JSON.stringify({ id: currentId, title: form.title, excerpt: form.excerpt, cover: form.cover || '', type: 'Widget', status: form.status || 'Published' })
        });
        const d = await res.json();
        if (!d.success) alert(`❌ 保存失败！\n\n错误信息:\n${d.error}`);
        else { alert("✅ 保存成功！"); setView('list'); fetchPosts(); }
      } catch (e) { alert('网络错误: ' + e.message); }
      finally { setLoading(false); }
      return;
    }

    setLoading(true);
    setSaveProgress(null);

    let blocksForSave = editorBlocksRef.current;
    const pendingMediaCount = countPendingEditorMedia(blocksForSave);
    const pendingGalleryCount = countPendingGalleryItems(galleryItems);
    const willSyncGallery =
      galleryDirty || pendingGalleryCount > 0;

    if (pendingMediaCount > 0) {
      setSavePhase('media');
      setSaveProgress({ done: 0, total: pendingMediaCount });
    } else {
      setSavePhase('post');
      setSaveProgress(null);
    }

    if (pendingMediaCount > 0) {
      try {
        blocksForSave = await flushEditorBlocksMedia(blocksForSave, {
          onProgress: ({ done, total }) => setSaveProgress({ done, total }),
        });
        setEditorBlocks(blocksForSave);
      } catch (e) {
        alert(`正文图片上传失败：\n\n${e.message}\n\n请重试保存。`);
        setLoading(false);
        setSavePhase('');
        setSaveProgress(null);
        return;
      }
    }

    setSavePhase('post');
    setSaveProgress(null);

    const fullContent = blocksToMarkdown(blocksForSave);

    const blocksData = serializeBlocksForSave(blocksForSave);

    const autoCover = resolveAutoCover(blocksForSave);

    try {
      const res = await fetch('/api/admin/post', {
        method: 'POST',
        body: JSON.stringify({ 
          ...form, 
          cover: autoCover,
          // 🟢 修复：强制提交 Published 状态
          status: 'Published', 
          content: fullContent, 
          blocksData,
          id: currentId,
          type: form.type || 'Post' 
        })
      });
      const d = await res.json();
      
      if (!d.success) {
        alert(`❌ 保存失败！\n\n错误信息:\n${d.error}`);
      } else {
        const newId = d.id || currentId;
        if (newId && newId !== currentId) setCurrentId(newId);

        if (willSyncGallery) {
          setSavePhase('gallery');
          if (pendingGalleryCount > 0) {
            setSaveProgress({ done: 0, total: pendingGalleryCount });
          } else {
            setSaveProgress(null);
          }
          try {
            const updated = await flushGalleryUploads({
              slug: form.slug,
              postTitle: form.title,
              postNotionId: newId,
              items: galleryItems,
              onProgress: ({ done, total }) => setSaveProgress({ done, total }),
            });
            setGalleryItems(updated);
            setGalleryDirty(false);
          } catch (e) {
            alert(`✅ 文章已保存，但图库上传失败：\n\n${e.message}\n\n请留在本页重试保存。`);
            return;
          }
        }

        alert("✅ 保存成功！");
        resetGalleryItems();
        setView('list');
        fetchPosts();
        loadGalleryStorage();
      }
    } catch (e) {
      alert('网络错误: ' + e.message);
    } finally {
      setLoading(false);
      setSavePhase('');
      setSaveProgress(null);
    }
  };

  const updateSiteTitle = async () => {
    const newTitle = prompt("请输入新的网站标题:", siteTitle);
    if (newTitle && newTitle !== siteTitle) {
        setLoading(true); await fetch('/api/admin/config', { method: 'POST', body: JSON.stringify({ title: newTitle }) });
        setSiteTitle(newTitle); setLoading(false);
    }
  };

  const handleManualDeploy = async () => {
     if (isDeploying) return;
     if(confirm('确定要立即更新Blog吗？\n点击确定将立刻开始更新，在完成内容更新前请不要重复提交更新请求！')) {
        setIsDeploying(true);
        try { await fetch('/api/admin/deploy'); } catch(e) {}
        alert('已触发更新！请耐心等待（预计30分钟内完成）。请不要重复提交更新请求。');
        setTimeout(() => setIsDeploying(false), 60000);
     }
  };

  const deleteTagOption = (e, tagToDelete) => {
    e.stopPropagation();
    const currentTags = form.tags ? form.tags.split(',').filter(t => t.trim()) : [];
    const newTags = currentTags.filter(t => t.trim() !== tagToDelete).join(',');
    setForm({ ...form, tags: newTags });
  };

  const handleNavClick = (idx) => { setNavIdx(idx); const modes = ['folder','covered','text','gallery']; setViewMode(modes[idx]); setSelectedFolder(null); };

  const ANNOUNCEMENT_SLUG = 'announcement';

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
      else await fetchPosts();
    } catch (err) {
      alert(err.message || '置顶操作失败');
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
      <div onClick={(e) => { e.stopPropagation(); if (confirm('彻底删除？')) { setLoading(true); fetch('/api/admin/post?id=' + p.id, { method: 'DELETE' }).then(() => fetchPosts()); } }} style={{ background: '#ff4d4f' }} className="dr-btn"><Icons.Trash /></div>
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
        list = list.filter(p => p.type === 'Widget' && p.slug !== 'gallery-ad');
     }
     else {
        list = list.filter(p => p.type === 'Post' && p.status !== 'Draft' && p.slug !== ANNOUNCEMENT_SLUG);
        list = sortAdminPosts(list);
     }

     if (searchQuery) list = list.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
     if (selectedFolder) list = list.filter(p => p.category === selectedFolder);
     return list;
  };
  const filtered = getFilteredPosts();
  const pinnedDividerIndex = activeTab === 'Post' ? filtered.findIndex(p => !p.pinned) : -1;
  const displayTags = (options.tags && options.tags.length > 0) ? (showAllTags ? options.tags : options.tags.slice(0, 12)) : [];
  const selectedTags = (form.tags || '').split(',').map(t => t.trim()).filter(Boolean);
  const addTag = (name) => { const n = (name || '').trim(); if (!n || selectedTags.includes(n)) return; setForm({ ...form, tags: [...selectedTags, n].join(',') }); };
  const removeTag = (name) => { setForm({ ...form, tags: selectedTags.filter(t => t !== name).join(',') }); };

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#303030', padding: '40px 20px' }}>
      <Head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="shortcut icon" href="/favicon-32x32.png" />
      </Head>
      <GlobalStyle />
      {loading && <FullScreenLoader phase={savePhase} progress={saveProgress} />}
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
           <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
             {view === 'list' && <SearchInput value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />}
             <div style={{display:'flex', flexDirection:'column', justifyContent:'center'}}>
                <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '1px', display:'flex', alignItems:'center', gap:'10px' }}>
                   {siteTitle} <span onClick={updateSiteTitle} style={{cursor:'pointer', opacity:0.5}} title="修改网站标题"><Icons.Settings /></span>
                </div>
             </div>
           </div>
           
           <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
             {/* 🟢 修复：更新按钮 */}
             <button onClick={handleManualDeploy} style={{background:'#424242', border: isDeploying ? '1px solid #555' : '1px solid greenyellow', opacity: isDeploying ? 0.5 : 1, padding:'10px', borderRadius:'8px', color: isDeploying ? '#888' : 'greenyellow', cursor: isDeploying ? 'not-allowed' : 'pointer'}} title="立即更新博客前端">
               <Icons.Refresh />
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
                      onClick={() => { setActiveTab(t); setSelectedFolder(null); }}
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

              {/* 3. 右侧滑动导航 */}
              <SlidingNav activeIdx={navIdx} onSelect={handleNavClick} />
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
                    <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>Gallery 主题内页底部横幅（链接预览风格）</div>
                  </div>
                  <div style={{ color: '#f59e0b', fontSize: '13px', fontWeight: 'bold' }}>进入 →</div>
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
                          <span>/{p.slug}{p.date ? ` · ${p.date}` : ''}</span>
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
              <div style={{fontSize:'12px', color:'#888'}}>仅 Gallery 文章内页底部显示</div>
            </div>

            {galleryAdLoading ? (
              <div style={{color:'#888', textAlign:'center', padding:'30px'}}>加载中...</div>
            ) : (
              <>
                <div style={{fontSize:'12px', color:'#aaa', marginBottom:'20px', lineHeight:1.8}}>
                  横幅显示在 Gallery 文章内页底部（猜你喜欢下方）。链接必填；未配置时不显示。背景图优先使用下方上传的 Banner（写入 Notion cover 字段），未上传则构建时自动抓取链接预览图。
                </div>
                <div style={{display:'flex', gap:'24px', alignItems:'flex-start', flexWrap:'wrap'}}>
                  <div>
                    <label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'8px'}}>Banner 背景图 <span style={{color:'#777', fontWeight:'normal'}}>(选填，写入 cover)</span></label>
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
                <div style={{marginTop:'20px', fontSize:'12px', color:'#777', lineHeight:1.7}}>
                  💡 保存后需点击右上角「更新」重新部署，前台 Gallery 内页才会显示新横幅。
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

            <div style={{marginTop:'24px', fontSize:'12px', color:'#777', lineHeight:1.7}}>
              💡 提示：友链保存到 Notion 后，前端 <span style={{color:'#aaa'}}>/friends</span> 页面是静态生成的，需点击右上角的「更新」按钮重新部署，新友链才会显示。
            </div>
          </div>
        ) : form.type === 'Widget' ? (
          /* 🧩 组件编辑：精简界面，仅 标题 / 摘要 / 头像 */
          <div style={{background: '#424242', padding: 30, borderRadius: 20}}>
            <div style={{fontSize:'20px', fontWeight:'bold', color:'#fff', marginBottom:'6px'}}>🧩 网站信息组件</div>
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
               <div style={{marginBottom:'15px'}}><label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'5px'}}>标题 <span style={{color: '#ff4d4f'}}>*</span></label><input className="glow-input" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} placeholder="输入文章标题..." /></div>
               <div style={{marginBottom:'15px'}}><label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'5px'}}>摘要</label><input className="glow-input" value={form.excerpt} onChange={e=>setForm({...form, excerpt:e.target.value})} placeholder="输入文章摘要..." /></div>
               <div style={{marginTop:'4px', paddingTop:'16px', borderTop:'1px solid #333'}}>
                 <label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'6px'}}>下载信息 <span style={{color:'#777', fontWeight:'normal'}}>(选填)</span></label>
                 <p style={{fontSize:'11px', color:'#777', margin:'0 0 8px', lineHeight:1.5}}>Gallery 主题会展示下载按钮，对应此处填写内容。可写说明 + 链接，例如：欢迎下载-https://example.com</p>
                 <input className="glow-input" value={form.download || ''} onChange={e=>setForm({...form, download:e.target.value})} placeholder="说明文字与链接，留空则前台提示「暂无下载」" style={{fontSize:'13px'}} />
               </div>
               <div style={{marginTop:'16px', fontSize:'12px', color:'#999', background:'#202024', borderRadius:'8px', padding:'12px 14px', lineHeight:1.7, border:'1px solid #333'}}>🖼️ <b style={{color:'greenyellow'}}>封面说明</b>：保存后系统会把<b style={{color:'#fff'}}>第一个图片块</b>的图床链接写入 Notion <b style={{color:'#fff'}}>cover</b> 并在内页嵌入；列表卡片也用该图。大图库请在 Step 4 批量添加（本地预览，保存后上传）。</div>
            </StepAccordion>
            <StepAccordion step={2} title="分类与时间" isOpen={expandedStep === 2} onToggle={()=>setExpandedStep(expandedStep===2?0:2)}>
               <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                 <div><label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'5px'}}>分类 <span style={{color: '#ff4d4f'}}>*</span></label><input className="glow-input" list="cats" value={form.category} onChange={e=>setForm({...form, category:e.target.value})} placeholder="选择或输入分类" /><datalist id="cats">{options.categories.map(o=><option key={o} value={o}/>)}</datalist></div>
                 <div><label style={{display:'block', fontSize:'11px', color:'#bbb', marginBottom:'5px'}}>发布日期 <span style={{color: '#ff4d4f'}}>*</span></label><input className="glow-input" type="date" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} /></div>
               </div>
            </StepAccordion>
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

            <StepAccordion step={4} title="图库（Gallery · Supabase）" isOpen={expandedStep === 4} onToggle={()=>setExpandedStep(expandedStep===4?0:4)}>
              <GalleryManager
                postSlug={form.slug}
                postTitle={form.title}
                postNotionId={currentId}
                items={galleryItems}
                onItemsChange={setGalleryItems}
                onGalleryMutated={() => setGalleryDirty(true)}
              />
            </StepAccordion>
            
            <BlockBuilder blocks={editorBlocks} setBlocks={setEditorBlocks} />
            
            <div className="fab-scroll">
              <div className="fab-btn" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}><Icons.ArrowUp /></div>
              <div className="fab-btn" onClick={() => window.scrollTo({top:99999, behavior:'smooth'})}><Icons.ArrowDown /></div>
            </div>

            <button onClick={attemptSave} disabled={loading} title={isFormValid ? '' : (getMissingFieldMsg() || '')} style={{width:'100%', padding:'20px', background:isFormValid && !loading?'#fff':'#222', color:isFormValid && !loading?'#000':'#666', border:'none', borderRadius:'12px', fontWeight:'bold', fontSize:'16px', marginTop:'40px', cursor: loading ? 'wait' : 'pointer', transition:'0.3s'}}>
              {loading && savePhase === 'media'
                ? saveProgress
                  ? `上传正文图片 ${saveProgress.done}/${saveProgress.total}…`
                  : '准备上传正文图片…'
                : loading && savePhase === 'post'
                ? '保存文章中…'
                : loading && savePhase === 'gallery'
                  ? saveProgress?.total
                    ? `上传图库 ${saveProgress.done}/${saveProgress.total}…`
                    : '同步图库…'
                  : currentId
                    ? '保存修改'
                    : '确认发布'}
            </button>
          </div>
        )}
        {previewData && <div className="modal-bg" onClick={()=>setPreviewData(null)}><div className="modal-box" onClick={e=>e.stopPropagation()}><div style={{padding:'20px 25px', borderBottom:'1px solid #333', display:'flex', justifyContent:'space-between', alignItems:'center'}}><strong>预览: {previewData.title}</strong><button onClick={()=>setPreviewData(null)} style={{background:'none', border:'none', color:'#666', fontSize:'24px', cursor:'pointer'}}>×</button></div><div className="modal-body"><NotionView blocks={previewData.rawBlocks} /></div></div></div>}
      </div>
    </div>
  );
}
