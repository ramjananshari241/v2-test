import {
  getFullRedeployStatus,
  triggerFullRedeploy,
} from '@/src/lib/admin/fullRedeploy'

const FULL_REDEPLOY_PASSWORD =
  process.env.ADMIN_FULL_REDEPLOY_PASSWORD?.trim() || '123456'

function readFullRedeployPassword(req) {
  const bodyPassword =
    typeof req.body?.password === 'string' ? req.body.password : ''
  const headerPassword =
    typeof req.headers['x-full-redeploy-password'] === 'string'
      ? req.headers['x-full-redeploy-password']
      : ''
  return (bodyPassword || headerPassword).trim()
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const status = await getFullRedeployStatus()
      return res.status(200).json({ success: true, ...status })
    }

    if (req.method === 'POST') {
      if (readFullRedeployPassword(req) !== FULL_REDEPLOY_PASSWORD) {
        return res.status(403).json({
          success: false,
          error: '全量更新密码错误',
        })
      }

      await triggerFullRedeploy()
      const status = await getFullRedeployStatus()
      return res.status(200).json({
        success: true,
        message:
          '全量更新已触发，请等待3分钟后刷新BLOG，如存在问题请联系管理',
        ...status,
      })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const isCooldown = /小时内仅可使用一次/.test(message)
    return res.status(isCooldown ? 429 : 500).json({
      success: false,
      error: message,
    })
  }
}
