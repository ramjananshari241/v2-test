'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import CONFIG from '@/blog.config'
import { tweetShellClass } from './tweetFonts'

const { ABOUT, FREINDS } = CONFIG.DEFAULT_SPECIAL_PAGES

type TweetHeaderProps = {
  siteName: string
}

export function TweetHeader({ siteName }: TweetHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-neutral-50/90 backdrop-blur-md dark:border-neutral-800 dark:bg-[#111111]/90">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="truncate font-tweet text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
        >
          {siteName}
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href={`/${FREINDS}`}
            className="rounded-lg px-3 py-1.5 font-tweet text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            友链
          </Link>
          <Link
            href={`/${ABOUT}`}
            className="rounded-lg px-3 py-1.5 font-tweet text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            About
          </Link>
          <button
            type="button"
            aria-label="切换深色模式"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {isDark ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

export function TweetShellFrame({
  siteName,
  leftAside,
  rightAside,
  children,
}: {
  siteName: string
  leftAside?: React.ReactNode
  rightAside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className={`min-h-screen min-h-[100dvh] ${tweetShellClass}`}>
      <TweetHeader siteName={siteName} />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,180px)_minmax(0,1fr)_minmax(0,280px)]">
          {leftAside ? (
            <aside className="hidden lg:block">
              <div className="sticky top-[4.5rem]">{leftAside}</div>
            </aside>
          ) : (
            <div className="hidden lg:block" />
          )}
          <main className="min-w-0">{children}</main>
          {rightAside ? (
            <aside className="order-first lg:order-none">
              <div className="lg:sticky lg:top-[4.5rem]">{rightAside}</div>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  )
}
