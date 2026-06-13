'use client'

import { useCallback, useState } from 'react'

type GalleryGridImageProps = {
  src: string
  index: number
  appendFrom: number
  onOpen: () => void
}

export function GalleryGridImage({
  src,
  index,
  appendFrom,
  onOpen,
}: GalleryGridImageProps) {
  const [loaded, setLoaded] = useState(false)
  const isLoadMoreItem = index >= appendFrom && appendFrom > 0
  const staggerIndex = isLoadMoreItem ? index - appendFrom : index
  const delay = Math.min(staggerIndex, 11) * (isLoadMoreItem ? 60 : 45)

  const markLoaded = useCallback(() => setLoaded(true), [])

  const bindImg = useCallback(
    (node: HTMLImageElement | null) => {
      if (!node) return
      if (node.complete && node.naturalHeight > 0) {
        markLoaded()
      }
    },
    [markLoaded, src]
  )

  return (
    <button
      type="button"
      data-gallery-index={index}
      onClick={onOpen}
      className={`gallery-grid-cell group relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-neutral-100 text-left ring-0 transition-shadow hover:ring-2 hover:ring-neutral-900/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 ${
        isLoadMoreItem ? 'gallery-grid-load-more-item' : 'gallery-grid-enter-item'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {!loaded ? (
        <div
          className="absolute inset-0 z-[1] bg-neutral-100"
          aria-hidden
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={bindImg}
        src={src}
        alt=""
        onLoad={markLoaded}
        onError={markLoaded}
        className={`relative z-[2] h-full w-full object-cover transition-[transform,opacity] duration-300 ease-out will-change-transform group-hover:scale-[1.12] ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
        decoding="async"
      />
    </button>
  )
}
