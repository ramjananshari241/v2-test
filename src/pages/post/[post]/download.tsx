import CONFIG from '@/blog.config'
import { GetStaticProps, GetStaticPropsContext, NextPage } from 'next'
import { BlogLayoutPure } from '@/src/components/layout/BlogLayout'
import { Section404 } from '@/src/components/section/Section404'
import withNavFooter from '@/src/components/withNavFooter'
import { GALLERY_DOWNLOAD_INSTRUCTIONS_SLUG } from '@/src/lib/gallery/galleryDownloadPaths'
import { formatBlocks } from '@/src/lib/blog/format/block'
import { formatPosts, FORMAT_POST_LIST_OPTIONS } from '@/src/lib/blog/format/post'
import { withNavFooterStaticProps } from '@/src/lib/blog/withNavFooterStaticProps'
import { getAllBlocks } from '@/src/lib/notion/getBlocks'
import {
  BLOG_STATIC_POST_PATHS_MAX,
  buildStaticPostPaths,
  onDemandStaticPaths,
} from '@/src/lib/blog/postLimits'
import { getPostBySlug, getPosts } from '@/src/lib/notion/getBlogData'
import { isTransientNotionError } from '@/src/lib/notion/transientErrors'
import { addSubTitle } from '@/src/lib/util'
import { GalleryPostDownloadPage } from '@/src/themes/gallery/GalleryPostDownloadPage'
import { getPostStats } from '@/src/lib/gallery/postStats'
import {
  GalleryAdBanner,
  clearGalleryAdBannerCache,
  loadGalleryAdBanner,
} from '@/src/lib/gallery/loadGalleryAdBanner'
import { resolveActiveTheme } from '@/src/themes/getActiveTheme'
import {
  NextPageWithLayout,
  Page,
  Post,
  SharedNavFooterStaticProps,
} from '@/src/types/blog'
import { ApiScope, BlockResponse } from '@/src/types/notion'

export const getStaticPaths = async () => {
  if (!BLOG_STATIC_POST_PATHS_MAX || BLOG_STATIC_POST_PATHS_MAX <= 0) {
    return onDemandStaticPaths
  }
  try {
    const postsRaw = await getPosts(ApiScope.Archive)
    const formattedPosts = await formatPosts(postsRaw, FORMAT_POST_LIST_OPTIONS)
    const paths = buildStaticPostPaths(formattedPosts).map((post) => ({
      params: { post: post.slug },
    }))
    return { paths, fallback: 'blocking' as const }
  } catch (error) {
    if (isTransientNotionError(error)) {
      console.warn('[post/download] getStaticPaths Notion limit, using on-demand paths')
      return onDemandStaticPaths
    }
    throw error
  }
}

export const getStaticProps: GetStaticProps = withNavFooterStaticProps(
  async (
    context: GetStaticPropsContext,
    sharedPageStaticProps: SharedNavFooterStaticProps
  ): Promise<any> => {
    const slug = context.params?.post as string

    if (!slug || slug.includes('[') || slug === 'undefined') {
      return {
        props: JSON.parse(
          JSON.stringify({
            ...sharedPageStaticProps.props,
            post: null,
            downloadInstructionBlocks: [],
          })
        ),
      }
    }

    try {
      const rawPost = await getPostBySlug(slug, ApiScope.Archive)
      if (!rawPost) return { notFound: true }

      const post = (
        await formatPosts([rawPost], FORMAT_POST_LIST_OPTIONS)
      )[0]

      const postStats = await getPostStats(slug)

      addSubTitle(
        sharedPageStaticProps.props,
        '',
        { text: post.title, color: 'gray', slug: post.slug },
        false
      )

      const downloadPage =
        sharedPageStaticProps.props.navPages.find(
          (p) => p.slug === GALLERY_DOWNLOAD_INSTRUCTIONS_SLUG
        ) ?? null

      let downloadInstructionBlocks: BlockResponse[] = []
      if (downloadPage?.id) {
        const blocks = await getAllBlocks(downloadPage.id)
        downloadInstructionBlocks = (await formatBlocks(blocks)) as BlockResponse[]
      }

      const activeTheme = await resolveActiveTheme()
      let galleryAdBanner = null
      if (activeTheme === 'gallery') {
        clearGalleryAdBannerCache()
        galleryAdBanner = await loadGalleryAdBanner()
      }

      const safeData = JSON.parse(
        JSON.stringify({
          ...sharedPageStaticProps.props,
          post,
          downloadInstructionBlocks,
          postStats,
          galleryAdBanner,
        })
      )

      return {
        props: safeData,
        revalidate: CONFIG.NEXT_REVALIDATE_SECONDS,
      }
    } catch (error) {
      console.error('Gallery download page error:', error)
      if (isTransientNotionError(error)) throw error
      throw error
    }
  }
)

const PostDownloadPage: NextPage<{
  post: Post | null
  downloadInstructionBlocks: BlockResponse[]
  postStats?: { viewCount: number; downloadCount: number } | null
  activeTheme?: string
  navPages?: Page[]
  galleryAdBanner?: GalleryAdBanner | null
}> = ({
  post,
  downloadInstructionBlocks,
  postStats = null,
  activeTheme,
  navPages = [],
  galleryAdBanner = null,
}) => {
  if (!post) return <Section404 />

  if (activeTheme === 'gallery') {
    return (
      <GalleryPostDownloadPage
        post={post}
        downloadInstructionBlocks={downloadInstructionBlocks}
        postStats={postStats}
        navPages={navPages}
        galleryAdBanner={galleryAdBanner}
      />
    )
  }

  return <Section404 />
}

const withNavPage = withNavFooter(PostDownloadPage)
;(withNavPage as NextPageWithLayout).getLayout = (page) => {
  const activeTheme = (page.props as { activeTheme?: string })?.activeTheme
  if (activeTheme === 'gallery') return page
  return <BlogLayoutPure>{page}</BlogLayoutPure>
}

export default withNavPage
