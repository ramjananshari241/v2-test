'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { GalleryLightbox } from '@/src/themes/gallery/GalleryLightbox'
import { STANDARD_GALLERY_PAGE_SIZE } from './standardGalleryConstants'

export type StandardGalleryImage = {
  id: string
  url: string
  thumb_url: string | null
}

type GalleryApiImage = {
  id: string
  url: string
  thumb_url: string | null
  sort_order: number
}

type GalleryApiResponse = {
  success: boolean
  total?: number
  images?: GalleryApiImage[]
  hasMore?: boolean
  error?: string
}

type StandardGalleryPreviewContextValue = {
  ready: boolean
  hasGallery: boolean
  loading: boolean
  loadingMore: boolean
  total: number
  activeIndex: number
  setActiveIndex: (index: number) => void
  getImageAt: (index: number) => StandardGalleryImage | undefined
  maybeLoadMore: () => void
  openLightbox: () => void
}

const StandardGalleryPreviewContext =
  createContext<StandardGalleryPreviewContextValue | null>(null)

export function useStandardGalleryPreview() {
  return useContext(StandardGalleryPreviewContext)
}

function thumbSrc(img: StandardGalleryImage) {
  return (img.thumb_url || img.url || '').trim()
}

export function StandardGalleryPreviewProvider({
  postSlug,
  children,
}: {
  postSlug: string
  children: ReactNode
}) {
  const [ready, setReady] = useState(false)
  const [hasGallery, setHasGallery] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<Map<number, StandardGalleryImage>>(new Map())
  const [activeIndex, setActiveIndexState] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const pageRef = useRef(1)
  const hasMoreRef = useRef(false)
  const loadingMoreRef = useRef(false)
  const totalRef = useRef(0)
  const itemsRef = useRef(items)
  itemsRef.current = items

  const getMaxLoadedIndex = useCallback(() => {
    const map = itemsRef.current
    if (map.size === 0) return -1
    return Math.max(...map.keys())
  }, [])

  const mergePage = useCallback(
    (pageNum: number, images: GalleryApiImage[]) => {
      const offset = (pageNum - 1) * STANDARD_GALLERY_PAGE_SIZE
      setItems((prev) => {
        const next = new Map(prev)
        images.forEach((img, i) => {
          next.set(offset + i, {
            id: img.id,
            url: img.url,
            thumb_url: img.thumb_url,
          })
        })
        return next
      })
    },
    []
  )

  const fetchPage = useCallback(
    async (pageNum: number) => {
      const res = await fetch(
        `/api/gallery/${encodeURIComponent(postSlug)}?page=${pageNum}&limit=${STANDARD_GALLERY_PAGE_SIZE}`
      )
      const data: GalleryApiResponse = await res.json()
      if (!data.success) {
        throw new Error(data.error || '加载图库失败')
      }
      const list = data.images || []
      mergePage(pageNum, list)
      const count = data.total || 0
      setTotal(count)
      totalRef.current = count
      setHasMore(!!data.hasMore)
      hasMoreRef.current = !!data.hasMore
      setHasGallery(count > 0)
      return list
    },
    [postSlug, mergePage]
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setReady(false)
    setItems(new Map())
    setActiveIndexState(0)
    pageRef.current = 1
    setPage(1)

    fetchPage(1)
      .then(() => {
        if (!cancelled) {
          setReady(true)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasGallery(false)
          setReady(true)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [postSlug, fetchPage])

  const maxLoadedIndex = useMemo(() => {
    if (items.size === 0) return -1
    return Math.max(...items.keys())
  }, [items])

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const nextPage = pageRef.current + 1
      await fetchPage(nextPage)
      pageRef.current = nextPage
      setPage(nextPage)
    } catch {
      // 保持已加载内容，静默失败
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [fetchPage])

  const ensureIndexLoaded = useCallback(
    async (targetIndex: number) => {
      let guard = 0
      while (
        targetIndex > getMaxLoadedIndex() &&
        hasMoreRef.current &&
        guard < 24
      ) {
        await loadMore()
        guard += 1
      }
    },
    [getMaxLoadedIndex, loadMore]
  )

  const maybeLoadMore = useCallback(() => {
    void loadMore()
  }, [loadMore])

  const setActiveIndex = useCallback(
    (index: number) => {
      const safe = Math.max(0, Math.min(index, Math.max(0, totalRef.current - 1)))
      setActiveIndexState(safe)
      if (safe > maxLoadedIndex && hasMoreRef.current) {
        void ensureIndexLoaded(safe)
      } else if (safe > maxLoadedIndex - 4 && hasMoreRef.current) {
        void loadMore()
      }
    },
    [loadMore, maxLoadedIndex, ensureIndexLoaded]
  )

  const getImageAt = useCallback(
    (index: number) => items.get(index),
    [items]
  )

  const activeImage = getImageAt(activeIndex)

  const lightboxImages = useMemo(() => {
    const list: { url: string; thumb_url?: string | null; sourceIndex: number }[] =
      []
    for (let i = 0; i < total; i++) {
      const img = items.get(i)
      if (img) {
        list.push({
          url: img.url,
          thumb_url: img.thumb_url,
          sourceIndex: i,
        })
      }
    }
    return list
  }, [items, total])

  const lightboxIndex = useMemo(
    () => lightboxImages.findIndex((e) => e.sourceIndex === activeIndex),
    [lightboxImages, activeIndex]
  )

  const value = useMemo<StandardGalleryPreviewContextValue>(
    () => ({
      ready,
      hasGallery,
      loading,
      loadingMore,
      total,
      activeIndex,
      setActiveIndex,
      getImageAt,
      maybeLoadMore,
      openLightbox: () => {
        if (activeImage) setLightboxOpen(true)
      },
    }),
    [
      ready,
      hasGallery,
      loading,
      loadingMore,
      total,
      activeIndex,
      setActiveIndex,
      getImageAt,
      maybeLoadMore,
      activeImage,
    ]
  )

  return (
    <StandardGalleryPreviewContext.Provider value={value}>
      {children}
      {hasGallery && activeImage ? (
        <GalleryLightbox
          open={lightboxOpen}
          images={lightboxImages}
          index={Math.max(0, lightboxIndex)}
          onClose={() => setLightboxOpen(false)}
          onPrev={() => {
            const idx = Math.max(0, lightboxIndex)
            const prev = lightboxImages[idx - 1]
            if (prev) setActiveIndex(prev.sourceIndex)
          }}
          onNext={() => {
            const idx = Math.max(0, lightboxIndex)
            const next = lightboxImages[idx + 1]
            if (next) {
              setActiveIndex(next.sourceIndex)
            } else if (hasMoreRef.current) {
              const nextGlobal = activeIndex + 1
              void ensureIndexLoaded(nextGlobal).then(() => {
                setActiveIndex(nextGlobal)
              })
            }
          }}
        />
      ) : null}
    </StandardGalleryPreviewContext.Provider>
  )
}

export function standardGalleryThumbUrl(index: number, img?: StandardGalleryImage) {
  if (!img) return null
  return thumbSrc(img)
}
