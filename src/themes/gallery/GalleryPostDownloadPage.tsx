import { BlockRender } from '@/src/components/blocks/BlockRender'
import { GalleryAdBanner as GalleryAdBannerData } from '@/src/lib/gallery/loadGalleryAdBanner'
import { PostStatsSnapshot } from '@/src/lib/gallery/postStats'
import { Page, Post } from '@/src/types/blog'
import { BlockResponse } from '@/src/types/notion'
import Link from 'next/link'
import CONFIG from '@/blog.config'
import { getSubTitleInfo } from '@/src/lib/util'
import { GalleryAdBanner } from './GalleryAdBanner'
import { GalleryBreadcrumb } from './GalleryBreadcrumb'
import { GalleryPostDownloadActions } from './GalleryPostDownloadActions'
import { GalleryPostStats } from './GalleryPostStats'
import { galleryEpicBarTitleClass, galleryProseClass } from './galleryFonts'

type GalleryPostDownloadPageProps = {
  post: Post
  downloadInstructionBlocks: BlockResponse[]
  postStats?: PostStatsSnapshot | null
  navPages?: Page[]
  galleryAdBanner?: GalleryAdBannerData | null
}

const { CATEGORY } = CONFIG.DEFAULT_SPECIAL_PAGES

export function GalleryPostDownloadPage({
  post,
  downloadInstructionBlocks,
  postStats = null,
  navPages = [],
  galleryAdBanner = null,
}: GalleryPostDownloadPageProps) {
  const cover = post.cover?.light?.src
  const downloadValue = post.options?.download?.trim() ?? ''
  const downloadSize = post.options?.downloadSize?.trim() ?? ''
  const postHref = `/post/${post.slug}`

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
          { label: post.title, href: postHref },
          { label: '下载' },
        ]}
      />

      <main className="flex flex-1 flex-col bg-white px-4 py-5 pb-10 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-[960px]">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-neutral-200 pb-3">
              <h1 className={`min-w-0 flex-1 ${galleryEpicBarTitleClass}`}>
                {post.title}
              </h1>
              {downloadSize ? (
                <span className="shrink-0 font-gallery text-[13px] font-normal text-neutral-500">
                  {downloadSize}
                </span>
              ) : null}
            </div>

            <GalleryPostStats
              postSlug={post.slug}
              publishedDate={post.date?.updated || post.date?.created}
              initialStats={postStats}
              track={false}
            />

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
              <div className="mx-auto w-full max-w-[380px] shrink-0 lg:mx-0 lg:max-w-[340px] xl:max-w-[380px]">
                <div className="overflow-hidden rounded-md bg-neutral-100">
                  <div className="relative aspect-[10/13.35]">
                    {cover ? (
                      <img
                        src={cover}
                        alt={post.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-neutral-300">
                        P
                      </div>
                    )}
                  </div>
                </div>
                <Link
                  href={postHref}
                  className="mt-3 inline-block font-gallery text-[13px] text-neutral-500 transition-colors hover:text-neutral-900"
                >
                  ← 返回作品预览
                </Link>
              </div>

              <div className="min-w-0 flex-1">
                {galleryAdBanner ? (
                  <GalleryAdBanner
                    banner={galleryAdBanner}
                    className="mb-6 shrink-0 bg-white"
                  />
                ) : null}

                <section className="mb-8 flex justify-center py-2">
                  <GalleryPostDownloadActions
                    postSlug={post.slug}
                    postTitle={post.title}
                    downloadContent={downloadValue}
                  />
                </section>

                <section className="pt-2">
                  {downloadInstructionBlocks.length > 0 ? (
                    <div className={`${galleryProseClass} text-[15px]`}>
                      <BlockRender blocks={downloadInstructionBlocks} />
                    </div>
                  ) : (
                    <p className="font-gallery text-sm leading-relaxed text-neutral-500">
                      暂无下载说明。请在后台「自定义页面」中编辑 slug 为{' '}
                      <code className="rounded bg-neutral-100 px-1 py-0.5 text-[13px] text-neutral-700">
                        download
                      </code>{' '}
                      的页面内容。
                    </p>
                  )}
                </section>
              </div>
            </div>
        </div>
      </main>
    </>
  )
}
