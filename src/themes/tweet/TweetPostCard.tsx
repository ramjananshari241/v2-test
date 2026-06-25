import Link from 'next/link'
import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { TweetFeedMediaMap } from '@/src/lib/tweet/loadTweetFeedMedia'
import { Post } from '@/src/types/blog'
import { formatTweetDate } from './tweetSearch'
import { TweetPostCardAuthor } from './TweetPostCardAuthor'
import { TweetPostCardMedia } from './TweetPostCardMedia'
import { TweetPostCardShare } from './TweetPostCardShare'
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
  const categoryId = post.category?.id
  const tags = post.tags?.filter((t) => t.name) ?? []
  const dateLabel = formatTweetDate(post.date?.created)
  const excerpt = post.excerpt?.trim()
  const media = resolveTweetCardMedia(post, feedMedia)
  const postHref = `/post/${post.slug}`

  return (
    <article className="tweet-post-card">
      <div className="tweet-post-card__shell">
        <TweetPostCardAuthor
          profile={profile}
          categoryName={categoryName}
          categoryId={categoryId}
          dateLabel={dateLabel}
          dateTime={post.date?.created}
        />
        <Link href={postHref} className="tweet-post-card__article">
          <div className="tweet-post-card__body">
            <h2 className="tweet-post-card__title">{post.title}</h2>

            {excerpt ? (
              <p className="tweet-post-card__excerpt">{excerpt}</p>
            ) : null}

            {media.mode !== 'none' ? (
              <div className="tweet-post-card__media-block">
                <TweetPostCardMedia media={media} />
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
        </Link>
        <div className="tweet-post-card__footer">
          <TweetPostCardShare slug={post.slug} />
        </div>
      </div>
    </article>
  )
}
