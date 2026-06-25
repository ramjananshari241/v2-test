import { Friend } from '@/src/types/blog'
import { BlockResponse } from '@/src/types/notion'
import Link from 'next/link'
import { TweetArticlePage } from './TweetArticlePage'

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
    <article className="tweet-friend-card">
      <Link href={href} target="_blank" rel="noopener noreferrer" className="tweet-friend-card__link">
        <div className="tweet-friend-card__avatar-wrap">
          {friend.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={friend.avatar} alt="" className="tweet-friend-card__avatar" />
          ) : (
            <span className="tweet-friend-card__avatar-fallback">{initial}</span>
          )}
        </div>
        <h3 className="tweet-friend-card__name">{friend.name}</h3>
        <p className="tweet-friend-card__host">{hostFromUrl(friend.link)}</p>
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
      <section className="tweet-friends-section">
        <h2 className="tweet-friends-section__title">友情链接</h2>
        {friends.length === 0 ? (
          <p className="tweet-post-list__empty">暂无友链</p>
        ) : (
          <div className="tweet-friends-grid">
            {friends.map((friend) => <FriendCard key={friend.name} friend={friend} />)}
          </div>
        )}
      </section>
    </div>
  )
}
