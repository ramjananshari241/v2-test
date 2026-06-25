import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { TweetAvatar } from './TweetAvatar'
import { TweetSectionTitle } from './TweetSectionTitle'
import { TweetVendingButton } from './TweetVendingButton'

export function TweetMobileProfileCard({
  profile,
}: {
  profile?: ProfileWidgetType | null
}) {
  const name = profile?.name?.trim() || '本站'
  const description = profile?.description?.trim() || ''

  return (
    <div className="tweet-feed__profile-mobile">
      <TweetSectionTitle emoji="👤" label="Profile" />
      <div className="tweet-profile__stack">
        <div className="tweet-profile-mobile">
          <div className="tweet-profile-mobile__row">
            <TweetAvatar
              profile={profile}
              className="tweet-profile-mobile__avatar-wrap"
              imgClassName="tweet-avatar__img tweet-profile-mobile__avatar"
              fallbackClassName="tweet-profile-mobile__avatar tweet-profile-mobile__avatar-fallback"
              fallbackText={name.charAt(0).toUpperCase()}
            />
            <div>
              <div className="tweet-profile-mobile__name">{name}</div>
              {description ? (
                <p className="tweet-profile-mobile__bio">{description}</p>
              ) : null}
            </div>
          </div>
        </div>
        <TweetVendingButton />
      </div>
    </div>
  )
}
