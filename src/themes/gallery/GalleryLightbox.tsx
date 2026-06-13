'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type GalleryLightboxImage = {
  url: string
  thumb_url?: string | null
}

type GalleryLightboxProps = {
  open: boolean
  images: GalleryLightboxImage[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

const EXIT_MS = 260

export function GalleryLightbox({
  open,
  images,
  index,
  onClose,
  onPrev,
  onNext,
}: GalleryLightboxProps) {
  // mounted：是否渲染 portal；entered：是否应用「打开」过渡态
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      if (exitTimer.current) {
        clearTimeout(exitTimer.current)
        exitTimer.current = null
      }
      setMounted(true)
      // 下一帧再切到 entered，确保过渡从初始态开始播放
      const frame = requestAnimationFrame(() => setEntered(true))
      return () => cancelAnimationFrame(frame)
    }

    // 关闭：先播放退出动画，再卸载
    setEntered(false)
    exitTimer.current = setTimeout(() => {
      setMounted(false)
      exitTimer.current = null
    }, EXIT_MS)
    return () => {
      if (exitTimer.current) {
        clearTimeout(exitTimer.current)
        exitTimer.current = null
      }
    }
  }, [open])

  const current = images[index]

  // 退出动画期间父级会把 index 归零，需冻结最后一帧画面，避免关闭瞬间闪到第 1 张
  const snapshotRef = useRef<{
    url: string
    index: number
    total: number
    hasPrev: boolean
    hasNext: boolean
  } | null>(null)

  if (open && current) {
    snapshotRef.current = {
      url: current.url,
      index,
      total: images.length,
      hasPrev: index > 0,
      hasNext: index < images.length - 1,
    }
  }

  const view = open && current
    ? {
        url: current.url,
        index,
        total: images.length,
        hasPrev: index > 0,
        hasNext: index < images.length - 1,
      }
    : snapshotRef.current

  const hasPrev = !!view?.hasPrev
  const hasNext = !!view?.hasNext

  useEffect(() => {
    if (!mounted) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onPrev()
      if (e.key === 'ArrowRight' && hasNext) onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [mounted, onClose, onPrev, onNext, hasPrev, hasNext])

  if (!mounted || !view || typeof document === 'undefined') return null

  const state = entered ? 'open' : 'closed'
  // 退出动画期间禁用翻页箭头，避免误触
  const showPrev = open && hasPrev
  const showNext = open && hasNext

  return createPortal(
    <div
      className="gallery-lightbox-backdrop fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm sm:p-6"
      data-state={state}
      role="dialog"
      aria-modal="true"
      aria-label="查看大图"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition-colors hover:bg-white/20"
        aria-label="关闭"
      >
        ×
      </button>

      {showPrev ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onPrev()
          }}
          className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/10 px-3 py-6 text-white transition-colors hover:bg-white/20 sm:block"
          aria-label="上一张"
        >
          ‹
        </button>
      ) : null}

      {showNext ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onNext()
          }}
          className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/10 px-3 py-6 text-white transition-colors hover:bg-white/20 sm:block"
          aria-label="下一张"
        >
          ›
        </button>
      ) : null}

      <div
        className="gallery-lightbox-figure flex max-h-full max-w-full flex-col items-center"
        data-state={state}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          key={view.url}
          src={view.url}
          alt=""
          className="gallery-lightbox-img max-h-[92vh] max-w-[min(96vw,1500px)] select-none rounded-sm object-contain shadow-2xl"
          draggable={false}
        />
        <p className="mt-4 font-gallery text-sm text-white/70">
          {view.index + 1} / {view.total}
        </p>
      </div>
    </div>,
    document.body
  )
}
