import { Post } from '@/src/types/blog'
import { TweetFeedHeader } from './TweetFeedHeader'
import { TweetPostList } from './TweetPostList'

type TweetFilteredPostsProps = {
  posts: Post[]
  title: string
  emptyLabel?: string
}

export function TweetFilteredPosts({
  posts,
  title,
  emptyLabel = 'Nothing! 😺',
}: TweetFilteredPostsProps) {
  const listPosts = posts.filter((p) => p.slug !== 'announcement')

  return (
    <div>
      <h1 className="tweet-article-title" style={{ marginBottom: '1rem' }}>
        {title}
      </h1>
      <TweetFeedHeader posts={listPosts} />
      <TweetPostList posts={listPosts} emptyLabel={emptyLabel} />
    </div>
  )
}
