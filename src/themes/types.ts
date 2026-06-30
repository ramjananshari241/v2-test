import { Page, Post, Title } from '@/src/types/blog'
import { TweetFeedMediaMap } from '@/src/lib/tweet/loadTweetFeedMedia'

export type ThemeId = 'anzifan' | 'touchgal' | 'gallery' | 'tweet' | 'tweet-light'

/**
 * 各主题首页组件共用 props。
 * posts 由 index 经 buildHomeFeedPosts 全量下发；构建与 ISR 策略见 blog.config.ts。
 */
export type ThemeHomeProps = {
  posts: Post[]
  widgets: { [key: string]: unknown }
  siteTitle?: Title
  navPages?: Page[]
  tweetFeedMedia?: TweetFeedMediaMap | null
  galleryFeedCovers?: Record<string, string> | null
  vendingEnabled?: boolean
}
