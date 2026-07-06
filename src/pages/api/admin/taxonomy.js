import { Client } from '@notionhq/client';
import { deleteCategoryFromNotion, deleteTagFromNotion } from '@/src/lib/blog/deleteTaxonomy';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const notion = new Client({ auth: process.env.NOTION_KEY || process.env.NOTION_TOKEN });
  const databaseId = process.env.NOTION_DATABASE_ID || process.env.NOTION_PAGE_ID;

  if (!databaseId) {
    return res.status(500).json({ success: false, error: '未配置 Notion 数据库 ID' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const type = (body?.type || '').trim();
    const name = (body?.name || '').trim();

    if (!name) {
      return res.status(400).json({ success: false, error: '缺少 name' });
    }

    let result;
    if (type === 'category') {
      result = await withRetry(() => deleteCategoryFromNotion(notion, databaseId, name));
    } else if (type === 'tag') {
      result = await withRetry(() => deleteTagFromNotion(notion, databaseId, name));
    } else {
      return res.status(400).json({ success: false, error: 'type 须为 category 或 tag' });
    }

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Taxonomy delete error:', error);
    return res.status(500).json({ success: false, error: error.message || '删除失败' });
  }
}
