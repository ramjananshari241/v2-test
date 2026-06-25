import CONFIG from '@/blog.config'
import { GetStaticProps, GetStaticPropsContext, NextPage } from 'next'
import BlogLayout from '../components/layout/BlogLayout'
import withNavFooter from '../components/withNavFooter'
import { applyThemePageLayout } from '../themes/themeLayout'
import { formatPosts, FORMAT_POST_LIST_OPTIONS } from '../lib/blog/format/post'
import { loadHomeWidgets } from '../lib/blog/loadHomeWidgets'
import { withNavFooterStaticProps } from '../lib/blog/withNavFooterStaticProps'
import { buildHomeFeedPosts } from '../lib/blog/postLimits'
import { ANNOUNCEMENT_SLUG } from '../lib/blog/pinnedPosts'
import { getAnnouncementPost } from '../lib/blog/loadHomeWidgets'
import { getPosts } from '../lib/notion/getBlogData'
import { NextPageWithLayout, Post, SharedNavFooterStaticProps } from '../types/blog'
import { ApiScope } from '../types/notion'
import { buildHomePageSeo } from '../lib/seo/lightSeo'
import { getThemeHomeComponent } from '../themes/registry'
import { ThemeId } from '../themes/types'

const Home: NextPage<{
  posts: Post[]
  widgets: { [key: string]: unknown }
  activeTheme: ThemeId
}> = ({ posts, widgets, activeTheme, siteTitle, navPages }) => {
  const themeId =
    activeTheme ||
    (process.env.NODE_ENV === 'development' ? themeFromEnv() : null) ||
    'anzifan'
  const HomeView = getThemeHomeComponent(themeId)
  return (
    <HomeView
      posts={posts}
      widgets={widgets}
      siteTitle={siteTitle}
      navPages={navPages}
    />
  )
}

export const getStaticProps: GetStaticProps = withNavFooterStaticProps(
  async (
    _context: GetStaticPropsContext,
    sharedPageStaticProps: SharedNavFooterStaticProps
  ) => {
    try {
      const postsRaw = await getPosts(ApiScope.Archive)
      let allFormattedPosts = buildHomeFeedPosts(
        await formatPosts(postsRaw, FORMAT_POST_LIST_OPTIONS)
      )

      if (!allFormattedPosts || allFormattedPosts.length === 0) {
        const backupPosts = (sharedPageStaticProps.props.navPages as unknown as { type?: string; slug?: string }[]) || []
        allFormattedPosts = backupPosts.filter((p) => p.type === 'Post') as Post[]
      }

      let announcementPost =
        allFormattedPosts.find((p) => p.slug === ANNOUNCEMENT_SLUG) || null
      if (!announcementPost) {
        announcementPost = await getAnnouncementPost()
      }
      const filteredPosts = allFormattedPosts.filter(
        (p) => p.slug !== ANNOUNCEMENT_SLUG
      )

      const safeWidgets = await loadHomeWidgets({
        announcement: announcementPost,
      })

      const finalProps = JSON.parse(JSON.stringify(sharedPageStaticProps.props))
      const finalPosts = JSON.parse(JSON.stringify(filteredPosts))
      const finalWidgets = JSON.parse(JSON.stringify(safeWidgets || {}))

      return {
        props: {
          ...finalProps,
          posts: finalPosts,
          widgets: finalWidgets,
          seo: buildHomePageSeo(),
        },
        revalidate: CONFIG.NEXT_REVALIDATE_SECONDS,
      }
    } catch (e) {
      console.error('Index page build failed:', e)
      const base = JSON.parse(JSON.stringify(sharedPageStaticProps.props))
      return {
        props: {
          ...base,
          posts: [],
          widgets: {},
          seo: buildHomePageSeo(),
          // 保留 sharedPageStaticProps 中的 activeTheme，由 withNavFooter 末尾再次校正
        },
        revalidate: CONFIG.NEXT_REVALIDATE_SECONDS,
      }
    }
  }
)

const withNavPage = withNavFooter(Home, undefined, true)
;(withNavPage as NextPageWithLayout).getLayout = (page) =>
  applyThemePageLayout(page, (p) => <BlogLayout>{p}</BlogLayout>)
export default withNavPage
