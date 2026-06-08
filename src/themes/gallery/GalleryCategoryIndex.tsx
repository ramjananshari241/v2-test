import CONFIG from '@/blog.config'
import { Category, Page } from '@/src/types/blog'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { GalleryBreadcrumb } from './GalleryBreadcrumb'
import { GalleryPageSearch } from './GalleryPageSearch'
import { GalleryPagination } from './GalleryPagination'
import { GALLERY_LIST_PAGE_SIZE } from './galleryConstants'
import { filterGalleryCategories } from './galleryCategorySearch'
import {
  galleryContentContainerClass,
  galleryPillGridClass,
} from './galleryFonts'
import { readSearchQuery } from './gallerySearch'

const { CATEGORY } = CONFIG.DEFAULT_SPECIAL_PAGES

function parsePageFromQuery(query: unknown, maxPages: number): number {
  const raw = Array.isArray(query) ? query[0] : query
  const n = parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, maxPages)
}

type GalleryCategoryIndexProps = {
  page: Page
  categories: Category[]
}

export function GalleryCategoryIndex({
  page,
  categories,
}: GalleryCategoryIndexProps) {
  const router = useRouter()
  const pageLabel = page.nav || page.title || 'Lists'

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

  const filtered = useMemo(
    () => filterGalleryCategories(categories, searchQuery),
    [categories, searchQuery]
  )

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / GALLERY_LIST_PAGE_SIZE)
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
  const pageItems = filtered.slice(start, start + GALLERY_LIST_PAGE_SIZE)

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
            placeholder="搜索分类"
          />
        </div>

        {searchQuery ? (
          <p className="mb-4 px-6 text-[12px] text-neutral-400">
            共 {filtered.length} 个分类
          </p>
        ) : null}

        {pageItems.length === 0 ? (
          <div className="px-6 py-20 text-center text-sm text-neutral-400">
            {searchQuery
              ? `未找到与「${searchQuery}」相关的分类`
              : '暂无分类'}
          </div>
        ) : (
          <>
            <div className={`${galleryPillGridClass} px-6`}>
              {pageItems.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/${CATEGORY}/${cat.id}`}
                  className="font-gallery group flex min-h-[48px] items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 py-3.5 text-center text-[15px] font-medium leading-snug text-neutral-900 transition-all duration-200 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white hover:shadow-sm active:scale-[0.98]"
                >
                  <span className="line-clamp-2">{cat.name}</span>
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
