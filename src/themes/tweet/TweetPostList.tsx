import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { TweetFeedMediaMap } from '@/src/lib/tweet/loadTweetFeedMedia'
import { Post } from '@/src/types/blog'
import { TweetPostCard } from './TweetPostCard'

type TweetPostListProps = {
  posts: Post[]
  emptyLabel?: string
  profile?: ProfileWidgetType | null
  feedMedia?: TweetFeedMediaMap | null
}

export function TweetPostList({
  posts,
  emptyLabel = '暂无内容 😺',
  profile,
  feedMedia,
}: TweetPostListProps) {
  if (!posts.length) {
    return <p className="tweet-post-list__empty">{emptyLabel}</p>
  }

  return (
    <div>
      {posts.map((post) => (
        <TweetPostCard
          key={post.id}
          post={post}
          profile={profile}
          feedMedia={feedMedia}
        />
      ))}
    </div>
  )
}
