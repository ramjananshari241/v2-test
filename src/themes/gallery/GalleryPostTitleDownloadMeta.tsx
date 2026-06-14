import { Post } from '@/src/types/blog'

type GalleryPostTitleDownloadMetaProps = {
  post: Post
  /** 与同行标题共用字号/字重类名 */
  titleClass: string
}

/** 标题旁下载元信息：文件数量 + 资源大小 */
export function GalleryPostTitleDownloadMeta({
  post,
  titleClass,
}: GalleryPostTitleDownloadMetaProps) {
  const count = post.options?.downloadCount?.trim() ?? ''
  const size = post.options?.downloadSize?.trim() ?? ''
  if (!count && !size) return null

  const text = [count, size].filter(Boolean).join(' ')

  return (
    <span className={`shrink-0 whitespace-nowrap ${titleClass}`}>
      {text}
    </span>
  )
}
