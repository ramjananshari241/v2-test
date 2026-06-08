import CONFIG from '@/blog.config'

export type GalleryNavItem = {
  /** Epic 展示文案（与参考站一致） */
  label: string
  href: string
  icon: 'home' | 'lists' | 'cosers' | 'parodies' | 'guide' | 'models'
}

export type GalleryNavSection = {
  /** 分组标题；首页项无标题 */
  title?: string
  items: GalleryNavItem[]
}

const { ARCHIVE, TAG, CATEGORY, FREINDS, ABOUT } = CONFIG.DEFAULT_SPECIAL_PAGES

const guidePath =
  (CONFIG as { GALLERY_GUIDE_PATH?: string }).GALLERY_GUIDE_PATH ||
  `/${ABOUT}`
const morePath =
  (CONFIG as { GALLERY_MORE_PATH?: string }).GALLERY_MORE_PATH || `/${FREINDS}`

/**
 * Gallery 侧栏结构：
 * Home → 首页
 * Cosplay：分类 | 标签 | 归档
 * About：说明 | 更多
 */
export const GALLERY_NAV_SECTIONS: GalleryNavSection[] = [
  {
    items: [{ label: 'Home', href: '/', icon: 'home' }],
  },
  {
    title: 'Cosplay',
    items: [
      { label: '分类', href: `/${CATEGORY}`, icon: 'lists' },
      { label: '标签', href: `/${TAG}`, icon: 'cosers' },
      { label: '归档', href: `/${ARCHIVE}`, icon: 'parodies' },
    ],
  },
  {
    title: 'About',
    items: [
      { label: '说明', href: guidePath, icon: 'guide' },
      { label: '更多', href: morePath, icon: 'models' },
    ],
  },
]
