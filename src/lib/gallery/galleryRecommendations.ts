import { ANNOUNCEMENT_SLUG } from '@/src/lib/blog/pinnedPosts'
import { Post } from '@/src/types/blog'
import {
  pickPopularRecommendations,
  PostStatsSnapshot,
  postPopularityScore,
} from '@/src/lib/gallery/postStats'

export const GALLERY_RECOMMEND_COUNT = 6

export type GalleryRecommendPost = {
  title: string
  slug: string
  coverSrc: string
  date: string
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const copy = [...arr]
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0
  }
  for (let i = copy.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) | 0
    const j = Math.abs(h) % (i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function postToGalleryRecommend(post: Post): GalleryRecommendPost {
  return {
    title: post.title,
    slug: post.slug,
    coverSrc: post.cover?.light?.src || '',
    date: post.date?.updated || post.date?.created || '',
  }
}

/** Gallery 内页：站长公告（slug=announcement） */
export function findGalleryAnnouncementPost(
  allPosts: Post[]
): Post | undefined {
  return allPosts.find(
    (p) => p.slug === ANNOUNCEMENT_SLUG && p.status === 'Published'
  )
}

/** 右侧「热门推荐」：公告始终置顶 */
export function pinAnnouncementForGallerySidebar(
  recommendations: GalleryRecommendPost[],
  allPosts: Post[],
  limit = GALLERY_RECOMMEND_COUNT
): GalleryRecommendPost[] {
  const announcement = findGalleryAnnouncementPost(allPosts)
  if (!announcement) {
    return recommendations.slice(0, limit)
  }
  const pinned = postToGalleryRecommend(announcement)
  const rest = recommendations.filter((p) => p.slug !== ANNOUNCEMENT_SLUG)
  return [pinned, ...rest].slice(0, limit)
}

/** 底部「猜你喜欢」：不展示站长公告 */
export function excludeAnnouncementFromGalleryRecommendations(
  recommendations: GalleryRecommendPost[]
): GalleryRecommendPost[] {
  return recommendations.filter((p) => p.slug !== ANNOUNCEMENT_SLUG)
}

/**
 * 热门推荐：Supabase 热度优先 → 同 tag → 同 category → 随机补足
 */
export function buildGalleryRecommendations(
  current: Post,
  allPosts: Post[],
  limit = GALLERY_RECOMMEND_COUNT,
  statsMap?: Map<string, PostStatsSnapshot>
): GalleryRecommendPost[] {
  const pool = allPosts.filter(
    (p) =>
      p.slug !== current.slug &&
      p.slug !== ANNOUNCEMENT_SLUG &&
      p.status === 'Published'
  )
  const tagIds = new Set((current.tags || []).map((t) => t.id))
  const categoryId = current.category?.id
  const picked: Post[] = []
  const seen = new Set<string>()

  const push = (list: Post[]) => {
    for (const p of list) {
      if (picked.length >= limit) return
      if (seen.has(p.slug)) continue
      seen.add(p.slug)
      picked.push(p)
    }
  }

  if (statsMap && statsMap.size > 0) {
    const popular = pickPopularRecommendations(
      current,
      allPosts,
      statsMap,
      limit
    )
    push(popular.map((r) => pool.find((p) => p.slug === r.slug)).filter(Boolean) as Post[])
  }

  if (tagIds.size > 0) {
    const byTag = pool
      .map((p) => ({
        p,
        score: (p.tags || []).filter((t) => tagIds.has(t.id)).length,
      }))
      .filter((x) => x.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          postPopularityScore(statsMap?.get(b.p.slug)) -
            postPopularityScore(statsMap?.get(a.p.slug))
      )
      .map((x) => x.p)
    push(byTag)
  }

  if (picked.length < limit && categoryId) {
    const byCategory = pool
      .filter((p) => p.category?.id === categoryId && !seen.has(p.slug))
      .sort(
        (a, b) =>
          postPopularityScore(statsMap?.get(b.slug)) -
          postPopularityScore(statsMap?.get(a.slug))
      )
    push(byCategory)
  }

  if (picked.length < limit) {
    const rest = pool
      .filter((p) => !seen.has(p.slug))
      .sort(
        (a, b) =>
          postPopularityScore(statsMap?.get(b.slug)) -
          postPopularityScore(statsMap?.get(a.slug))
      )
    if (rest.every((p) => postPopularityScore(statsMap?.get(p.slug)) === 0)) {
      push(seededShuffle(rest, current.slug))
    } else {
      push(rest)
    }
  }

  return picked.slice(0, limit).map(postToGalleryRecommend)
}
