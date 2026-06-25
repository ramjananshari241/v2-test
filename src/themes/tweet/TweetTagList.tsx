'use client'

import CONFIG from '@/blog.config'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Tag } from '@/src/types/blog'
import { TweetSectionTitle } from './TweetSectionTitle'

const { TAG } = CONFIG.DEFAULT_SPECIAL_PAGES

type TweetTagListProps = {
  tags: Tag[]
  layout?: 'both' | 'sidebar' | 'mobile'
}

function TagItems({
  tags,
  activeTag,
  horizontal,
}: {
  tags: Tag[]
  activeTag: string
  horizontal: boolean
}) {
  const listClass = horizontal
    ? 'tweet-tags__list--horizontal'
    : 'tweet-tags__list--vertical'

  return (
    <ul className={listClass}>
      {tags.map((tag) => {
        const href = `/${TAG}/${tag.id}`
        const active = activeTag === tag.id
        return (
          <li key={tag.id}>
            <Link
              href={href}
              className="tweet-tags__item"
              data-active={active}
            >
              {tag.name}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function TweetTagList({ tags, layout = 'both' }: TweetTagListProps) {
  const router = useRouter()
  const activeTag =
    typeof router.query.tag === 'string' ? router.query.tag : ''

  if (!tags.length) return null

  const showSidebar = layout === 'both' || layout === 'sidebar'
  const showMobile = layout === 'both' || layout === 'mobile'

  return (
    <>
      {showSidebar ? (
        <div>
          <TweetSectionTitle emoji="🏷️" label="Tags" desktopOnly />
          <TagItems tags={tags} activeTag={activeTag} horizontal={false} />
        </div>
      ) : null}
      {showMobile ? (
        <div className="tweet-feed__tags-mobile">
          <TagItems tags={tags} activeTag={activeTag} horizontal={true} />
        </div>
      ) : null}
    </>
  )
}
