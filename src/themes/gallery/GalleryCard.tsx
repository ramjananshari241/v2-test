import Link from 'next/link'
import { Post, Tag } from '@/src/types/blog'
import CONFIG from '@/blog.config'
import { galleryPostDownloadHref } from '@/src/lib/gallery/galleryDownloadPaths'
import {
  galleryCardCategoryClass,
  galleryCardTagClass,
  galleryCardTitleClass,
} from './galleryFonts'

const { TAG, CATEGORY } = CONFIG.DEFAULT_SPECIAL_PAGES

function tagHref(tag: Tag) {
  return `/${TAG}/${tag.id}`
}

/** Gallery Epic 同款：箭头向下指向底部横条（下载，非上传） */
function DownloadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
    </svg>
  )
}

export const GalleryCard = ({ post }: { post: Post }) => {
  const cover = post.cover?.light?.src
  const postHref = `/post/${post.slug}`
  const downloadHref = galleryPostDownloadHref(post.slug)
  const tags = post.tags?.filter((t) => t.name) ?? []
  const categoryName = post.category?.name?.trim()

  return (
    <article className="group flex w-full flex-col">
        <Link href={postHref} className="block overflow-hidden rounded-md">
          <div className="relative aspect-[10/13.35] bg-neutral-100">
            {cover ? (
              <img
                src={cover}
                alt={post.title}
                className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.08]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-neutral-300">
                P
              </div>
            )}
          </div>
        </Link>

        <div className="mt-2 flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <Link
              href={postHref}
              className={`min-w-0 flex-1 truncate leading-tight hover:text-neutral-600 ${galleryCardTitleClass}`}
            >
              {post.title}
            </Link>
            <Link
              href={downloadHref}
              title="下载"
              onClick={(e) => e.stopPropagation()}
              className="flex h-7 w-7 shrink-0 items-center justify-center text-neutral-900 transition-opacity hover:opacity-60"
            >
              <DownloadIcon />
            </Link>
          </div>

          {tags.length > 0 ? (
            <p className={`mt-0.5 line-clamp-2 ${galleryCardTagClass}`}>
              {tags.map((tag, index) => (
                <span key={tag.id}>
                  {index > 0 ? (
                    <span className="text-neutral-400" aria-hidden>
                      ,{' '}
                    </span>
                  ) : null}
                  <Link
                    href={tagHref(tag)}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-neutral-800 hover:underline decoration-neutral-300 underline-offset-2"
                  >
                    {tag.name}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}

          {categoryName ? (
            <p className={`mt-1 truncate ${galleryCardCategoryClass}`}>
              <Link
                href={`/${CATEGORY}/${post.category?.id || ''}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-neutral-600 hover:underline decoration-neutral-300 underline-offset-2"
              >
                {categoryName}
              </Link>
            </p>
          ) : null}
        </div>
      </article>
  )
}
