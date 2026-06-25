'use client'

import Lottie from 'lottie-react'
import tweetGalleryLoaderHello from './tweet-gallery-loader-hello.json'

type TweetGalleryGridLoaderProps = {
  compact?: boolean
}

/** Tweet 内页图库加载：Hello 手写动画 */
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
        animationData={tweetGalleryLoaderHello}
        loop
        className="tweet-gallery-loader__lottie"
        style={{
          width: compact ? 80 : 120,
          height: compact ? 80 : 120,
        }}
      />
    </div>
  )
}
