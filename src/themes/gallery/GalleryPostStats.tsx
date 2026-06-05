'use client'

import { useEffect, useState } from 'react'
import type { PostStatsSnapshot } from '@/src/lib/gallery/postStats'

type GalleryPostStatsProps = {
  postSlug: string
  publishedDate?: string
  initialStats?: PostStatsSnapshot | null
  /** view = 文章内页；download = 下载页访问 */
  track?: 'view' | 'download' | false
}

function formatDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}

function sessionKey(slug: string, type: string) {
  return `gallery-stat:${type}:${slug}`
}

async function trackOnce(slug: string, type: 'view' | 'download') {
  if (typeof window === 'undefined') return
  const key = sessionKey(slug, type)
  if (sessionStorage.getItem(key)) return
  sessionStorage.setItem(key, '1')
  try {
    await fetch('/api/gallery/post-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, type }),
    })
  } catch {
    /* 静默失败，不影响阅读 */
  }
}

async function fetchStats(slug: string): Promise<PostStatsSnapshot | null> {
  try {
    const res = await fetch(`/api/gallery/post-stats?slug=${encodeURIComponent(slug)}`)
    const data = await res.json()
    if (data.success && data.stats) return data.stats as PostStatsSnapshot
  } catch {
    /* ignore */
  }
  return null
}

/** 内页元信息：日期 + 浏览/下载（Supabase 实时统计） */
export function GalleryPostStats({
  postSlug,
  publishedDate,
  initialStats,
  track = 'view',
}: GalleryPostStatsProps) {
  const [stats, setStats] = useState<PostStatsSnapshot>(
    initialStats || { viewCount: 0, downloadCount: 0 }
  )

  useEffect(() => {
    if (!postSlug) return
    let cancelled = false

    ;(async () => {
      if (track) {
        await trackOnce(postSlug, track)
      }
      const fresh = await fetchStats(postSlug)
      if (!cancelled && fresh) setStats(fresh)
    })()

    return () => {
      cancelled = true
    }
  }, [postSlug, track])

  const dateLabel = formatDate(publishedDate || '')
  const parts: string[] = []
  if (dateLabel) parts.push(dateLabel)
  parts.push(`${stats.viewCount} 浏览`)
  parts.push(`${stats.downloadCount} 下载`)

  return (
    <p className="mb-6 font-gallery text-[13px] font-normal text-neutral-400">
      {parts.join(' · ')}
    </p>
  )
}

export { trackOnce as trackGalleryPostStatOnce }
