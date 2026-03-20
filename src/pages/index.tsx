import CONFIG from '@/blog.config'
import { GetStaticProps, GetStaticPropsContext, NextPage } from 'next'
import ContainerLayout from '../components/post/ContainerLayout'
import { WidgetCollection } from '../components/section/WidgetCollection'
import withNavFooter from '../components/withNavFooter'
import { formatPosts } from '../lib/blog/format/post'
import { formatWidgets, preFormatWidgets } from '../lib/blog/format/widget'
import getBlogStats from '../lib/blog/getBlogStats'
import { withNavFooterStaticProps } from '../lib/blog/withNavFooterStaticProps'
import { getWidgets, getPosts } from '../lib/notion/getBlogData' 
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
      // 1. 尝试通过 Archive 作用域抓取全量文章
      const postsRaw = await getPosts(ApiScope.Archive)
      let allFormattedPosts = await formatPosts(postsRaw)

      // 🛡️ 容错逻辑：如果全量抓取为空，尝试从共享的 navPages 备份中提取 Post 类型的文章
      if (!allFormattedPosts || allFormattedPosts.length === 0) {
          const backupPosts = (sharedPageStaticProps.props.navPages as any[]) || []
          allFormattedPosts = backupPosts.filter(p => p.type === 'Post')
      }

      // 2. 逻辑处理 (公告拦截)
      const announcementPost = allFormattedPosts.find(p => p.slug === 'announcement') || null
      // 🟢 修改：放宽过滤条件，不再检查 status，因为 getPosts(ApiScope.Archive) 已经保证了是已发布的
      const filteredPosts = allFormattedPosts.filter(p => p.slug !== 'announcement')

      // 3. 获取组件数据
      const blogStats = await getBlogStats()
      const rawWidgets = await getWidgets()
      const preFormattedWidgets = await preFormatWidgets(rawWidgets)
      const formattedWidgets = await formatWidgets(preFormattedWidgets, blogStats)

      const safeWidgets = formattedWidgets as any
      if (safeWidgets && safeWidgets.profile) {
        if (safeWidgets.profile.links === undefined) safeWidgets.profile.links = null
      }
      if (safeWidgets) safeWidgets.announcement = announcementPost

      // 4. 打包并脱壳清洗
      const finalData = JSON.parse(JSON.stringify({
        ...sharedPageStaticProps.props,
        posts: filteredPosts.slice(0, 30), // 首页显示前 30 篇
        widgets: safeWidgets || {},
      }))

      return {
        props: finalData,
        revalidate: 1,
      }
    } catch (e) {
      console.error('Build Error:', e)
      return {
        props: JSON.parse(JSON.stringify(sharedPageStaticProps.props)),
        revalidate: 1,
      }
    }
  }
)

const withNavPage = withNavFooter(Home, undefined, true)
export default withNavPage