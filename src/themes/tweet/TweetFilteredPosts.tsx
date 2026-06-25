import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { TweetFeedMediaMap } from '@/src/lib/tweet/loadTweetFeedMedia'
import { Post } from '@/src/types/blog'
import { TweetFeedHeader } from './TweetFeedHeader'
import { TweetPostList } from './TweetPostList'

type TweetFilteredPostsProps = {
  posts: Post[]
  title: string
  emptyLabel?: string
  profile?: ProfileWidgetType | null
  feedMedia?: TweetFeedMediaMap | null
}

export function TweetFilteredPosts({
  posts,
  title,
  emptyLabel = 'Nothing! 😺',
  profile,
  feedMedia,
}: TweetFilteredPostsProps) {
  const listPosts = posts.filter((p) => p.slug !== 'announcement')

  return (
    <div>
      <h1 className="tweet-article-title" style={{ marginBottom: '1rem' }}>
        {title}
      </h1>
      <TweetFeedHeader posts={listPosts} />
      <TweetPostList
        posts={listPosts}
        emptyLabel={emptyLabel}
        profile={profile}
        feedMedia={feedMedia}
      />
    </div>
  )
}
