import { SharedNavFooterStaticProps } from '@/src/types/blog'
import { GetStaticPropsContext } from 'next'
import { resolveActiveTheme } from '@/src/themes/getActiveTheme'
import { getVendingEnabled } from '@/src/lib/blog/vendingSettings'
import { getCachedNavFooter } from '../notion/getCachedMem'

async function buildSharedProps(
  navPages: SharedNavFooterStaticProps['props']['navPages'],
  siteTitle: SharedNavFooterStaticProps['props']['siteTitle'],
  logo: SharedNavFooterStaticProps['props']['logo']
): Promise<SharedNavFooterStaticProps['props']> {
  const [activeTheme, vendingEnabled] = await Promise.all([
    resolveActiveTheme(),
    getVendingEnabled(),
  ])
  return {
    navPages,
    siteTitle,
    siteSubtitle: null,
    logo,
    activeTheme,
    vendingEnabled,
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
    const { navPages, siteTitle, logo } = await getCachedNavFooter()
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
