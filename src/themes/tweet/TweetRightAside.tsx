import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { TweetAsideFooter } from './TweetAsideFooter'
import { TweetProfileCard } from './TweetProfileCard'
import { TweetServiceCard } from './TweetServiceCard'

type TweetRightAsideProps = {
  profile?: ProfileWidgetType | null
}

export function TweetRightAside({ profile }: TweetRightAsideProps) {
  return (
    <>
      <TweetProfileCard profile={profile} />
      <TweetServiceCard />
      <TweetAsideFooter />
    </>
  )
}
