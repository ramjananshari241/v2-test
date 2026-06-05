import CONFIG from '@/blog.config'
import { GetStaticProps, GetStaticPropsContext, NextPage } from 'next'
import { BlockRender } from '../../components/blocks/BlockRender'
import { BlogLayoutPure } from '../../components/layout/BlogLayout'
import ContentLayout from '../../components/layout/ContentLayout'
import PostFooter from '../../components/post/PostFooter'
import PostHeader from '../../components/post/PostHeader'
import PostMessage from '../../components/post/PostMessage'
import PostNavigation from '../../components/post/PostNavigation'
import CommentSection from '../../components/section/CommentSection'
import { Section404 } from '../../components/section/Section404'
import withNavFooter from '../../components/withNavFooter'
import { GalleryPost } from '@/src/themes/gallery/GalleryPost'
import {
  buildGalleryRecommendations,
  GalleryRecommendPost,
} from '@/src/lib/gallery/galleryRecommendations'
import {
  GalleryAdBanner,
  loadGalleryAdBanner,
} from '@/src/lib/gallery/loadGalleryAdBanner'
import { resolveActiveTheme } from '@/src/themes/getActiveTheme'
import { formatBlocks } from '../../lib/blog/format/block'
import { formatPosts, getNavigationInfo } from '../../lib/blog/format/post'
import { withNavFooterStaticProps } from '../../lib/blog/withNavFooterStaticProps'
import { getAllBlocks } from '../../lib/notion/getBlocks'
import { capPostsForBuild } from '../../lib/blog/postLimits'
import { getPosts } from '../../lib/notion/getBlogData'
import { addSubTitle } from '../../lib/util'
import { NextPageWithLayout, PartialPost, Post, SharedNavFooterStaticProps } from '../../types/blog'
import { ApiScope, BlockResponse } from '../../types/notion'

export const getStaticPaths = async () => {
  const postsRaw = await getPosts(ApiScope.Archive)
  const formattedPosts = await formatPosts(postsRaw)
  
  // 构建期仅预渲染最新 N 篇，其余走 fallback: blocking（见 blog.config STATIC_POST_PATHS_MAX）
  const paths = capPostsForBuild(formattedPosts).map((post) => ({
      params: { post: post.slug },
    }))

  return { 
    paths, 
    // 🟢 必须是 'blocking'。这样第 101 篇老文章被点击时，才会现场即时生成。
    fallback: 'blocking' 
  }
}

export const getStaticProps: GetStaticProps = withNavFooterStaticProps(
  async (context: GetStaticPropsContext, sharedPageStaticProps: SharedNavFooterStaticProps): Promise<any> => {
    const slug = context.params?.post as string

    if (!slug || slug.includes('[') || slug === 'undefined') {
      return { 
        props: JSON.parse(JSON.stringify({ ...sharedPageStaticProps.props, post: null, blocks: [] }))
      }
    }

    try {
      const postsRaw = await getPosts(ApiScope.Archive)
      const allFormattedPosts = await formatPosts(postsRaw)
      const post = allFormattedPosts.find((p) => p.slug === slug)

      if (!post) return { notFound: true }

      addSubTitle(sharedPageStaticProps.props, '', { text: post.title, color: 'gray', slug: post.slug }, false)
      const { previousPost, nextPost } = getNavigationInfo(allFormattedPosts, post)
      const recommendations = buildGalleryRecommendations(post, allFormattedPosts)
      const blocks = await getAllBlocks(post.id)
      const formattedBlocks = await formatBlocks(blocks)

      const activeTheme = await resolveActiveTheme()
      const galleryAdBanner =
        activeTheme === 'gallery' ? await loadGalleryAdBanner() : null

      // 🛡️ JSON 暴力清洗：杜绝 undefined 导致的 500 报错
      const safeData = JSON.parse(JSON.stringify({
        ...sharedPageStaticProps.props,
        post,
        blocks: formattedBlocks,
        navigation: {
            previousPost: previousPost || null,
            nextPost: nextPost || null,
        },
        recommendations,
        galleryAdBanner,
      }))

      if (safeData.widgets?.profile && safeData.widgets.profile.links === undefined) {
        safeData.widgets.profile.links = null
      }

      return {
        props: safeData,
      }
    } catch (error) {
      console.error("🛡️ Render Error Bypass:", error)
      return { notFound: true }
    }
  }
)

const PostPage: NextPage<{
  post: Post
  blocks: BlockResponse[]
  navigation: { previousPost: PartialPost; nextPost: PartialPost }
  recommendations?: GalleryRecommendPost[]
  galleryAdBanner?: GalleryAdBanner | null
  activeTheme?: string
}> = ({ post, blocks, navigation, recommendations = [], galleryAdBanner = null, activeTheme }) => {
  if (!post) return <Section404 />

  if (activeTheme === 'gallery') {
    return (
      <GalleryPost
        post={post}
        blocks={blocks}
        recommendations={recommendations}
        galleryAdBanner={galleryAdBanner}
      />
    )
  }

  return (
    <>
      <PostHeader post={post} blocks={blocks} />
      <ContentLayout>
        <PostMessage post={post} />
        <BlockRender blocks={blocks} />
        <PostFooter post={post} />
        <PostNavigation navigation={navigation} />
        {CONFIG.ENABLE_COMMENT && <CommentSection />}
      </ContentLayout>
    </>
  )
}

const withNavPage = withNavFooter(PostPage)
;(withNavPage as NextPageWithLayout).getLayout = (page) => {
  const activeTheme = (page.props as { activeTheme?: string })?.activeTheme
  if (activeTheme === 'gallery') return page
  return <BlogLayoutPure>{page}</BlogLayoutPure>
}
export default withNavPage
