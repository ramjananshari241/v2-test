import Link from 'next/link'
import { Post } from '@/src/types/blog'
import { normalizeMediaUrl } from '@/src/lib/notion/readProperty'
import { formatTweetDate } from './tweetSearch'
import { tweetCategoryColor } from './tweetCategoryColor'

function coverSrc(post: Post): string {
  const raw = post.cover?.light?.src?.trim()
  if (!raw) return ''
  return normalizeMediaUrl(raw) || raw
}

export function TweetPostCard({ post }: { post: Post }) {
  const cover = coverSrc(post)
  const categoryName = post.category?.name?.trim()
  const tags = post.tags?.filter((t) => t.name) ?? []
  const dateLabel = formatTweetDate(post.date?.created)
  const hasThumb = Boolean(cover)
  const hasCategory = Boolean(categoryName)

  return (
    <Link href={`/post/${post.slug}`} className="tweet-post-card">
      <article className="tweet-post-card__article">
        {categoryName ? (
          <div className="tweet-post-card__category-wrap">
            <span
              className="tweet-post-card__category"
              style={{ backgroundColor: tweetCategoryColor(categoryName) }}
            >
              {categoryName}
            </span>
          </div>
        ) : null}
        {cover ? (
          <div className="tweet-post-card__thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt={post.title} />
          </div>
        ) : null}
        <div
          className="tweet-post-card__content"
          data-thumb={hasThumb}
          data-category={hasCategory}
        >
          <header className="tweet-post-card__top">
            <h2 className="tweet-post-card__title">{post.title}</h2>
          </header>
          {dateLabel ? (
            <div className="tweet-post-card__date">
              <div className="tweet-post-card__date-text">{dateLabel}</div>
            </div>
          ) : null}
          {post.excerpt?.trim() ? (
            <div className="tweet-post-card__summary">
              <p>{post.excerpt}</p>
            </div>
          ) : null}
          {tags.length > 0 ? (
            <div className="tweet-post-card__tags">
              {tags.map((tag) => (
                <span key={tag.id} className="tweet-post-card__tag">
                  {tag.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </article>
    </Link>
  )
}
