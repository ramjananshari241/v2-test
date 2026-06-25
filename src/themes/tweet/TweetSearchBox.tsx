'use client'

import { useRouter } from 'next/router'
import { FormEvent, useEffect, useState } from 'react'
import { tweetCardSurfaceClass } from './tweetFonts'

export function TweetSearchBox() {
  const router = useRouter()
  const [value, setValue] = useState('')

  useEffect(() => {
    if (!router.isReady) return
    const q = router.query.q
    setValue(typeof q === 'string' ? q : '')
  }, [router.isReady, router.query.q])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const query = { ...router.query }
    const trimmed = value.trim()
    if (trimmed) query.q = trimmed
    else delete query.q
    delete query.page
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true })
  }

  return (
    <div className={`${tweetCardSurfaceClass} p-4`}>
      <div className="mb-2 flex items-center gap-2 font-tweet text-sm font-semibold text-neutral-500 dark:text-neutral-400">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        Search
      </div>
      <form onSubmit={onSubmit}>
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search Keyword..."
          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 font-tweet text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500"
        />
      </form>
    </div>
  )
}
