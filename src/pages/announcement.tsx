import CONFIG from '@/blog.config'
import { GetStaticProps, NextPage } from 'next'
import { BlockRender } from '@/src/components/blocks/BlockRender'
import { LargeTitle } from '@/src/components/LargeTitle'
import { BlogLayoutPure } from '@/src/components/layout/BlogLayout'
import ContainerLayout from '@/src/components/post/ContainerLayout'
import { Section404 } from '@/src/components/section/Section404'
import withNavFooter from '@/src/components/withNavFooter'
import { formatBlocks } from '@/src/lib/blog/format/block'
import { getAnnouncementPost, loadHomeWidgets } from '@/src/lib/blog/loadHomeWidgets'
import { withNavFooterStaticProps } from '@/src/lib/blog/withNavFooterStaticProps'
import { getAllBlocks } from '@/src/lib/notion/getBlocks'
import { TweetArticlePage } from '@/src/themes/tweet/TweetArticlePage'
import { TweetShell } from '@/src/themes/tweet/TweetShell'
import { isTweetTheme } from '@/src/themes/tweet/tweetTheme'
import { pickTweetShellWidgets } from '@/src/themes/tweet/tweetShellWidgets'
import { applyThemePageLayout } from '@/src/themes/themeLayout'
import { NextPageWithLayout, SharedNavFooterStaticProps } from '@/src/types/blog'
import { BlockResponse } from '@/src/types/notion'

const AnnouncementPage: NextPage<{
  title: string
  blocks: BlockResponse[]
  activeTheme?: string
  siteTitle?: SharedNavFooterStaticProps['props']['siteTitle']
  widgets?: Record<string, unknown>
}> = ({ title, blocks, activeTheme, siteTitle, widgets }) => {
  if (!title) return <Section404 />

  if (isTweetTheme(activeTheme)) {
    const shellWidgets = pickTweetShellWidgets(widgets)
    return (
      <TweetShell
        siteTitle={siteTitle}
        profile={shellWidgets.profile}
      >
        <TweetArticlePage title={title} blocks={blocks} backHref="/" backLabel="返回首页" />
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
  async (_context, sharedPageStaticProps) => {
    const announcement = await getAnnouncementPost()
    if (!announcement) {
      return {
        props: JSON.parse(
          JSON.stringify({
            ...sharedPageStaticProps.props,
            title: '',
            blocks: [],
          })
        ),
        revalidate: CONFIG.NEXT_REVALIDATE_SECONDS,
      }
    }

    const blocks = await getAllBlocks(announcement.id)
    const formattedBlocks = await formatBlocks(blocks)
    const widgets = await loadHomeWidgets({ announcement })

    return {
      props: JSON.parse(
        JSON.stringify({
          ...sharedPageStaticProps.props,
          title: announcement.title,
          blocks: formattedBlocks || [],
          widgets,
        })
      ),
      revalidate: CONFIG.NEXT_REVALIDATE_SECONDS,
    }
  }
)

const withNavPage = withNavFooter(AnnouncementPage)

;(withNavPage as NextPageWithLayout).getLayout = (page) =>
  applyThemePageLayout(page, (p) => <BlogLayoutPure>{p}</BlogLayoutPure>)

export default withNavPage
