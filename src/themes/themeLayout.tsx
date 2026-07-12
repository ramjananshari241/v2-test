import { ReactElement } from 'react'
import { Title } from '@/src/types/blog'
import type { VendingConfig } from '@/src/lib/blog/vendingDefaults'
import { GalleryPageLayout } from '@/src/themes/gallery/GalleryPageLayout'
import { GalleryShell } from '@/src/themes/gallery/GalleryShell'
import { TweetPageLayout } from '@/src/themes/tweet/TweetPageLayout'
import { resolveThemeId } from '@/src/themes/registry'
import { isTweetTheme } from '@/src/themes/tweet/tweetTheme'
import { ThemeId } from '@/src/themes/types'

/** Gallery / Tweet 等自带完整壳层，不走默认 Navbar + Footer */
export function usesStandaloneThemeLayout(activeTheme?: string | null): boolean {
  const id = resolveThemeId(activeTheme)
  return id === 'gallery' || isTweetTheme(id)
}

export function resolvePageThemeId(activeTheme?: string | null): ThemeId {
  return resolveThemeId(activeTheme)
}

export function applyThemePageLayout(
  page: ReactElement,
  defaultLayout: (page: ReactElement) => ReactElement
): ReactElement {
  if (usesStandaloneThemeLayout(page.props?.activeTheme)) {
    return page
  }
  return defaultLayout(page)
}

type ThemeNavShellProps = {
  activeTheme?: string | null
  siteTitle?: Title
  vendingConfig?: VendingConfig | null
  vendingEnabled?: boolean
  children: ReactElement
}

/** withNavFooter 内根据主题包裹独立壳层 */
export function ThemeNavShell({
  activeTheme,
  siteTitle,
  vendingConfig,
  vendingEnabled = true,
  children,
}: ThemeNavShellProps) {
  const themeId = resolveThemeId(activeTheme)

  if (themeId === 'gallery') {
    return (
      <GalleryPageLayout>
        <GalleryShell
          siteTitle={siteTitle}
          vendingConfig={vendingConfig}
          vendingEnabled={vendingEnabled}
        >
          {children}
        </GalleryShell>
      </GalleryPageLayout>
    )
  }

  if (isTweetTheme(themeId)) {
    return <TweetPageLayout>{children}</TweetPageLayout>
  }

  return children
}
