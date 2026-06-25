import CONFIG from '@/blog.config'
import Link from 'next/link'
import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { tweetAvatarSrc } from './tweetProfile'

const { CATEGORY } = CONFIG.DEFAULT_SPECIAL_PAGES

type TweetPostCardAuthorProps = {
  profile?: ProfileWidgetType | null
  categoryName?: string
  categoryId?: string
  dateLabel?: string
  dateTime?: string
}

export function TweetPostCardAuthor({
  profile,
  categoryName,
  categoryId,
  dateLabel,
  dateTime,
}: TweetPostCardAuthorProps) {
  const name = profile?.name?.trim() || 'PRO BLOG'
  const avatar = tweetAvatarSrc(profile)
  const categoryHref =
    categoryName && categoryId ? `/${CATEGORY}/${categoryId}` : ''

  return (
    <div className="tweet-post-card__author">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="tweet-post-card__author-avatar" />
      ) : (
        <div className="tweet-post-card__author-avatar tweet-post-card__author-fallback">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="tweet-post-card__author-meta">
        <span className="tweet-post-card__author-name">{name}</span>
        <span className="tweet-post-card__author-badge">作者</span>
        {categoryName && categoryHref ? (
          <Link href={categoryHref} className="tweet-post-card__category">
            {categoryName}
          </Link>
        ) : null}
      </div>
      {dateLabel ? (
        <time className="tweet-post-card__date" dateTime={dateTime}>
          {dateLabel}
        </time>
      ) : null}
    </div>
  )
}
