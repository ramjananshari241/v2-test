'use client'

import { GalleryAdBanner as GalleryAdBannerData } from '@/src/lib/gallery/loadGalleryAdBanner'
import { useState } from 'react'

type TweetAdBannerProps = {
  banner: GalleryAdBannerData
}

/** Tweet 内页底部广告位（复用 gallery-ad widget 数据） */
export function TweetAdBanner({ banner }: TweetAdBannerProps) {
  const { url, imageSrc, promoText } = banner
  const hasImage = Boolean(imageSrc?.startsWith('http'))
  const [imgFailed, setImgFailed] = useState(false)
  const showImage = hasImage && !imgFailed

  return (
    <aside className="tweet-ad-banner">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="tweet-ad-banner__link"
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc!}
            alt=""
            className="tweet-ad-banner__image"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="tweet-ad-banner__fallback" aria-hidden />
        )}
        {promoText ? (
          <div className="tweet-ad-banner__label">
            <p className="tweet-ad-banner__text">{promoText}</p>
          </div>
        ) : (
          <span className="sr-only">广告</span>
        )}
      </a>
    </aside>
  )
}
