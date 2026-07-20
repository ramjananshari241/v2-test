'use client'

import { useEffect, useRef, useState } from 'react'

const coverCache = new Map<string, string | null>()

export function GalleryCardCoverLazy({
  slug,
  title,
}: {
  slug: string
  title: string
}) {
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

    const element = sentinelRef.current
    if (!element) return
    let cancelled = false

    const loadCover = async () => {
      try {
        const response = await fetch(
          `/api/tweet/post-cover/${encodeURIComponent(slug)}`
        )
        const data = (await response.json()) as {
          success?: boolean
          url?: string
        }
        const url =
          response.ok && data.success && data.url?.trim()
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
      { rootMargin: '300px 0px' }
    )

    observer.observe(element)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [slug, resolved])

  if (src) {
    return (
      <img
        src={src}
        alt={title}
        className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.08]"
      />
    )
  }

  return (
    <div
      ref={resolved ? undefined : sentinelRef}
      className="flex h-full w-full items-center justify-center text-3xl font-bold text-neutral-300"
    >
      P
    </div>
  )
}
