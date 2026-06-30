'use client'

import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useActiveTheme } from '@/src/components/theme/ActiveThemeProvider'
import { isTweetLightTheme } from './tweetTheme'

const MIN_VISIBLE_MS = 1200
const ROUTE_HIDE_DELAY_MS = 900
const FADE_MS = 350

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
  const startedAtRef = useRef<number>(Date.now())

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
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
  }, [releaseBootPending])

  const scheduleHide = useCallback(() => {
    clearHideTimer()

    const run = async () => {
      if (document.fonts?.ready) {
        try {
          await document.fonts.ready
        } catch {
          /* ignore */
        }
      }

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })

      const elapsed = Date.now() - startedAtRef.current
      const remain = Math.max(0, MIN_VISIBLE_MS - elapsed)
      hideTimerRef.current = window.setTimeout(() => {
        hideBootScreen()
      }, remain)
    }

    void run()
  }, [clearHideTimer, hideBootScreen])

  const showBootScreen = useCallback(() => {
    clearHideTimer()
    startedAtRef.current = Date.now()
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
  }, [clearHideTimer, tweetLight])

  useEffect(() => {
    setMounted(true)
    ensureBootScreen()
    document.body.style.overflow = 'hidden'
  }, [])

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
      releaseBootPending()
    }
  }, [clearHideTimer, releaseBootPending])

  if (!mounted || !visible) return null

  if (document.getElementById('tweet-boot-screen')) return null

  return createPortal(<TweetBootScreen />, document.body)
}
