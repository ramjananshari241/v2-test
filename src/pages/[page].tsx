import CONFIG from '@/blog.config'
import { GetStaticProps, GetStaticPropsContext, NextPage } from 'next'
import { BlockRender } from '../components/blocks/BlockRender'
import { Empty } from '../components/Empty'
import { LargeTitle } from '../components/LargeTitle'
import { BlogLayoutPure } from '../components/layout/BlogLayout'
import ContainerLayout from '../components/post/ContainerLayout'
import { Section404 } from '../components/section/Section404'
import withNavFooter from '../components/withNavFooter'
import { formatBlocks } from '../lib/blog/format/block'
import { formatPages } from '../lib/blog/format/page'
import { withNavFooterStaticProps } from '../lib/blog/withNavFooterStaticProps'
import { getAllBlocks } from '../lib/notion/getBlocks'
import { getPages } from '../lib/notion/getBlogData'
import { addSubTitle } from '../lib/util'
import { buildNavPageSeo } from '@/src/lib/seo/lightSeo'
import { TweetArticlePage } from '@/src/themes/tweet/TweetArticlePage'
import { TweetShell } from '@/src/themes/tweet/TweetShell'
import { isTweetTheme } from '@/src/themes/tweet/tweetTheme'
import { pickTweetShellWidgets } from '@/src/themes/tweet/tweetShellWidgets'
import { applyThemePageLayout } from '@/src/themes/themeLayout'
import { loadHomeWidgets } from '../lib/blog/loadHomeWidgets'
import {
  NextPageWithLayout,
  Page,
  SharedNavFooterStaticProps,
} from '../types/blog'
import { BlockResponse } from '../types/notion'

const specialPages = Object.values(CONFIG.DEFAULT_SPECIAL_PAGES)

export const getStaticPaths = async () => {
  const pages = await getPages()
  const formattedPages = formatPages(pages)
  
  // 🟢 核心优化：只在构建阶段预先渲染前 20 篇文章
  // 这样部署时间将缩短 90% 以上。剩下的文章会在用户访问时自动生成并缓存。
  const paths = formattedPages
    .slice(0, 20) 
    .map((page) => ({
      params: { page: page.slug },
    }))
    .filter((page) => !specialPages.includes(page.params?.page as string))

  return { 
    paths, 
    // 🟢 关键：blocking 模式会确保未预生成的页面在初次访问时自动同步生成
    fallback: 'blocking' 
  }
}

export const getStaticProps: GetStaticProps = withNavFooterStaticProps(
  async (
    context: GetStaticPropsContext,
    sharedPageStaticProps: SharedNavFooterStaticProps
  ) => {
    const slug = context.params?.page as string
    addSubTitle(sharedPageStaticProps.props, slug)
    const page =
      sharedPageStaticProps.props.navPages.find((page) => page.slug === slug) ??
      null

    if (!page) {
      return {
        props: JSON.parse(
          JSON.stringify({
            ...sharedPageStaticProps.props,
            page: null,
            blocks: [],
          })
        ),
        revalidate: CONFIG.NEXT_REVALIDATE_SECONDS,
      }
    }

    try {
      const blocks = await getAllBlocks(page?.id ?? '')
      const formattedBlocks = await formatBlocks(blocks)
      const widgets = await loadHomeWidgets()

      return {
        props: JSON.parse(
          JSON.stringify({
            ...sharedPageStaticProps.props,
            page: page,
            blocks: formattedBlocks,
            widgets,
            seo: buildNavPageSeo(page),
          })
        ),
        revalidate: CONFIG.NEXT_REVALIDATE_SECONDS,
      }
    } catch (error) {
      console.error(`[page/${slug}] render error:`, error)
      const message = error instanceof Error ? error.message : String(error)
      const isTransient =
        /ECONNRESET|ETIMEDOUT|ENOTFOUND|429|502|503|504|fetch failed|network/i.test(
          message
        )
      if (isTransient) throw error
      // 正文块格式化失败时降级为空内容，避免整页 500（自定义页如 announcement 仍可打开）
      return {
        props: JSON.parse(
          JSON.stringify({
            ...sharedPageStaticProps.props,
            page: page,
            blocks: [],
            seo: buildNavPageSeo(page),
          })
        ),
        revalidate: CONFIG.NEXT_REVALIDATE_SECONDS,
      }
    }
  }
)

const Page: NextPage<{
  page: Page
  blocks: BlockResponse[]
  activeTheme?: string
  siteTitle?: SharedNavFooterStaticProps['props']['siteTitle']
  widgets?: Record<string, unknown>
}> = ({ page, blocks, activeTheme, siteTitle, widgets, vendingEnabled }) => {
  if (!page) return <Section404 />

  const { title } = page

  if (isTweetTheme(activeTheme)) {
    const shellWidgets = pickTweetShellWidgets(widgets)
    return (
      <TweetShell
        siteTitle={siteTitle}
        profile={shellWidgets.profile}
        vendingEnabled={vendingEnabled !== false}
      >
        <TweetArticlePage title={page.nav || title} blocks={blocks} />
      </TweetShell>
    )
  }

  return (
    <>
      <ContainerLayout>
        <LargeTitle className="mb-4" title={title} />
        {blocks.length > 0 ? (
          <div className="px-8 py-4 break-words bg-white rounded-2xl dark:bg-neutral-900">
            <BlockRender blocks={blocks} />
          </div>
        ) : (
          <Empty />
        )}
      </ContainerLayout>
    </>
  )
}

;(Page as NextPageWithLayout).getLayout = (page) =>
  applyThemePageLayout(page, (p) => <BlogLayoutPure>{p}</BlogLayoutPure>)

export default withNavFooter(Page)
