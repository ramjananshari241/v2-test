'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { GalleryRecommendPost } from '@/src/lib/gallery/galleryRecommendations'

const COVER_ASPECT = 'aspect-[10/13.35]'

function formatPostDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}

type GalleryPopularSidebarProps = {
  posts: GalleryRecommendPost[]
  excludeSlug?: string
  className?: string
}

/** Gallery Epic 风格：内页右侧「热门推荐」（支持 Supabase 热度刷新） */
export function GalleryPopularSidebar({
  posts: initialPosts,
  excludeSlug = '',
  className = '',
}: GalleryPopularSidebarProps) {
  const [posts, setPosts] = useState(initialPosts)

  useEffect(() => {
    setPosts(initialPosts)
  }, [initialPosts])

  useEffect(() => {
    if (!excludeSlug) return
    let cancelled = false
    fetch(
      `/api/gallery/post-stats?mode=popular&exclude=${encodeURIComponent(excludeSlug)}&limit=6`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success && Array.isArray(data.posts) && data.posts.length) {
          setPosts(data.posts)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [excludeSlug])

  if (!posts.length) return null

  return (
    <aside
      className={`w-[280px] shrink-0 border-neutral-200 lg:border-l lg:pl-8 ${className}`.trim()}
    >
      <h2 className="mb-5 font-gallery text-[14px] font-normal tracking-wide text-neutral-400">
        热门推荐
      </h2>
      <ul className="flex flex-col gap-6">
        {posts.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/post/${item.slug}`}
              className="group flex items-start gap-3.5"
            >
              <div className="w-[92px] shrink-0 overflow-hidden rounded-md bg-neutral-100">
                <div className={`relative ${COVER_ASPECT}`}>
                  {item.coverSrc ? (
                    <img
                      src={item.coverSrc}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-neutral-300">
                      P
                    </div>
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="line-clamp-3 font-gallery text-[13px] font-normal leading-[1.45] tracking-[0.01em] text-neutral-900 transition-colors group-hover:text-neutral-500">
                  {item.title}
                </p>
                {item.date ? (
                  <p className="mt-2 font-gallery text-[12px] text-neutral-400">
                    {formatPostDate(item.date)}
                  </p>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}
