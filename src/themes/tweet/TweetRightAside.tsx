import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { TweetAnnouncementBar } from './TweetAnnouncementBar'
import { TweetProfileCard } from './TweetProfileCard'
import { TweetServiceCard } from './TweetServiceCard'

type AnnouncementLike = { title?: string; slug?: string }

type TweetRightAsideProps = {
  profile?: ProfileWidgetType | null
  announcement?: AnnouncementLike | null
}

export function TweetRightAside({
  profile,
  announcement,
}: TweetRightAsideProps) {
  return (
    <>
      <TweetProfileCard profile={profile} />
      <TweetAnnouncementBar announcement={announcement} placement="sidebar" />
      <TweetServiceCard />
    </>
  )
}
