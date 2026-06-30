'use client'

import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useActiveTheme } from '@/src/components/theme/ActiveThemeProvider'
import { isTweetLightTheme } from './tweetTheme'

/** 遮罩最短展示时间（品牌字母动画） */
const MIN_VISIBLE_MS = 500
/** 路由切换时更短 */
const ROUTE_MIN_VISIBLE_MS = 280
const ROUTE_HIDE_DELAY_MS = 200
const FADE_MS = 350
/** 无论后台资源是否加载完，遮罩最长不超过此时长 */
const HARD_CAP_MS = 2800
/** 等待 tweet 壳层 DOM 的最长时间 */
const SHELL_WAIT_MS = 1800

const TWEET_SHELL_SELECTOR =
  '.tweet-root .tweet-header, .tweet-root .tweet-main'

function raf2(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

function isTweetShellPainted(): boolean {
  return Boolean(document.querySelector(TWEET_SHELL_SELECTOR))
}

/** 等首页壳层挂上 DOM 并完成一两帧绘制，不等待字体 / window.load */
async function waitForTweetShellPaint(): Promise<void> {
  if (isTweetShellPainted()) {
    await raf2()
    return
  }

  await new Promise<void>((resolve) => {
    const deadline = Date.now() + SHELL_WAIT_MS
    let settled = false

    const finish = () => {
      if (settled) return
      settled = true
      observer.disconnect()
      resolve()
    }

    const observer = new MutationObserver(() => {
      if (isTweetShellPainted()) finish()
    })
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    })

    const poll = () => {
      if (isTweetShellPainted()) {
        finish()
        return
      }
      if (Date.now() >= deadline) {
        finish()
        return
      }
      requestAnimationFrame(poll)
    }
    requestAnimationFrame(poll)
  })

  await raf2()
}

function ensureBootScreen(): HTMLElement | null {
  if (typeof document === 'undefined') return null

  let screen = document.getElementById('tweet-boot-screen')
  if (screen) return screen

  screen = document.createElement('div')
  screen.id = 'tweet-boot-screen'
  screen.className = 'tweet-boot-screen'
  screen.setAttribute('role', 'status')
  screen.setAttribute('aria-live', 'polite')
  screen.setAttribute('aria-label', '页面加载中')
  screen.innerHTML =
    '<span class="tweet-boot-screen__letter" aria-hidden="true">P</span>'
  document.body.insertBefore(screen, document.body.firstChild)
  return screen
}

function TweetBootScreen() {
  return (
    <div
      id="tweet-boot-screen"
      className="tweet-boot-screen"
      role="status"
      aria-live="polite"
      aria-label="页面加载中"
    >
      <span className="tweet-boot-screen__letter" aria-hidden="true">
        P
      </span>
    </div>
  )
}

export function TweetLoadingProgress() {
  const router = useRouter()
  const activeTheme = useActiveTheme()
  const tweetLight = isTweetLightTheme(activeTheme)
  const [visible, setVisible] = useState(true)
  const [mounted, setMounted] = useState(false)
  const hideTimerRef = useRef<number | null>(null)
  const hardCapTimerRef = useRef<number | null>(null)
  const startedAtRef = useRef<number>(Date.now())
  const hideBootScreenRef = useRef<() => void>(() => {})
  const minVisibleRef = useRef(MIN_VISIBLE_MS)

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const clearHardCapTimer = useCallback(() => {
    if (hardCapTimerRef.current != null) {
      window.clearTimeout(hardCapTimerRef.current)
      hardCapTimerRef.current = null
    }
  }, [])

  const releaseBootPending = useCallback(() => {
    document.documentElement.classList.remove('tweet-boot-pending')
    document.body.style.overflow = ''
    if (!document.body.style.cssText) {
      document.body.removeAttribute('style')
    }
  }, [])

  const hideBootScreen = useCallback(() => {
    clearHideTimer()
    clearHardCapTimer()

    const screen =
      document.getElementById('tweet-boot-screen') ?? ensureBootScreen()
    if (!screen) {
      releaseBootPending()
      setVisible(false)
      return
    }

    screen.classList.add('tweet-boot-screen--hiding')
    window.setTimeout(() => {
      screen.remove()
      releaseBootPending()
      setVisible(false)
    }, FADE_MS)
  }, [clearHardCapTimer, clearHideTimer, releaseBootPending])

  hideBootScreenRef.current = hideBootScreen

  const scheduleHide = useCallback(() => {
    clearHideTimer()

    const run = async () => {
      if (router.isReady) {
        await waitForTweetShellPaint()
      } else {
        await raf2()
      }

      const elapsed = Date.now() - startedAtRef.current
      const remain = Math.max(0, minVisibleRef.current - elapsed)
      hideTimerRef.current = window.setTimeout(() => {
        hideBootScreenRef.current()
      }, remain)
    }

    void run()
  }, [clearHideTimer, router.isReady])

  const showBootScreen = useCallback(() => {
    clearHideTimer()
    clearHardCapTimer()
    startedAtRef.current = Date.now()
    minVisibleRef.current = ROUTE_MIN_VISIBLE_MS
    setVisible(true)

    const root = document.documentElement
    root.classList.add('tweet-theme', 'tweet-boot-pending')
    if (tweetLight) {
      root.classList.add('tweet-theme--light')
      root.classList.remove('dark')
    } else {
      root.classList.add('dark')
      root.classList.remove('tweet-theme--light')
    }

    ensureBootScreen()
    document.body.style.overflow = 'hidden'

    hardCapTimerRef.current = window.setTimeout(() => {
      hideBootScreenRef.current()
    }, HARD_CAP_MS)
  }, [clearHardCapTimer, clearHideTimer, tweetLight])

  useEffect(() => {
    setMounted(true)
    ensureBootScreen()
    document.body.style.overflow = 'hidden'
    minVisibleRef.current = MIN_VISIBLE_MS

    hardCapTimerRef.current = window.setTimeout(() => {
      hideBootScreenRef.current()
    }, HARD_CAP_MS)

    return () => clearHardCapTimer()
  }, [clearHardCapTimer])

  useEffect(() => {
    if (!router.isReady) return
    scheduleHide()
  }, [router.isReady, scheduleHide])

  useEffect(() => {
    const onStart = () => showBootScreen()
    const onStop = () => {
      clearHideTimer()
      hideTimerRef.current = window.setTimeout(() => {
        scheduleHide()
      }, ROUTE_HIDE_DELAY_MS)
    }

    router.events.on('routeChangeStart', onStart)
    router.events.on('routeChangeComplete', onStop)
    router.events.on('routeChangeError', onStop)

    return () => {
      router.events.off('routeChangeStart', onStart)
      router.events.off('routeChangeComplete', onStop)
      router.events.off('routeChangeError', onStop)
      clearHideTimer()
    }
  }, [router.events, showBootScreen, scheduleHide, clearHideTimer])

  useEffect(() => {
    return () => {
      clearHideTimer()
      clearHardCapTimer()
      releaseBootPending()
    }
  }, [clearHardCapTimer, clearHideTimer, releaseBootPending])

  if (!mounted || !visible) return null

  if (document.getElementById('tweet-boot-screen')) return null

  return createPortal(<TweetBootScreen />, document.body)
}
