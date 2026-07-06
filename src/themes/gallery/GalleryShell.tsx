'use client'

import { Page, Title } from '@/src/types/blog'
import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { GALLERY_LOGO_SRC } from './galleryConstants'
import { GalleryFontLinks } from './GalleryFontLinks'
import { galleryShellClass } from './galleryFonts'
import { GALLERY_HEADER_HEIGHT, GallerySidebar } from './GallerySidebar'
import { ProPlusCreateButton } from '@/src/components/nav/ProPlusCreateButton'

const GALLERY_LOGO_BUST = 'v=5'

type GalleryShellProps = {
  siteTitle?: Title
  navPages?: Page[]
  children: ReactNode
  vendingEnabled?: boolean
  /** 顶栏居中标题，传 false 可隐藏 */
  headerTitle?: string | false
}

export const GalleryShell = ({
  siteTitle,
  children,
  headerTitle,
  vendingEnabled = true,
}: GalleryShellProps) => {
  const siteName = siteTitle?.text || 'PRO BLOG'
  const showHeader = headerTitle !== false
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  // 导航后自动收起移动端抽屉
  useEffect(() => {
    const close = () => setMenuOpen(false)
    router.events.on('routeChangeStart', close)
    return () => router.events.off('routeChangeStart', close)
  }, [router.events])

  // 抽屉展开时锁定背景滚动 + Esc 关闭
  useEffect(() => {
    if (!menuOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <div className={`min-h-screen min-h-[100dvh] bg-white ${galleryShellClass}`}>
      <GalleryFontLinks />
      <GallerySidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        vendingEnabled={vendingEnabled}
      />

      {/* 移动端抽屉遮罩 */}
      {menuOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      ) : null}

      <div className="flex min-h-screen min-h-[100dvh] min-w-0 flex-1 flex-col bg-white lg:ml-[260px]">
        {showHeader ? (
          <header
            className="relative flex shrink-0 items-center justify-center gap-3 border-b border-neutral-200 bg-white px-14 lg:px-8"
            style={{ height: GALLERY_HEADER_HEIGHT }}
          >
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="打开菜单"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 lg:hidden"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${GALLERY_LOGO_SRC}?${GALLERY_LOGO_BUST}`}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 object-contain"
            />
            <h1 className="truncate font-gallery text-[17px] font-semibold tracking-tight text-neutral-900 sm:text-[19px]">
              {headerTitle === undefined ? siteName : headerTitle}
            </h1>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 sm:right-5 lg:right-8">
              <ProPlusCreateButton className="proplus-create-btn--gallery" />
            </div>
          </header>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col bg-white">{children}</div>
      </div>
    </div>
  )
}
