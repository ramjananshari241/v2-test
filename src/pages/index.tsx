import { GetStaticProps, GetStaticPropsContext, NextPage } from 'next'
import ContainerLayout from '../components/post/ContainerLayout'
import { WidgetCollection } from '../components/section/WidgetCollection'
import withNavFooter from '../components/withNavFooter'
import { formatPosts } from '../lib/blog/format/post'
import { formatWidgets, preFormatWidgets } from '../lib/blog/format/widget'
import getBlogStats from '../lib/blog/getBlogStats'
import { withNavFooterStaticProps } from '../lib/blog/withNavFooterStaticProps'
import { getWidgets, getPosts, getRemoteTheme } from '../lib/notion/getBlogData'

import { MainPostsCollection } from '../components/section/MainPostsCollection'
import { MorePostsCollection } from '../components/section/MorePostsCollection'
import { Post, SharedNavFooterStaticProps } from '../types/blog'
import { ApiScope } from '../types/notion'

// 导入 Touchgal 主题布局
import { TouchgalLayout } from '../components/section/TouchgalLayout'

const Home: NextPage<{
  posts: Post[]
  widgets: { [key: string]: any }
  activeTheme: string
}> = ({ posts, widgets, activeTheme }) => {
  
  const theme = activeTheme || process.env.NEXT_PUBLIC_THEME || 'anzifan'
  const isTouchgal = theme.toLowerCase() === 'touchgal'

  if (isTouchgal) {
    return <TouchgalLayout posts={posts} widgets={widgets} />
  }

  return (
    <>
      <ContainerLayout>
        <WidgetCollection widgets={widgets} />
        <div data-aos="fade-up" data-aos-delay={300}>
          <MainPostsCollection posts={posts} />
        </div>
      </ContainerLayout>
      <MorePostsCollection posts={posts} />
    </>
  )
}

export const getStaticProps: GetStaticProps = withNavFooterStaticProps(
  async (
    _context: GetStaticPropsContext,
    sharedPageStaticProps: SharedNavFooterStaticProps
  ) => {
    try {
      const remoteTheme = await getRemoteTheme()
      const postsRaw = await getPosts(ApiScope.Archive)
      let allFormattedPosts = await formatPosts(postsRaw)

      if (!allFormattedPosts || allFormattedPosts.length === 0) {
        const backupPosts = (sharedPageStaticProps.props.navPages as any[]) || []
        allFormattedPosts = backupPosts.filter(p => p.type === 'Post')
      }

      const announcementPost = allFormattedPosts.find(p => p.slug === 'announcement') || null
      const filteredPosts = allFormattedPosts.filter(p => p.slug !== 'announcement')

      const blogStats = await getBlogStats()
      const rawWidgets = await getWidgets()
      const preFormattedWidgets = await preFormatWidgets(rawWidgets)
      const formattedWidgets = await formatWidgets(preFormattedWidgets, blogStats)

      const safeWidgets = formattedWidgets as any
      if (safeWidgets && safeWidgets.profile) {
        if (safeWidgets.profile.links === undefined) safeWidgets.profile.links = null
      }
      if (safeWidgets) {
        safeWidgets.announcement = announcementPost
      }

      const finalProps = JSON.parse(JSON.stringify(sharedPageStaticProps.props))
      const finalPosts = JSON.parse(JSON.stringify(filteredPosts))
      const finalWidgets = JSON.parse(JSON.stringify(safeWidgets || {}))

      return {
        props: {
          ...finalProps,
          posts: finalPosts,
          widgets: finalWidgets,
          activeTheme: remoteTheme || 'anzifan',
        },
        revalidate: 1,
      }
    } catch (e) {
      console.error('Index page build failed:', e)
      return {
        props: { ...JSON.parse(JSON.stringify(sharedPageStaticProps.props)), posts: [], widgets: {}, activeTheme: 'anzifan' },
        revalidate: 1,
      }
    }
  }
)

const withNavPage = withNavFooter(Home, undefined, true)
export default withNavPage