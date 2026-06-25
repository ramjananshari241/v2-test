import CONFIG from '@/blog.config'
import Link from 'next/link'
import { Post, Tag } from '@/src/types/blog'
import { normalizeMediaUrl } from '@/src/lib/notion/readProperty'
import { tweetCardSurfaceClass, tweetCardTitleClass } from './tweetFonts'
import { formatTweetDate } from './tweetSearch'

const { TAG } = CONFIG.DEFAULT_SPECIAL_PAGES

function tagHref(tag: Tag) {
  return `/${TAG}/${tag.id}`
}

function coverSrc(post: Post): string {
  const raw = post.cover?.light?.src?.trim()
  if (!raw) return ''
  return normalizeMediaUrl(raw) || raw
}

export function TweetPostCard({ post }: { post: Post }) {
  const cover = coverSrc(post)
  const categoryName = post.category?.name?.trim()
  const tags = post.tags?.filter((t) => t.name) ?? []
  const dateLabel = formatTweetDate(post.date?.created)

  return (
    <article className="group">
      <Link
        href={`/post/${post.slug}`}
        className={`block overflow-hidden ${tweetCardSurfaceClass}`}
      >
        {categoryName ? (
          <div className="px-4 pt-4">
            <span className="inline-block rounded-md bg-neutral-100 px-2 py-0.5 font-tweet text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {categoryName}
            </span>
          </div>
        ) : null}

        {cover ? (
          <div className="relative mt-3 aspect-[16/10] w-full bg-neutral-100 dark:bg-neutral-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt={post.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
        ) : null}

        <div className="p-4 pt-3">
          <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
            <h2 className={tweetCardTitleClass}>{post.title}</h2>
            {dateLabel ? (
              <time className="shrink-0 font-tweet text-sm text-neutral-400">
                {dateLabel}
              </time>
            ) : null}
          </div>

          {post.excerpt?.trim() ? (
            <p className="mb-3 hidden font-tweet text-sm leading-relaxed text-neutral-500 dark:text-neutral-400 md:block">
              {post.excerpt}
            </p>
          ) : null}

          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-md bg-neutral-100 px-2 py-0.5 font-tweet text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  <Link href={tagHref(tag)} className="hover:underline">
                    {tag.name}
                  </Link>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </Link>
    </article>
  )
}
