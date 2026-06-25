'use client'

import { useEffect, useRef, useState } from 'react'

const coverCache = new Map<string, string | null>()

type TweetPostCardCoverLazyProps = {
  slug: string
}

export function TweetPostCardCoverLazy({ slug }: TweetPostCardCoverLazyProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [src, setSrc] = useState<string | null>(() =>
    coverCache.has(slug) ? coverCache.get(slug) ?? null : null
  )
  const [resolved, setResolved] = useState(() => coverCache.has(slug))

  useEffect(() => {
    if (resolved) return

    const cached = coverCache.get(slug)
    if (cached !== undefined) {
      setSrc(cached)
      setResolved(true)
      return
    }

    const el = sentinelRef.current
    if (!el) return

    let cancelled = false

    const loadCover = async () => {
      try {
        const res = await fetch(
          `/api/tweet/post-cover/${encodeURIComponent(slug)}`
        )
        const data = (await res.json()) as {
          success?: boolean
          url?: string
        }
        const url =
          res.ok && data.success && data.url?.trim()
            ? data.url.trim()
            : null
        if (!cancelled) {
          coverCache.set(slug, url)
          setSrc(url)
          setResolved(true)
        }
      } catch {
        if (!cancelled) {
          coverCache.set(slug, null)
          setResolved(true)
        }
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        observer.disconnect()
        void loadCover()
      },
      { rootMargin: '200px 0px' }
    )

    observer.observe(el)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [slug, resolved])

  if (!resolved) {
    return (
      <div
        ref={sentinelRef}
        className="tweet-post-card__cover-wrap tweet-post-card__cover-wrap--lazy"
        aria-hidden
      />
    )
  }

  if (!src) return null

  return (
    <div className="tweet-post-card__cover-wrap">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="tweet-post-card__cover" />
    </div>
  )
}
