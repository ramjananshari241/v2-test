import { BlockRender } from '@/src/components/blocks/BlockRender'
import { Friend } from '@/src/types/blog'
import { BlockResponse } from '@/src/types/notion'
import Link from 'next/link'
import { GalleryBreadcrumb } from './GalleryBreadcrumb'
import { filterGalleryIntroBlocks } from './filterGalleryIntroBlocks'
import {
  galleryCardGridClass,
  galleryContentContainerClass,
  galleryPostTitleClass,
  galleryProseClass,
} from './galleryFonts'

function hostFromUrl(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function FriendCard({ friend }: { friend: Friend }) {
  const href =
    friend.link.startsWith('http://') || friend.link.startsWith('https://')
      ? friend.link
      : friend.link
        ? `https://${friend.link}`
        : '#'

  const initial = (friend.name || '?').trim().charAt(0).toUpperCase()

  return (
    <article className="group flex flex-col items-center rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all duration-300 hover:border-neutral-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 block shrink-0"
      >
        <div className="relative h-[72px] w-[72px] overflow-hidden rounded-full border border-neutral-100 bg-neutral-50">
          {friend.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={friend.avatar}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center font-gallery text-2xl font-medium text-neutral-300">
              {initial}
            </span>
          )}
        </div>
      </Link>

      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-gallery text-[16px] font-semibold leading-snug text-neutral-900 transition-colors hover:text-neutral-600"
      >
        {friend.name}
      </Link>

      {friend.link ? (
        <p className="mt-1 font-gallery text-[12px] text-neutral-400">
          {hostFromUrl(friend.link)}
        </p>
      ) : null}

      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex min-w-[100px] items-center justify-center rounded-full bg-neutral-900 px-5 py-2 font-gallery text-[13px] font-semibold text-white transition-all hover:bg-neutral-700 active:scale-[0.98]"
      >
        访问
      </Link>
    </article>
  )
}

type GalleryFriendsPageProps = {
  title: string
  pageNav?: string
  blocks: BlockResponse[]
  friends: Friend[]
}

export function GalleryFriendsPage({
  title,
  pageNav,
  blocks,
  friends,
}: GalleryFriendsPageProps) {
  const heading = pageNav || title || 'Models'
  const list = friends.filter((f) => f.name?.trim())
  const introBlocks = filterGalleryIntroBlocks(blocks)

  return (
    <>
      <GalleryBreadcrumb
        items={[{ label: '首页', href: '/' }, { label: heading }]}
      />

      <main className={`${galleryContentContainerClass} flex-1 px-5 pb-12 pt-2`}>
        <header className="mb-6 px-1">
          <h1 className={galleryPostTitleClass}>{heading}</h1>
          <p className="mt-2 font-gallery text-[13px] text-neutral-400">
            {list.length > 0
              ? `共 ${list.length} 个友链`
              : '欢迎交换友链，可在后台「友链管理」中添加'}
          </p>
        </header>

        {introBlocks.length > 0 ? (
          <div
            className={`${galleryProseClass} mb-10 max-w-3xl rounded-sm border border-neutral-200 bg-white px-6 py-6 md:px-8`}
          >
            <BlockRender blocks={introBlocks} />
          </div>
        ) : null}

        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-20 text-center">
            <p className="font-gallery text-sm text-neutral-400">
              暂无友链，请先在后台添加后点击「更新」重新部署站点
            </p>
          </div>
        ) : (
          <div className={galleryCardGridClass}>
            {list.map((friend) => (
              <FriendCard
                key={`${friend.name}-${friend.link}`}
                friend={friend}
              />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
