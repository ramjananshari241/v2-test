'use client'

import { useRouter } from 'next/router'
import { FormEvent, useEffect, useState } from 'react'
import { TweetSectionTitle } from './TweetSectionTitle'

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
    router.replace({ pathname: router.pathname, query }, undefined, {
      shallow: true,
    })
  }

  return (
    <div className="tweet-search">
      <TweetSectionTitle emoji="🔎" label="搜索" desktopOnly />
      <form onSubmit={onSubmit}>
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="搜索关键词…"
          className="tweet-search__box"
        />
      </form>
    </div>
  )
}
