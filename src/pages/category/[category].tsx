import CONFIG from '@/blog.config'
import BlogLayout, {
  BlogLayoutWithColor,
} from '@/src/components/layout/BlogLayout'
import { Section404 } from '@/src/components/section/Section404'
import { SubCollection } from '@/src/components/section/SubCollection'
import withNavFooter from '@/src/components/withNavFooter'
import { GalleryFilteredPosts } from '@/src/themes/gallery/GalleryFilteredPosts'
import { getAllCategories } from '@/src/lib/blog/format/category'
import { formatPosts } from '@/src/lib/blog/format/post'
import { withNavFooterStaticProps } from '@/src/lib/blog/withNavFooterStaticProps'
import { addSubTitle, getSubTitleInfo } from '@/src/lib/util'
import {
  Category,
  NextPageWithLayout,
  Post,
  SharedNavFooterStaticProps,
  Title,
} from '@/src/types/blog'
import { ApiScope } from '@/src/types/notion'
import { GetStaticProps, GetStaticPropsContext, NextPage } from 'next'
import { getPosts } from '../../lib/notion/getBlogData'

const { CATEGORY } = CONFIG.DEFAULT_SPECIAL_PAGES

export const getStaticPaths = async () => {
  const posts = await getPosts(ApiScope.Archive)
  const formattedPosts = await formatPosts(posts)
  const categories = getAllCategories(formattedPosts)
  const paths = categories.map((category) => ({
    params: { category: category.id },
  }))
  return { paths, fallback: 'blocking' }
}

export const getStaticProps: GetStaticProps = withNavFooterStaticProps(
  async (
    context: GetStaticPropsContext,
    sharedPageStaticProps: SharedNavFooterStaticProps
  ) => {
    const slug = CATEGORY
    const subTitle = getSubTitleInfo(slug, sharedPageStaticProps.props)
    addSubTitle(sharedPageStaticProps.props, '', subTitle)
    const posts = await getPosts(ApiScope.Archive)
    const formattedPosts = await formatPosts(posts)
    const categoryId = context.params?.category as string
    const postsByCategory = formattedPosts.filter(
      (post) => post.category.id === categoryId
    )
    const category = postsByCategory[0].category

    return {
      props: {
        ...sharedPageStaticProps.props,
        posts: postsByCategory,
        category,
        subTitle,
      },
      revalidate: CONFIG.NEXT_REVALIDATE_SECONDS,
    }
  }
)

const CategoryPage: NextPage<{
  category: Category
  posts: Post[]
  subTitle: Title
  activeTheme?: string
}> = ({ category, posts, subTitle, activeTheme }) => {
  if (!category) return <Section404 />

  category.count = posts.length

  if (activeTheme === 'gallery') {
    const parentLabel = subTitle?.text || 'Lists'
    const parentHref = subTitle?.slug ? `/${subTitle.slug}` : `/${CATEGORY}`
    return (
      <GalleryFilteredPosts
        posts={posts}
        title={category.name}
        breadcrumbItems={[
          { label: '首页', href: '/' },
          { label: parentLabel, href: parentHref },
          { label: category.name },
        ]}
        emptyLabel="该分类下暂无文章"
      />
    )
  }

  return (
    <SubCollection
      item={category}
      posts={posts}
      subTitle={subTitle}
      type={'category'}
    />
  )
}

const withNavPage = withNavFooter(CategoryPage, true)

;(withNavPage as NextPageWithLayout).getLayout = (page) => {
  if ((page.props as { activeTheme?: string })?.activeTheme === 'gallery') {
    return page
  }
  if (!page.props.category) return <BlogLayout>{page}</BlogLayout>
  const color = page.props.category.color
  return color !== 'gray' && color !== 'default' ? (
    <BlogLayoutWithColor color={color}>{page}</BlogLayoutWithColor>
  ) : (
    <BlogLayout>{page}</BlogLayout>
  )
}

export default withNavPage
