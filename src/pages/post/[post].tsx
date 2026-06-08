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
  excludeAnnouncementFromGalleryRecommendations,
  findGalleryAnnouncementPost,
  GalleryRecommendPost,
  pinAnnouncementForGallerySidebar,
  postToGalleryRecommend,
} from '@/src/lib/gallery/galleryRecommendations'
import {
  getAllPostStatsMap,
  getPostStats,
} from '@/src/lib/gallery/postStats'
import {
  GalleryAdBanner,
  loadGalleryAdBanner,
} from '@/src/lib/gallery/loadGalleryAdBanner'
import { resolveActiveTheme } from '@/src/themes/getActiveTheme'
import { formatBlocks } from '../../lib/blog/format/block'
import { formatPosts, FORMAT_POST_LIST_OPTIONS, getNavigationInfo } from '../../lib/blog/format/post'
import { getArchiveNavPosts } from '../../lib/blog/archiveNavCache'
import { withNavFooterStaticProps } from '../../lib/blog/withNavFooterStaticProps'
import { getAllBlocks } from '../../lib/notion/getBlocks'
import {
  BLOG_STATIC_POST_PATHS_MAX,
  buildStaticPostPaths,
  onDemandStaticPaths,
} from '../../lib/blog/postLimits'
import { getPostBySlug, getPosts } from '../../lib/notion/getBlogData'
import { addSubTitle } from '../../lib/util'
import { NextPageWithLayout, Page, PartialPost, Post, SharedNavFooterStaticProps } from '../../types/blog'
import { ApiScope, BlockResponse } from '../../types/notion'

export const getStaticPaths = async () => {
  if (!BLOG_STATIC_POST_PATHS_MAX || BLOG_STATIC_POST_PATHS_MAX <= 0) {
    return onDemandStaticPaths
  }
  const postsRaw = await getPosts(ApiScope.Archive)
  const formattedPosts = await formatPosts(postsRaw, FORMAT_POST_LIST_OPTIONS)
  const paths = buildStaticPostPaths(formattedPosts).map((post) => ({
    params: { post: post.slug },
  }))
  return { paths, fallback: 'blocking' as const }
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
      const [rawPost, activeTheme] = await Promise.all([
        getPostBySlug(slug, ApiScope.Archive),
        resolveActiveTheme(),
      ])
      if (!rawPost) return { notFound: true }

      const postForPage = (
        await formatPosts([rawPost], FORMAT_POST_LIST_OPTIONS)
      )[0]

      addSubTitle(
        sharedPageStaticProps.props,
        '',
        { text: postForPage.title, color: 'gray', slug: postForPage.slug },
        false
      )

      let navPosts: Post[] = []
      try {
        navPosts = await getArchiveNavPosts()
      } catch (navError) {
        console.warn('Post page: archive nav load failed, continuing without nav', navError)
      }
      const { previousPost, nextPost } = getNavigationInfo(navPosts, postForPage)

      const postStats = await getPostStats(slug)
      let recommendations: GalleryRecommendPost[] = []
      let sidebarRecommendations: GalleryRecommendPost[] = []
      let bottomRecommendations: GalleryRecommendPost[] = []
      let pinnedSidebarPost: GalleryRecommendPost | null = null
      if (activeTheme === 'gallery') {
        try {
          const statsMap = await getAllPostStatsMap()
          recommendations = buildGalleryRecommendations(
            postForPage,
            navPosts,
            undefined,
            statsMap
          )
          const announcement = findGalleryAnnouncementPost(navPosts)
          pinnedSidebarPost = announcement
            ? postToGalleryRecommend(announcement)
            : null
          sidebarRecommendations = pinAnnouncementForGallerySidebar(
            recommendations,
            navPosts
          )
          bottomRecommendations =
            excludeAnnouncementFromGalleryRecommendations(recommendations)
        } catch (recError) {
          console.warn('Post page: gallery recommendations failed', recError)
        }
      }

      const blocks = await getAllBlocks(postForPage.id)
      const formattedBlocks = await formatBlocks(blocks)

      const galleryAdBanner =
        activeTheme === 'gallery' ? await loadGalleryAdBanner() : null

      // 🛡️ JSON 暴力清洗：杜绝 undefined 导致的 500 报错
      const safeData = JSON.parse(JSON.stringify({
        ...sharedPageStaticProps.props,
        post: postForPage,
        blocks: formattedBlocks,
        navigation: {
            previousPost: previousPost || null,
            nextPost: nextPost || null,
        },
        recommendations,
        sidebarRecommendations,
        bottomRecommendations,
        pinnedSidebarPost,
        postStats,
        galleryAdBanner,
      }))

      if (safeData.widgets?.profile && safeData.widgets.profile.links === undefined) {
        safeData.widgets.profile.links = null
      }

      return {
        props: safeData,
        revalidate: CONFIG.NEXT_REVALIDATE_SECONDS,
      }
    } catch (error) {
      console.error('Post page render error:', error)
      const message = error instanceof Error ? error.message : String(error)
      const isTransient =
        /ECONNRESET|ETIMEDOUT|ENOTFOUND|429|502|503|504|fetch failed|network/i.test(
          message
        )
      if (isTransient) {
        throw error
      }
      throw error
    }
  }
)

const PostPage: NextPage<{
  post: Post
  blocks: BlockResponse[]
  navigation: { previousPost: PartialPost; nextPost: PartialPost }
  recommendations?: GalleryRecommendPost[]
  sidebarRecommendations?: GalleryRecommendPost[]
  bottomRecommendations?: GalleryRecommendPost[]
  pinnedSidebarPost?: GalleryRecommendPost | null
  postStats?: { viewCount: number; downloadCount: number } | null
  galleryAdBanner?: GalleryAdBanner | null
  activeTheme?: string
  navPages?: Page[]
}> = ({
  post,
  blocks,
  navigation,
  sidebarRecommendations = [],
  bottomRecommendations = [],
  pinnedSidebarPost = null,
  postStats = null,
  galleryAdBanner = null,
  activeTheme,
  navPages = [],
}) => {
  if (!post) return <Section404 />

  if (activeTheme === 'gallery') {
    return (
      <GalleryPost
        post={post}
        blocks={blocks}
        sidebarRecommendations={sidebarRecommendations}
        bottomRecommendations={bottomRecommendations}
        pinnedSidebarPost={pinnedSidebarPost}
        postStats={postStats}
        galleryAdBanner={galleryAdBanner}
        navPages={navPages}
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
