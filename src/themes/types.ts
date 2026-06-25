import { Page, Post, Title } from '@/src/types/blog'

export type ThemeId = 'anzifan' | 'touchgal' | 'gallery' | 'tweet'

/**
 * 各主题首页组件共用 props。
 * posts 由 index 经 buildHomeFeedPosts 全量下发；构建与 ISR 策略见 blog.config.ts。
 */
export type ThemeHomeProps = {
  posts: Post[]
  widgets: { [key: string]: unknown }
  siteTitle?: Title
  navPages?: Page[]
}
