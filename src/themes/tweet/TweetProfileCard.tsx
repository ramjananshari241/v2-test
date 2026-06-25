import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { tweetAvatarSrc } from './tweetProfile'
import { TweetSectionTitle } from './TweetSectionTitle'
import { TweetVendingButton } from './TweetVendingButton'

type TweetProfileCardProps = {
  profile?: ProfileWidgetType | null
  showSectionTitle?: boolean
}

export function TweetProfileCard({
  profile,
  showSectionTitle = true,
}: TweetProfileCardProps) {
  const name = profile?.name?.trim() || 'PRO BLOG'
  const description = profile?.description?.trim() || ''
  const avatar = tweetAvatarSrc(profile)

  return (
    <div className="tweet-profile">
      {showSectionTitle ? (
        <TweetSectionTitle emoji="💻" label="Profile" desktopOnly />
      ) : null}
      <div className="tweet-profile__stack">
        <div className="tweet-profile-card">
          <div className="tweet-profile-card__top">
            <div className="tweet-profile-card__avatar-wrap">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="tweet-profile-card__avatar" />
              ) : (
                <div className="tweet-profile-card__avatar-fallback">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div className="tweet-profile-card__mid">
            <div className="tweet-profile-card__name">{name}</div>
          </div>
          {description ? (
            <p className="tweet-profile-card__bio">{description}</p>
          ) : null}
        </div>
        <TweetVendingButton />
      </div>
    </div>
  )
}
