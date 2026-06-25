import { BlockRender } from '@/src/components/blocks/BlockRender'
import { Post } from '@/src/types/blog'
import { BlockResponse } from '@/src/types/notion'
import Link from 'next/link'
import { MathJaxContext } from 'better-react-mathjax'
import { tweetPostTitleClass, tweetProseClass } from './tweetFonts'
import { formatTweetDate } from './tweetSearch'

type TweetPostPageProps = {
  post: Post
  blocks: BlockResponse[]
}

export function TweetPostPage({ post, blocks }: TweetPostPageProps) {
  const dateLabel = formatTweetDate(post.date?.created)

  return (
    <article>
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 font-tweet text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
      >
        ← 返回首页
      </Link>
      <h1 className={`mb-2 ${tweetPostTitleClass}`}>{post.title}</h1>
      {dateLabel ? (
        <p className="mb-6 font-tweet text-sm text-neutral-400">{dateLabel}</p>
      ) : (
        <div className="mb-6" />
      )}
      {post.excerpt?.trim() ? (
        <p className="mb-8 font-tweet text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          {post.excerpt}
        </p>
      ) : null}
      <MathJaxContext>
        <div className={`${tweetProseClass} overflow-hidden break-words`}>
          <BlockRender blocks={blocks} />
        </div>
      </MathJaxContext>
    </article>
  )
}
