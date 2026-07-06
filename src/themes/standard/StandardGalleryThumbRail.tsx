'use client'

import { useCallback, useRef } from 'react'
import {
  standardGalleryThumbUrl,
  useStandardGalleryPreview,
} from './StandardGalleryPreviewContext'

export function StandardGalleryThumbRail() {
  const ctx = useStandardGalleryPreview()
  const railRef = useRef<HTMLDivElement>(null)

  const onScroll = useCallback(() => {
    const el = railRef.current
    if (!el || !ctx) return
    const nearEnd =
      el.scrollLeft + el.clientWidth >= el.scrollWidth - 72
    if (nearEnd) ctx.maybeLoadMore()
  }, [ctx])

  if (!ctx?.hasGallery || !ctx.ready) return null

  const { total, activeIndex, setActiveIndex, getImageAt, loadingMore } = ctx

  if (total <= 0) return null

  return (
    <section className="standard-gallery-preview" aria-label="预览">
      <h2 className="standard-gallery-preview__title">预览</h2>
      <div
        ref={railRef}
        className="standard-gallery-preview__rail"
        onScroll={onScroll}
      >
        {Array.from({ length: total }, (_, index) => {
          const img = getImageAt(index)
          const thumb = standardGalleryThumbUrl(index, img)
          const isActive = index === activeIndex

          if (thumb) {
            return (
              <button
                key={img?.id || `thumb-${index}`}
                type="button"
                className={`standard-gallery-preview__thumb${isActive ? ' is-active' : ''}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`预览第 ${index + 1} 张`}
                aria-pressed={isActive}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb} alt="" loading="lazy" decoding="async" />
              </button>
            )
          }

          return (
            <button
              key={`placeholder-${index}`}
              type="button"
              className={`standard-gallery-preview__thumb standard-gallery-preview__thumb--placeholder${isActive ? ' is-active' : ''}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`第 ${index + 1} 张加载中`}
              aria-pressed={isActive}
            />
          )
        })}
        {loadingMore ? (
          <div
            className="standard-gallery-preview__thumb standard-gallery-preview__thumb--placeholder standard-gallery-preview__thumb--loading"
            aria-hidden
          />
        ) : null}
      </div>
    </section>
  )
}
