import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';

const notion = new Client({
  auth: process.env.NOTION_KEY || process.env.NOTION_TOKEN,
});
const n2m = new NotionToMarkdown({ notionClient: notion });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

export default async function handler(req, res) {
  const { id: queryId } = req.query;
  const databaseId = process.env.NOTION_DATABASE_ID || process.env.NOTION_PAGE_ID;

  try {
    if (req.method === 'GET') {
      const page = await notion.pages.retrieve({ page_id: queryId });
      const mdblocks = await n2m.pageToMarkdown(queryId);
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
      try { const blocksRes = await notion.blocks.children.list({ block_id: queryId }); rawBlocks = blocksRes.results; } catch (e) {}
      return res.status(200).json({ success: true, post: { id: page.id, title: p.title?.title?.[0]?.plain_text || p.Page?.title?.[0]?.plain_text || '无标题', slug: p.slug?.rich_text?.[0]?.plain_text || '', excerpt: p.excerpt?.rich_text?.[0]?.plain_text || '', category: p.category?.select?.name || '', tags: (p.tags?.multi_select || []).map(t => t.name).join(','), status: p.status?.status?.name || p.status?.select?.name || 'Published', type: p.type?.select?.name || 'Post', date: p.date?.date?.start || '', cover: p.cover?.url || p.cover?.file?.url || p.cover?.external?.url || '', content: cleanContent, rawBlocks: rawBlocks } });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { id, title, content, slug, excerpt, category, tags, status, date, type, cover } = body;

      // 1. 获取目标页面属性，用于动态判定类型
      let targetProps = {};
      if (id) {
          const page = await notion.pages.retrieve({ page_id: id });
          targetProps = page.properties;
      } else {
          const db = await notion.databases.retrieve({ database_id: databaseId });
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
      if (cover !== undefined && cover.startsWith('http')) props["cover"] = { url: cover };

      if (id) {
        await notion.pages.update({ page_id: id, properties: props });
        if (content !== undefined && content !== null && content.trim().length > 0) {
            const children = await notion.blocks.children.list({ block_id: id });
            if (children.results.length > 0) {
                const chunks = [];
                for (let i = 0; i < children.results.length; i += 3) chunks.push(children.results.slice(i, i + 3));
                for (const chunk of chunks) await Promise.all(chunk.map(b => notion.blocks.delete({ block_id: b.id })));
            }
            const newBlocks = mdToBlocks(content);
            for (let i = 0; i < newBlocks.length; i += 100) {
              await notion.blocks.children.append({ block_id: id, children: newBlocks.slice(i, i + 100) });
              if (i + 100 < newBlocks.length) await sleep(100); 
            }
        }
      } else {
        const newBlocks = mdToBlocks(content || "");
        await notion.pages.create({ parent: { database_id: databaseId }, properties: props, children: newBlocks.slice(0, 100) });
      }
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      await notion.pages.update({ page_id: queryId, archived: true });
      return res.status(200).json({ success: true });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}