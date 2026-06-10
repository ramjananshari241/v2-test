/**
 * Gallery 排版：Inter + Noto Sans SC（GalleryFontLinks 从 Google Fonts 加载）
 */

/** Shell / 侧栏 / 主内容区根节点 */
export const galleryShellClass =
  'font-gallery text-neutral-900 antialiased [text-rendering:optimizeLegibility]'

/** 文章正文容器（prose + 字体） */
export const galleryProseClass =
  'prose-gallery font-gallery text-[17px] font-normal leading-[1.8] tracking-[0.01em] text-neutral-900 antialiased'

/** 正文内超链（与 gallery-prose-blocks.css .gallery-block-link 一致） */
export const galleryInlineLinkClass =
  'gallery-block-link font-semibold text-neutral-500 underline decoration-neutral-200 underline-offset-[3px] transition-colors hover:text-neutral-900 hover:decoration-neutral-400'

/** 文章卡片标题 */
export const galleryCardTitleClass =
  'font-gallery text-[15px] font-normal leading-[1.45] tracking-[0.01em] text-neutral-900 antialiased'

/** 文章卡片标签行 */
export const galleryCardTagClass =
  'font-gallery text-[12px] font-normal leading-[1.5] tracking-[0.03em] text-neutral-500 antialiased'

/** 文章卡片分类名（略大于标签、字重更深，便于区分） */
export const galleryCardCategoryClass =
  'font-gallery text-[15px] font-semibold leading-[1.4] tracking-[0.01em] text-neutral-900 antialiased'

/** 文章详情页标题 */
export const galleryPostTitleClass =
  'font-gallery text-2xl font-semibold leading-tight tracking-[0.01em] text-neutral-900 antialiased md:text-[1.75rem]'

/** Epic 风格：下载页 / 内页顶栏小标题（常规字重、非大字） */
export const galleryEpicBarTitleClass =
  'font-gallery text-[15px] font-normal leading-snug tracking-[0.01em] text-neutral-900 antialiased'

/** 文章页标签链接 */
export const galleryPostTagLinkClass = `${galleryInlineLinkClass} text-[12px]`

/** 标签列表页（Parodies 风格纯文字链接） */
export const galleryTagLinkClass =
  'font-gallery block py-3.5 text-[17px] font-medium leading-[1.55] tracking-[0.01em] text-neutral-900 antialiased transition-colors duration-200 hover:text-neutral-500 sm:text-[18px] sm:py-4'

/** 首页公告栏（对齐 Gallery Epic：14px 常规黑字、清晰抗锯齿） */
export const galleryAnnouncementBarClass =
  'font-gallery text-[14px] font-normal leading-[1.45] tracking-normal text-neutral-900 antialiased subpixel-antialiased'

/** 归档页年份标题 */
export const galleryArchiveYearClass =
  'font-gallery text-[20px] font-semibold leading-none tracking-tight text-neutral-900 antialiased'

/** 归档页日期 */
export const galleryArchiveDateClass =
  'font-gallery text-[13px] font-normal tabular-nums leading-none text-neutral-400 antialiased'

/** 归档页文章标题 */
export const galleryArchiveEntryClass =
  'font-gallery text-[15px] font-normal leading-snug tracking-[0.01em] text-neutral-900 antialiased'

/** 流体网格容器（配合 gallery-grid.css） */
export const galleryContentContainerClass = 'gallery-content-container'

/** 首页 / 列表卡片网格 */
export const galleryCardGridClass = 'gallery-card-grid'

/** 文章内页图库网格 */
export const galleryMediaGridClass = 'gallery-media-grid'

/** 分类索引 pill 网格（遗留，当前分类页已改用 gallery-category-grid） */
export const galleryPillGridClass = 'gallery-pill-grid'

/** 分类索引：Epic Coser 风格圆标 + 名称网格 */
export const galleryCategoryGridClass = 'gallery-category-grid'

/** 标签索引多列网格 */
export const galleryTagGridClass = 'gallery-tag-grid'

/** 内页底部推荐网格 */
export const galleryRecommendGridClass = 'gallery-recommend-grid'

