import CONFIG from '@/blog.config'
import { Post } from '@/src/types/blog'
import { BlockResponse } from '@/src/types/notion'
import { normalizeMediaUrl } from '@/src/lib/notion/readProperty'

export function isDefaultPostCover(src: string | null | undefined): boolean {
  const s = (src || '').trim()
  return !!s && s === CONFIG.DEFAULT_POST_COVER
}

/** Gallery 推荐缩略图：不使用站点默认占位封面 */
export function resolvePostCoverSrc(post: Post): string {
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

/** Notion 正文块中第一张图片 URL（与文章背景 / 自动封面逻辑一致） */
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

/** 列表卡片封面：有图库时优先图库首图，其次 Notion 封面属性 */
export function resolveGalleryListCoverSrc(
  post: Post,
  galleryThumbUrl?: string | null
): string {
  const fromGallery = (galleryThumbUrl || '').trim()
  if (fromGallery && !isDefaultPostCover(fromGallery)) return fromGallery
  return resolvePostCoverSrc(post)
}

/** 分类 banner 等：图库首图 → 封面属性 → 正文首图 */
export function resolveGalleryPostBannerSrc(
  post: Post,
  blocks?: BlockResponse[],
  galleryThumbUrl?: string | null
): string {
  const fromGallery = (galleryThumbUrl || '').trim()
  if (fromGallery && !isDefaultPostCover(fromGallery)) return fromGallery

  const cover = resolvePostCoverSrc(post)
  if (cover) return cover
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
