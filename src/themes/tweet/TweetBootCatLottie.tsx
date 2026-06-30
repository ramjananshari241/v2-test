'use client'

import Lottie from 'lottie-react'
import tweetBootLoaderCat from './tweet-gallery-loader-cat.json'

/** 首屏 / 路由切换遮罩：猫咪 Lottie */
export function TweetBootCatLottie() {
  return (
    <Lottie
      animationData={tweetBootLoaderCat}
      loop
      className="tweet-boot-screen__lottie"
      aria-hidden
    />
  )
}
