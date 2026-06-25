import { GetStaticProps, GetStaticPropsContext, NextPage } from 'next'
import CONFIG from '@/blog.config'
import { BlockRender } from '@/src/components/blocks/BlockRender'
import { BlogLayoutPure } from '@/src/components/layout/BlogLayout'
import ContainerLayout from '@/src/components/post/ContainerLayout'
import { LargeTitle } from '@/src/components/LargeTitle'
import { Section404 } from '@/src/components/section/Section404'
import withNavFooter from '@/src/components/withNavFooter'
import { GALLERY_DOWNLOAD_INSTRUCTIONS_SLUG } from '@/src/lib/gallery/galleryDownloadPaths'
import { formatBlocks } from '@/src/lib/blog/format/block'
import { loadHomeWidgets } from '@/src/lib/blog/loadHomeWidgets'
import { withNavFooterStaticProps } from '@/src/lib/blog/withNavFooterStaticProps'
import { getAllBlocks } from '@/src/lib/notion/getBlocks'
import { addSubTitle } from '@/src/lib/util'
import { GalleryArticlePage } from '@/src/themes/gallery/GalleryArticlePage'
import { TweetArticlePage } from '@/src/themes/tweet/TweetArticlePage'
import { TweetShell } from '@/src/themes/tweet/TweetShell'
import { isTweetTheme } from '@/src/themes/tweet/tweetTheme'
import { pickTweetShellWidgets } from '@/src/themes/tweet/tweetShellWidgets'
import { applyThemePageLayout } from '@/src/themes/themeLayout'
import { NextPageWithLayout, Page, SharedNavFooterStaticProps } from '@/src/types/blog'
import { BlockResponse } from '@/src/types/notion'

const DownloadInstructionsPage: NextPage<{
  blocks: BlockResponse[]
  title: string
  page: Page | null
  activeTheme?: string
  siteTitle?: SharedNavFooterStaticProps['props']['siteTitle']
  widgets?: Record<string, unknown>
}> = ({ blocks, title, page, activeTheme, siteTitle, widgets }) => {
  if (!page) return <Section404 />

  if (activeTheme === 'gallery') {
    const heading = page.nav || title
    return (
      <GalleryArticlePage
        title={heading}
        blocks={blocks}
        breadcrumbLabel={heading}
        excerpt={page.title && page.title !== page.nav ? page.title : null}
      />
    )
  }

  if (isTweetTheme(activeTheme)) {
    const shellWidgets = pickTweetShellWidgets(widgets)
    const heading = page.nav || title
    return (
      <TweetShell siteTitle={siteTitle} profile={shellWidgets.profile}>
        <TweetArticlePage
          title={heading}
          blocks={blocks}
          excerpt={page.title && page.title !== page.nav ? page.title : null}
          backHref="/"
          backLabel="返回首页"
        />
      </TweetShell>
    )
  }

  return (
    <ContainerLayout>
      <LargeTitle className="mb-4" title={title} />
      <div className="break-words rounded-2xl bg-white px-8 py-4 dark:bg-neutral-900">
        <BlockRender blocks={blocks} />
      </div>
    </ContainerLayout>
  )
}

export const getStaticProps: GetStaticProps = withNavFooterStaticProps(
  async (
    _context: GetStaticPropsContext,
    sharedPageStaticProps: SharedNavFooterStaticProps
  ) => {
    addSubTitle(sharedPageStaticProps.props, GALLERY_DOWNLOAD_INSTRUCTIONS_SLUG)
    const page =
      sharedPageStaticProps.props.navPages.find(
        (p) => p.slug === GALLERY_DOWNLOAD_INSTRUCTIONS_SLUG
      ) ?? null

    const blocks = await getAllBlocks(page?.id ?? '')
    const formattedBlocks = await formatBlocks(blocks)

    const safeTitle = page?.title ?? page?.nav ?? '下载说明'

    return {
      props: JSON.parse(
        JSON.stringify({
          ...sharedPageStaticProps.props,
          page,
          blocks: formattedBlocks || [],
          title: safeTitle,
          widgets: await loadHomeWidgets(),
        })
      ),
      revalidate: CONFIG.NEXT_REVALIDATE_SECONDS,
    }
  }
)

const withNavPage = withNavFooter(DownloadInstructionsPage)

;(withNavPage as NextPageWithLayout).getLayout = (page) =>
  applyThemePageLayout(page, (p) => <BlogLayoutPure>{p}</BlogLayoutPure>)

export default withNavPage
