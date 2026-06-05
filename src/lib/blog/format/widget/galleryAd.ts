import { BlogStats, Widget } from '@/src/types/blog'

export type GalleryAdWidgetType = {
  url: string
  promoText: string
  coverOverride: string | null
}

export function formatGalleryAdWidget(
  properties: Widget['properties'],
  _blogStats?: BlogStats
): GalleryAdWidgetType {
  const url = (properties.excerpt || '').trim()
  const promoText = (properties.title || '').trim()
  const coverSrc = properties.cover?.light?.src
  const coverOverride =
    coverSrc && coverSrc.startsWith('http') ? coverSrc : null

  return {
    url,
    promoText,
    coverOverride,
  }
}
