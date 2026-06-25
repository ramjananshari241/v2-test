import Link from 'next/link'
import { BlockRender } from '@/src/components/blocks/BlockRender'
import { BlockResponse } from '@/src/types/notion'
import { MathJaxContext } from 'better-react-mathjax'

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
      <Link href={backHref} className="tweet-article-back">
        ← {backLabel}
      </Link>
      <h1 className="tweet-article-title">{title}</h1>
      {excerpt?.trim() ? (
        <p className="tweet-article-excerpt">{excerpt}</p>
      ) : null}
      <MathJaxContext>
        <div className="prose-tweet overflow-hidden break-words">
          <BlockRender blocks={blocks} variant="tweet" />
        </div>
      </MathJaxContext>
    </article>
  )
}
