import { SharedNavFooterStaticProps } from '@/src/types/blog'
import { GetStaticPropsContext } from 'next'
import { resolveActiveTheme } from '@/src/themes/getActiveTheme'
import { getVendingConfig } from '@/src/lib/blog/vendingSettings'
import { getCachedNavFooter } from '../notion/getCachedMem'
import { isTransientNotionError, isNotionBuildPhase } from '../notion/transientErrors'

async function buildSharedProps(
  navPages: SharedNavFooterStaticProps['props']['navPages'],
  siteTitle: SharedNavFooterStaticProps['props']['siteTitle'],
  logo: SharedNavFooterStaticProps['props']['logo']
): Promise<SharedNavFooterStaticProps['props']> {
  const [activeTheme, vendingConfig] = await Promise.all([
    resolveActiveTheme(),
    getVendingConfig(),
  ])
  return {
    navPages,
    siteTitle,
    siteSubtitle: null,
    logo,
    activeTheme,
    vendingConfig,
    vendingEnabled: vendingConfig.enabled,
  }
}

export function withNavFooterStaticProps(
  getStaticPropsFunc?: (
    context: GetStaticPropsContext,
    sharedPageStaticProps: SharedNavFooterStaticProps
  ) => Promise<SharedNavFooterStaticProps>
) {
  return async (
    context: GetStaticPropsContext
  ): Promise<SharedNavFooterStaticProps> => {
    let navPages: SharedNavFooterStaticProps['props']['navPages'] = []
    let siteTitle: SharedNavFooterStaticProps['props']['siteTitle'] = {
      text: 'PRO BLOG',
      color: 'gray',
      slug: '/',
    }
    let logo: SharedNavFooterStaticProps['props']['logo'] = null

    try {
      const nav = await getCachedNavFooter()
      navPages = nav.navPages
      siteTitle = nav.siteTitle
      logo = nav.logo
    } catch (error) {
      if (!isTransientNotionError(error) || !isNotionBuildPhase()) throw error
      console.warn(
        '[withNavFooterStaticProps] nav load failed during build, using fallback:',
        error instanceof Error ? error.message : error
      )
    }

    const sharedProps = await buildSharedProps(navPages, siteTitle, logo)

    if (getStaticPropsFunc == null) {
      return { props: sharedProps }
    }

    const result = await getStaticPropsFunc(context, { props: sharedProps })
    if (result && 'props' in result && result.props) {
      // 复用 sharedProps.activeTheme（getRemoteTheme 已进程内缓存）；仅在页面显式覆盖时再解析
      const pageTheme = result.props.activeTheme as string | undefined
      if (pageTheme && pageTheme !== sharedProps.activeTheme) {
        result.props.activeTheme = await resolveActiveTheme(pageTheme)
      } else {
        result.props.activeTheme = sharedProps.activeTheme
      }
    }
    return result
  }
}
