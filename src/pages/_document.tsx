import Document, {
  DocumentContext,
  DocumentInitialProps,
  Head,
  Html,
  Main,
  NextScript,
} from 'next/document'
import {
  TWEET_BOOT_CRITICAL_CSS,
  TWEET_BOOT_PLACEHOLDER_HTML,
} from '@/src/themes/tweet/tweetBootCriticalCss'
import {
  isTweetDarkTheme,
  isTweetLightTheme,
  isTweetTheme,
} from '@/src/themes/tweet/tweetTheme'

type BlogDocumentProps = DocumentInitialProps & {
  activeTheme?: string
  isAdminRoute?: boolean
}

export default class BlogDocument extends Document<BlogDocumentProps> {
  static async getInitialProps(
    ctx: DocumentContext
  ): Promise<BlogDocumentProps> {
    const originalRenderPage = ctx.renderPage
    let activeTheme = ''

    ctx.renderPage = () =>
      originalRenderPage({
        enhanceApp: (App) => (props) => {
          activeTheme = String(
            (props.pageProps as { activeTheme?: string })?.activeTheme || ''
          )
          return <App {...props} />
        },
      })

    const initialProps = await Document.getInitialProps(ctx)
    const isAdminRoute =
      ctx.pathname === '/admin' || ctx.pathname.startsWith('/admin/')

    return { ...initialProps, activeTheme, isAdminRoute }
  }

  render() {
    const { activeTheme, isAdminRoute } = this.props
    const showTweetBoot = !isAdminRoute && isTweetTheme(activeTheme)
    const tweetLight = isTweetLightTheme(activeTheme)
    const tweetDark = isTweetDarkTheme(activeTheme)

    const htmlClass = [
      showTweetBoot ? 'tweet-theme tweet-boot-pending' : '',
      showTweetBoot && !tweetLight ? 'dark' : '',
      showTweetBoot && tweetLight ? 'tweet-theme--light' : '',
      showTweetBoot && tweetDark ? 'tweet-theme--dark' : '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <Html lang="zh-CN" className={htmlClass || undefined}>
        <Head>
          {showTweetBoot ? (
            <style
              id="tweet-boot-screen-style"
              dangerouslySetInnerHTML={{ __html: TWEET_BOOT_CRITICAL_CSS }}
            />
          ) : null}
        </Head>
        <body>
          {showTweetBoot ? (
            <div
              id="tweet-boot-screen"
              className="tweet-boot-screen"
              role="status"
              aria-live="polite"
              aria-label="页面加载中"
              dangerouslySetInnerHTML={{ __html: TWEET_BOOT_PLACEHOLDER_HTML }}
            />
          ) : null}
          <Main />
          <NextScript />
          <script src="/gallery-theme-boot.js" />
          {!showTweetBoot ? <script src="/tweet-theme-boot.js" /> : null}
        </body>
      </Html>
    )
  }
}
