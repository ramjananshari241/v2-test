import { SocialLinks } from '@/src/components/widget/SocialLinks'
import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { TweetSectionTitle } from './TweetSectionTitle'

type TweetContactCardProps = {
  profile?: ProfileWidgetType | null
  showSectionTitle?: boolean
  sectionTitleDesktopOnly?: boolean
}

export function TweetContactCard({
  profile,
  showSectionTitle = true,
  sectionTitleDesktopOnly = true,
}: TweetContactCardProps) {
  const links = Array.isArray(profile?.links) ? profile?.links : null
  if (!links) return null

  return (
    <div className="tweet-contact">
      {showSectionTitle ? (
        <TweetSectionTitle
          emoji="💬"
          label="Contact"
          desktopOnly={sectionTitleDesktopOnly}
        />
      ) : null}
      <div className="tweet-contact__card">
        <SocialLinks links={links} variant="tweet" />
      </div>
    </div>
  )
}
