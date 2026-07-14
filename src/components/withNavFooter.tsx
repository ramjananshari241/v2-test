import Footer from './footer/Footer'
import Navbar from './nav/Navbar'
import { AnnouncementPopup } from './widget/AnnouncementPopup'
import { ThemeNavShell } from '@/src/themes/themeLayout'
import { isTweetTheme } from '@/src/themes/tweet/tweetTheme'
import { Page, SharedNavFooterStaticProps } from '@/src/types/blog'

export default function withNavFooter(
  WrappedComponent: any,
  pureFooter?: boolean,
  showBeian?: boolean
) {
  return function WithNavFooterWrapper(
    props: SharedNavFooterStaticProps['props'] & { activeTheme?: string }
  ) {
    const themeId = props.activeTheme
    if (themeId === 'gallery' || isTweetTheme(themeId)) {
      return (
        <>
          <ThemeNavShell
            activeTheme={themeId}
            siteTitle={props.siteTitle}
            vendingConfig={props.vendingConfig}
            vendingEnabled={props.vendingEnabled !== false}
          >
            <WrappedComponent {...props} />
          </ThemeNavShell>
          <AnnouncementPopup
            config={props.announcementPopup}
            activeTheme={themeId}
          />
        </>
      )
    }

    const items = props.navPages.filter(
      (item: Page) => item.status === 'Published'
    )

    return (
      <main className="flex flex-col justify-start min-h-screen">
        <Navbar
          items={items}
          title={props.siteTitle}
          subtitle={
            props.enableNavSubtitle && props.siteSubtitle
              ? props.siteSubtitle
              : undefined
          }
        />
        <WrappedComponent {...props} />
        <div className="mt-auto">
          <Footer
            title={props.siteTitle}
            color={pureFooter ? 'pure' : undefined}
            showBeian={showBeian}
            logo={props.logo}
            path={{
              text: props.siteSubtitle?.text ?? '',
              href: props.siteSubtitle?.slug ?? '',
            }}
          />
        </div>
        <AnnouncementPopup
          config={props.announcementPopup}
          activeTheme={themeId}
        />
      </main>
    )
  }
}
