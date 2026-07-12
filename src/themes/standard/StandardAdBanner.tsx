'use client'

import { useState } from 'react'
import { GalleryAdBanner as GalleryAdBannerData } from '@/src/lib/gallery/loadGalleryAdBanner'

type StandardAdBannerProps = {
  banner: GalleryAdBannerData
}

/** Standard 系列文章内页底部广告位（复用后台“内页广告位”数据） */
export function StandardAdBanner({ banner }: StandardAdBannerProps) {
  const { url, imageSrc, promoText } = banner
  const hasImage = Boolean(imageSrc?.startsWith('http'))
  const [imgFailed, setImgFailed] = useState(false)
  const showImage = hasImage && !imgFailed

  return (
    <aside className="not-prose my-10">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="group relative mx-auto flex min-h-[76px] w-full max-w-[760px] items-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-950"
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-800"
            aria-hidden
          />
        )}
        <div className="relative z-10 flex min-h-[76px] w-full items-center bg-black/45 px-5 py-4 transition-colors group-hover:bg-black/55 sm:px-7">
          {promoText ? (
            <p className="w-full text-center text-sm font-medium leading-relaxed tracking-wide text-white sm:text-[15px]">
              {promoText}
            </p>
          ) : (
            <span className="sr-only">广告</span>
          )}
        </div>
      </a>
    </aside>
  )
}
