'use client'

import Lottie from 'lottie-react'
import tweetGalleryLoaderCat from './tweet-gallery-loader-cat.json'

type TweetGalleryGridLoaderProps = {
  compact?: boolean
}

/** Tweet 内页图库加载：猫咪动画 */
export function TweetGalleryGridLoader({
  compact = false,
}: TweetGalleryGridLoaderProps) {
  return (
    <div
      className={
        compact
          ? 'tweet-gallery-loader tweet-gallery-loader--compact'
          : 'tweet-gallery-loader'
      }
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="加载中"
    >
      <Lottie
        animationData={tweetGalleryLoaderCat}
        loop
        className="tweet-gallery-loader__lottie"
        style={{
          width: compact ? 96 : 140,
          height: compact ? 96 : 140,
        }}
      />
    </div>
  )
}
