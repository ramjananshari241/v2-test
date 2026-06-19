import type { NextApiResponse } from 'next'
import {
  clearContentBuildCaches,
  collectPostRevalidatePaths,
  collectShellRevalidatePaths,
  revalidateMany,
  resolveRevalidateOrigin,
} from '@/src/lib/blog/contentRevalidation'
import { isGalleryTenantConfigured } from '@/src/lib/gallery/blogSite'
import { loadOccupiedPostSlugs } from '@/src/lib/blog/generateAdminPostSlug'
import {
  claimCrawlerQueueRows,
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
  res: NextApiResponse,
  occupiedSlugs: Set<string>
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
    const result = await processCrawlerGalleryRow(row, occupiedSlugs)

    await markCrawlerQueueRow(row.id, {
      status: 'done',
      notion_page_id: result.notionPageId,
      slug: result.slug,
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
      slug: result.slug,
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
  res: NextApiResponse,
  options?: { ids?: string[] }
): Promise<CrawlerIngestRunResult> {
  if (!isGalleryTenantConfigured()) {
    throw new Error('爬虫入库未配置（需 Supabase + BLOG_SITE_ID）')
  }

  const batchSize = parseBatchSize()
  const claimLimit = options?.ids?.length
    ? Math.min(options.ids.length, 50)
    : batchSize
  const pending = await claimCrawlerQueueRows({
    ids: options?.ids,
    limit: claimLimit,
  })
  const occupiedSlugs = await loadOccupiedPostSlugs()

  const items: CrawlerIngestRunItem[] = []
  let succeeded = 0
  let failed = 0
  let skipped = 0

  for (const row of pending) {
    const item = await processOneRow(row, res, occupiedSlugs)
    items.push(item)
    if (item.status === 'done') succeeded += 1
    else if (item.status === 'failed') failed += 1
    else skipped += 1
  }

  if (succeeded > 0) {
    try {
      await revalidateShellAfterBatch(res)
    } catch (shellErr) {
      console.warn('爬虫入库后壳层列表刷新失败（文章已写入）', shellErr)
    }
  }

  return {
    processed: items.length,
    succeeded,
    failed,
    skipped,
    items,
  }
}

async function revalidateShellAfterBatch(res: NextApiResponse) {
  clearContentBuildCaches()
  const shellPaths = collectShellRevalidatePaths()
  await revalidateMany(res, shellPaths, {
    clearCaches: false,
    freshTheme: true,
    contentChange: true,
    origin: resolveRevalidateOrigin(),
  })
}
