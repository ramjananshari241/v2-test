import CONFIG from '@/blog.config'
import { Page, Post } from '@/src/types/blog'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useMemo, useState } from 'react'
import { GalleryBreadcrumb } from './GalleryBreadcrumb'
import { GalleryPageSearch } from './GalleryPageSearch'
import { GalleryPagination } from './GalleryPagination'
import { filterGalleryArchivePosts } from './galleryArchiveSearch'
import {
  galleryArchiveDateClass,
  galleryArchiveEntryClass,
  galleryArchiveYearClass,
  galleryCardCategoryClass,
  galleryPostTitleClass,
} from './galleryFonts'

const { ARCHIVE, CATEGORY } = CONFIG.DEFAULT_SPECIAL_PAGES

type GalleryArchiveProps = {
  page: Page
  items: Post[]
  pageCount: number
  currentPage: number
  totalCount?: number
}

function formatArchiveDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
}

function groupPostsByYear(posts: Post[]): { year: number; posts: Post[] }[] {
  const map = new Map<number, Post[]>()
  for (const post of posts) {
    const year = new Date(post.date?.created || '').getFullYear()
    const key = Number.isFinite(year) ? year : 0
    const bucket = map.get(key)
    if (bucket) bucket.push(post)
    else map.set(key, [post])
  }
  return [...map.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, yearPosts]) => ({ year, posts: yearPosts }))
}

function GalleryArchiveEntry({ post }: { post: Post }) {
  const date = formatArchiveDate(post.date?.created || '')
  const categoryName = post.category?.name?.trim()
  const categoryId = post.category?.id

  return (
    <li>
      <div className="group -mx-2 flex flex-col gap-1.5 rounded-md px-2 py-3.5 transition-colors hover:bg-neutral-50 sm:flex-row sm:items-center sm:gap-5">
        <time
          dateTime={post.date?.created}
          className={`shrink-0 sm:w-[6.5rem] ${galleryArchiveDateClass}`}
        >
          {date}
        </time>
        <Link
          href={`/post/${post.slug}`}
          className={`min-w-0 flex-1 truncate transition-colors hover:text-neutral-500 ${galleryArchiveEntryClass}`}
        >
          {post.title}
        </Link>
        {categoryName && categoryId ? (
          <Link
            href={`/${CATEGORY}/${categoryId}`}
            className={`shrink-0 transition-colors hover:text-neutral-500 sm:w-[5.5rem] sm:text-right ${galleryCardCategoryClass}`}
          >
            {categoryName}
          </Link>
        ) : (
          <span className="hidden shrink-0 sm:block sm:w-[5.5rem]" aria-hidden />
        )}
      </div>
    </li>
  )
}

/** Gallery 归档：按年分组的时间轴列表 + 标题搜索 */
export function GalleryArchive({
  page,
  items,
  pageCount,
  currentPage,
  totalCount,
}: GalleryArchiveProps) {
  const router = useRouter()
  const pageLabel = page.nav || page.title || '归档'
  const [searchInput, setSearchInput] = useState('')

  const basePosts = useMemo(
    () => items.filter((p) => p.slug !== 'announcement'),
    [items]
  )

  const filteredPosts = useMemo(
    () => filterGalleryArchivePosts(basePosts, searchInput),
    [basePosts, searchInput]
  )

  const yearGroups = useMemo(
    () => groupPostsByYear(filteredPosts),
    [filteredPosts]
  )

  const goToPage = (pageNum: number) => {
    setSearchInput('')
    const href = pageNum <= 1 ? `/${ARCHIVE}` : `/${ARCHIVE}/${pageNum}`
    router.push(href)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const searching = searchInput.trim().length > 0

  return (
    <>
      <GalleryBreadcrumb
        items={[{ label: '首页', href: '/' }, { label: pageLabel }]}
      />

      <main className="flex-1 pb-12">
        <div className="px-6 pt-4">
          <header className="mx-auto max-w-2xl">
            <h1 className={galleryPostTitleClass}>{pageLabel}</h1>
            {totalCount != null ? (
              <p className="mt-2 font-gallery text-[13px] text-neutral-400">
                {searching
                  ? `本页找到 ${filteredPosts.length} 篇`
                  : `共 ${totalCount} 篇`}
                {!searching && pageCount > 1 ? (
                  <span className="text-neutral-300">
                    {' '}
                    · 第 {currentPage} / {pageCount} 页
                  </span>
                ) : null}
              </p>
            ) : null}
          </header>

          <div className="mx-auto max-w-2xl py-8">
            <GalleryPageSearch
              value={searchInput}
              onChange={setSearchInput}
              placeholder="搜索标题、分类或标签"
            />
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="px-6 py-20 text-center text-sm text-neutral-400">
            {searching ? `未找到与「${searchInput.trim()}」相关的文章` : '暂无文章'}
          </div>
        ) : (
          <div className="mx-auto max-w-2xl px-6">
            {yearGroups.map(({ year, posts: yearPosts }, groupIndex) => (
              <section
                key={year}
                className={groupIndex > 0 ? 'mt-10' : ''}
                aria-labelledby={`archive-year-${year}`}
              >
                <div className="mb-3 flex items-end justify-between gap-4 border-b border-neutral-200 pb-2">
                  <h2
                    id={`archive-year-${year}`}
                    className={galleryArchiveYearClass}
                  >
                    {year > 0 ? year : '未知'}
                  </h2>
                  <span className="font-gallery text-[12px] text-neutral-400">
                    {yearPosts.length} 篇
                  </span>
                </div>

                <ul className="divide-y divide-neutral-100">
                  {yearPosts.map((post) => (
                    <GalleryArchiveEntry key={post.id} post={post} />
                  ))}
                </ul>
              </section>
            ))}

            <GalleryPagination
              currentPage={currentPage}
              totalPages={pageCount}
              onPageChange={goToPage}
            />
          </div>
        )}
      </main>
    </>
  )
}
