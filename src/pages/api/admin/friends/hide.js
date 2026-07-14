import {
  clearFriendsDbCache,
  hideFriendByUrl,
} from '@/src/lib/admin/friendsNotion'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const result = await hideFriendByUrl(body.url)
    return res.status(200).json(result)
  } catch (error) {
    clearFriendsDbCache()
    console.error('Friends hide API Error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
