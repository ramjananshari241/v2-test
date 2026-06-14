import { GalleryAdBanner as GalleryAdBannerData } from '@/src/lib/gallery/loadGalleryAdBanner'

type GalleryAdBannerProps = {
  banner: GalleryAdBannerData
  className?: string
  /** 下载页右栏：铺满栏宽；文章底栏：居中限宽 */
  layout?: 'default' | 'full'
}

/** Gallery Epic 风格：内页底部 / 下载页顶部矩形挂件 */
export function GalleryAdBanner({
  banner,
  className,
  layout = 'default',
}: GalleryAdBannerProps) {
  const { url, imageSrc, promoText } = banner
  const hasImage = Boolean(imageSrc?.startsWith('http'))

  const widthClass =
    layout === 'full' ? 'w-full' : 'mx-auto w-full max-w-[min(640px,84%)]'

  return (
    <aside className={className ?? 'mt-8 shrink-0 bg-white'}>
      <div className={widthClass}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="group relative flex h-16 w-full items-center overflow-hidden rounded-lg shadow-[0_1px_6px_rgba(0,0,0,0.1)] ring-1 ring-black/5 transition-shadow duration-200 hover:shadow-[0_2px_10px_rgba(0,0,0,0.14)] sm:h-[72px]"
        >
          {hasImage ? (
            <img
              src={imageSrc!}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="absolute inset-0 bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-600"
              aria-hidden
            />
          )}
          {promoText ? (
            <div className="relative z-10 flex h-full w-full items-center bg-black/45 px-4 transition-colors group-hover:bg-black/55 sm:px-5">
              <p className="w-full truncate text-center font-gallery text-xs font-medium tracking-wide text-white sm:text-[13px]">
                {promoText}
              </p>
            </div>
          ) : (
            <span className="sr-only">广告</span>
          )}
        </a>
      </div>
    </aside>
  )
}
