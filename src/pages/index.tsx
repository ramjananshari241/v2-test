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
import { getLimitPosts } from '../lib/notion/getDatabase'

import { MainPostsCollection } from '../components/section/MainPostsCollection'
import { MorePostsCollection } from '../components/section/MorePostsCollection'
import { Post, SharedNavFooterStaticProps } from '../types/blog'
import { ApiScope } from '../types/notion'

// 🟢 导入 Touchgal 主题布局组件
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

  // 默认 ANZIFAN 布局
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
  async (_context, sharedPageStaticProps: SharedNavFooterStaticProps) => {
    try {
      const postsRaw = await getPosts(ApiScope.Archive)
      let allFormattedPosts = await formatPosts(postsRaw)

      if (!allFormattedPosts || allFormattedPosts.length === 0) {
          const backupPosts = (sharedPageStaticProps.props.navPages as any[]) || []
          allFormattedPosts = backupPosts.filter(p => p.type === 'Post')
      }

      const announcementPost = allFormattedPosts.find(p => p.slug === 'announcement') || null
      const filteredPosts = allFormattedPosts.filter(p => p.slug !== 'announcement')

      const formattedWidgets = await formatWidgets(await preFormatWidgets(await getWidgets()), await getBlogStats())

      const safeWidgets = formattedWidgets as any
      if (safeWidgets && safeWidgets.profile) {
        if (safeWidgets.profile.links === undefined) safeWidgets.profile.links = null
      }
      if (safeWidgets) safeWidgets.announcement = announcementPost

      return {
        props: {
          ...sharedPageStaticProps.props,
          posts: JSON.parse(JSON.stringify(filteredPosts.slice(0, 12))), 
          // 🟢 注入总文章数，用于计算页码
          totalPostsCount: filteredPosts.length, 
          widgets: JSON.parse(JSON.stringify(safeWidgets || {})),
        },
        revalidate: 1,
      }
    } catch (e) {
      return {
        props: JSON.parse(JSON.stringify(sharedPageStaticProps.props)),
        revalidate: 1,
      }
    }
  }
)

const withNavPage = withNavFooter(Home, undefined, true)

export default withNavPage