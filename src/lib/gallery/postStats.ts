import {
  getBlogSiteId,
  getBlogSiteIdOrNull,
  isGalleryTenantConfigured,
} from '@/src/lib/gallery/blogSite'
import { ANNOUNCEMENT_SLUG } from '@/src/lib/blog/pinnedPosts'
import {
  GalleryRecommendPost,
  GALLERY_RECOMMEND_COUNT,
  pinAnnouncementForGallerySidebar,
  postToGalleryRecommend,
} from '@/src/lib/gallery/galleryRecommendations'
import { getSupabaseAdmin } from '@/src/lib/supabase/admin'
import { Post } from '@/src/types/blog'

export type PostStatsSnapshot = {
  viewCount: number
  downloadCount: number
}

const SLUG_RE = /^[a-zA-Z0-9_-]+$/

export function isValidPostSlug(slug: string): boolean {
  const s = slug?.trim()
  return Boolean(s && s.length <= 200 && SLUG_RE.test(s))
}

export function postPopularityScore(stats?: PostStatsSnapshot | null): number {
  if (!stats) return 0
  return Math.max(0, stats.viewCount) + Math.max(0, stats.downloadCount) * 3
}

export function isPostStatsConfigured(): boolean {
  return isGalleryTenantConfigured()
}

export async function getAllPostStatsMap(): Promise<
  Map<string, PostStatsSnapshot>
> {
  const sb = getSupabaseAdmin()
  const map = new Map<string, PostStatsSnapshot>()
  const siteId = getBlogSiteIdOrNull()
  if (!sb || !siteId) return map
  const { data, error } = await sb
    .from('post_stats')
    .select('post_slug, view_count, download_count')
    .eq('site_id', siteId)
  if (error) {
    console.warn('[postStats] getAllPostStatsMap:', error.message)
    return map
  }

  for (const row of data || []) {
    map.set(row.post_slug, {
      viewCount: Number(row.view_count) || 0,
      downloadCount: Number(row.download_count) || 0,
    })
  }
  return map
}

export async function getPostStats(slug: string): Promise<PostStatsSnapshot | null> {
  if (!isValidPostSlug(slug)) return null
  const sb = getSupabaseAdmin()
  const siteId = getBlogSiteIdOrNull()
  if (!sb || !siteId) return null
  const { data, error } = await sb
    .from('post_stats')
    .select('view_count, download_count')
    .eq('site_id', siteId)
    .eq('post_slug', slug.trim())
    .maybeSingle()

  if (error || !data) return null
  return {
    viewCount: Number(data.view_count) || 0,
    downloadCount: Number(data.download_count) || 0,
  }
}

export async function incrementPostStat(
  slug: string,
  field: 'view' | 'download'
): Promise<boolean> {
  if (!isValidPostSlug(slug)) return false
  const sb = getSupabaseAdmin()
  const siteId = getBlogSiteIdOrNull()
  if (!sb || !siteId) return false
  const { error } = await sb.rpc('increment_post_stat', {
    p_site_id: siteId,
    p_slug: slug.trim(),
    p_field: field,
  })

  if (error) {
    console.warn('[postStats] incrementPostStat:', error.message)
    return false
  }
  return true
}

export function pickPopularRecommendations(
  current: Post,
  allPosts: Post[],
  statsMap: Map<string, PostStatsSnapshot>,
  limit = GALLERY_RECOMMEND_COUNT
): GalleryRecommendPost[] {
  const pool = allPosts.filter(
    (p) =>
      p.slug !== current.slug &&
      p.slug !== ANNOUNCEMENT_SLUG &&
      p.status === 'Published'
  )

  const scored = pool
    .map((p) => ({
      post: p,
      score: postPopularityScore(statsMap.get(p.slug)),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map((x) => postToGalleryRecommend(x.post))
}
