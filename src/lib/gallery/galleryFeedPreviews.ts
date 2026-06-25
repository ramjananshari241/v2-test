import { getBlogSiteIdOrNull } from '@/src/lib/gallery/blogSite'
import { listGalleryImages } from '@/src/lib/gallery/galleryDb'
import { normalizeMediaUrl } from '@/src/lib/notion/readProperty'
import { getSupabaseAdmin } from '@/src/lib/supabase/admin'

export type GalleryFeedPreview = {
  total: number
  thumbs: string[]
}

function normalizeThumbUrl(
  thumbUrl: string | null | undefined,
  url: string
): string {
  const raw = (thumbUrl || url || '').trim()
  if (!raw) return ''
  return normalizeMediaUrl(raw) || raw
}

/**
 * 批量读取首页/列表卡片用的图库缩略图（每篇最多 thumbLimit 张）。
 */
export async function loadGalleryFeedPreviews(
  slugs: string[],
  thumbLimit = 6
): Promise<Record<string, GalleryFeedPreview>> {
  const uniqueSlugs = [...new Set(slugs.filter(Boolean))]
  if (!uniqueSlugs.length) return {}

  const sb = getSupabaseAdmin()
  const siteId = getBlogSiteIdOrNull()
  if (!sb || !siteId) return {}

  const { data: galleries, error } = await sb
    .from('galleries')
    .select('post_slug, image_count')
    .eq('site_id', siteId)
    .in('post_slug', uniqueSlugs)

  if (error) throw error
  if (!galleries?.length) return {}

  const slugsWithGallery = galleries
    .filter((g) => (g.image_count ?? 0) > 0)
    .map((g) => g.post_slug as string)

  const results: Record<string, GalleryFeedPreview> = {}

  await Promise.all(
    slugsWithGallery.map(async (slug) => {
      try {
        const { images, total } = await listGalleryImages(slug, 1, thumbLimit)
        const thumbs = images
          .map((img) => normalizeThumbUrl(img.thumb_url, img.url))
          .filter(Boolean)
        if (!thumbs.length) return
        results[slug] = { total, thumbs }
      } catch (err) {
        console.warn('[galleryFeedPreviews] load failed:', slug, err)
      }
    })
  )

  return results
}

/** 列表卡片用：每篇取图库第一张缩略图作为封面候选 */
export async function loadGalleryFeedCovers(
  slugs: string[]
): Promise<Record<string, string>> {
  const previews = await loadGalleryFeedPreviews(slugs, 1)
  const covers: Record<string, string> = {}
  for (const [slug, preview] of Object.entries(previews)) {
    const first = preview.thumbs[0]
    if (first) covers[slug] = first
  }
  return covers
}
