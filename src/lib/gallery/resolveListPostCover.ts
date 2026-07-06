import { Post } from '@/src/types/blog'
import { resolveGalleryListCoverSrc } from './postCover'

/**
 * 列表卡片封面：优先 Notion 封面，否则用图库首图（构建期 loadGalleryFeedCovers 注入）。
 * 返回完整 cover 对象供 PostImage 使用。
 */
export function resolveListPostCover(
  post: Post,
  galleryThumbUrl?: string | null
): Post['cover'] {
  const src = resolveGalleryListCoverSrc(post, galleryThumbUrl)
  if (!src) return post.cover
  return {
    light: { ...post.cover.light, src },
    dark: { ...post.cover.dark, src },
  }
}
