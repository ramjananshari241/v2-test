import { ThemeHomeProps } from '../types'
import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { TweetFeedHeader } from './TweetFeedHeader'
import { TweetMobileProfileCard } from './TweetMobileProfileCard'
import { TweetPostList } from './TweetPostList'
import { TweetSearchBox } from './TweetSearchBox'
import { TweetServiceCard } from './TweetServiceCard'
import { TweetVendingButton } from './TweetVendingButton'
import { TweetShell } from './TweetShell'
import { TweetTagList } from './TweetTagList'
import {
  collectTweetTags,
  filterTweetPosts,
  readTweetSearchQuery,
} from './tweetSearch'

type AnnouncementLike = { title?: string; slug?: string }

export function TweetHome({ posts, widgets, siteTitle }: ThemeHomeProps) {
  const router = useRouter()
  const allPosts = posts?.length ? posts : []
  const profile = widgets?.profile as ProfileWidgetType | undefined
  const announcement = widgets?.announcement as AnnouncementLike | undefined

  const searchQuery = router.isReady ? readTweetSearchQuery(router.query.q) : ''
  const categoryId =
    router.isReady && typeof router.query.category === 'string'
      ? router.query.category
      : undefined
  const order =
    router.isReady && typeof router.query.order === 'string'
      ? router.query.order
      : 'desc'

  const filteredPosts = useMemo(
    () =>
      filterTweetPosts(allPosts, {
        q: searchQuery,
        categoryId,
        order,
      }),
    [allPosts, searchQuery, categoryId, order]
  )
  const tags = useMemo(() => collectTweetTags(allPosts), [allPosts])

  const emptyMessage = searchQuery
    ? `未找到与「${searchQuery}」相关的文章`
    : 'Nothing! 😺'

  return (
    <TweetShell
      siteTitle={siteTitle}
      profile={profile}
      announcement={announcement}
      leftAside={<TweetTagList tags={tags} layout="sidebar" />}
    >
      <TweetTagList tags={tags} layout="mobile" />
      <TweetMobileProfileCard profile={profile} />
      <div className="tweet-service-mobile">
        <TweetServiceCard
          announcement={announcement}
          sectionTitleDesktopOnly={false}
        />
        <TweetVendingButton />
      </div>
      <TweetSearchBox />
      <TweetFeedHeader posts={allPosts} />
      <TweetPostList posts={filteredPosts} emptyLabel={emptyMessage} />
    </TweetShell>
  )
}
