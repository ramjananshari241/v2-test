import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { TweetProfileCard } from './TweetProfileCard'
import { TweetServiceCard } from './TweetServiceCard'
import { TweetVendingButton } from './TweetVendingButton'
import type { TweetAnnouncementLike } from './tweetShellWidgets'

type TweetRightAsideProps = {
  profile?: ProfileWidgetType | null
  announcement?: TweetAnnouncementLike | null
}

export function TweetRightAside({
  profile,
  announcement,
}: TweetRightAsideProps) {
  return (
    <>
      <TweetProfileCard profile={profile} />
      <TweetServiceCard announcement={announcement} />
      <TweetVendingButton />
    </>
  )
}
