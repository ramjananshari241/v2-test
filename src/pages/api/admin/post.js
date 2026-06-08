import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { readPinnedFromNotionProperties } from '@/src/lib/blog/pinnedPosts';
import { syncSiteThemeFromAdmin } from '@/src/lib/blog/siteTheme';
import { normalizeMediaUrl, readNotionCoverUrl } from '@/src/lib/notion/readProperty';

const notion = new Client({
  auth: process.env.NOTION_KEY || process.env.NOTION_TOKEN,
});
const n2m = new NotionToMarkdown({ notionClient: notion });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 网络抖动(ECONNRESET 等)自动重试：本地到 api.notion.com 偶发连接重置时不至于整单失败
const isTransient = (e) => {
  const msg = String((e && e.message) || '');
  const code = String((e && e.code) || '');
  return /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|socket hang up|network|fetch failed|aborted/i.test(msg)
    || /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ECONNREFUSED|ENOTFOUND/i.test(code)
    || (e && (e.status === 429 || e.status === 502 || e.status === 503 || e.status === 504));
};
const withRetry = async (fn, retries = 4) => {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      if (!isTransient(e) || i === retries - 1) throw e;
      await sleep(500 * Math.pow(2, i)); // 0.5s, 1s, 2s, 4s
    }
  }
  throw lastErr;
};

/** 读取 Notion rich_text 字段 */
function readRichTextProperty(prop) {
  if (!prop || prop.type !== 'rich_text') return '';
  return (prop.rich_text || []).map((t) => t.plain_text).join('');
}

/** 读取 Notion download 字段（支持 rich_text；兼容旧 url 类型） */
function readDownloadProperty(prop) {
  if (!prop) return '';
  if (prop.type === 'rich_text') {
    return (prop.rich_text || []).map((t) => t.plain_text).join('');
  }
  if (prop.type === 'url') {
    return prop.url || '';
  }
  return '';
}

/** 按数据库属性类型写入 rich_text */
function buildRichTextProperty(value, targetProp) {
  const text = typeof value === 'string' ? value.trim() : '';
  const propType = targetProp?.type || 'rich_text';
  if (propType === 'rich_text') {
    return { rich_text: text ? [{ text: { content: text } }] : [] };
  }
  return { rich_text: text ? [{ text: { content: text } }] : [] };
}

/** 按数据库属性类型写入 download */
function buildDownloadProperty(value, targetProp) {
  const text = typeof value === 'string' ? value : '';
  const propType = targetProp?.type || 'rich_text';
  if (propType === 'rich_text') {
    return { rich_text: text ? [{ text: { content: text } }] : [] };
  }
  if (propType === 'url') {
    return text.startsWith('http') ? { url: text } : { url: null };
  }
  return { rich_text: text ? [{ text: { content: text } }] : [] };
}

// === 1. 解析器 (保留洗链、视频/图片、代码块逻辑) ===
function parseLinesToChildren(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const mdMatch = trimmed.match(/^!\[.*?\]\((.*?)\)$/) || trimmed.match(/^\[.*?\]\((.*?)\)$/);
    let potentialUrl = mdMatch ? mdMatch[1] : trimmed;
    const urlMatch = potentialUrl.match(/https?:\/\/[^\s"']+/);
    if (urlMatch) {
      let safeUrl = urlMatch[0];
      if (/[\[\]]/.test(safeUrl)) { try { safeUrl = encodeURI(decodeURI(safeUrl)); } catch (e) { safeUrl = encodeURI(safeUrl); } }
      const isVideo = safeUrl.match(/\.(mp4|mov|webm|ogg|mkv)(\?|$)/i);
      const isImage = safeUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i);
      if (isVideo) { blocks.push({ object: 'block', type: 'video', video: { type: 'external', external: { url: safeUrl } } }); } 
      else if (isImage) { blocks.push({ object: 'block', type: 'image', image: { type: 'external', external: { url: safeUrl } } }); } 
      else { blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: trimmed, link: { url: safeUrl } } }] } }); }
      continue;
    }
    if (trimmed.startsWith('# ')) { blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ text: { content: trimmed.replace('# ', '') } }] } }); continue; } 
    if (trimmed.startsWith('`') && trimmed.endsWith('`') && trimmed.length > 1) { blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: trimmed.slice(1, -1) }, annotations: { code: true, color: 'red' } }] } }); continue; }
    blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: trimmed } }] } });
  }
  return blocks;
}

// === 2. 转换器 (保留加密块状态机) ===
function mdToBlocks(markdown) {
  if (!markdown) return [];
  const rawChunks = markdown.split(/\n{2,}/);
  const blocks = [];
  let mergedChunks = [];
  let buffer = "";
  let isLocking = false;
  for (let chunk of rawChunks) {
    const t = chunk.trim();
    if (!t) continue;
    if (!isLocking && t.startsWith(':::lock')) { if (t.endsWith(':::')) mergedChunks.push(t); else { isLocking = true; buffer = t; } } 
    else if (isLocking) { buffer += "\n\n" + t; if (t.endsWith(':::')) { isLocking = false; mergedChunks.push(buffer); buffer = ""; } } 
    else { mergedChunks.push(t); }
  }
  if (buffer) mergedChunks.push(buffer);
  for (let content of mergedChunks) {
    if (content.startsWith(':::lock')) {
        const firstLineEnd = content.indexOf('\n');
        const header = content.substring(0, firstLineEnd > -1 ? firstLineEnd : content.length);
        let pwd = header.replace(':::lock', '').replace(/[>*\s🔒]/g, '').trim(); 
        const body = content.replace(/^:::lock.*?\n/, '').replace(/\n:::$/, '').trim();
        blocks.push({ object: 'block', type: 'callout', callout: { rich_text: [{ text: { content: `LOCK:${pwd}` }, annotations: { bold: true } }], icon: { type: "emoji", emoji: "🔒" }, color: "gray_background", children: [ { object: 'block', type: 'divider', divider: {} }, ...parseLinesToChildren(body) ] } });
    } else { blocks.push(...parseLinesToChildren(content)); }
  }
  return blocks;
}

// === 3. 结构化编辑块 → Notion 块 (支持整块格式: 加粗/斜体/颜色) ===
const NOTION_COLORS = ['default','gray','brown','orange','yellow','green','blue','purple','pink','red'];

function annOf(b, extra = {}) {
  const color = NOTION_COLORS.includes(b && b.color) ? b.color : 'default';
  return { bold: !!(b && b.bold), italic: !!(b && b.italic), color, ...extra };
}

// 文本(可多行)转 Notion 子块：保留洗链(图片/视频/链接自动识别)，并给段落附加整块样式
function styledLinesToChildren(text, b) {
  const lines = (text || '').split(/\r?\n/);
  const out = [];
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const mdMatch = trimmed.match(/^!\[.*?\]\((.*?)\)$/) || trimmed.match(/^\[.*?\]\((.*?)\)$/);
    let potentialUrl = mdMatch ? mdMatch[1] : trimmed;
    const urlMatch = potentialUrl.match(/https?:\/\/[^\s"']+/);
    if (urlMatch) {
      let safeUrl = urlMatch[0];
      if (/[\[\]]/.test(safeUrl)) { try { safeUrl = encodeURI(decodeURI(safeUrl)); } catch (e) { safeUrl = encodeURI(safeUrl); } }
      const isVideo = safeUrl.match(/\.(mp4|mov|webm|ogg|mkv)(\?|$)/i);
      const isImage = safeUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i);
      if (isVideo) { out.push({ object: 'block', type: 'video', video: { type: 'external', external: { url: safeUrl } } }); continue; }
      if (isImage) { out.push({ object: 'block', type: 'image', image: { type: 'external', external: { url: safeUrl } } }); continue; }
      out.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: trimmed, link: { url: safeUrl } }, annotations: annOf(b) }] } });
      continue;
    }
    out.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: line }, annotations: annOf(b) }] } });
  }
  return out;
}

function structuredToBlocks(blocks) {
  const out = [];
  for (const b of (blocks || [])) {
    const type = b.type;
    if (type === 'h1') {
      out.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ text: { content: b.content || '' }, annotations: annOf(b) }] } });
    } else if (type === 'note') {
      out.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: b.content || '' }, annotations: annOf(b, { code: true, color: (b.color && b.color !== 'default') ? b.color : 'red' }) }] } });
    } else if (type === 'quote') {
      out.push({ object: 'block', type: 'quote', quote: { rich_text: [{ text: { content: b.content || '' }, annotations: annOf(b) }] } });
    } else if (type === 'link') {
      const url = (b.url || '').trim();
      const text = b.content || url;
      if (url) out.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: text, link: { url } }, annotations: annOf(b) }] } });
      else if (text) out.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: text }, annotations: annOf(b) }] } });
    } else if (type === 'image') {
      const url = (b.content || '').trim();
      if (!url) continue;
      const isVideo = url.match(/\.(mp4|mov|webm|ogg|mkv)(\?|$)/i);
      if (isVideo) out.push({ object: 'block', type: 'video', video: { type: 'external', external: { url } } });
      else out.push({ object: 'block', type: 'image', image: { type: 'external', external: { url } } });
    } else if (type === 'lock') {
      const children = [{ object: 'block', type: 'divider', divider: {} }];
      children.push(...styledLinesToChildren(b.content || '', b));
      (b.images || []).forEach(url => { if (url) children.push({ object: 'block', type: 'image', image: { type: 'external', external: { url } } }); });
      out.push({ object: 'block', type: 'callout', callout: { rich_text: [{ text: { content: `LOCK:${b.pwd || ''}` }, annotations: { bold: true } }], icon: { type: 'emoji', emoji: '🔒' }, color: 'gray_background', children } });
    } else {
      out.push(...styledLinesToChildren(b.content || '', b));
    }
  }
  return out;
}

// === 4. Notion 块 → 结构化编辑块 (读取，保留整块格式) ===
const plainText = (rts) => (rts || []).map(x => x.plain_text).join('');
const annFrom = (rt) => ({
  bold: !!(rt && rt.annotations && rt.annotations.bold),
  italic: !!(rt && rt.annotations && rt.annotations.italic),
  color: (rt && rt.annotations && rt.annotations.color) || 'default',
});

async function notionToEditorBlocks(blocks) {
  const out = [];
  for (const blk of (blocks || [])) {
    const t = blk.type;
    if (t === 'heading_1' || t === 'heading_2' || t === 'heading_3') {
      out.push({ type: 'h1', content: plainText(blk[t].rich_text), ...annFrom(blk[t].rich_text && blk[t].rich_text[0]) });
    } else if (t === 'paragraph') {
      const rts = blk.paragraph.rich_text || [];
      const rt = rts[0];
      const text = plainText(rts);
      const link = (rt && rt.text && rt.text.link && rt.text.link.url) || (rt && rt.href) || '';
      if (link) out.push({ type: 'link', content: text, url: link, ...annFrom(rt) });
      else if (rt && rt.annotations && rt.annotations.code) out.push({ type: 'note', content: text, ...annFrom(rt) });
      else out.push({ type: 'text', content: text, ...annFrom(rt) });
    } else if (t === 'quote') {
      out.push({ type: 'quote', content: plainText(blk.quote.rich_text), ...annFrom(blk.quote.rich_text && blk.quote.rich_text[0]) });
    } else if (t === 'image') {
      const url = (blk.image && (blk.image.external?.url || blk.image.file?.url)) || '';
      if (url) out.push({ type: 'image', content: url });
    } else if (t === 'video') {
      const url = (blk.video && (blk.video.external?.url || blk.video.file?.url)) || '';
      if (url) out.push({ type: 'image', content: url });
    } else if (t === 'callout') {
      const rt = blk.callout.rich_text || [];
      const txt = plainText(rt);
      const lock = txt.match(/^LOCK:\s*(.*)$/);
      if (lock) {
        const pwd = lock[1].trim();
        let kids = [];
        try { const r = await withRetry(() => notion.blocks.children.list({ block_id: blk.id })); kids = r.results; } catch (e) {}
        const images = []; const textLines = []; let lockAnn = null;
        kids.forEach(k => {
          if (k.type === 'image') { const u = k.image?.external?.url || k.image?.file?.url; if (u) images.push(u); }
          else if (k.type === 'paragraph') { const p = plainText(k.paragraph.rich_text); if (p) { textLines.push(p); if (!lockAnn) lockAnn = annFrom(k.paragraph.rich_text && k.paragraph.rich_text[0]); } }
        });
        out.push({ type: 'lock', pwd, content: textLines.join('\n'), images, ...(lockAnn || {}) });
      } else {
        out.push({ type: 'text', content: txt, ...annFrom(rt[0]) });
      }
    } else if (t === 'divider') {
      // 分割线跳过 (加密块内部的分隔已在 lock 处理)
    } else {
      const data = blk[t];
      const text = data && data.rich_text ? plainText(data.rich_text) : '';
      if (text) out.push({ type: 'text', content: text });
    }
  }
  // 合并相邻、同样式的纯文本块，避免按行碎片化
  const merged = [];
  for (const b of out) {
    const last = merged[merged.length - 1];
    if (b.type === 'text' && last && last.type === 'text' && !!last.bold === !!b.bold && !!last.italic === !!b.italic && (last.color || 'default') === (b.color || 'default')) {
      last.content = last.content + '\n' + b.content;
    } else {
      merged.push(b);
    }
  }
  return merged;
}

function getPinnedPropertyKey(targetProps) {
  if (targetProps.pinned?.type === 'checkbox') return 'pinned';
  if (targetProps.Pinned?.type === 'checkbox') return 'Pinned';
  return null;
}

async function unpinAllExcept(notion, databaseId, exceptId, pinKey) {
  let cursor;
  do {
    const response = await withRetry(() =>
      notion.databases.query({
        database_id: databaseId,
        filter: { property: pinKey, checkbox: { equals: true } },
        page_size: 100,
        start_cursor: cursor,
      })
    );
    for (const page of response.results) {
      if (page.id !== exceptId) {
        await withRetry(() =>
          notion.pages.update({
            page_id: page.id,
            properties: { [pinKey]: { checkbox: false } },
          })
        );
      }
    }
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);
}

export default async function handler(req, res) {
  const { id: queryId } = req.query;
  const databaseId = process.env.NOTION_DATABASE_ID || process.env.NOTION_PAGE_ID;

  try {
    if (req.method === 'GET') {
      const page = await withRetry(() => notion.pages.retrieve({ page_id: queryId }));
      const mdblocks = await withRetry(() => n2m.pageToMarkdown(queryId));
      const p = page.properties;
      mdblocks.forEach(b => {
        if (b.type === 'callout' && b.parent.includes('LOCK:')) {
          const pwdMatch = b.parent.match(/LOCK:(.*?)(\n|$)/);
          const pwd = pwdMatch ? pwdMatch[1].trim() : '';
          const parts = b.parent.split('---');
          let body = parts.length > 1 ? parts.slice(1).join('---') : parts[0].replace(/LOCK:.*\n?/, '');
          body = body.replace(/^>[ \t]*/gm, '').trim(); 
          b.parent = `:::lock ${pwd}\n\n${body}\n\n:::`; 
        }
      });
      const cleanContent = n2m.toMarkdownString(mdblocks).parent.trim();
      let rawBlocks = [];
      try { const blocksRes = await withRetry(() => notion.blocks.children.list({ block_id: queryId })); rawBlocks = blocksRes.results; } catch (e) {}
      let editorBlocks = [];
      try { editorBlocks = await notionToEditorBlocks(rawBlocks); } catch (e) { editorBlocks = []; }
      return res.status(200).json({ success: true, post: { id: page.id, title: p.title?.title?.[0]?.plain_text || p.Page?.title?.[0]?.plain_text || '无标题', slug: p.slug?.rich_text?.[0]?.plain_text || '', excerpt: p.excerpt?.rich_text?.[0]?.plain_text || '', category: p.category?.select?.name || '', tags: (p.tags?.multi_select || []).map(t => t.name).join(','), status: p.status?.status?.name || p.status?.select?.name || 'Published', type: p.type?.select?.name || 'Post', date: p.date?.date?.start || '', cover: readNotionCoverUrl(p.cover) || '', pinned: readPinnedFromNotionProperties(p), download: readDownloadProperty(p.download), download_size: readRichTextProperty(p.download_size), content: cleanContent, rawBlocks: rawBlocks, editorBlocks: editorBlocks } });
    }

    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const pageId = queryId || body.id;
      const { pinned } = body;
      if (!pageId || pinned === undefined) {
        return res.status(400).json({ success: false, error: '缺少 id 或 pinned' });
      }
      const page = await withRetry(() => notion.pages.retrieve({ page_id: pageId }));
      const pinKey = getPinnedPropertyKey(page.properties);
      if (!pinKey) {
        return res.status(400).json({
          success: false,
          error: '置顶功能暂不可用，请联系管理员。',
        });
      }
      if (pinned) {
        await unpinAllExcept(notion, databaseId, pageId, pinKey);
      }
      await withRetry(() =>
        notion.pages.update({
          page_id: pageId,
          properties: { [pinKey]: { checkbox: !!pinned } },
        })
      );
      return res.status(200).json({ success: true, pinned: !!pinned });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { id, title, content, slug, excerpt, category, tags, status, date, type, cover, download, download_size, blocksData } = body;
      const useStructured = Array.isArray(blocksData);

      // 1. 获取目标页面属性，用于动态判定类型
      let targetProps = {};
      if (id) {
          const page = await withRetry(() => notion.pages.retrieve({ page_id: id }));
          targetProps = page.properties;
      } else {
          const db = await withRetry(() => notion.databases.retrieve({ database_id: databaseId }));
          targetProps = db.properties;
      }

      // 2. 智能构建属性
      const props = {};
      
      // 标题兼容性
      const titleKey = targetProps['title'] ? 'title' : (targetProps['Page'] ? 'Page' : 'title');
      if (title !== undefined) props[titleKey] = { title: [{ text: { content: title || "无标题" } }] };
      
      if (slug !== undefined) props["slug"] = { rich_text: [{ text: { content: slug } }] };
      if (excerpt !== undefined) props["excerpt"] = { rich_text: [{ text: { content: excerpt || "" } }] };
      if (category !== undefined) props["category"] = category ? { select: { name: category } } : { select: null };
      if (tags !== undefined) props["tags"] = { multi_select: (tags || "").split(',').filter(t => t.trim()).map(t => ({ name: t.trim() })) };
      
      // 🔴 智能状态修复逻辑
      if (status !== undefined && status !== null) {
          const statusType = targetProps['status']?.type || 'select';
          if (statusType === 'status') {
             props["status"] = { status: { name: status } }; // 适配 Status 类型
          } else {
             props["status"] = { select: { name: status } }; // 适配 Select 类型
          }
      }
      
      if (type !== undefined) props["type"] = { select: { name: type } };
      if (date !== undefined) props["date"] = date ? { date: { start: date } } : null;
      if (cover !== undefined) {
          const normalizedCover = normalizeMediaUrl(
            typeof cover === 'string' ? cover : ''
          );
          props['cover'] = normalizedCover ? { url: normalizedCover } : { url: null };
      }
      if (download !== undefined) {
          props['download'] = buildDownloadProperty(download, targetProps['download']);
      }
      if (download_size !== undefined && targetProps['download_size']) {
          props['download_size'] = buildRichTextProperty(download_size, targetProps['download_size']);
      }

      if (id) {
        await withRetry(() => notion.pages.update({ page_id: id, properties: props }));
        if (slug === 'theme-config' && excerpt !== undefined) {
          try {
            await syncSiteThemeFromAdmin(excerpt, id);
          } catch (themeSyncErr) {
            console.warn('theme-config Supabase 同步失败（Notion 已保存）', themeSyncErr);
          }
        }
        const shouldReplaceBody = useStructured || content !== undefined;
        if (shouldReplaceBody) {
            const children = await withRetry(() => notion.blocks.children.list({ block_id: id }));
            if (children.results.length > 0) {
                for (const blk of children.results) {
                  await withRetry(() => notion.blocks.delete({ block_id: blk.id }));
                }
            }
            const newBlocks = useStructured
              ? structuredToBlocks(blocksData)
              : (content && content.trim().length > 0 ? mdToBlocks(content) : []);
            for (let i = 0; i < newBlocks.length; i += 100) {
              await withRetry(() => notion.blocks.children.append({ block_id: id, children: newBlocks.slice(i, i + 100) }));
              if (i + 100 < newBlocks.length) await sleep(100); 
            }
        }
      } else {
        const newBlocks = useStructured ? structuredToBlocks(blocksData) : mdToBlocks(content || "");
        const page = await withRetry(() => notion.pages.create({ parent: { database_id: databaseId }, properties: props, children: newBlocks.slice(0, 100) }));
        return res.status(200).json({ success: true, id: page.id });
      }
      return res.status(200).json({ success: true, id });
    }

    if (req.method === 'DELETE') {
      await withRetry(() => notion.pages.update({ page_id: queryId, archived: true }));
      return res.status(200).json({ success: true });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}