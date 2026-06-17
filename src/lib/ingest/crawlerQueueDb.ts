import { getBlogSiteId, getBlogSiteIdOrNull } from '@/src/lib/gallery/blogSite'
import { getSupabaseAdmin } from '@/src/lib/supabase/admin'

export type CrawlerQueueStatus =
  | 'pending'
  | 'processing'
  | 'done'
  | 'failed'
  | 'skipped'

export type CrawlerQueueRow = {
  id: string
  site_id: string
  source_id: string
  status: CrawlerQueueStatus
  title: string
  slug: string
  excerpt: string | null
  category: string | null
  tags: string | null
  download: string | null
  download_size: string | null
  download_count: string | null
  content: string | null
  image_urls: string[]
  notion_page_id: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  processed_at: string | null
}

function normalizeImageUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((u) => (typeof u === 'string' ? u.trim() : ''))
    .filter((u) => u.startsWith('http'))
}

function mapRow(row: Record<string, unknown>): CrawlerQueueRow {
  return {
    id: String(row.id),
    site_id: String(row.site_id),
    source_id: String(row.source_id),
    status: row.status as CrawlerQueueStatus,
    title: String(row.title || ''),
    slug: String(row.slug || ''),
    excerpt: row.excerpt != null ? String(row.excerpt) : null,
    category: row.category != null ? String(row.category) : null,
    tags: row.tags != null ? String(row.tags) : null,
    download: row.download != null ? String(row.download) : null,
    download_size: row.download_size != null ? String(row.download_size) : null,
    download_count: row.download_count != null ? String(row.download_count) : null,
    content: row.content != null ? String(row.content) : null,
    image_urls: normalizeImageUrls(row.image_urls),
    notion_page_id:
      row.notion_page_id != null ? String(row.notion_page_id) : null,
    error_message: row.error_message != null ? String(row.error_message) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    processed_at: row.processed_at != null ? String(row.processed_at) : null,
  }
}

export async function listPendingCrawlerQueueRows(
  limit: number
): Promise<CrawlerQueueRow[]> {
  const sb = getSupabaseAdmin()
  const siteId = getBlogSiteIdOrNull()
  if (!sb || !siteId) return []

  const safeLimit = Math.min(Math.max(limit, 1), 50)
  const { data, error } = await sb
    .from('crawler_ingest_queue')
    .select('*')
    .eq('site_id', siteId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(safeLimit)

  if (error) throw error
  return (data || []).map((row) => mapRow(row as Record<string, unknown>))
}

export async function getCrawlerQueueSummary(): Promise<{
  pending: number
  processing: number
  done: number
  failed: number
  skipped: number
}> {
  const sb = getSupabaseAdmin()
  const siteId = getBlogSiteIdOrNull()
  if (!sb || !siteId) {
    return { pending: 0, processing: 0, done: 0, failed: 0, skipped: 0 }
  }

  const statuses: CrawlerQueueStatus[] = [
    'pending',
    'processing',
    'done',
    'failed',
    'skipped',
  ]
  const counts = { pending: 0, processing: 0, done: 0, failed: 0, skipped: 0 }

  for (const status of statuses) {
    const { count, error } = await sb
      .from('crawler_ingest_queue')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('status', status)
    if (error) throw error
    counts[status] = count ?? 0
  }

  return counts
}

export async function listRecentCrawlerQueueRows(
  limit: number
): Promise<CrawlerQueueRow[]> {
  const sb = getSupabaseAdmin()
  const siteId = getBlogSiteIdOrNull()
  if (!sb || !siteId) return []

  const safeLimit = Math.min(Math.max(limit, 1), 100)
  const { data, error } = await sb
    .from('crawler_ingest_queue')
    .select('*')
    .eq('site_id', siteId)
    .order('updated_at', { ascending: false })
    .limit(safeLimit)

  if (error) throw error
  return (data || []).map((row) => mapRow(row as Record<string, unknown>))
}

export async function retryCrawlerQueueRow(id: string): Promise<void> {
  await markCrawlerQueueRow(id, {
    status: 'pending',
    error_message: null,
    processed_at: null,
  })
}

export async function markCrawlerQueueRow(
  id: string,
  patch: Partial<{
    status: CrawlerQueueStatus
    slug: string
    notion_page_id: string | null
    error_message: string | null
    processed_at: string | null
  }>
): Promise<void> {
  const sb = getSupabaseAdmin()
  if (!sb) throw new Error('Supabase 未配置')

  const siteId = getBlogSiteId()
  const { error } = await sb
    .from('crawler_ingest_queue')
    .update(patch)
    .eq('site_id', siteId)
    .eq('id', id)

  if (error) throw error
}
