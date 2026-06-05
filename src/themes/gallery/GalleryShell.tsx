import { Page, Title } from '@/src/types/blog'
import { ReactNode } from 'react'
import { GALLERY_LOGO_SRC, GALLERY_SIDEBAR_WIDTH } from './galleryConstants'
import { GalleryFontLinks } from './GalleryFontLinks'
import { galleryShellClass } from './galleryFonts'
import { GALLERY_HEADER_HEIGHT, GallerySidebar } from './GallerySidebar'

const GALLERY_LOGO_BUST = 'v=5'

type GalleryShellProps = {
  siteTitle?: Title
  navPages?: Page[]
  children: ReactNode
  /** 顶栏居中标题，传 false 可隐藏 */
  headerTitle?: string | false
}

export const GalleryShell = ({
  siteTitle,
  children,
  headerTitle,
}: GalleryShellProps) => {
  const siteName = siteTitle?.text || 'PRO BLOG'
  const showHeader = headerTitle !== false

  return (
    <div className={`min-h-screen bg-white ${galleryShellClass}`}>
      <GalleryFontLinks />
      <GallerySidebar />

      <div
        className="flex min-h-screen min-w-0 flex-col bg-white"
        style={{ marginLeft: GALLERY_SIDEBAR_WIDTH }}
      >
        {showHeader ? (
          <header
            className="flex shrink-0 items-center justify-center gap-3 border-b border-neutral-200 bg-white px-8"
            style={{ height: GALLERY_HEADER_HEIGHT }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${GALLERY_LOGO_SRC}?${GALLERY_LOGO_BUST}`}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 object-contain"
            />
            <h1 className="font-gallery text-[19px] font-semibold tracking-tight text-neutral-900">
              {headerTitle === undefined ? siteName : headerTitle}
            </h1>
          </header>
        ) : null}
        <div className="flex flex-1 flex-col bg-white">{children}</div>
      </div>
    </div>
  )
}
