'use client'

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { useRouter } from 'next/router'

/** 转圈超过该时长仍未跳转，判定为「卡住」，提示用户点此重开 */
const STALL_MS = 2000

/**
 * 卡片点击后的「单卡加载态」：
 * 文章内页按需 ISR（fallback blocking）首次生成会现场调用 Notion，存在秒级延迟。
 * 点击封面后在被点的那张卡片上显示加载动画，避免「点了没反应」的错觉。
 *
 * 已知问题：Next 客户端导航在拉取 `_next/data` 时偶发卡住（服务端其实已生成并缓存，
 * 手动刷新即可秒开），此时 routeChangeComplete/Error 都不会触发，转圈会一直卡住。
 * 处理方式：
 *  1) 超过 STALL_MS 仍未完成 → 在卡片上显示提示，告知可重新打开；
 *  2) 对已在加载中的同一张卡片再次点击（或点提示）→ 直接整页跳转（等价于手动刷新，必定打开）。
 */
export function useGalleryNavLoading() {
  const router = useRouter()
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [stalledKey, setStalledKey] = useState<string | null>(null)
  const [reloadingKey, setReloadingKey] = useState<string | null>(null)
  const loadingKeyRef = useRef<string | null>(null)
  const reloadingKeyRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reset = useCallback(() => {
    // 已触发整页重载兜底时不要清空覆盖层，保留「重新加载中」直到页面真正卸载
    if (reloadingKeyRef.current) return
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    loadingKeyRef.current = null
    setLoadingKey(null)
    setStalledKey(null)
  }, [])

  useEffect(() => {
    const done = () => reset()
    router.events.on('routeChangeComplete', done)
    router.events.on('routeChangeError', done)
    return () => {
      router.events.off('routeChangeComplete', done)
      router.events.off('routeChangeError', done)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [router.events, reset])

  const startNav = useCallback(
    (key: string, href?: string) => (e: MouseEvent) => {
      // 新标签页 / 修饰键 / 非左键点击不会在本页导航，无需加载态
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        ('button' in e && e.button !== 0)
      ) {
        return
      }

      // 同一张卡片已在加载中却被再次点击（或点了「重新打开」提示）：
      // 客户端导航大概率卡住，改用整页跳转兜底，必定能进入内页。
      // 同时切到「重新加载中」状态，覆盖层保持显示直到整页加载完成。
      if (loadingKeyRef.current === key && href) {
        e.preventDefault()
        reloadingKeyRef.current = key
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
        setReloadingKey(key)
        setStalledKey(null)
        setLoadingKey(key)
        window.location.href = href
        return
      }

      loadingKeyRef.current = key
      setLoadingKey(key)
      setStalledKey(null)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setStalledKey((prev) => (loadingKeyRef.current === key ? key : prev))
      }, STALL_MS)
    },
    []
  )

  const isLoading = useCallback(
    (key: string) => loadingKey === key || reloadingKey === key,
    [loadingKey, reloadingKey]
  )
  const isStalled = useCallback((key: string) => stalledKey === key, [stalledKey])
  const isReloading = useCallback(
    (key: string) => reloadingKey === key,
    [reloadingKey]
  )

  return { isLoading, isStalled, isReloading, startNav }
}

/**
 * 覆盖在封面上的轻量加载动画（半透明遮罩 + 旋转环），需父级为 relative。
 * 卡住超过阈值时（stalled）追加可点击的「重新打开」提示，点击会冒泡到外层 Link 的
 * onClick(startNav) 触发整页跳转兜底。
 */
export function GalleryCardLoading({
  stalled = false,
  reloading = false,
}: {
  stalled?: boolean
  reloading?: boolean
}) {
  return (
    <span
      className="gallery-card-loading pointer-events-none absolute inset-0 z-[3] flex flex-col items-center justify-center gap-2 bg-black/25"
    >
      <span className="gallery-card-spinner" aria-hidden="true" />
      {reloading ? (
        <span className="rounded bg-black/65 px-2 py-1 text-center text-[11px] font-medium leading-tight text-white">
          重新加载中…
        </span>
      ) : stalled ? (
        <span className="pointer-events-auto cursor-pointer rounded bg-black/65 px-2 py-1 text-center text-[11px] font-medium leading-tight text-white">
         预览加载完成，请再次点击
        </span>
      ) : null}
    </span>
  )
}
