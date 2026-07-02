'use client'

import Link from 'next/link'
import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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

/** 固定全视口毛玻璃层：不拦截滚动，仅居中密码面板可交互 */
function ArticlePasswordOverlay({
  post,
  input,
  error,
  loading,
  onInputChange,
  onUnlock,
}: {
  post: Post
  input: string
  error: boolean
  loading: boolean
  onInputChange: (value: string) => void
  onUnlock: () => void
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div
      className="article-password-overlay fixed inset-0 z-[9999] pointer-events-none"
      role="presentation"
      aria-hidden="true"
    >
      <div className="article-password-overlay__glass absolute inset-0 bg-black/25 backdrop-blur-xl backdrop-saturate-150 dark:bg-black/40" />
      <div
        className="article-password-overlay__panel pointer-events-auto fixed left-1/2 top-1/2 z-10 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2"
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-password-title"
      >
        <div className="gallery-encrypted-panel relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white/95 shadow-2xl dark:border-neutral-700 dark:bg-[#181818]/95">
          <div className="gallery-encrypted-panel__bg absolute inset-0 bg-neutral-50/90 dark:bg-[#121212]/90" />
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-blue-500/10 blur-[70px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-purple-500/10 blur-[70px] pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center px-6 py-9 text-center select-none sm:py-10">
            <p className="font-gallery mb-2 text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              🔒 会员专享内容
            </p>
            <h2
              id="article-password-title"
              className="font-gallery mb-2 line-clamp-2 text-lg font-semibold text-neutral-900 dark:text-white sm:text-xl"
            >
              {post.title}
            </h2>
            <p className="font-gallery mb-6 max-w-xs text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {loading && !input.trim()
                ? '正在验证访问权限…'
                : '输入密码解锁清晰阅读；您可先滚动预览模糊内容。'}
            </p>
            <div className="flex w-full flex-col items-stretch justify-center gap-3 sm:flex-row">
              <input
                type="password"
                placeholder="请输入文章密码…"
                className={`flex-1 rounded-xl border-2 bg-white px-4 py-2.5 font-gallery text-neutral-900 outline-none transition-all dark:bg-neutral-900 dark:text-white ${
                  error
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 dark:border-transparent dark:hover:bg-neutral-800 dark:focus:border-blue-500'
                }`}
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading && input.trim()) void onUnlock()
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => void onUnlock()}
                disabled={loading || !input.trim()}
                className="gallery-encrypted-panel__unlock whitespace-nowrap rounded-xl bg-neutral-900 px-6 py-2.5 font-gallery text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {loading ? '验证中…' : '解锁阅读'}
              </button>
            </div>
            {error ? (
              <p className="mt-4 text-sm font-medium text-red-500">🚫 密码错误</p>
            ) : null}
            <Link
              href="/"
              className="mt-6 text-sm text-neutral-500 transition-colors hover:text-neutral-800 dark:hover:text-neutral-300"
            >
              ← 返回首页
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function ArticlePasswordGate({
  post,
  initialBlocks,
  children,
}: ArticlePasswordGateProps) {
  const protectedPost = !!post.options?.isPasswordProtected
  const [blocks, setBlocks] = useState<BlockResponse[]>(initialBlocks)
  const [unlocked, setUnlocked] = useState(!protectedPost)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(protectedPost)
  const [relockHover, setRelockHover] = useState(false)

  const applyUnlock = useCallback((nextBlocks: BlockResponse[], token?: string) => {
    if (token) setArticleUnlockToken(post.slug, token)
    if (nextBlocks.length) setBlocks(nextBlocks)
    setUnlocked(true)
    setError(false)
  }, [post.slug])

  const verifyWithToken = useCallback(
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
      applyUnlock(data.blocks?.length ? data.blocks : initialBlocks, data.token || token)
    },
    [post.slug, initialBlocks, applyUnlock]
  )

  useEffect(() => {
    setBlocks(initialBlocks)
  }, [initialBlocks])

  useEffect(() => {
    if (!protectedPost) {
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
        await verifyWithToken(token)
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
  }, [protectedPost, post.slug, verifyWithToken])

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
      applyUnlock(data.blocks?.length ? data.blocks : initialBlocks, data.token)
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
    setBlocks(initialBlocks)
    setInput('')
    setError(false)
  }

  const lockedPreview = protectedPost && !unlocked

  return (
    <div className="article-password-gate relative">
      <div
        className={
          lockedPreview
            ? 'pointer-events-none select-none [filter:saturate(0.85)]'
            : undefined
        }
        aria-hidden={lockedPreview ? true : undefined}
      >
        {children(blocks)}
      </div>

      {lockedPreview ? (
        <ArticlePasswordOverlay
          post={post}
          input={input}
          error={error}
          loading={loading}
          onInputChange={(value) => {
            setInput(value)
            if (error) setError(false)
          }}
          onUnlock={handleUnlock}
        />
      ) : null}

      {protectedPost && unlocked ? (
        <div
          className={`fixed top-20 right-4 z-[9000] transition-opacity duration-300 ${relockHover ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
          onMouseEnter={() => setRelockHover(true)}
          onMouseLeave={() => setRelockHover(false)}
        >
          <button
            type="button"
            onClick={handleRelock}
            className="pointer-events-auto rounded-lg bg-neutral-900/90 px-3 py-1.5 text-xs font-medium text-neutral-300 shadow-lg backdrop-blur-sm transition-colors hover:bg-red-600 hover:text-white"
          >
            🔒 重新锁定
          </button>
        </div>
      ) : null}
    </div>
  )
}
