import { NextPage } from 'next'
import Link from 'next/link'
import React from 'react'
import { colorMap } from '../../lib/colors'
import { classNames, formatDate } from '../../lib/util'
import { BlockDataType, Post } from '../../types/blog'
import { ApiColor } from '../../types/notion'
import { PostImage } from '../card/CardInfo'
import ContentLayout, { CoverLayout } from '../layout/ContentLayout'
import { Share } from './Share'

const PostHeader: NextPage<{
  post: Post
  blocks: BlockDataType[]
  showHeroCover?: boolean
  heroSlot?: React.ReactNode
}> = ({ post, showHeroCover = true, heroSlot }) => {
  const { title, excerpt, date, cover, category, options } = post

  return (
    <header>
      <ContentLayout>
        <div
          className="flex flex-col items-baseline text-justify break-words"
          data-aos="fade-down"
        >
          <div className="mt-3 md:mt-6">
            <Link href="/category/[{Category}]" as={`/category/${category.id}`}>
              <p
                className={`leading-2 mb-2 inline-block text-xs font-bold ${
                  colorMap[category.color]
                    ? colorMap[category.color]
                    : 'text-neutral-600'
                } `}
              >
                {category.name}
              </p>
            </Link>
            <div className="flex flex-row flex-wrap items-center justify-start mt-2 text-sm font-semibold gap-x-2 text-neutral-600 dark:text-neutral-400">
              <time
                className="text-sm font-semibold shrink-0 text-neutral-600 dark:text-neutral-400"
                dateTime={date.created}
              >
                {formatDate(date.created)}
              </time>
            </div>
          </div>
          <p
            className={classNames(
              excerpt ? 'my-6' : 'mt-6',
              'relative z-0 whitespace-pre-wrap text-4xl font-bold lg:text-5xl',
              options.colorTitle.length > 0
                ? `bg-gradient-to-r ${options.colorTitle
                    .map((color, index) => {
                      if (index === 0) {
                        return colorMap[
                          (color + '_background_from') as ApiColor
                        ]
                      }
                      if (index === options.colorTitle.length - 1) {
                        return colorMap[(color + '_background_to') as ApiColor]
                      }
                      return colorMap[(color + '_background_via') as ApiColor]
                    })
                    .join(' ')} !bg-clip-text text-transparent`
                : ''
            )}
          >
            {title}
          </p>
          {excerpt && (
            <p className="mb-4 text-xl font-medium text-neutral-600 dark:text-neutral-400 lg:text-2xl">
              {excerpt}
            </p>
          )}
          <Share />
        </div>
      </ContentLayout>
      {showHeroCover ? (
        <CoverLayout>
          {heroSlot ?? (
            <div
              id="cover"
              className="relative w-full h-full md:rounded-3xl"
              data-aos="fade-up"
              data-aos-duration="500"
            >
              <PostImage
                cover={cover}
                alt={title}
                className={
                  'z-0 overflow-hidden transition-all duration-500 ease-in-out md:rounded-3xl'
                }
              />
            </div>
          )}
        </CoverLayout>
      ) : null}
    </header>
  )
}

export default PostHeader
