import CONFIG from '@/blog.config'
import { GetStaticProps, GetStaticPropsContext, NextPage } from 'next'
import { BlockRender } from '../components/blocks/BlockRender'
import { LargeTitle } from '../components/LargeTitle'
import { BlogLayoutGradient } from '../components/layout/BlogLayout'
import ContainerLayout from '../components/post/ContainerLayout'
import FriendsCollection from '../components/section/FriendsCollection'
import withNavFooter from '../components/withNavFooter'
import { formatBlocks } from '../lib/blog/format/block'
import { getFormattedChildrenDatabase } from '../lib/blog/format/childrenDatabase'
import { withNavFooterStaticProps } from '../lib/blog/withNavFooterStaticProps'
import { getAllBlocks } from '../lib/notion/getBlocks'
import { addSubTitle } from '../lib/util'
import {
  Friend,
  NextPageWithLayout,
  Page,
  SharedNavFooterStaticProps,
} from '../types/blog'
import { BlockResponse } from '../types/notion'
import { GalleryFriendsPage } from '@/src/themes/gallery/GalleryFriendsPage'
import { TweetFriendsPage } from '@/src/themes/tweet/TweetFriendsPage'
import { TweetShell } from '@/src/themes/tweet/TweetShell'
import { isTweetTheme } from '@/src/themes/tweet/tweetTheme'
import { pickTweetShellWidgets } from '@/src/themes/tweet/tweetShellWidgets'
import { applyThemePageLayout } from '@/src/themes/themeLayout'
import { loadHomeWidgets } from '../lib/blog/loadHomeWidgets'

const { FREINDS } = CONFIG.DEFAULT_SPECIAL_PAGES

const Freinds: NextPage<{
  blocks: BlockResponse[]
  friendsDatabase: {
    type: 'Friends'
    data: Friend[]
  } | null
  title: string
  page: Page | null
  activeTheme?: string
  siteTitle?: SharedNavFooterStaticProps['props']['siteTitle']
  widgets?: Record<string, unknown>
}> = ({ blocks, friendsDatabase, title, page, activeTheme, siteTitle, widgets, vendingConfig, vendingEnabled }) => {
  const friends = friendsDatabase?.data ?? []

  if (activeTheme === 'gallery') {
    return (
      <GalleryFriendsPage
        title={title}
        pageNav={page?.nav}
        blocks={blocks}
        friends={friends}
      />
    )
  }

  if (isTweetTheme(activeTheme)) {
    const shellWidgets = pickTweetShellWidgets(widgets)
    return (
      <TweetShell
        siteTitle={siteTitle}
        profile={shellWidgets.profile}
        vendingConfig={vendingConfig}
        vendingEnabled={vendingEnabled !== false}
      >
        <TweetFriendsPage title={title} blocks={blocks} friends={friends} />
      </TweetShell>
    )
  }

  return (
    <>
      <ContainerLayout>
        <LargeTitle className="mb-4" title={title} />
        <div className="break-words">
          <BlockRender blocks={blocks} />
        </div>
        <FriendsCollection friends={friends} />
      </ContainerLayout>
    </>
  )
}

export const getStaticProps: GetStaticProps = withNavFooterStaticProps(
  async (
    _context: GetStaticPropsContext,
    sharedPageStaticProps: SharedNavFooterStaticProps
  ) => {
    addSubTitle(sharedPageStaticProps.props, FREINDS)
    const page =
      sharedPageStaticProps.props.navPages.find(
        (p) => p.slug === FREINDS
      ) ?? null
    const blocks = await getAllBlocks(page?.id ?? '')
    const formattedBlocks = await formatBlocks(blocks)
    const formattedChildDatabase = await getFormattedChildrenDatabase(
      formattedBlocks
    )
    const friendsDatabase =
      formattedChildDatabase.find((database) => database.type === 'Friends') ??
      null
    const widgets = await loadHomeWidgets()

    return {
      props: {
        ...sharedPageStaticProps.props,
        page,
        title: page?.nav || page?.title || '友链',
        blocks: formattedBlocks || [],
        friendsDatabase,
        widgets,
      },
      revalidate: CONFIG.NEXT_REVALIDATE_SECONDS,
    }
  }
)

const withNavPage = withNavFooter(Freinds)

;(withNavPage as NextPageWithLayout).getLayout = (page) =>
  applyThemePageLayout(page, (p) => <BlogLayoutGradient>{p}</BlogLayoutGradient>)

export default withNavPage
