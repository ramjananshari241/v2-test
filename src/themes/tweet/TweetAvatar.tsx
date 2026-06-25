'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { tweetAvatarSrc } from './tweetProfile'

type TweetAvatarProps = {
  profile?: ProfileWidgetType | null
  className?: string
  imgClassName?: string
  fallbackClassName?: string
  fallbackText?: string
}

export function TweetAvatar({
  profile,
  className,
  imgClassName,
  fallbackClassName,
  fallbackText,
}: TweetAvatarProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const name = profile?.name?.trim() || '本站'
  const fallback = fallbackText ?? name.charAt(0).toUpperCase()
  const isDark = mounted && resolvedTheme === 'dark'
  const src = tweetAvatarSrc(profile, { preferDark: isDark })

  if (!src) {
    return (
      <div className={fallbackClassName ?? className}>
        {fallback}
      </div>
    )
  }

  return (
    <span className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className={imgClassName ?? 'tweet-avatar__img'} />
    </span>
  )
}
