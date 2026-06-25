import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { Title } from '@/src/types/blog'
import { ReactNode } from 'react'
import { TweetFeedGrid } from './TweetHeader'
import { TweetProfileCard } from './TweetProfileCard'
import { buildTweetProfileData } from './tweetProfile'

type TweetShellProps = {
  siteTitle?: Title
  profile?: ProfileWidgetType | null
  leftAside?: ReactNode
  children: ReactNode
}

export function TweetShell({
  siteTitle,
  profile,
  leftAside,
  children,
}: TweetShellProps) {
  const siteName = siteTitle?.text?.trim() || 'PRO BLOG'
  const profileData = buildTweetProfileData(profile, siteTitle)

  return (
    <TweetFeedGrid
      siteName={siteName}
      leftAside={leftAside}
      rightAside={<TweetProfileCard profile={profileData} />}
    >
      {children}
    </TweetFeedGrid>
  )
}
