import { PostNavLink } from '@/src/components/navigation/PostNavStallGuard'
import { PartialPost } from '@/src/types/blog'

type TweetPostFooterProps = {
  previousPost?: PartialPost | null
  nextPost?: PartialPost | null
}

export function TweetPostFooter({
  previousPost,
  nextPost,
}: TweetPostFooterProps) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!previousPost && !nextPost) {
    return (
      <footer className="tweet-post-footer tweet-post-footer--solo">
        <button
          type="button"
          className="tweet-post-footer__action tweet-post-footer__action--top"
          onClick={scrollToTop}
        >
          ↑ 回到顶部
        </button>
      </footer>
    )
  }

  return (
    <footer className="tweet-post-footer">
      {previousPost ? (
        <PostNavLink
          href={`/post/${previousPost.slug}`}
          navKey={previousPost.slug}
          className="tweet-post-footer__action tweet-post-footer__action--prev"
        >
          ← 上一篇
        </PostNavLink>
      ) : (
        <span className="tweet-post-footer__spacer" />
      )}

      <button
        type="button"
        className="tweet-post-footer__action tweet-post-footer__action--top"
        onClick={scrollToTop}
      >
        ↑ 回到顶部
      </button>

      {nextPost ? (
        <PostNavLink
          href={`/post/${nextPost.slug}`}
          navKey={nextPost.slug}
          className="tweet-post-footer__action tweet-post-footer__action--next"
        >
          下一篇 →
        </PostNavLink>
      ) : (
        <span className="tweet-post-footer__spacer" />
      )}
    </footer>
  )
}
