import CONFIG from '@/blog.config'
import Link from 'next/link'
import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { TweetAvatar } from './TweetAvatar'

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
  const name = profile?.name?.trim() || '本站'
  const categoryHref =
    categoryName && categoryId ? `/${CATEGORY}/${categoryId}` : ''

  return (
    <div className="tweet-post-card__author">
      <TweetAvatar
        profile={profile}
        className="tweet-post-card__author-avatar-wrap"
        imgClassName="tweet-avatar__img tweet-post-card__author-avatar"
        fallbackClassName="tweet-post-card__author-avatar tweet-post-card__author-fallback"
        fallbackText={name.charAt(0).toUpperCase()}
      />
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
