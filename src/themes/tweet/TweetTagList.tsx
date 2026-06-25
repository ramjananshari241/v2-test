import CONFIG from '@/blog.config'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Tag } from '@/src/types/blog'
import { tweetCardSurfaceClass } from './tweetFonts'

const { TAG } = CONFIG.DEFAULT_SPECIAL_PAGES

type TweetTagListProps = {
  tags: Tag[]
}

export function TweetTagList({ tags }: TweetTagListProps) {
  const router = useRouter()
  const activeTag = typeof router.query.tag === 'string' ? router.query.tag : ''

  if (!tags.length) return null

  return (
    <div className={`${tweetCardSurfaceClass} p-4`}>
      <h3 className="mb-3 font-tweet text-sm font-semibold text-neutral-500 dark:text-neutral-400">
        Tags
      </h3>
      <ul className="space-y-1">
        {tags.map((tag) => {
          const href = `/${TAG}/${tag.id}`
          const active = activeTag === tag.id
          return (
            <li key={tag.id}>
              <Link
                href={href}
                className={`block rounded-lg px-2 py-1.5 font-tweet text-sm transition-colors ${
                  active
                    ? 'bg-neutral-900 font-medium text-white dark:bg-neutral-100 dark:text-neutral-900'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                }`}
              >
                {tag.name}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
