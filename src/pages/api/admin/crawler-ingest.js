import { verifyAdminRequest } from '@/src/lib/admin/verifyAdminRequest'
import { verifyAdminMaintenancePassword } from '@/src/lib/admin/maintenancePassword'
import { isGalleryTenantConfigured } from '@/src/lib/gallery/blogSite'
import {
  getCrawlerIngestAutoSettings,
  updateCrawlerIngestAutoSettings,
} from '@/src/lib/ingest/crawlerIngestSettings'
import {
  deleteCrawlerQueueRows,
  failStaleProcessingRows,
  getCrawlerQueueSummary,
  listAllPendingCrawlerQueueRows,
  listFailedCrawlerQueueRows,
  listProcessingCrawlerQueueRows,
  listRecentCrawlerQueueRows,
  resetProcessingRowsToPending,
  retryCrawlerQueueRow,
  retryCrawlerQueueRows,
} from '@/src/lib/ingest/crawlerQueueDb'
import { runCrawlerIngestJob } from '@/src/lib/ingest/runCrawlerIngestJob'

export const config = {
  maxDuration: 300,
}

async function buildPanelPayload(tab) {
  const staleFailed = await failStaleProcessingRows()
  const summary = await getCrawlerQueueSummary()
  const autoSettings = await getCrawlerIngestAutoSettings()

  const payload = {
    success: true,
    configured: isGalleryTenantConfigured(),
    summary,
    autoSettings,
    staleFailed,
  }

  if (tab === 'pending') {
    return {
      ...payload,
      pendingItems: await listAllPendingCrawlerQueueRows(500),
    }
  }

  if (tab === 'processing') {
    return {
      ...payload,
      processingItems: await listProcessingCrawlerQueueRows(200),
    }
  }

  if (tab === 'failed') {
    return {
      ...payload,
      failedItems: await listFailedCrawlerQueueRows(200),
    }
  }

  return {
    ...payload,
    items: await listRecentCrawlerQueueRows(100),
  }
}

async function buildSummaryPayload() {
  const summary = await getCrawlerQueueSummary()
  const autoSettings = await getCrawlerIngestAutoSettings()
  return {
    success: true,
    configured: isGalleryTenantConfigured(),
    summary,
    autoSettings,
  }
}

export default async function handler(req, res) {
  if (!verifyAdminRequest(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  try {
    if (req.method === 'GET') {
      if (req.query.summary === '1') {
        const payload = await buildSummaryPayload()
        return res.status(200).json(payload)
      }

      if (!verifyAdminMaintenancePassword(req)) {
        return res.status(403).json({
          success: false,
          error: '爬虫管理密码错误',
        })
      }

      const tab = typeof req.query.tab === 'string' ? req.query.tab : 'log'
      const payload = await buildPanelPayload(tab)
      return res.status(200).json(payload)
    }

    if (req.method === 'POST') {
      const body =
        typeof req.body === 'string'
          ? JSON.parse(req.body || '{}')
          : req.body || {}

      if (!verifyAdminMaintenancePassword(req, body)) {
        return res.status(403).json({
          success: false,
          error: '爬虫管理密码错误',
        })
      }

      if (body.action === 'updateAutoSettings') {
        const enabled = Boolean(body.enabled)
        const hour =
          typeof body.hour === 'number'
            ? body.hour
            : parseInt(String(body.hour ?? '3'), 10)
        const autoSettings = await updateCrawlerIngestAutoSettings({
          enabled,
          hour,
        })
        const summary = await getCrawlerQueueSummary()
        return res.status(200).json({
          success: true,
          autoSettings,
          summary,
        })
      }

      if (body.action === 'reclaimStale') {
        const staleFailed = await failStaleProcessingRows()
        const payload = await buildPanelPayload(
          typeof body.tab === 'string' ? body.tab : 'processing'
        )
        return res.status(200).json({ ...payload, staleFailed })
      }

      if (body.action === 'resetProcessing' && Array.isArray(body.ids) && body.ids.length) {
        const reset = await resetProcessingRowsToPending(
          body.ids.map((id) => String(id))
        )
        const payload = await buildPanelPayload('processing')
        return res.status(200).json({ ...payload, reset })
      }

      if (body.action === 'retry' && body.id) {
        await retryCrawlerQueueRow(String(body.id))
        const payload = await buildPanelPayload(
          typeof body.tab === 'string' ? body.tab : 'failed'
        )
        return res.status(200).json(payload)
      }

      if (body.action === 'retry' && Array.isArray(body.ids) && body.ids.length) {
        const retried = await retryCrawlerQueueRows(
          body.ids.map((id) => String(id))
        )
        const payload = await buildPanelPayload('failed')
        return res.status(200).json({ ...payload, retried })
      }

      if (body.action === 'delete' && Array.isArray(body.ids) && body.ids.length) {
        const deleted = await deleteCrawlerQueueRows(
          body.ids.map((id) => String(id))
        )
        const payload = await buildPanelPayload('pending')
        return res.status(200).json({ ...payload, deleted })
      }

      const ingestIds =
        body.action === 'ingest' && Array.isArray(body.ids) && body.ids.length
          ? body.ids.map((id) => String(id))
          : undefined

      if (body.action === 'ingest' && !ingestIds?.length) {
        return res.status(400).json({
          success: false,
          error: '缺少 ids',
        })
      }

      const deferShellRefresh = Boolean(body.deferShellRefresh)
      const result = await runCrawlerIngestJob(res, {
        ids: ingestIds,
        continuous: ingestIds.length > 1,
        deferShellRefresh,
        maxDurationMs: ingestIds.length === 1 ? 270_000 : undefined,
      })

      const tab =
        ingestIds
          ? 'pending'
          : typeof body.tab === 'string'
            ? body.tab
            : 'log'
      const payload = await buildPanelPayload(tab)
      return res.status(200).json({
        success: true,
        ...result,
        ...payload,
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
