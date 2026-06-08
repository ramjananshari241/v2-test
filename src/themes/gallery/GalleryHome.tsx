import { ThemeHomeProps } from '../types'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { GalleryAnnouncement } from './GalleryAnnouncement'
import { GalleryCard } from './GalleryCard'
import { GalleryPagination } from './GalleryPagination'
import { GALLERY_HOME_PAGE_SIZE } from './galleryConstants'
import {
  galleryCardGridClass,
  galleryContentContainerClass,
} from './galleryFonts'
import { filterGalleryPosts, readSearchQuery } from './gallerySearch'

type AnnouncementLike = { title?: string; slug?: string }

function parsePageFromQuery(query: unknown, maxPages: number): number {
  const raw = Array.isArray(query) ? query[0] : query
  const n = parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, maxPages)
}

export const GalleryHome = ({ posts, widgets }: ThemeHomeProps) => {
  const router = useRouter()
  const allPosts = posts?.length ? posts : []
  const announcement = widgets?.announcement as AnnouncementLike | undefined

  const searchQuery = router.isReady ? readSearchQuery(router.query.q) : ''
  const filteredPosts = useMemo(
    () => filterGalleryPosts(allPosts, searchQuery),
    [allPosts, searchQuery]
  )

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPosts.length / GALLERY_HOME_PAGE_SIZE)
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
  const startIndex = (safePage - 1) * GALLERY_HOME_PAGE_SIZE
  const displayPosts = filteredPosts.slice(
    startIndex,
    startIndex + GALLERY_HOME_PAGE_SIZE
  )

  const goToPage = (page: number) => {
    setCurrentPage(page)
    const query = { ...router.query }
    if (page <= 1) {
      delete query.page
    } else {
      query.page = String(page)
    }
    router.replace({ pathname: router.pathname, query }, undefined, {
      shallow: true,
      scroll: false,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const emptyMessage = searchQuery
    ? `未找到与「${searchQuery}」相关的文章`
    : '暂无内容'

  return (
    <>
      <GalleryAnnouncement announcement={announcement} />

      <main className={`${galleryContentContainerClass} flex-1 px-5 pb-10 pt-1`}>
        {searchQuery ? (
          <p className="mb-4 text-[12px] text-neutral-400">
            共 {filteredPosts.length} 条结果
          </p>
        ) : null}

        {displayPosts.length === 0 ? (
          <div className="py-24 text-center text-sm text-neutral-400">
            {emptyMessage}
          </div>
        ) : (
          <>
            <div className={galleryCardGridClass}>
              {displayPosts.map((post) => (
                <GalleryCard key={post.id} post={post} />
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
