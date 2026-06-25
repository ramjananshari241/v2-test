'use client'

import { Post } from '@/src/types/blog'
import { TweetPostCard } from './TweetPostCard'

type TweetPostListProps = {
  posts: Post[]
  emptyLabel?: string
}

export function TweetPostList({
  posts,
  emptyLabel = 'Nothing! 😺',
}: TweetPostListProps) {
  if (!posts.length) {
    return <p className="tweet-post-list__empty">{emptyLabel}</p>
  }

  return (
    <div>
      {posts.map((post) => <TweetPostCard key={post.id} post={post} />)}
    </div>
  )
}
