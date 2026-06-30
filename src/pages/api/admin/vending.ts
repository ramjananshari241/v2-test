import type { NextApiRequest, NextApiResponse } from 'next'
import {
  getVendingEnabled,
  updateVendingEnabled,
} from '@/src/lib/blog/vendingSettings'

type VendingResponse = {
  success: boolean
  enabled?: boolean
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VendingResponse>
) {
  try {
    if (req.method === 'GET') {
      const enabled = await getVendingEnabled()
      return res.status(200).json({ success: true, enabled })
    }

    if (req.method === 'POST') {
      const body =
        typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {}
      const enabled = Boolean(body.enabled)
      const next = await updateVendingEnabled(enabled)
      return res.status(200).json({ success: true, enabled: next })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (e) {
    const message = e instanceof Error ? e.message : '服务器错误'
    return res.status(500).json({ success: false, error: message })
  }
}
