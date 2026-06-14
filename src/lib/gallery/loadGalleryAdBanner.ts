import { fetchUrlPreview } from '@/src/lib/blog/fetchUrlPreview'
import { queryDatabasePages } from '@/src/lib/notion/getDatabase'
import { slugEqualsFilter } from '@/src/lib/notion/filter'
import {
  readCoverFromPageProperties,
  readRichTextPlain,
} from '@/src/lib/notion/readProperty'
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'

export type GalleryAdBanner = {
  url: string
  imageSrc: string | null
  promoText: string | null
}

const GALLERY_AD_SLUG = 'gallery-ad'

let buildCache: GalleryAdBanner | null | undefined

export function clearGalleryAdBannerCache(): void {
  buildCache = undefined
}

async function findGalleryAdWidget(): Promise<PageObjectResponse | null> {
  const results = await queryDatabasePages(slugEqualsFilter(GALLERY_AD_SLUG), {
    pageSize: 5,
  })
  return (
    results.find(
      (page) =>
        page.properties['type']?.type === 'select' &&
        page.properties['type'].select?.name === 'Widget' &&
        readRichTextPlain(page.properties.slug) === GALLERY_AD_SLUG
    ) ?? null
  )
}

export async function loadGalleryAdBanner(): Promise<GalleryAdBanner | null> {
  if (buildCache !== undefined) return buildCache

  const raw = await findGalleryAdWidget()
  if (!raw) {
    buildCache = null
    return null
  }

  const url = readRichTextPlain(raw.properties.excerpt) || ''
  if (!url.startsWith('http')) {
    buildCache = null
    return null
  }

  const coverOverride = readCoverFromPageProperties(raw.properties)

  let imageSrc: string | null = coverOverride
  if (!imageSrc) {
    try {
      const preview = await fetchUrlPreview(url)
      imageSrc =
        preview.image?.startsWith('http') ? preview.image : null
    } catch {
      imageSrc = null
    }
  }

  const rawTitle = readRichTextPlain(raw.properties.title) || ''
  const promoText =
    rawTitle && rawTitle !== '广告位' ? rawTitle : null

  if (!imageSrc && !promoText) {
    buildCache = null
    return null
  }

  buildCache = {
    url,
    imageSrc,
    promoText,
  }
  return buildCache
}
