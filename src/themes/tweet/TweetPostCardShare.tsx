'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AiOutlineShareAlt } from 'react-icons/ai'

type TweetPostCardShareProps = {
  slug: string
}

export function TweetPostCardShare({ slug }: TweetPostCardShareProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setShareUrl(
      `${window.location.origin}/post/${encodeURIComponent(slug)}`
    )
  }, [slug])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const stopCardNav = useCallback((event: React.SyntheticEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const copyLink = useCallback(
    async (event: React.MouseEvent) => {
      stopCardNav(event)
      const url =
        shareUrl ||
        `${window.location.origin}/post/${encodeURIComponent(slug)}`
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      } catch {
        setCopied(false)
      }
    },
    [shareUrl, slug, stopCardNav]
  )

  return (
    <div
      ref={rootRef}
      className="tweet-post-card__share"
      onClick={stopCardNav}
    >
      <button
        type="button"
        className="tweet-post-card__share-btn"
        aria-label="分享链接"
        aria-expanded={open}
        onClick={(event) => {
          stopCardNav(event)
          setOpen((value) => !value)
        }}
      >
        <AiOutlineShareAlt aria-hidden />
      </button>

      {open ? (
        <div className="tweet-post-card__share-pop" role="dialog" aria-label="分享链接">
          <input
            type="text"
            className="tweet-post-card__share-input"
            readOnly
            value={shareUrl}
            aria-label="文章链接"
          />
          <button
            type="button"
            className="tweet-post-card__share-copy"
            onClick={copyLink}
          >
            {copied ? '已复制' : '复制链接'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
