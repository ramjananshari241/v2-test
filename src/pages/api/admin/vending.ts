import type { NextApiRequest, NextApiResponse } from 'next'
import {
  getVendingConfig,
  updateVendingConfig,
} from '@/src/lib/blog/vendingSettings'

type VendingResponse = {
  success: boolean
  enabled?: boolean
  url?: string
  title?: string
  id?: string | null
  source?: string
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VendingResponse>
) {
  try {
    if (req.method === 'GET') {
      const config = await getVendingConfig()
      return res.status(200).json({ success: true, ...config })
    }

    if (req.method === 'POST') {
      const body =
        typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {}
      const url = String(body.url || '').trim()
      if (url && !url.startsWith('http')) {
        return res.status(400).json({
          success: false,
          error: '贩售机地址必须以 http 开头',
        })
      }
      const config = await updateVendingConfig({
        enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
        url,
        title: String(body.title || '').trim(),
      })
      return res.status(200).json({ success: true, ...config })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (e) {
    const message = e instanceof Error ? e.message : '服务器错误'
    return res.status(500).json({ success: false, error: message })
  }
}
