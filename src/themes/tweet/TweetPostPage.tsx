import Link from 'next/link'
import { BlockRender } from '@/src/components/blocks/BlockRender'
import { Post } from '@/src/types/blog'
import { BlockResponse } from '@/src/types/notion'
import { MathJaxContext } from 'better-react-mathjax'
import { formatTweetDate } from './tweetSearch'

type TweetPostPageProps = {
  post: Post
  blocks: BlockResponse[]
}

export function TweetPostPage({ post, blocks }: TweetPostPageProps) {
  const dateLabel = formatTweetDate(post.date?.created)

  return (
    <article>
      <Link href="/" className="tweet-article-back">
        ← 返回首页
      </Link>
      <h1 className="tweet-article-title">{post.title}</h1>
      {dateLabel ? <p className="tweet-article-meta">{dateLabel}</p> : null}
      {post.excerpt?.trim() ? (
        <p className="tweet-article-excerpt">{post.excerpt}</p>
      ) : null}
      <MathJaxContext>
        <div className="prose-tweet overflow-hidden break-words">
          <BlockRender blocks={blocks} />
        </div>
      </MathJaxContext>
    </article>
  )
}
