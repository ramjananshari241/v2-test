import Link from 'next/link'
import { useRouter } from 'next/router'
import { GALLERY_LOGIN_URL, GALLERY_SIDEBAR_WIDTH } from './galleryConstants'
import { GALLERY_NAV_SECTIONS } from './galleryNav'
import { getGalleryNavIcon } from './galleryIcons'
import { GallerySearchBox } from './GallerySearchBox'

export const GALLERY_HEADER_HEIGHT = 72

export const GallerySidebar = () => {
  const router = useRouter()

  const isActive = (href: string) => {
    if (href === '/') return router.pathname === '/'
    const path = href.split('?')[0]
    if (path.startsWith('/post/')) {
      return router.asPath === path
    }
    return router.asPath === path || router.asPath.startsWith(path + '/')
  }

  return (
    <aside
      className="font-gallery fixed inset-y-0 left-0 z-30 flex flex-col border-r border-neutral-200 bg-white antialiased"
      style={{ width: GALLERY_SIDEBAR_WIDTH }}
    >
      <div style={{ height: GALLERY_HEADER_HEIGHT }} aria-hidden />

      <nav className="flex flex-1 flex-col overflow-y-auto border-t border-neutral-200 px-5 pb-4 pt-6">
        {GALLERY_NAV_SECTIONS.map((section, sectionIndex) => (
          <div
            key={section.title ?? 'home'}
            className={sectionIndex > 0 ? 'mt-6' : ''}
          >
            {section.title ? (
              <div className="mb-1.5 px-2 text-[15px] font-semibold text-neutral-900">
                {section.title}
              </div>
            ) : null}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const NavIcon = getGalleryNavIcon(item.icon)
                const active = isActive(item.href)
                const isHome = item.href === '/'
                return (
                  <li key={`${section.title}-${item.label}-${item.href}`}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-md px-2 py-2 text-[15px] transition-colors ${
                        active
                          ? 'bg-neutral-100 font-semibold text-neutral-900'
                          : 'font-medium text-neutral-800 hover:bg-neutral-50'
                      }`}
                    >
                      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-black">
                        <NavIcon />
                      </span>
                      {item.label}
                    </Link>
                    {isHome ? <GallerySearchBox /> : null}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-neutral-200 px-4 py-5">
        <a
          href={GALLERY_LOGIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-md bg-black py-2 text-center text-[13px] font-normal text-white transition-all hover:bg-neutral-800 active:scale-[0.98] active:bg-neutral-900"
        >
          STORE
        </a>
      </div>
    </aside>
  )
}
