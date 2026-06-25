'use client'

import CONFIG from '@/blog.config'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { Tag } from '@/src/types/blog'
import { TweetSectionTitle } from './TweetSectionTitle'

const { TAG } = CONFIG.DEFAULT_SPECIAL_PAGES

/** 移动端折叠时最多展示的标签数（超出显示 …） */
const MOBILE_TAG_PREVIEW = 5

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

function MobileTagBar({
  tags,
  activeTag,
}: {
  tags: Tag[]
  activeTag: string
}) {
  const [expanded, setExpanded] = useState(false)
  const hasOverflow = tags.length > MOBILE_TAG_PREVIEW
  const visibleTags =
    expanded || !hasOverflow ? tags : tags.slice(0, MOBILE_TAG_PREVIEW)

  return (
    <div
      className={`tweet-tags-mobile${expanded ? ' tweet-tags-mobile--expanded' : ''}`}
    >
      <ul
        className={
          expanded
            ? 'tweet-tags__list--horizontal tweet-tags__list--horizontal-expanded'
            : 'tweet-tags__list--horizontal'
        }
      >
        {visibleTags.map((tag) => {
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
        {hasOverflow && !expanded ? (
          <li>
            <button
              type="button"
              className="tweet-tags__item tweet-tags__more"
              aria-expanded={false}
              aria-label="展开全部标签"
              onClick={() => setExpanded(true)}
            >
              …
            </button>
          </li>
        ) : null}
        {hasOverflow && expanded ? (
          <li>
            <button
              type="button"
              className="tweet-tags__item tweet-tags__more"
              aria-expanded={true}
              aria-label="收起标签"
              onClick={() => setExpanded(false)}
            >
              收起
            </button>
          </li>
        ) : null}
      </ul>
    </div>
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
          <TweetSectionTitle emoji="🏷️" label="标签" desktopOnly />
          <TagItems tags={tags} activeTag={activeTag} horizontal={false} />
        </div>
      ) : null}
      {showMobile ? (
        <div className="tweet-feed__tags-mobile">
          <MobileTagBar tags={tags} activeTag={activeTag} />
        </div>
      ) : null}
    </>
  )
}
