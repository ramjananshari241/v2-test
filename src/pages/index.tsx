import CONFIG from '@/blog.config'
import { GetStaticProps, GetStaticPropsContext, NextPage } from 'next'
import ContainerLayout from '../components/post/ContainerLayout'
import { WidgetCollection } from '../components/section/WidgetCollection'
import withNavFooter from '../components/withNavFooter'
import { formatPosts } from '../lib/blog/format/post'
import { formatWidgets, preFormatWidgets } from '../lib/blog/format/widget'
import getBlogStats from '../lib/blog/getBlogStats'
import { withNavFooterStaticProps } from '../lib/blog/withNavFooterStaticProps'
import { getWidgets } from '../lib/notion/getBlogData'
import { getLimitPosts } from '../lib/notion/getDatabase'

import { MainPostsCollection } from '../components/section/MainPostsCollection'
import { MorePostsCollection } from '../components/section/MorePostsCollection'
import { Post, SharedNavFooterStaticProps } from '../types/blog'
import { ApiScope } from '../types/notion'

// 🟢 导入 Touchgal 主题布局 (请确保对应的文件名是 TouchgalLayout.tsx)
import { TouchgalLayout } from '../components/section/TouchgalLayout'

const Home: NextPage<{
  posts: Post[]
  widgets: {
    [key: string]: any
  }
}> = ({ posts, widgets }) => {
  // 🟢 核心主题分流逻辑
  const theme = process.env.NEXT_PUBLIC_THEME || 'anzifan'
  const isTouchgal = theme.toLowerCase() === 'touchgal'

  if (isTouchgal) {
    return <TouchgalLayout posts={posts} widgets={widgets} />
  }

  // 默认 ANZIFAN 布局保持原封不动
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
      const { LARGE, MEDIUM, SMALL, MORE } = CONFIG.HOME_POSTS_COUNT
      const sum = LARGE + MEDIUM + SMALL + MORE + 5

      const postsRaw = await getLimitPosts(sum, ApiScope.Home)
      const allFormattedPosts = await formatPosts(postsRaw)

      const announcementPost = allFormattedPosts.find(p => p.slug === 'announcement') || null
      const filteredPosts = allFormattedPosts.filter(p => p.slug !== 'announcement')

      const blogStats = await getBlogStats()
      const rawWidgets = await getWidgets()
      const preFormattedWidgets = await preFormatWidgets(rawWidgets)
      const formattedWidgets = await formatWidgets(preFormattedWidgets, blogStats)

      // 🛡️ 核心修复：使用 (as any) 强制转换，消除 TS 报红
      const safeWidgets = formattedWidgets as any
      if (safeWidgets && safeWidgets.profile) {
          // 检查并补全 links，防止序列化报错
          if (safeWidgets.profile.links === undefined) {
              safeWidgets.profile.links = null;
          }
      }
      
      // 注入拦截下来的公告数据
      if (safeWidgets) {
          safeWidgets.announcement = announcementPost;
      }

      return {
        props: {
          ...sharedPageStaticProps.props,
          posts: filteredPosts, 
          widgets: safeWidgets || {},
        },
        // 开启 1 秒增量更新
        revalidate: 1,
      }
    } catch (e) {
      console.error('Home page data fetch error:', e)
      return {
        props: {
          ...sharedPageStaticProps.props,
          posts: [],
          widgets: {},
        },
        revalidate: 1,
      }
    }
  }
)

const withNavPage = withNavFooter(Home, undefined, true)

export default withNavPage