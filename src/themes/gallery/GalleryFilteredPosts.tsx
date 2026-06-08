import { Post } from '@/src/types/blog'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { GalleryBreadcrumb, BreadcrumbItem } from './GalleryBreadcrumb'
import { GalleryCard } from './GalleryCard'
import { GalleryPagination } from './GalleryPagination'
import { GALLERY_HOME_PAGE_SIZE } from './galleryConstants'
import {
  galleryCardGridClass,
  galleryContentContainerClass,
  galleryPostTitleClass,
} from './galleryFonts'

function parsePageFromQuery(query: unknown, maxPages: number): number {
  const raw = Array.isArray(query) ? query[0] : query
  const n = parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, maxPages)
}

type GalleryFilteredPostsProps = {
  posts: Post[]
  breadcrumbItems: BreadcrumbItem[]
  /** 列表上方标题（分类名 / 标签名） */
  title: string
  emptyLabel?: string
}

/**
 * 分类 / 标签详情：与 Gallery 首页相同卡片网格 + 底部分页
 */
export function GalleryFilteredPosts({
  posts,
  breadcrumbItems,
  title,
  emptyLabel = '暂无文章',
}: GalleryFilteredPostsProps) {
  const router = useRouter()

  const listPosts = useMemo(
    () => posts.filter((p) => p.slug !== 'announcement'),
    [posts]
  )

  const totalPages = Math.max(
    1,
    Math.ceil(listPosts.length / GALLERY_HOME_PAGE_SIZE)
  )
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (!router.isReady) return
    setCurrentPage(parsePageFromQuery(router.query.page, totalPages))
  }, [router.isReady, router.query.page, totalPages])

  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * GALLERY_HOME_PAGE_SIZE
  const displayPosts = listPosts.slice(
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

  return (
    <>
      <GalleryBreadcrumb items={breadcrumbItems} />

      <main className={`${galleryContentContainerClass} flex-1 px-5 pb-10 pt-2`}>
        <header className="mb-6 px-1">
          <h1 className={galleryPostTitleClass}>{title}</h1>
          <p className="mt-2 font-gallery text-[13px] text-neutral-400">
            共 {listPosts.length} 篇
          </p>
        </header>

        {displayPosts.length === 0 ? (
          <div className="py-24 text-center text-sm text-neutral-400">
            {emptyLabel}
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
