import { verifyAdminRequest } from '@/src/lib/admin/verifyAdminRequest'
import { isGalleryTenantConfigured } from '@/src/lib/gallery/blogSite'
import {
  deleteCrawlerQueueRows,
  getCrawlerQueueSummary,
  listAllPendingCrawlerQueueRows,
  listRecentCrawlerQueueRows,
  retryCrawlerQueueRow,
} from '@/src/lib/ingest/crawlerQueueDb'
import { runCrawlerIngestJob } from '@/src/lib/ingest/runCrawlerIngestJob'

export const config = {
  maxDuration: 300,
}

export default async function handler(req, res) {
  if (!verifyAdminRequest(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  try {
    if (req.method === 'GET') {
      const summary = await getCrawlerQueueSummary()
      const tab = typeof req.query.tab === 'string' ? req.query.tab : ''
      if (tab === 'pending') {
        const pendingItems = await listAllPendingCrawlerQueueRows(500)
        return res.status(200).json({
          success: true,
          configured: isGalleryTenantConfigured(),
          summary,
          pendingItems,
        })
      }
      const items = await listRecentCrawlerQueueRows(100)
      return res.status(200).json({
        success: true,
        configured: isGalleryTenantConfigured(),
        summary,
        items,
      })
    }

    if (req.method === 'POST') {
      const body =
        typeof req.body === 'string'
          ? JSON.parse(req.body || '{}')
          : req.body || {}

      if (body.action === 'retry' && body.id) {
        await retryCrawlerQueueRow(String(body.id))
        const summary = await getCrawlerQueueSummary()
        const items = await listRecentCrawlerQueueRows(100)
        return res.status(200).json({ success: true, summary, items })
      }

      if (body.action === 'delete' && Array.isArray(body.ids) && body.ids.length) {
        const deleted = await deleteCrawlerQueueRows(
          body.ids.map((id) => String(id))
        )
        const summary = await getCrawlerQueueSummary()
        const pendingItems = await listAllPendingCrawlerQueueRows(500)
        const items = await listRecentCrawlerQueueRows(100)
        return res.status(200).json({
          success: true,
          deleted,
          summary,
          pendingItems,
          items,
        })
      }

      const ingestIds =
        body.action === 'ingest' && Array.isArray(body.ids) && body.ids.length
          ? body.ids.map((id) => String(id))
          : undefined

      const result = await runCrawlerIngestJob(res, {
        ids: ingestIds,
      })
      const summary = await getCrawlerQueueSummary()
      const pendingItems = await listAllPendingCrawlerQueueRows(500)
      const items = await listRecentCrawlerQueueRows(100)
      return res.status(200).json({
        success: true,
        ...result,
        summary,
        pendingItems,
        items,
      })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('admin crawler-ingest error:', error)
    return res.status(500).json({ success: false, error: message })
  }
}
