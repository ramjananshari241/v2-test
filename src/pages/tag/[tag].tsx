import CONFIG from '@/blog.config'
import BlogLayout, {
  BlogLayoutWithColor,
} from '@/src/components/layout/BlogLayout'
import { Section404 } from '@/src/components/section/Section404'
import { SubCollection } from '@/src/components/section/SubCollection'
import withNavFooter from '@/src/components/withNavFooter'
import { GalleryFilteredPosts } from '@/src/themes/gallery/GalleryFilteredPosts'
import { TweetFilteredPosts } from '@/src/themes/tweet/TweetFilteredPosts'
import { TweetShell } from '@/src/themes/tweet/TweetShell'
import { applyThemePageLayout, usesStandaloneThemeLayout } from '@/src/themes/themeLayout'
import { formatPosts, FORMAT_POST_LIST_OPTIONS } from '@/src/lib/blog/format/post'
import { getAllTags } from '@/src/lib/blog/format/tag'
import { withNavFooterStaticProps } from '@/src/lib/blog/withNavFooterStaticProps'
import { onDemandStaticPaths } from '@/src/lib/blog/postLimits'
import { addSubTitle, getSubTitleInfo } from '@/src/lib/util'
import {
  NextPageWithLayout,
  Post,
  SharedNavFooterStaticProps,
  Tag,
  Title,
} from '@/src/types/blog'
import { ApiScope } from '@/src/types/notion'
import { GetStaticProps, GetStaticPropsContext, NextPage } from 'next'
import { getPosts } from '../../lib/notion/getBlogData'

const { TAG } = CONFIG.DEFAULT_SPECIAL_PAGES

export const getStaticPaths = async () => onDemandStaticPaths

export const getStaticProps: GetStaticProps = withNavFooterStaticProps(
  async (
    context: GetStaticPropsContext,
    sharedPageStaticProps: SharedNavFooterStaticProps
  ) => {
    const slug = TAG
    const subTitle = getSubTitleInfo(slug, sharedPageStaticProps.props)
    addSubTitle(sharedPageStaticProps.props, '', subTitle)
    const posts = await getPosts(ApiScope.Archive)
    const formattedPosts = await formatPosts(posts, FORMAT_POST_LIST_OPTIONS)
    const tagId = context.params?.tag as string
    const postsByTag = formattedPosts.filter((post) =>
      post.tags.map((t) => t.id).includes(tagId)
    )
    const tag = postsByTag[0].tags.find((t) => t.id === tagId)

    return {
      props: {
        ...sharedPageStaticProps.props,
        posts: postsByTag,
        tag,
        subTitle,
      },
      revalidate: CONFIG.NEXT_REVALIDATE_SECONDS,
    }
  }
)

const TagPage: NextPage<{
  tag: Tag
  posts: Post[]
  subTitle: Title
  activeTheme?: string
  siteTitle?: SharedNavFooterStaticProps['props']['siteTitle']
}> = ({ tag, posts, subTitle, activeTheme, siteTitle }) => {
  if (!tag) return <Section404 />

  tag.count = posts.length

  if (activeTheme === 'gallery') {
    const parentLabel = subTitle?.text || 'Cosers'
    const parentHref = subTitle?.slug ? `/${subTitle.slug}` : `/${TAG}`
    return (
      <GalleryFilteredPosts
        posts={posts}
        title={tag.name}
        breadcrumbItems={[
          { label: '首页', href: '/' },
          { label: parentLabel, href: parentHref },
          { label: tag.name },
        ]}
        emptyLabel="该标签下暂无文章"
      />
    )
  }

  if (activeTheme === 'tweet') {
    return (
      <TweetShell siteTitle={siteTitle}>
        <TweetFilteredPosts posts={posts} title={tag.name} emptyLabel="该标签下暂无文章" />
      </TweetShell>
    )
  }

  return (
    <SubCollection item={tag} posts={posts} subTitle={subTitle} type={'tag'} />
  )
}

const withNavPage = withNavFooter(TagPage, true)

;(withNavPage as NextPageWithLayout).getLayout = (page) => {
  if (usesStandaloneThemeLayout((page.props as { activeTheme?: string })?.activeTheme)) {
    return page
  }
  if (!page.props.tag) return <BlogLayout>{page}</BlogLayout>
  const color = page.props.tag.color
  return color !== 'gray' && color !== 'default' ? (
    <BlogLayoutWithColor color={color}>{page}</BlogLayoutWithColor>
  ) : (
    <BlogLayout>{page}</BlogLayout>
  )
}

export default withNavPage
