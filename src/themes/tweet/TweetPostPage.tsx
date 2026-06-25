import Link from 'next/link'
import { Post } from '@/src/types/blog'
import { BlockResponse } from '@/src/types/notion'
import { formatTweetDate } from './tweetSearch'
import { TweetPostContent } from './TweetPostContent'

type TweetPostPageProps = {
  post: Post
  blocks: BlockResponse[]
}

export function TweetPostPage({ post, blocks }: TweetPostPageProps) {
  const dateLabel = formatTweetDate(post.date?.created)

  return (
    <article className="tweet-post-page">
      <Link href="/" className="tweet-article-back">
        ← 返回首页
      </Link>
      <h1 className="tweet-article-title">{post.title}</h1>
      {dateLabel ? <p className="tweet-article-meta">{dateLabel}</p> : null}
      {post.excerpt?.trim() ? (
        <p className="tweet-article-excerpt">{post.excerpt}</p>
      ) : null}
      <TweetPostContent postSlug={post.slug} blocks={blocks} />
    </article>
  )
}
