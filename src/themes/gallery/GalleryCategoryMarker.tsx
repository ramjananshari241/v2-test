/** Epic Coser 风格分类圆标（无头像时统一占位，悬停整行链接触发动画） */
export function GalleryCategoryMarker() {
  return (
    <span className="gallery-category-marker" aria-hidden="true">
      <span className="gallery-category-marker__disc">
        <span className="gallery-category-marker__hole" />
      </span>
    </span>
  )
}
