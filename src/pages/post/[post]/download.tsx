import CONFIG from '@/blog.config'
import { GetStaticProps, GetStaticPropsContext, NextPage } from 'next'
import { BlogLayoutPure } from '@/src/components/layout/BlogLayout'
import { Section404 } from '@/src/components/section/Section404'
import withNavFooter from '@/src/components/withNavFooter'
import { GALLERY_DOWNLOAD_INSTRUCTIONS_SLUG } from '@/src/lib/gallery/galleryDownloadPaths'
import { formatBlocks } from '@/src/lib/blog/format/block'
import { formatPosts } from '@/src/lib/blog/format/post'
import { withNavFooterStaticProps } from '@/src/lib/blog/withNavFooterStaticProps'
import { getAllBlocks } from '@/src/lib/notion/getBlocks'
import { buildStaticPostPaths } from '@/src/lib/blog/postLimits'
import { getPosts } from '@/src/lib/notion/getBlogData'
import { addSubTitle } from '@/src/lib/util'
import { GalleryPostDownloadPage } from '@/src/themes/gallery/GalleryPostDownloadPage'
import { getPostStats } from '@/src/lib/gallery/postStats'
import {
  GalleryAdBanner,
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
  const postsRaw = await getPosts(ApiScope.Archive)
  const formattedPosts = await formatPosts(postsRaw, { skipImageProbe: true })
  const paths = buildStaticPostPaths(formattedPosts).map((post) => ({
    params: { post: post.slug },
  }))

  return {
    paths,
    fallback: 'blocking',
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
      const postsRaw = await getPosts(ApiScope.Archive)
      const allFormattedPosts = await formatPosts(postsRaw)
      const post = allFormattedPosts.find((p) => p.slug === slug)

      if (!post) return { notFound: true }

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
      const galleryAdBanner =
        activeTheme === 'gallery' ? await loadGalleryAdBanner() : null

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
      return { notFound: true }
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
