import CONFIG from '@/blog.config'
import { fetchUrlPreview } from '@/src/lib/blog/fetchUrlPreview'
import { formatPosts } from '@/src/lib/blog/format/post'
import { getWidgets } from '@/src/lib/notion/getBlogData'
import { readRichTextPlain } from '@/src/lib/notion/readProperty'

export type GalleryAdBanner = {
  url: string
  imageSrc: string
  promoText: string | null
}

const GALLERY_AD_SLUG = 'gallery-ad'

function isUsableCover(src: string | undefined | null): src is string {
  if (!src || !src.startsWith('http')) return false
  if (src === CONFIG.DEFAULT_POST_COVER) return false
  return true
}

export async function loadGalleryAdBanner(): Promise<GalleryAdBanner | null> {
  const widgets = await getWidgets()
  const raw = widgets.find(
    (w) => readRichTextPlain(w.properties.slug) === GALLERY_AD_SLUG
  )
  if (!raw) return null

  const [widget] = await formatPosts([raw])
  const url = (widget.excerpt || '').trim()
  if (!url.startsWith('http')) return null

  const coverOverride = isUsableCover(widget.cover?.light?.src)
    ? widget.cover.light.src
    : null

  let imageSrc = coverOverride
  if (!imageSrc) {
    const preview = await fetchUrlPreview(url)
    imageSrc = preview.image?.startsWith('http') ? preview.image : null
  }

  if (!imageSrc) return null

  const rawTitle = (widget.title || '').trim()
  const promoText =
    rawTitle && rawTitle !== '广告位' ? rawTitle : null

  return {
    url,
    imageSrc,
    promoText,
  }
}
