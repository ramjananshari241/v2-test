'use client'

import { Post } from '@/src/types/blog'
import { useRouter } from 'next/router'
import { useMemo, useRef, useState, useEffect } from 'react'

const ALL_LABEL = 'All'

export function TweetFeedHeader({ posts }: { posts: Post[] }) {
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [opened, setOpened] = useState(false)

  const currentCategoryId =
    typeof router.query.category === 'string' ? router.query.category : ''
  const currentOrder =
    typeof router.query.order === 'string' ? router.query.order : 'desc'

  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>()
    for (const post of posts) {
      const id = post.category?.id
      const name = post.category?.name?.trim()
      if (!id || !name) continue
      const existing = map.get(id)
      if (existing) existing.count += 1
      else map.set(id, { id, name, count: 1 })
    }
    return Array.from(map.values())
  }, [posts])

  const currentLabel =
    categories.find((c) => c.id === currentCategoryId)?.name ?? ALL_LABEL

  useEffect(() => {
    if (!opened) return
    const onDocClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpened(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [opened])

  const setQuery = (patch: Record<string, string | undefined>) => {
    const query = { ...router.query }
    for (const [key, val] of Object.entries(patch)) {
      if (val === undefined) delete query[key]
      else query[key] = val
    }
    delete query.page
    router.replace({ pathname: router.pathname, query }, undefined, {
      shallow: true,
    })
    setOpened(false)
  }

  return (
    <div className="tweet-feed-header">
      <div className="tweet-feed-header__category" ref={dropdownRef}>
        <button
          type="button"
          className="tweet-feed-header__category-trigger"
          onClick={() => setOpened((v) => !v)}
          aria-expanded={opened}
        >
          {currentLabel} Posts
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </button>
        {opened ? (
          <div className="tweet-feed-header__dropdown">
            <button
              type="button"
              className="tweet-feed-header__dropdown-item"
              onClick={() => setQuery({ category: undefined })}
            >
              {ALL_LABEL} ({posts.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className="tweet-feed-header__dropdown-item"
                onClick={() => setQuery({ category: cat.id })}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="tweet-feed-header__order">
        <button
          type="button"
          className="tweet-feed-header__order-btn"
          data-active={currentOrder === 'desc'}
          onClick={() => setQuery({ order: 'desc' })}
        >
          Desc
        </button>
        <button
          type="button"
          className="tweet-feed-header__order-btn"
          data-active={currentOrder === 'asc'}
          onClick={() => setQuery({ order: 'asc' })}
        >
          Asc
        </button>
      </div>
    </div>
  )
}
