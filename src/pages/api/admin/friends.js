import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_KEY || process.env.NOTION_TOKEN,
});

const MAIN_DB = process.env.NOTION_PAGE_ID || process.env.NOTION_DATABASE_ID;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 网络抖动(ECONNRESET 等)自动重试
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
      await sleep(500 * Math.pow(2, i));
    }
  }
  throw lastErr;
};

// 缓存友链子数据库的发现结果，避免每次请求都重新探测
let cache = null; // { dbId, titleProp, urlProp, avatarProp, statusProp, statusValue }

async function discoverFriendsDb() {
  if (cache) return cache;
  if (!MAIN_DB) throw new Error('未配置 NOTION_PAGE_ID / NOTION_DATABASE_ID');

  // 1. 在主库中找到 slug 为 friends 的页面
  let friendPage = null;
  let cursor;
  do {
    const q = await withRetry(() => notion.databases.query({ database_id: MAIN_DB, start_cursor: cursor }));
    for (const row of q.results) {
      const props = row.properties || {};
      const slugProp = props.slug || props.Slug;
      const slug = slugProp?.rich_text?.[0]?.plain_text || '';
      if (slug === 'friends') { friendPage = row; break; }
    }
    cursor = (!friendPage && q.has_more) ? q.next_cursor : undefined;
  } while (cursor);
  if (!friendPage) throw new Error('主库中未找到 slug 为 friends 的页面');

  // 2. 在该页面内部找到标题为 Friends 的内嵌数据库 (child_database)
  let childDbId = null;
  let firstAnyDb = null;
  let bCursor;
  do {
    const c = await withRetry(() => notion.blocks.children.list({ block_id: friendPage.id, start_cursor: bCursor }));
    for (const b of c.results) {
      if (b.type === 'child_database') {
        if (!firstAnyDb) firstAnyDb = b.id;
        if (b.child_database?.title === 'Friends') { childDbId = b.id; break; }
      }
    }
    bCursor = (!childDbId && c.has_more) ? c.next_cursor : undefined;
  } while (bCursor);
  if (!childDbId) childDbId = firstAnyDb; // 兜底：取页面内第一个内嵌数据库
  if (!childDbId) throw new Error('友链页面内部未找到内嵌数据库');

  // 3. 读取该数据库的结构，按字段类型稳健地定位属性名
  const db = await withRetry(() => notion.databases.retrieve({ database_id: childDbId }));
  const props = db.properties || {};
  let titleProp, urlProp, avatarProp, statusProp;
  for (const [name, def] of Object.entries(props)) {
    if (def.type === 'title' && !titleProp) titleProp = name;
    else if (def.type === 'url' && !urlProp) urlProp = name;
    else if (def.type === 'files' && !avatarProp) avatarProp = name;
    else if (def.type === 'status' && !statusProp) statusProp = name;
  }
  // 优先使用前端约定好的字段名
  if (props['url']?.type === 'url') urlProp = 'url';
  if (props['avatar']?.type === 'files') avatarProp = 'avatar';

  let statusValue = 'Published';
  if (statusProp) {
    const options = props[statusProp].status?.options || [];
    if (!options.find((o) => o.name === 'Published')) statusValue = options[0]?.name || 'Published';
  }

  cache = { dbId: childDbId, titleProp, urlProp, avatarProp, statusProp, statusValue };
  return cache;
}

function mapFriend(page, c) {
  const props = page.properties || {};
  const name = c.titleProp ? (props[c.titleProp]?.title?.[0]?.plain_text || '') : '';
  const url = c.urlProp ? (props[c.urlProp]?.url || '') : '';
  let avatar = '';
  if (c.avatarProp) {
    const files = props[c.avatarProp]?.files || [];
    if (files[0]) avatar = files[0].external?.url || files[0].file?.url || '';
  }
  return { id: page.id, name, url, avatar };
}

function buildProperties(c, { name, url, avatar }) {
  const properties = {};
  if (c.titleProp) properties[c.titleProp] = { title: [{ text: { content: name || '' } }] };
  if (c.urlProp) properties[c.urlProp] = { url: url ? url : null };
  if (c.avatarProp) properties[c.avatarProp] = { files: avatar ? [{ type: 'external', name: 'avatar', external: { url: avatar } }] : [] };
  if (c.statusProp) properties[c.statusProp] = { status: { name: c.statusValue } };
  return properties;
}

export default async function handler(req, res) {
  try {
    const c = await discoverFriendsDb();

    if (req.method === 'GET') {
      let results = [];
      let cursor;
      do {
        const r = await withRetry(() => notion.databases.query({ database_id: c.dbId, start_cursor: cursor }));
        results = results.concat(r.results);
        cursor = r.has_more ? r.next_cursor : undefined;
      } while (cursor);
      const friends = results.map((p) => mapFriend(p, c));
      return res.status(200).json({ success: true, friends });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { id, name, url, avatar } = body || {};
      if (!name || !name.trim()) return res.status(400).json({ success: false, error: '名称不能为空' });
      const properties = buildProperties(c, { name: name.trim(), url: (url || '').trim(), avatar: (avatar || '').trim() });
      if (id) {
        await withRetry(() => notion.pages.update({ page_id: id, properties }));
      } else {
        await withRetry(() => notion.pages.create({ parent: { database_id: c.dbId }, properties }));
      }
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ success: false, error: '缺少 id' });
      await withRetry(() => notion.pages.update({ page_id: id, archived: true }));
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    cache = null; // 出错后清空缓存，下次请求重新探测
    console.error('Friends API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
