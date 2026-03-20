import CONFIG from '@/blog.config'
import { GetStaticProps, GetStaticPropsContext, NextPage } from 'next'
import ContainerLayout from '../components/post/ContainerLayout'
import { WidgetCollection } from '../components/section/WidgetCollection'
import withNavFooter from '../components/withNavFooter'
import { formatPosts } from '../lib/blog/format/post'
import { formatWidgets, preFormatWidgets } from '../lib/blog/format/widget'
import getBlogStats from '../lib/blog/getBlogStats'
import { withNavFooterStaticProps } from '../lib/blog/withNavFooterStaticProps'
import { getWidgets, getPosts } from '../lib/notion/getBlogData' // 🟢 改为导入 getPosts
import { MainPostsCollection } from '../components/section/MainPostsCollection'
import { MorePostsCollection } from '../components/section/MorePostsCollection'
import { Post, SharedNavFooterStaticProps } from '../types/blog'
import { ApiScope } from '../types/notion'
import { TouchgalLayout } from '../components/section/TouchgalLayout'

const Home: NextPage<{ posts: Post[]; widgets: { [key: string]: any } }> = ({ posts, widgets }) => {
  const theme = process.env.NEXT_PUBLIC_THEME || 'anzifan'
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
      // 🟢 修复点：使用 getPosts(ApiScope.Archive) 抓取全量已发布文章，确保列表不为空
      const postsRaw = await getPosts(ApiScope.Archive)
      const allFormattedPosts = await formatPosts(postsRaw)

      // 逻辑处理
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
      if (safeWidgets) safeWidgets.announcement = announcementPost

      return {
        props: {
          ...sharedPageStaticProps.props,
          // 🟢 只取最新的 20 篇显示在首页
          posts: filteredPosts.slice(0, 20), 
          widgets: safeWidgets || {},
        },
        revalidate: 1,
      }
    } catch (e) {
      console.error('Data fetch error:', e)
      return {
        props: { ...sharedPageStaticProps.props, posts: [], widgets: {} },
        revalidate: 1,
      }
    }
  }
)

const withNavPage = withNavFooter(Home, undefined, true)
export default withNavPage