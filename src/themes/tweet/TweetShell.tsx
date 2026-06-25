import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { Title } from '@/src/types/blog'
import { ReactNode } from 'react'
import { TweetFeedGrid } from './TweetHeader'
import { TweetRightAside } from './TweetRightAside'
import { buildTweetProfileData } from './tweetProfile'

type AnnouncementLike = { title?: string; slug?: string }

type TweetShellProps = {
  siteTitle?: Title
  profile?: ProfileWidgetType | null
  announcement?: AnnouncementLike | null
  leftAside?: ReactNode
  children: ReactNode
}

export function TweetShell({
  siteTitle,
  profile,
  announcement,
  leftAside,
  children,
}: TweetShellProps) {
  const siteName = siteTitle?.text?.trim() || 'PRO BLOG'
  const profileData = buildTweetProfileData(profile, siteTitle)

  return (
    <TweetFeedGrid
      siteName={siteName}
      leftAside={leftAside}
      rightAside={
        <TweetRightAside profile={profileData} announcement={announcement} />
      }
    >
      {children}
    </TweetFeedGrid>
  )
}
