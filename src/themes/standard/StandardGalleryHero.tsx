'use client'

import { useStandardGalleryPreview } from './StandardGalleryPreviewContext'

export function StandardGalleryHero() {
  const ctx = useStandardGalleryPreview()
  if (!ctx) return null

  const { getImageAt, activeIndex, openLightbox, hasGallery, ready } = ctx
  if (ready && !hasGallery) return null

  const active = getImageAt(activeIndex)

  return (
    <button
      type="button"
      className="standard-gallery-hero"
      onClick={openLightbox}
      disabled={!active}
      aria-label={active ? '全屏预览当前图片' : '图片加载中'}
    >
      {active ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={active.url}
          alt=""
          className="standard-gallery-hero__img"
          loading="eager"
          decoding="async"
        />
      ) : (
        <div className="standard-gallery-hero__placeholder" aria-hidden />
      )}
    </button>
  )
}
