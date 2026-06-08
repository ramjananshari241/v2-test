import CONFIG from '@/blog.config'
import { Page, Tag } from '@/src/types/blog'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { GalleryBreadcrumb } from './GalleryBreadcrumb'
import { GalleryPageSearch } from './GalleryPageSearch'
import { GalleryPagination } from './GalleryPagination'
import { GALLERY_LIST_PAGE_SIZE } from './galleryConstants'
import {
  galleryContentContainerClass,
  galleryTagGridClass,
  galleryTagLinkClass,
} from './galleryFonts'
import { filterGalleryTags } from './galleryTagSearch'
import { readSearchQuery } from './gallerySearch'

const { TAG } = CONFIG.DEFAULT_SPECIAL_PAGES

function parsePageFromQuery(query: unknown, maxPages: number): number {
  const raw = Array.isArray(query) ? query[0] : query
  const n = parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, maxPages)
}

type GalleryTagIndexProps = {
  page: Page
  tags: Tag[]
}

/**
 * Gallery Epic Parodies 风格：四列纯文字标签 + 居中搜索
 */
export function GalleryTagIndex({ page, tags }: GalleryTagIndexProps) {
  const router = useRouter()
  const pageLabel = page.nav || page.title || 'Cosers'

  const [searchInput, setSearchInput] = useState('')
  const searchQuery = router.isReady ? readSearchQuery(router.query.q) : ''

  useEffect(() => {
    if (!router.isReady) return
    setSearchInput(readSearchQuery(router.query.q))
  }, [router.isReady, router.query.q])

  useEffect(() => {
    if (!router.isReady) return
    const t = setTimeout(() => {
      const trimmed = searchInput.trim()
      const urlQ = readSearchQuery(router.query.q)
      if (trimmed === urlQ) return
      const query = { ...router.query }
      if (trimmed) query.q = trimmed
      else delete query.q
      delete query.page
      router.replace({ pathname: router.pathname, query }, undefined, {
        shallow: true,
        scroll: false,
      })
    }, 320)
    return () => clearTimeout(t)
  }, [searchInput, router])

  const sortedFiltered = useMemo(() => {
    const filtered = filterGalleryTags(tags, searchQuery)
    return [...filtered].sort((a, b) =>
      a.name.localeCompare(b.name, 'zh-Hans')
    )
  }, [tags, searchQuery])

  const totalPages = Math.max(
    1,
    Math.ceil(sortedFiltered.length / GALLERY_LIST_PAGE_SIZE)
  )
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (!router.isReady) return
    setCurrentPage(parsePageFromQuery(router.query.page, totalPages))
  }, [router.isReady, router.query.page, totalPages])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const safePage = Math.min(currentPage, totalPages)
  const start = (safePage - 1) * GALLERY_LIST_PAGE_SIZE
  const pageItems = sortedFiltered.slice(start, start + GALLERY_LIST_PAGE_SIZE)

  const goToPage = (p: number) => {
    setCurrentPage(p)
    const query = { ...router.query }
    if (p <= 1) delete query.page
    else query.page = String(p)
    router.replace({ pathname: router.pathname, query }, undefined, {
      shallow: true,
      scroll: false,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <GalleryBreadcrumb
        items={[{ label: '首页', href: '/' }, { label: pageLabel }]}
      />

      <main className={`${galleryContentContainerClass} flex-1 pb-10`}>
        <div className="py-8">
          <GalleryPageSearch
            value={searchInput}
            onChange={setSearchInput}
            placeholder="搜索标签"
          />
        </div>

        {searchQuery ? (
          <p className="mb-5 px-6 text-[12px] text-neutral-400">
            共 {sortedFiltered.length} 个标签
          </p>
        ) : null}

        {pageItems.length === 0 ? (
          <div className="px-6 py-20 text-center text-sm text-neutral-400">
            {searchQuery
              ? `未找到与「${searchQuery}」相关的标签`
              : '暂无标签'}
          </div>
        ) : (
          <>
            <div className={`${galleryTagGridClass} px-6`}>
              {pageItems.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/${TAG}/${tag.id}`}
                  className={galleryTagLinkClass}
                >
                  {tag.name}
                </Link>
              ))}
            </div>

            <GalleryPagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={goToPage}
            />
          </>
        )}
      </main>
    </>
  )
}
