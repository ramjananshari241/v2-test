/* eslint-disable @next/next/no-img-element */
import { classNames } from '@/src/lib/util'
import { Post } from '@/src/types/blog'
import Link from 'next/link'
import React from 'react'
import { PostCategory, PostImage, PostTime } from './CardInfo'
import { PostLockBadge } from '../post/PostLockBadge'

type GridCardProps = {
  post: Post
  size: 'small' | 'medium' | 'large'
}

const SIZE = {
  large: {
    card: classNames('w-full h-auto flex-col', 'md:flex-row md:h-[18rem]', 'lg:h-[22.5rem]'),
    image: classNames('h-52 w-full', 'md:h-full md:w-[60%]', 'lg:w-[62%]'),
    title: classNames('text-xl leading-snug', 'md:text-2xl md:leading-tight md:line-clamp-3', 'lg:text-3xl'),
  },
  medium: {
    card: 'h-auto min-h-[24rem] flex-col',
    image: 'h-56 w-full',
    title: 'text-xl leading-tight line-clamp-2',
  },
  small: {
    card: 'h-auto min-h-[22rem] flex-col',
    image: 'h-48 w-full',
    title: 'line-clamp-2 text-lg leading-tight md:text-base',
  },
}

const GridCard = ({ post, size }: GridCardProps) => {
  const { title, slug, cover, date, category, options } = post

  return (
    <React.StrictMode>
      <Link href={{ pathname: '/post/[slug]', query: { slug: slug } }}>
        <div
          className={classNames(
            'group relative flex transform-gpu cursor-pointer select-none overflow-hidden rounded-[2.5rem]',
            'bg-[#151516]/70 backdrop-blur-xl border border-white/10 shadow-2xl',
            'transition-all duration-500 ease-out hover:scale-[1.015] hover:bg-[#1c1c1e]/90',
            SIZE[size].card
          )}
        >
          <header className={classNames('relative overflow-hidden shrink-0', SIZE[size].image)}>
            {/* ✅ 彻底移除所有遮罩层和滤镜，确保图片原彩清晰显示 */}
            {options?.isPasswordProtected ? (
              <span className="absolute top-3 right-3 z-20">
                <PostLockBadge className="px-2 py-1 text-xs" />
              </span>
            ) : null}
            <PostImage
              cover={cover}
              alt={title}
              className={'w-full h-full object-cover opacity-100 transition-all duration-700 group-hover:scale-110'}
            />
          </header>

          <div className="z-10 flex flex-col justify-between flex-1 p-6 md:p-8 transition-all">
            <article className="flex flex-col items-start gap-2 md:gap-3">
              <PostCategory category={category} />
              <h2 className={`${SIZE[size].title} font-extrabold text-white antialiased tracking-tight transition-colors group-hover:text-blue-100`}>
                {title}
              </h2>
            </article>
            
            <div className="mt-4 border-t border-white/5 pt-4 opacity-50 flex justify-between items-center w-full">
              <PostTime date={date.created} />
              <div className="hidden md:block transform transition-transform duration-300 group-hover:translate-x-1 text-white/40">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </React.StrictMode>
  )
}

export default GridCard
