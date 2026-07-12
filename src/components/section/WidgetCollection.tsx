import { ProfileWidget } from '../widget/ProfileWidget'
import { StatsWidget } from '../widget/StatsWidget'
import type { VendingConfig } from '@/src/lib/blog/vendingDefaults'

export const WidgetCollection = ({
  widgets,
  vendingConfig,
  vendingEnabled = true,
}: {
  widgets: { [key: string]: any }
  vendingConfig?: VendingConfig | null
  vendingEnabled?: boolean
}) => {
  return (
    <div
      className="mb-6 grid grid-cols-2 gap-4 md:gap-8 lg:gap-10"
      data-aos="fade-up"
    >
      <ProfileWidget data={widgets.profile} />

      <StatsWidget
        data={widgets.announcement}
        vendingConfig={vendingConfig}
        vendingEnabled={vendingEnabled}
      />
    </div>
  )
}
