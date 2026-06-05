import { Post } from '@/src/types/blog'

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

function toRecommendPost(post: Post): GalleryRecommendPost {
  return {
    title: post.title,
    slug: post.slug,
    coverSrc: post.cover?.light?.src || '',
    date: post.date?.updated || post.date?.created || '',
  }
}

/**
 * 猜你喜欢：同 tag → 同 category → 随机补足，最多 6 篇
 */
export function buildGalleryRecommendations(
  current: Post,
  allPosts: Post[],
  limit = GALLERY_RECOMMEND_COUNT
): GalleryRecommendPost[] {
  const pool = allPosts.filter(
    (p) => p.slug !== current.slug && p.status === 'Published'
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

  if (tagIds.size > 0) {
    const byTag = pool
      .map((p) => ({
        p,
        score: (p.tags || []).filter((t) => tagIds.has(t.id)).length,
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.p)
    push(byTag)
  }

  if (picked.length < limit && categoryId) {
    const byCategory = pool.filter(
      (p) => p.category?.id === categoryId && !seen.has(p.slug)
    )
    push(byCategory)
  }

  if (picked.length < limit) {
    const rest = pool.filter((p) => !seen.has(p.slug))
    push(seededShuffle(rest, current.slug))
  }

  return picked.slice(0, limit).map(toRecommendPost)
}
