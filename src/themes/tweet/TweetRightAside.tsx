import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { TweetAsideFooter } from './TweetAsideFooter'
import { TweetProfileCard } from './TweetProfileCard'
import { TweetServiceCard } from './TweetServiceCard'

type TweetRightAsideProps = {
  profile?: ProfileWidgetType | null
  vendingEnabled?: boolean
}

export function TweetRightAside({
  profile,
  vendingEnabled = true,
}: TweetRightAsideProps) {
  return (
    <>
      <TweetProfileCard profile={profile} vendingEnabled={vendingEnabled} />
      <TweetServiceCard />
      <TweetAsideFooter />
    </>
  )
}
