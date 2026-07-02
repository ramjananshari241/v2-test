import CONFIG from '@/blog.config'
import { Post } from '@/src/types/blog'
import { BlockResponse } from '@/src/types/notion'
import { normalizeMediaUrl } from '@/src/lib/notion/readProperty'

export function isDefaultPostCover(src: string | null | undefined): boolean {
  const s = (src || '').trim()
  return !!s && s === CONFIG.DEFAULT_POST_COVER
}

/** 来自 Notion cover 属性的有效封面（不含 formatPost 对 Standard 的占位回退） */
export function resolvePostCoverSrc(post: Post): string {
  if (post.options?.useDefaultCover) {
    return CONFIG.DEFAULT_POST_COVER
  }
  const src = post.cover?.light?.src?.trim() || ''
  if (!src || isDefaultPostCover(src)) return ''
  return src
}

export function pickGalleryRecommendCover(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    const src = (candidate || '').trim()
    if (src && !isDefaultPostCover(src)) return src
  }
  return ''
}

/** Notion 正文块中第一张图片 URL（自动封面回退） */
export function findFirstBlockImageUrl(
  blocks: BlockResponse[] | undefined | null
): string | null {
  if (!blocks?.length) return null
  for (const block of blocks) {
    if (block.type === 'image' && block.image) {
      const img = block.image
      if (img.type === 'external' && img.external?.url) {
        const url = normalizeMediaUrl(img.external.url)
        if (url) return url
      }
      if (img.type === 'file' && img.file?.url) {
        const url = normalizeMediaUrl(img.file.url)
        if (url) return url
      }
    }
    if (block.children?.length) {
      const nested = findFirstBlockImageUrl(block.children)
      if (nested) return nested
    }
  }
  return null
}

/**
 * 文章封面 URL：Notion cover → 正文首图（懒加载场景）
 */
export function resolveBodyCoverUrl(
  coverFromPost: string | null | undefined,
  blocks?: BlockResponse[] | null,
  options?: { useDefaultCover?: boolean }
): string | null {
  if (options?.useDefaultCover) return CONFIG.DEFAULT_POST_COVER
  const fromProp = (coverFromPost || '').trim()
  if (fromProp && !isDefaultPostCover(fromProp)) return fromProp
  const fromBlock = findFirstBlockImageUrl(blocks)
  if (fromBlock && !isDefaultPostCover(fromBlock)) return fromBlock
  return fromBlock || null
}

/** 列表卡片封面：Notion 封面 → 图库首图 → 正文首图 */
export function resolveGalleryListCoverSrc(
  post: Post,
  galleryThumbUrl?: string | null,
  bodyFirstImageUrl?: string | null
): string {
  const fromNotion = resolvePostCoverSrc(post)
  if (fromNotion) return fromNotion

  const fromGallery = (galleryThumbUrl || '').trim()
  if (fromGallery && !isDefaultPostCover(fromGallery)) return fromGallery

  const fromBody = (bodyFirstImageUrl || '').trim()
  if (fromBody && !isDefaultPostCover(fromBody)) return fromBody

  return ''
}

/** 分类 banner 等：Notion 封面 → 图库首图 → 正文首图 */
export function resolveGalleryPostBannerSrc(
  post: Post,
  blocks?: BlockResponse[],
  galleryThumbUrl?: string | null
): string {
  const fromNotion = resolvePostCoverSrc(post)
  if (fromNotion) return fromNotion

  const fromGallery = (galleryThumbUrl || '').trim()
  if (fromGallery && !isDefaultPostCover(fromGallery)) return fromGallery

  const firstImage = findFirstBlockImageUrl(blocks)
  if (firstImage && !isDefaultPostCover(firstImage)) return firstImage
  return firstImage || ''
}

/** 按发布/更新日期取最新一篇（不含置顶优先） */
export function getLatestPostByDate<T extends Pick<Post, 'date'>>(
  posts: T[]
): T | null {
  if (!posts.length) return null
  return [...posts].sort((a, b) => {
    const aTime = new Date(a.date?.updated || a.date?.created).getTime()
    const bTime = new Date(b.date?.updated || b.date?.created).getTime()
    return bTime - aTime
  })[0]
}
