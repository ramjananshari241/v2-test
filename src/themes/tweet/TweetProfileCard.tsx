import { ProfileBioText } from '@/src/components/widget/ProfileBioText'
import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { TweetAvatar } from './TweetAvatar'
import { TweetSectionTitle } from './TweetSectionTitle'
import { TweetVendingButton } from './TweetVendingButton'

type TweetProfileCardProps = {
  profile?: ProfileWidgetType | null
  showSectionTitle?: boolean
  vendingEnabled?: boolean
}

export function TweetProfileCard({
  profile,
  showSectionTitle = true,
  vendingEnabled = true,
}: TweetProfileCardProps) {
  const name = profile?.name?.trim() || '本站'
  const description = profile?.description?.trim() || ''

  return (
    <div className="tweet-profile">
      {showSectionTitle ? (
        <TweetSectionTitle emoji="🙂" label="作者" desktopOnly />
      ) : null}
      <div className="tweet-profile__stack">
        <div className="tweet-profile-card">
          <div className="tweet-profile-card__top">
            <TweetAvatar
              profile={profile}
              className="tweet-profile-card__avatar-wrap"
              imgClassName="tweet-avatar__img tweet-profile-card__avatar"
              fallbackClassName="tweet-profile-card__avatar-fallback"
              fallbackText={name.charAt(0).toUpperCase()}
            />
          </div>
          <div className="tweet-profile-card__mid">
            <div className="tweet-profile-card__name">{name}</div>
          </div>
          {description ? (
            <ProfileBioText
              text={description}
              className="tweet-profile-card__bio"
            />
          ) : null}
        </div>
        {vendingEnabled ? <TweetVendingButton /> : null}
      </div>
    </div>
  )
}
