import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { Title } from '@/src/types/blog'
import { ReactNode } from 'react'
import { TweetFeedGrid } from './TweetHeader'
import { TweetRightAside } from './TweetRightAside'
import { buildTweetProfileData } from './tweetProfile'

type TweetShellProps = {
  siteTitle?: Title
  profile?: ProfileWidgetType | null
  leftAside?: ReactNode
  children: ReactNode
  vendingEnabled?: boolean
}

export function TweetShell({
  siteTitle,
  profile,
  leftAside,
  children,
  vendingEnabled = true,
}: TweetShellProps) {
  const siteName = siteTitle?.text?.trim() || '本站'
  const profileData = buildTweetProfileData(profile, siteTitle)

  return (
    <TweetFeedGrid
      siteName={siteName}
      leftAside={leftAside}
      rightAside={
        <TweetRightAside profile={profileData} vendingEnabled={vendingEnabled} />
      }
    >
      {children}
    </TweetFeedGrid>
  )
}
