import CONFIG from '@/blog.config'
import { BlockRender } from '@/src/components/blocks/BlockRender'
import { DraftDialog } from '@/src/components/DraftDialog'
import { BlogLayoutPure } from '@/src/components/layout/BlogLayout'
import ContentLayout from '@/src/components/layout/ContentLayout'
import PostFooter from '@/src/components/post/PostFooter'
import PostHeader from '@/src/components/post/PostHeader'
import { ArticlePasswordGate } from '@/src/components/post/ArticlePasswordGate'
import PostMessage from '@/src/components/post/PostMessage'
import { Section404 } from '@/src/components/section/Section404'
import withNavFooter from '@/src/components/withNavFooter'
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
import {
  NextPageWithLayout,
  Post,
  SharedNavFooterStaticProps,
} from '@/src/types/blog'
import { ApiScope, BlockResponse } from '@/src/types/notion'
import { GetStaticPropsContext, NextPage } from 'next'

export const getStaticPaths = async () => {
  if (!BLOG_STATIC_POST_PATHS_MAX || BLOG_STATIC_POST_PATHS_MAX <= 0) {
    return onDemandStaticPaths
  }
  try {
    const posts = await getPosts(ApiScope.Draft)
    const formattedPosts = await formatPosts(posts, FORMAT_POST_LIST_OPTIONS)
    const paths = buildStaticPostPaths(formattedPosts).map((post) => ({
      params: { post: post.slug },
    }))
    return { paths, fallback: 'blocking' as const }
  } catch (error) {
    if (isTransientNotionError(error)) {
      console.warn('[draft/post] getStaticPaths Notion limit, using on-demand paths')
      return onDemandStaticPaths
    }
    throw error
  }
}

export const getStaticProps = withNavFooterStaticProps(
  async (
    context: GetStaticPropsContext,
    sharedPageStaticProps: SharedNavFooterStaticProps
  ) => {
    const slug = context.params?.post as string
    const rawPost = slug
      ? await getPostBySlug(slug, ApiScope.Draft)
      : null

    let blocks: BlockResponse[] = []
    let post: Post | null = null

    if (rawPost) {
      const formatted = await formatPosts([rawPost], FORMAT_POST_LIST_OPTIONS)
      post = formatted[0] ?? null
    }

    if (post) {
      blocks = await getAllBlocks(post.id)
      addSubTitle(sharedPageStaticProps.props, '', {
        text: 'Draft',
        color: 'gray',
        slug: post.slug,
      })
    }
    const formattedBlocks = await formatBlocks(blocks)

    return {
      props: {
        ...sharedPageStaticProps.props,
        post: post || null,
        blocks: formattedBlocks,
      },
      revalidate: CONFIG.NEXT_REVALIDATE_SECONDS,
    }
  }
)

const PostPage: NextPage<{
  post: Post
  blocks: BlockResponse[]
}> = ({ post, blocks }) => {
  if (!post) {
    return <Section404 />
  }

  const enableDraftDialog = CONFIG.ENABLE_DRAFT_DIALOG

  return (
    <ArticlePasswordGate post={post} initialBlocks={blocks}>
      {(resolvedBlocks) => (
        <>
          <PostHeader post={post} blocks={resolvedBlocks} />
          <ContentLayout>
            <PostMessage post={post} />
            <BlockRender blocks={resolvedBlocks} />
            {enableDraftDialog && <DraftDialog />}
          </ContentLayout>
        </>
      )}
    </ArticlePasswordGate>
  )
}

const withNavPage = withNavFooter(PostPage)

;(withNavPage as NextPageWithLayout).getLayout = (page) => (
  <BlogLayoutPure showBeian>{page}</BlogLayoutPure>
)

export default withNavPage
