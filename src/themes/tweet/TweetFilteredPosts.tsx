import { Post } from '@/src/types/blog'
import { TweetPostList } from './TweetPostList'

type TweetFilteredPostsProps = {
  posts: Post[]
  title: string
  emptyLabel?: string
}

export function TweetFilteredPosts({
  posts,
  title,
  emptyLabel = '暂无文章',
}: TweetFilteredPostsProps) {
  const listPosts = posts.filter((p) => p.slug !== 'announcement')

  return (
    <div>
      <h1 className="mb-6 font-tweet text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        {title}
      </h1>
      <TweetPostList posts={listPosts} emptyLabel={emptyLabel} />
    </div>
  )
}
