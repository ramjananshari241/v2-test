import { useRouter } from 'next/router'
import { useEffect, useRef } from 'react'
import { ThemeId } from '@/src/themes/types'

const SYNC_PARAM = '_theme_sync'

/**
 * ISR/CDN 可能仍返回旧 activeTheme；与 Supabase/Notion 实时主题对比后自动刷新。
 */
export function ThemeSyncGuard({
  activeTheme,
  isAdminRoute,
}: {
  activeTheme?: string
  isAdminRoute: boolean
}) {
  const router = useRouter()
  const ranRef = useRef(false)

  useEffect(() => {
    if (isAdminRoute || ranRef.current || !activeTheme) return
    ranRef.current = true

    let cancelled = false

    const sync = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const alreadySynced = params.has(SYNC_PARAM)

        const res = await fetch('/api/public/active-theme', { cache: 'no-store' })
        if (!res.ok || cancelled) return

        const data = (await res.json()) as { themeId?: ThemeId }
        const remoteTheme = data.themeId
        if (!remoteTheme) return

        if (remoteTheme === activeTheme) {
          if (alreadySynced) {
            params.delete(SYNC_PARAM)
            const qs = params.toString()
            const clean = qs
              ? `${window.location.pathname}?${qs}`
              : window.location.pathname
            router.replace(clean, undefined, { shallow: false })
          }
          return
        }

        if (alreadySynced) {
          console.warn('[ThemeSyncGuard] theme mismatch after sync reload', {
            page: activeTheme,
            remote: remoteTheme,
          })
          return
        }

        params.set(SYNC_PARAM, '1')
        window.location.replace(
          `${window.location.pathname}?${params.toString()}`
        )
      } catch (error) {
        console.warn('[ThemeSyncGuard] sync failed', error)
      }
    }

    void sync()

    return () => {
      cancelled = true
    }
  }, [activeTheme, isAdminRoute, router])

  return null
}
