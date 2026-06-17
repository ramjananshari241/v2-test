import { verifyAdminRequest } from '@/src/lib/admin/verifyAdminRequest'
import { isGalleryTenantConfigured } from '@/src/lib/gallery/blogSite'
import { getCrawlerQueueSummary } from '@/src/lib/ingest/crawlerQueueDb'
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
      return res.status(200).json({
        success: true,
        configured: isGalleryTenantConfigured(),
        summary,
      })
    }

    if (req.method === 'POST') {
      const result = await runCrawlerIngestJob(res)
      return res.status(200).json({ success: true, ...result })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('admin crawler-ingest error:', error)
    return res.status(500).json({ success: false, error: message })
  }
}
