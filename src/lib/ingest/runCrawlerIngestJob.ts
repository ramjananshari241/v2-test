import type { NextApiResponse } from 'next'
import {
  clearContentBuildCaches,
  collectPostRevalidatePaths,
  revalidateMany,
  resolveRevalidateOrigin,
} from '@/src/lib/blog/contentRevalidation'
import { isGalleryTenantConfigured } from '@/src/lib/gallery/blogSite'
import {
  listPendingCrawlerQueueRows,
  markCrawlerQueueRow,
  type CrawlerQueueRow,
} from '@/src/lib/ingest/crawlerQueueDb'
import { processCrawlerGalleryRow } from '@/src/lib/ingest/processCrawlerGalleryRow'
import { slugify } from '@/src/lib/util'

export type CrawlerIngestRunItem = {
  id: string
  source_id: string
  slug: string
  status: 'done' | 'failed' | 'skipped'
  action?: 'created' | 'updated'
  notionPageId?: string
  imageCount?: number
  error?: string
}

export type CrawlerIngestRunResult = {
  processed: number
  succeeded: number
  failed: number
  skipped: number
  items: CrawlerIngestRunItem[]
}

function parseBatchSize(): number {
  const raw = process.env.CRAWLER_INGEST_BATCH_SIZE?.trim()
  const n = raw ? parseInt(raw, 10) : 20
  if (!Number.isFinite(n) || n < 1) return 20
  return Math.min(n, 50)
}

async function revalidatePost(
  res: NextApiResponse,
  row: CrawlerQueueRow,
  slug: string
) {
  const tagIds = (row.tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((name) => slugify(name))

  const categoryId = row.category?.trim() ? slugify(row.category.trim()) : null

  const paths = await collectPostRevalidatePaths(slug, {
    categoryId,
    tagIds,
  })

  clearContentBuildCaches()
  await revalidateMany(res, paths, {
    clearCaches: false,
    contentChange: true,
    origin: resolveRevalidateOrigin(),
  })
}

async function processOneRow(
  row: CrawlerQueueRow,
  res: NextApiResponse
): Promise<CrawlerIngestRunItem> {
  const base = {
    id: row.id,
    source_id: row.source_id,
    slug: row.slug,
  }

  await markCrawlerQueueRow(row.id, {
    status: 'processing',
    error_message: null,
  })

  try {
    const result = await processCrawlerGalleryRow(row)

    await markCrawlerQueueRow(row.id, {
      status: 'done',
      notion_page_id: result.notionPageId,
      error_message: null,
      processed_at: new Date().toISOString(),
    })

    try {
      await revalidatePost(res, row, result.slug)
    } catch (revErr) {
      console.warn('爬虫入库后 ISR 刷新失败（文章已写入）', revErr)
    }

    return {
      ...base,
      status: 'done',
      action: result.action,
      notionPageId: result.notionPageId,
      imageCount: result.imageCount,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await markCrawlerQueueRow(row.id, {
      status: 'failed',
      error_message: message.slice(0, 2000),
      processed_at: new Date().toISOString(),
    })
    return { ...base, status: 'failed', error: message }
  }
}

export async function runCrawlerIngestJob(
  res: NextApiResponse
): Promise<CrawlerIngestRunResult> {
  if (!isGalleryTenantConfigured()) {
    throw new Error('爬虫入库未配置（需 Supabase + BLOG_SITE_ID）')
  }

  const batchSize = parseBatchSize()
  const pending = await listPendingCrawlerQueueRows(batchSize)

  const items: CrawlerIngestRunItem[] = []
  let succeeded = 0
  let failed = 0
  let skipped = 0

  for (const row of pending) {
    const item = await processOneRow(row, res)
    items.push(item)
    if (item.status === 'done') succeeded += 1
    else if (item.status === 'failed') failed += 1
    else skipped += 1
  }

  return {
    processed: items.length,
    succeeded,
    failed,
    skipped,
    items,
  }
}
