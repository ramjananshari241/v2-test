import { findFirstBlockImageUrl, isDefaultPostCover } from '@/src/lib/gallery/postCover'
import {
  GalleryFeedPreview,
  loadGalleryFeedPreviews,
} from '@/src/lib/gallery/galleryFeedPreviews'
import { getAllBlocks } from '@/src/lib/notion/getBlocks'
import { Post } from '@/src/types/blog'

export type TweetFeedMediaMap = {
  galleryPreviews: Record<string, GalleryFeedPreview>
  bodyImages: Record<string, string>
  /** 无图库且未在构建期拉正文首图的文章（客户端懒加载） */
  deferredBodyImageSlugs: string[]
}

/** 构建 / ISR 时最多为无图库文章拉正文首图；其余走客户端懒加载 */
export const TWEET_BODY_IMAGE_BUILD_LIMIT = 15

const BODY_IMAGE_CONCURRENCY = 5
const GALLERY_THUMB_LIMIT = 6

async function mapWithConcurrency<T, R>(
  items: T[],
  mapper: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let index = 0

  async function worker() {
    while (index < items.length) {
      const current = index++
      results[current] = await mapper(items[current])
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  )
  await Promise.all(workers)
  return results
}

/**
 * Tweet 列表卡片媒体数据：优先图库缩略图；无图库时构建期最多拉前
 * {@link TWEET_BODY_IMAGE_BUILD_LIMIT} 篇正文首图，其余客户端懒加载。
 */
export async function loadTweetFeedMedia(
  posts: Post[]
): Promise<TweetFeedMediaMap> {
  const slugs = posts.map((p) => p.slug)
  const galleryPreviews = await loadGalleryFeedPreviews(
    slugs,
    GALLERY_THUMB_LIMIT
  )

  const postsNeedingBodyImage = posts.filter(
    (post) => !galleryPreviews[post.slug]?.thumbs?.length
  )
  const prefetchPosts = postsNeedingBodyImage.slice(
    0,
    TWEET_BODY_IMAGE_BUILD_LIMIT
  )
  const deferredBodyImageSlugs = postsNeedingBodyImage
    .slice(TWEET_BODY_IMAGE_BUILD_LIMIT)
    .map((post) => post.slug)

  const bodyImageEntries = await mapWithConcurrency(
    prefetchPosts,
    async (post) => {
      try {
        const blocks = await getAllBlocks(post.id)
        const url = findFirstBlockImageUrl(blocks)
        return url && !isDefaultPostCover(url)
          ? { slug: post.slug, url }
          : null
      } catch (err) {
        console.warn('[loadTweetFeedMedia] blocks failed:', post.slug, err)
        return null
      }
    },
    BODY_IMAGE_CONCURRENCY
  )

  const bodyImages: Record<string, string> = {}
  for (const entry of bodyImageEntries) {
    if (entry?.url) bodyImages[entry.slug] = entry.url
  }

  return { galleryPreviews, bodyImages, deferredBodyImageSlugs }
}
