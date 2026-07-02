import CONFIG from '@/blog.config'
import { GetStaticProps, GetStaticPropsContext, NextPage } from 'next'
import { BlockRender } from '../../components/blocks/BlockRender'
import { BlogLayoutPure } from '../../components/layout/BlogLayout'
import ContentLayout from '../../components/layout/ContentLayout'
import PostFooter from '../../components/post/PostFooter'
import PostHeader from '../../components/post/PostHeader'
import { ArticlePasswordGate } from '../../components/post/ArticlePasswordGate'
import PostMessage from '../../components/post/PostMessage'
import PostNavigation from '../../components/post/PostNavigation'
import CommentSection from '../../components/section/CommentSection'
import { Section404 } from '../../components/section/Section404'
import withNavFooter from '../../components/withNavFooter'
import { GalleryPost } from '@/src/themes/gallery/GalleryPost'
import { TweetPostPage } from '@/src/themes/tweet/TweetPostPage'
import { TweetShell } from '@/src/themes/tweet/TweetShell'
import { isTweetTheme } from '@/src/themes/tweet/tweetTheme'
import { pickTweetShellWidgets } from '@/src/themes/tweet/tweetShellWidgets'
import { applyThemePageLayout } from '@/src/themes/themeLayout'
import {
  buildGalleryRecommendations,
  GalleryRecommendPost,
  withoutGalleryAnnouncement,
} from '@/src/lib/gallery/galleryRecommendations'
import {
  getAllPostStatsMap,
  getPostStats,
} from '@/src/lib/gallery/postStats'
import {
  GalleryAdBanner,
  clearGalleryAdBannerCache,
  loadGalleryAdBanner,
} from '@/src/lib/gallery/loadGalleryAdBanner'
import { loadHomeWidgets } from '../../lib/blog/loadHomeWidgets'
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
import { buildPostPageSeo } from '@/src/lib/seo/lightSeo'
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
      let sidebarRecommendations: GalleryRecommendPost[] = []
      let bottomRecommendations: GalleryRecommendPost[] = []
      if (activeTheme === 'gallery') {
        try {
          const statsMap = await getAllPostStatsMap()
          const recommendations = buildGalleryRecommendations(
            postForPage,
            navPosts,
            undefined,
            statsMap
          )
          sidebarRecommendations = withoutGalleryAnnouncement(recommendations)
          bottomRecommendations = withoutGalleryAnnouncement(recommendations)
        } catch (recError) {
          console.warn('Post page: gallery recommendations failed', recError)
        }
      }

      const isPasswordProtected = !!postForPage.options?.isPasswordProtected
      let formattedBlocks: Awaited<ReturnType<typeof formatBlocks>> = []
      if (!isPasswordProtected) {
        const blocks = await getAllBlocks(postForPage.id)
        formattedBlocks = await formatBlocks(blocks)
      }

      let galleryAdBanner = null
      if (activeTheme === 'gallery' || isTweetTheme(activeTheme)) {
        clearGalleryAdBannerCache()
        galleryAdBanner = await loadGalleryAdBanner()
      }

      const widgets =
        isTweetTheme(activeTheme) ? await loadHomeWidgets() : null

      // 🛡️ JSON 暴力清洗：杜绝 undefined 导致的 500 报错
      const safeData = JSON.parse(JSON.stringify({
        ...sharedPageStaticProps.props,
        post: postForPage,
        blocks: formattedBlocks,
        navigation: {
            previousPost: previousPost || null,
            nextPost: nextPost || null,
        },
        sidebarRecommendations,
        bottomRecommendations,
        postStats,
        galleryAdBanner,
        widgets,
        seo: buildPostPageSeo(postForPage),
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
      if (isTransient) throw error
      // 非网络类错误降级，避免单篇数据异常导致全站文章页 500
      return {
        props: JSON.parse(
          JSON.stringify({
            ...sharedPageStaticProps.props,
            post: null,
            blocks: [],
            navigation: { previousPost: null, nextPost: null },
            sidebarRecommendations: [],
            bottomRecommendations: [],
            postStats: null,
            galleryAdBanner: null,
          })
        ),
        revalidate: CONFIG.NEXT_REVALIDATE_SECONDS,
      }
    }
  }
)

const PostPage: NextPage<{
  post: Post
  blocks: BlockResponse[]
  navigation: { previousPost: PartialPost; nextPost: PartialPost }
  sidebarRecommendations?: GalleryRecommendPost[]
  bottomRecommendations?: GalleryRecommendPost[]
  postStats?: { viewCount: number; downloadCount: number } | null
  galleryAdBanner?: GalleryAdBanner | null
  activeTheme?: string
  navPages?: Page[]
  siteTitle?: SharedNavFooterStaticProps['props']['siteTitle']
  widgets?: Record<string, unknown>
}> = ({
  post,
  blocks,
  navigation,
  sidebarRecommendations = [],
  bottomRecommendations = [],
  postStats = null,
  galleryAdBanner = null,
  activeTheme,
  navPages = [],
  siteTitle,
  widgets,
  vendingEnabled,
}) => {
  if (!post) return <Section404 />

  if (activeTheme === 'gallery') {
    return (
      <GalleryPost
        post={post}
        blocks={blocks}
        sidebarRecommendations={sidebarRecommendations}
        bottomRecommendations={bottomRecommendations}
        postStats={postStats}
        galleryAdBanner={galleryAdBanner}
        navPages={navPages}
      />
    )
  }

  if (isTweetTheme(activeTheme)) {
    const shellWidgets = pickTweetShellWidgets(widgets)
    return (
      <TweetShell
        siteTitle={siteTitle}
        profile={shellWidgets.profile}
        vendingEnabled={vendingEnabled !== false}
      >
        <TweetPostPage
          post={post}
          blocks={blocks}
          navigation={navigation}
          galleryAdBanner={galleryAdBanner}
        />
      </TweetShell>
    )
  }

  return (
    <>
      <PostHeader post={post} blocks={blocks} />
      <ContentLayout>
        <PostMessage post={post} />
        <ArticlePasswordGate post={post} initialBlocks={blocks}>
          {(resolvedBlocks) => (
            <>
              <BlockRender blocks={resolvedBlocks} />
              <PostFooter post={post} />
              <PostNavigation navigation={navigation} />
              {CONFIG.ENABLE_COMMENT && <CommentSection />}
            </>
          )}
        </ArticlePasswordGate>
      </ContentLayout>
    </>
  )
}

const withNavPage = withNavFooter(PostPage)
;(withNavPage as NextPageWithLayout).getLayout = (page) =>
  applyThemePageLayout(page, (p) => <BlogLayoutPure>{p}</BlogLayoutPure>)
export default withNavPage
