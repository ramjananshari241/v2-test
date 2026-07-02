'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  clearArticleUnlockToken,
  getArticleUnlockToken,
  setArticleUnlockToken,
} from '@/src/lib/blog/articlePasswordClient'
import { Post } from '@/src/types/blog'
import { BlockResponse } from '@/src/types/notion'

type ArticlePasswordGateProps = {
  post: Post
  initialBlocks: BlockResponse[]
  children: (blocks: BlockResponse[]) => React.ReactNode
}

export function ArticlePasswordGate({
  post,
  initialBlocks,
  children,
}: ArticlePasswordGateProps) {
  const protectedPost = !!post.options?.isPasswordProtected
  const [blocks, setBlocks] = useState<BlockResponse[]>(
    protectedPost ? [] : initialBlocks
  )
  const [unlocked, setUnlocked] = useState(!protectedPost)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(protectedPost)
  const [relockHover, setRelockHover] = useState(false)

  const fetchWithToken = useCallback(
    async (token: string) => {
      const res = await fetch('/api/post/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: post.slug, token }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || '解锁失败')
      }
      setArticleUnlockToken(post.slug, data.token || token)
      setBlocks(data.blocks || [])
      setUnlocked(true)
      setError(false)
    },
    [post.slug]
  )

  useEffect(() => {
    if (!protectedPost) {
      setBlocks(initialBlocks)
      setUnlocked(true)
      setLoading(false)
      return
    }

    const token = getArticleUnlockToken(post.slug)
    if (!token) {
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        await fetchWithToken(token)
      } catch {
        clearArticleUnlockToken(post.slug)
        if (!cancelled) setUnlocked(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [protectedPost, initialBlocks, post.slug, fetchWithToken])

  const handleUnlock = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/post/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: post.slug, password: input }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(true)
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(200)
        }
        return
      }
      if (data.token) setArticleUnlockToken(post.slug, data.token)
      setBlocks(data.blocks || [])
      setUnlocked(true)
      setInput('')
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleRelock = () => {
    clearArticleUnlockToken(post.slug)
    setUnlocked(false)
    setBlocks([])
    setInput('')
    setError(false)
  }

  if (!protectedPost) {
    return <>{children(blocks)}</>
  }

  if (loading && !unlocked) {
    return (
      <div className="gallery-encrypted-panel relative my-10 overflow-hidden rounded-2xl border border-neutral-200 bg-white px-6 py-12 text-center dark:border-neutral-800 dark:bg-[#181818]">
        <p className="font-gallery text-sm text-neutral-500 dark:text-neutral-400">
          正在验证访问权限…
        </p>
      </div>
    )
  }

  if (!unlocked) {
    return (
      <div className="gallery-encrypted-panel relative my-8 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:border-neutral-800 dark:bg-[#181818] dark:shadow-xl">
        <div className="gallery-encrypted-panel__bg absolute inset-0 bg-neutral-50 dark:bg-[#121212]" />
        <div className="relative z-10 flex flex-col items-center justify-center px-6 py-10 text-center select-none">
          <h2 className="font-gallery mb-2 text-xl font-semibold text-neutral-900 dark:text-white sm:text-2xl">
            {post.title}
          </h2>
          <p className="font-gallery mb-1 text-sm font-medium text-amber-600 dark:text-amber-400">
            🔒 该文章已加密
          </p>
          <p className="font-gallery mb-6 max-w-sm text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            请输入访问密码以查看正文内容。
          </p>
          <div className="flex w-full max-w-sm flex-col items-stretch justify-center gap-3 sm:flex-row">
            <input
              type="password"
              placeholder="请输入文章密码…"
              className={`flex-1 rounded-xl border-2 bg-white px-4 py-2.5 font-gallery text-neutral-900 outline-none transition-all dark:bg-neutral-900 dark:text-white ${
                error
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 dark:border-transparent dark:hover:bg-neutral-800 dark:focus:border-blue-500'
              }`}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                if (error) setError(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) void handleUnlock()
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={() => void handleUnlock()}
              disabled={loading || !input.trim()}
              className="gallery-encrypted-panel__unlock whitespace-nowrap rounded-xl bg-neutral-900 px-6 py-2.5 font-gallery text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {loading ? '验证中…' : '进入文章'}
            </button>
          </div>
          {error ? (
            <p className="mt-4 text-sm font-medium text-red-500">🚫 密码错误</p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div
        className={`absolute top-0 right-0 z-10 transition-opacity duration-300 ${relockHover ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
        onMouseEnter={() => setRelockHover(true)}
        onMouseLeave={() => setRelockHover(false)}
      >
        <button
          type="button"
          onClick={handleRelock}
          className="rounded-md bg-neutral-200/90 px-2 py-1 text-xs text-neutral-600 backdrop-blur-sm transition-colors hover:bg-red-500 hover:text-white dark:bg-neutral-800/80 dark:text-neutral-400"
        >
          🔒 重新锁定
        </button>
      </div>
      {children(blocks)}
    </div>
  )
}
