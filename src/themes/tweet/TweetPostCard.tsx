import Link from 'next/link'
import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { TweetFeedMediaMap } from '@/src/lib/tweet/loadTweetFeedMedia'
import { Post } from '@/src/types/blog'
import { formatTweetDate } from './tweetSearch'
import { TweetPostCardAuthor } from './TweetPostCardAuthor'
import { TweetPostCardMedia } from './TweetPostCardMedia'
import { resolveTweetCardMedia } from './tweetFeedMedia'

type TweetPostCardProps = {
  post: Post
  profile?: ProfileWidgetType | null
  feedMedia?: TweetFeedMediaMap | null
}

export function TweetPostCard({
  post,
  profile,
  feedMedia,
}: TweetPostCardProps) {
  const categoryName = post.category?.name?.trim()
  const tags = post.tags?.filter((t) => t.name) ?? []
  const dateLabel = formatTweetDate(post.date?.created)
  const excerpt = post.excerpt?.trim()
  const media = resolveTweetCardMedia(post, feedMedia)

  return (
    <Link href={`/post/${post.slug}`} className="tweet-post-card">
      <article className="tweet-post-card__article">
        <div className="tweet-post-card__body">
          <TweetPostCardAuthor profile={profile} categoryName={categoryName} />

          <div className="tweet-post-card__title-row">
            <h2 className="tweet-post-card__title">{post.title}</h2>
            {dateLabel ? (
              <time className="tweet-post-card__date" dateTime={post.date?.created}>
                {dateLabel}
              </time>
            ) : null}
          </div>

          {excerpt ? (
            <p className="tweet-post-card__excerpt">{excerpt}</p>
          ) : null}

          <TweetPostCardMedia media={media} />

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
