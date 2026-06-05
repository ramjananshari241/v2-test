/**
 * 侧栏导航图标：PNG 见 public/themes/gallery/nav/，路径常量见 galleryConstants.ts。
 * 各菜单项使用哪个 icon 键，见 galleryNav.ts 里 item.icon。
 */
import { ReactElement, SVGProps } from 'react'
import {
  GALLERY_NAV_ICON_GUIDE,
  GALLERY_NAV_ICON_HOME,
  GALLERY_NAV_ICON_LISTS,
  GALLERY_NAV_ICON_MODELS,
  GALLERY_NAV_ICON_PARODIES,
} from './galleryConstants'
import { GalleryNavItem } from './galleryNav'

/** 侧栏导航图标尺寸（与 GallerySidebar 文案配套） */
export const GALLERY_NAV_ICON_SIZE = 18

const navImgClass = 'h-[18px] w-[18px] shrink-0 object-contain'

function NavIconImg({ src, alt = '' }: { src: string; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={GALLERY_NAV_ICON_SIZE}
      height={GALLERY_NAV_ICON_SIZE}
      className={navImgClass}
      aria-hidden
    />
  )
}

const iconProps: SVGProps<SVGSVGElement> = {
  width: GALLERY_NAV_ICON_SIZE,
  height: GALLERY_NAV_ICON_SIZE,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.25,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'shrink-0',
  'aria-hidden': true,
}

/** Gallery Epic 黑色线性图标 */
export const GalleryNavIcons: Record<GalleryNavItem['icon'], () => ReactElement> = {
  home: () => <NavIconImg src={GALLERY_NAV_ICON_HOME} />,
  lists: () => <NavIconImg src={GALLERY_NAV_ICON_LISTS} />,
  cosers: () => (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  ),
  parodies: () => <NavIconImg src={GALLERY_NAV_ICON_PARODIES} />,
  guide: () => <NavIconImg src={GALLERY_NAV_ICON_GUIDE} />,
  models: () => <NavIconImg src={GALLERY_NAV_ICON_MODELS} />,
}

export function getGalleryNavIcon(icon: GalleryNavItem['icon']) {
  return GalleryNavIcons[icon]
}
