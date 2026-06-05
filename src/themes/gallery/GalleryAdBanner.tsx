import { GalleryAdBanner as GalleryAdBannerData } from '@/src/lib/gallery/loadGalleryAdBanner'

type GalleryAdBannerProps = {
  banner: GalleryAdBannerData
}

export function GalleryAdBanner({ banner }: GalleryAdBannerProps) {
  const { url, imageSrc, promoText } = banner

  return (
    <section className="mt-10">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="group relative block w-full overflow-hidden rounded-xl bg-neutral-900"
        style={{ aspectRatio: '4 / 1' }}
      >
        <img
          src={imageSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          loading="lazy"
        />
        {promoText ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35 px-6 transition-colors group-hover:bg-black/45">
            <p className="max-w-[90%] text-center font-gallery text-base font-semibold tracking-wide text-white drop-shadow-md sm:text-lg md:text-xl">
              {promoText}
            </p>
          </div>
        ) : null}
      </a>
    </section>
  )
}
