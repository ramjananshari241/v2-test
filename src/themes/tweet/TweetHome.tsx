import { ThemeHomeProps } from '../types'
import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { TweetAnnouncementBar } from './TweetAnnouncementBar'
import { TweetPostList } from './TweetPostList'
import { TweetSearchBox } from './TweetSearchBox'
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
  const filteredPosts = useMemo(
    () => filterTweetPosts(allPosts, searchQuery),
    [allPosts, searchQuery]
  )
  const tags = useMemo(() => collectTweetTags(allPosts), [allPosts])

  const emptyMessage = searchQuery
    ? `未找到与「${searchQuery}」相关的文章`
    : '暂无内容'

  return (
    <TweetShell siteTitle={siteTitle} profile={profile} leftAside={<TweetTagList tags={tags} />}>
      <div className="space-y-4">
        <TweetSearchBox />
        <TweetAnnouncementBar announcement={announcement} />
        <TweetPostList posts={filteredPosts} emptyLabel={emptyMessage} />
      </div>
    </TweetShell>
  )
}
