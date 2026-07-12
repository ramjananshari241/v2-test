import type { VendingConfig } from '@/src/lib/blog/vendingDefaults'
import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { TweetAsideFooter } from './TweetAsideFooter'
import { TweetProfileCard } from './TweetProfileCard'
import { TweetServiceCard } from './TweetServiceCard'

type TweetRightAsideProps = {
  profile?: ProfileWidgetType | null
  vendingConfig?: VendingConfig | null
  vendingEnabled?: boolean
}

export function TweetRightAside({
  profile,
  vendingConfig,
  vendingEnabled = true,
}: TweetRightAsideProps) {
  return (
    <>
      <TweetProfileCard
        profile={profile}
        vendingConfig={vendingConfig}
        vendingEnabled={vendingEnabled}
      />
      <TweetServiceCard />
      <TweetAsideFooter />
    </>
  )
}
