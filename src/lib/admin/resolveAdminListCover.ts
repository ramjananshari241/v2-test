import CONFIG from '@/blog.config'
import {
  isDefaultPostCover,
  resolveGalleryListCoverSrc,
} from '@/src/lib/gallery/postCover'
import type { Post } from '@/src/types/blog'

function buildListPostStub(notionCover: string): Post {
  const trimmed = (notionCover || '').trim()
  const useDefaultCover = isDefaultPostCover(trimmed)
  const lightSrc = trimmed || CONFIG.DEFAULT_POST_COVER
  const info = { placeholder: '', width: 0, height: 0 }
  return {
    cover: {
      light: { src: lightSrc, info },
      dark: { src: lightSrc, info },
    },
    options: { useDefaultCover },
  } as Post
}

/** 后台列表封面：与前台 resolveListPostCover + loadGalleryFeedCovers 回退链一致 */
export function resolveAdminListCoverSrc(
  notionCover: string,
  galleryThumbUrl?: string | null
): string {
  const post = buildListPostStub(notionCover)
  const resolved = resolveGalleryListCoverSrc(post, galleryThumbUrl)
  return resolved || CONFIG.DEFAULT_POST_COVER
}
