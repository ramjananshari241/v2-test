import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { tweetAvatarSrc } from './tweetProfile'
import { TweetSectionTitle } from './TweetSectionTitle'
import { TweetVendingButton } from './TweetVendingButton'

export function TweetMobileProfileCard({
  profile,
}: {
  profile?: ProfileWidgetType | null
}) {
  const name = profile?.name?.trim() || 'PRO BLOG'
  const description = profile?.description?.trim() || ''
  const avatar = tweetAvatarSrc(profile)

  return (
    <div className="tweet-feed__profile-mobile">
      <TweetSectionTitle emoji="💻" label="Profile" />
      <div className="tweet-profile__stack">
        <div className="tweet-profile-mobile">
          <div className="tweet-profile-mobile__row">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="tweet-profile-mobile__avatar" />
            ) : (
              <div
                className="tweet-profile-mobile__avatar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: 'var(--tweet-gray9)',
                }}
              >
                {name.charAt(0).toUpperCase()}
              </div>
            )}
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
