import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { tweetAvatarSrc } from './tweetProfile'

type TweetPostCardAuthorProps = {
  profile?: ProfileWidgetType | null
  categoryName?: string
}

export function TweetPostCardAuthor({
  profile,
  categoryName,
}: TweetPostCardAuthorProps) {
  const name = profile?.name?.trim() || 'PRO BLOG'
  const avatar = tweetAvatarSrc(profile)

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
        <span className="tweet-post-card__badge">作者</span>
        {categoryName ? (
          <span className="tweet-post-card__badge">{categoryName}</span>
        ) : null}
      </div>
    </div>
  )
}
