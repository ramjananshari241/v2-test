import { Friend } from '@/src/types/blog'
import { BlockResponse } from '@/src/types/notion'
import Link from 'next/link'
import { TweetArticlePage } from './TweetArticlePage'
import { tweetCardSurfaceClass } from './tweetFonts'

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
    <article className={`${tweetCardSurfaceClass} p-5 text-center`}>
      <Link href={href} target="_blank" rel="noopener noreferrer" className="block">
        <div className="mx-auto mb-3 h-16 w-16 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          {friend.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={friend.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center font-tweet text-xl text-neutral-300">
              {initial}
            </span>
          )}
        </div>
        <h3 className="font-tweet text-base font-semibold text-neutral-900 dark:text-neutral-100">
          {friend.name}
        </h3>
        <p className="mt-1 font-tweet text-xs text-neutral-400">{hostFromUrl(friend.link)}</p>
      </Link>
    </article>
  )
}

type TweetFriendsPageProps = {
  title: string
  blocks: BlockResponse[]
  friends: Friend[]
}

export function TweetFriendsPage({ title, blocks, friends }: TweetFriendsPageProps) {
  return (
    <div>
      <TweetArticlePage title={title} blocks={blocks} backHref="/" backLabel="返回首页" />
      <section className="mt-10">
        <h2 className="mb-4 font-tweet text-base font-semibold text-neutral-800 dark:text-neutral-100">
          友情链接
        </h2>
        {friends.length === 0 ? (
          <p className="font-tweet text-sm text-neutral-500">暂无友链</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {friends.map((friend) => <FriendCard key={friend.name} friend={friend} />)}
          </div>
        )}
      </section>
    </div>
  )
}
