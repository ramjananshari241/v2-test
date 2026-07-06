'use client'

type StandardGalleryGridLoaderProps = {
  compact?: boolean
}

export function StandardGalleryGridLoader({
  compact = false,
}: StandardGalleryGridLoaderProps) {
  return (
    <div
      className={`standard-gallery-loader${compact ? ' standard-gallery-loader--compact' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="加载图库"
    >
      <span className="standard-gallery-loader__ring" aria-hidden />
      <span className="standard-gallery-loader__text">加载图库…</span>
    </div>
  )
}
