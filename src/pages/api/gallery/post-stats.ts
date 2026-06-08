import type { NextApiRequest, NextApiResponse } from 'next'
import { formatPosts, FORMAT_POST_LIST_OPTIONS } from '@/src/lib/blog/format/post'
import { pinAnnouncementForGallerySidebar } from '@/src/lib/gallery/galleryRecommendations'
import {
  getAllPostStatsMap,
  getPostStats,
  incrementPostStat,
  isPostStatsConfigured,
  isValidPostSlug,
  pickPopularRecommendations,
} from '@/src/lib/gallery/postStats'
import { getPosts } from '@/src/lib/notion/getBlogData'
import { Post } from '@/src/types/blog'
import { ApiScope } from '@/src/types/notion'

let postsCache: { at: number; posts: Post[] } | null = null
const POSTS_CACHE_MS = 60_000

async function loadPublishedPosts(): Promise<Post[]> {
  if (postsCache && Date.now() - postsCache.at < POSTS_CACHE_MS) {
    return postsCache.posts
  }
  const raw = await getPosts(ApiScope.Archive)
  const posts = (await formatPosts(raw, FORMAT_POST_LIST_OPTIONS)).filter(
    (p) => p.status === 'Published'
  )
  postsCache = { at: Date.now(), posts }
  return posts
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!isPostStatsConfigured()) {
    return res.status(503).json({
      success: false,
      configured: false,
      error: '统计未配置（需 Supabase + BLOG_SITE_ID）',
    })
  }

  if (req.method === 'POST') {
    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch {
        return res.status(400).json({ success: false, error: 'JSON 无效' })
      }
    }
    const slug = String(body?.slug || '').trim()
    const type =
      body?.type === 'download' ? 'download' : body?.type === 'view' ? 'view' : ''

    if (!isValidPostSlug(slug) || !type) {
      return res.status(400).json({ success: false, error: '参数无效' })
    }

    const ok = await incrementPostStat(slug, type)
    if (!ok) {
      return res.status(500).json({ success: false, error: '写入失败' })
    }
    const stats = await getPostStats(slug)
    return res.status(200).json({ success: true, stats })
  }

  if (req.method === 'GET') {
    const mode = String(req.query.mode || '')

    if (mode === 'popular') {
      const limit = Math.min(
        12,
        Math.max(1, parseInt(String(req.query.limit || '6'), 10) || 6)
      )
      const exclude = String(req.query.exclude || '').trim()
      try {
        const [statsMap, allPosts] = await Promise.all([
          getAllPostStatsMap(),
          loadPublishedPosts(),
        ])
        const current =
          allPosts.find((p) => p.slug === exclude) ||
          ({
            slug: exclude,
            status: 'Published',
          } as Post)

        const popular = pickPopularRecommendations(
          current,
          allPosts,
          statsMap,
          limit
        )
        const posts = pinAnnouncementForGallerySidebar(
          popular,
          allPosts,
          limit
        )
        res.setHeader(
          'Cache-Control',
          'public, s-maxage=30, stale-while-revalidate=60'
        )
        return res.status(200).json({ success: true, configured: true, posts })
      } catch (e) {
        console.error('[post-stats] popular:', e)
        return res.status(500).json({ success: false, error: '读取失败' })
      }
    }

    const slug = String(req.query.slug || '').trim()
    if (!isValidPostSlug(slug)) {
      return res.status(400).json({ success: false, error: '缺少 slug' })
    }

    const stats = await getPostStats(slug)
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=10, stale-while-revalidate=30'
    )
    return res.status(200).json({
      success: true,
      configured: true,
      stats: stats || { viewCount: 0, downloadCount: 0 },
    })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
