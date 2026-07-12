import ContainerLayout from '@/src/components/post/ContainerLayout'
import { MainPostsCollection } from '@/src/components/section/MainPostsCollection'
import { MorePostsCollection } from '@/src/components/section/MorePostsCollection'
import { WidgetCollection } from '@/src/components/section/WidgetCollection'
import { ThemeHomeProps } from '../types'

/** Standard V1 首页 */
export const DefaultHome = ({
  posts,
  widgets,
  vendingConfig,
  vendingEnabled,
  galleryFeedCovers,
}: ThemeHomeProps) => (
  <>
    <ContainerLayout>
      <WidgetCollection
        widgets={widgets}
        vendingConfig={vendingConfig}
        vendingEnabled={vendingEnabled !== false}
      />
      <div data-aos="fade-up" data-aos-delay={300}>
        <MainPostsCollection posts={posts} galleryFeedCovers={galleryFeedCovers} />
      </div>
    </ContainerLayout>
    <MorePostsCollection posts={posts} galleryFeedCovers={galleryFeedCovers} />
  </>
)
