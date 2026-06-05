import { Page, Post } from '@/src/types/blog'
import { BlockResponse } from '@/src/types/notion'
import CONFIG from '@/blog.config'
import { getSubTitleInfo } from '@/src/lib/util'
import { GalleryAdBanner as GalleryAdBannerData } from '@/src/lib/gallery/loadGalleryAdBanner'
import { GalleryRecommendPost } from '@/src/lib/gallery/galleryRecommendations'
import { PostStatsSnapshot } from '@/src/lib/gallery/postStats'
import { GalleryAdBanner } from './GalleryAdBanner'
import { GalleryBreadcrumb } from './GalleryBreadcrumb'
import { GalleryPopularSidebar } from './GalleryPopularSidebar'
import { GalleryPostDownloadButton } from './GalleryPostDownloadButton'
import { GalleryPostContent } from './GalleryPostContent'
import { GalleryPostRecommendations } from './GalleryPostRecommendations'
import { GalleryPostStats } from './GalleryPostStats'
import {
  galleryPostPreviewLabelClass,
  galleryPostTitleClass,
} from './galleryFonts'

type GalleryPostProps = {
  post: Post
  blocks: BlockResponse[]
  recommendations: GalleryRecommendPost[]
  postStats?: PostStatsSnapshot | null
  galleryAdBanner?: GalleryAdBannerData | null
  navPages?: Page[]
}

const { CATEGORY } = CONFIG.DEFAULT_SPECIAL_PAGES

export const GalleryPost = ({
  post,
  blocks,
  recommendations,
  postStats = null,
  galleryAdBanner = null,
  navPages = [],
}: GalleryPostProps) => {
  const categorySubTitle = getSubTitleInfo(CATEGORY, {
    navPages,
    siteSubtitle: null,
  })
  const categoryParentLabel = categorySubTitle?.text || '分类'
  const categoryParentHref = categorySubTitle?.slug
    ? `/${categorySubTitle.slug}`
    : `/${CATEGORY}`

  return (
    <>
      <GalleryBreadcrumb
        items={[
          { label: '首页', href: '/' },
          { label: categoryParentLabel, href: categoryParentHref },
          {
            label: post.category?.name || '未分类',
            href: `/${CATEGORY}/${post.category?.id || ''}`,
          },
          { label: post.title },
        ]}
      />
      <main className="flex flex-1 flex-col bg-white px-6 py-6 pb-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-0 lg:flex-row lg:items-start lg:gap-6 xl:gap-8">
          <article className="min-w-0 flex-1">
            <div className="mb-3 flex items-start justify-between gap-6">
              <h1 className={`min-w-0 flex-1 ${galleryPostTitleClass}`}>
                {post.title}
              </h1>
              <div className="shrink-0 pt-0.5">
                <GalleryPostDownloadButton postSlug={post.slug} />
              </div>
            </div>

            <GalleryPostStats
              postSlug={post.slug}
              publishedDate={post.date?.updated || post.date?.created}
              initialStats={postStats}
              track="view"
            />

            <p className={`mb-6 ${galleryPostPreviewLabelClass}`}>作品预览：</p>

            {post.excerpt ? (
              <p className="mb-8 font-gallery text-sm font-normal leading-relaxed tracking-wide text-neutral-500">
                {post.excerpt}
              </p>
            ) : (
              <div className="mb-8" />
            )}

            <GalleryPostContent postSlug={post.slug} blocks={blocks} />

            <div className="lg:hidden">
              <GalleryPostRecommendations posts={recommendations} />
            </div>

            {galleryAdBanner ? <GalleryAdBanner banner={galleryAdBanner} /> : null}
          </article>

          <GalleryPopularSidebar
            posts={recommendations}
            excludeSlug={post.slug}
            className="hidden lg:block lg:sticky lg:top-6 lg:self-start"
          />
        </div>
      </main>
    </>
  )
}
