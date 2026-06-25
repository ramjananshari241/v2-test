import { ReactElement } from 'react'
import { Title } from '@/src/types/blog'
import { GalleryPageLayout } from '@/src/themes/gallery/GalleryPageLayout'
import { GalleryShell } from '@/src/themes/gallery/GalleryShell'
import { TweetPageLayout } from '@/src/themes/tweet/TweetPageLayout'
import { resolveThemeId } from '@/src/themes/registry'
import { ThemeId } from '@/src/themes/types'

/** Gallery / Tweet 等自带完整壳层，不走默认 Navbar + Footer */
export function usesStandaloneThemeLayout(activeTheme?: string | null): boolean {
  const id = resolveThemeId(activeTheme)
  return id === 'gallery' || id === 'tweet'
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
  children: ReactElement
}

/** withNavFooter 内根据主题包裹独立壳层 */
export function ThemeNavShell({
  activeTheme,
  siteTitle,
  children,
}: ThemeNavShellProps) {
  const themeId = resolveThemeId(activeTheme)

  if (themeId === 'gallery') {
    return (
      <GalleryPageLayout>
        <GalleryShell siteTitle={siteTitle}>{children}</GalleryShell>
      </GalleryPageLayout>
    )
  }

  if (themeId === 'tweet') {
    return <TweetPageLayout>{children}</TweetPageLayout>
  }

  return children
}
