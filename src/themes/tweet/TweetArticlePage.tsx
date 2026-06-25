import { BlockRender } from '@/src/components/blocks/BlockRender'
import { BlockResponse } from '@/src/types/notion'
import Link from 'next/link'
import { MathJaxContext } from 'better-react-mathjax'
import { tweetPostTitleClass, tweetProseClass } from './tweetFonts'

type TweetArticlePageProps = {
  title: string
  blocks: BlockResponse[]
  excerpt?: string | null
  backHref?: string
  backLabel?: string
}

export function TweetArticlePage({
  title,
  blocks,
  excerpt,
  backHref = '/',
  backLabel = '返回首页',
}: TweetArticlePageProps) {
  return (
    <article>
      <Link
        href={backHref}
        className="mb-6 inline-flex items-center gap-1 font-tweet text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
      >
        ← {backLabel}
      </Link>
      <h1 className={`mb-4 ${tweetPostTitleClass}`}>{title}</h1>
      {excerpt?.trim() ? (
        <p className="mb-8 font-tweet text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          {excerpt}
        </p>
      ) : (
        <div className="mb-8" />
      )}
      <MathJaxContext>
        <div className={`${tweetProseClass} overflow-hidden break-words`}>
          <BlockRender blocks={blocks} />
        </div>
      </MathJaxContext>
    </article>
  )
}
