import CONFIG from '@/blog.config'
import { Post } from '@/src/types/blog'
import { ApiColor } from '@/src/types/notion'
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { randomUUID } from 'crypto'
import { slugify } from '../../util'
import { getImageInfo } from '../getImageInfo'

export const formatPosts = async (
  posts: PageObjectResponse[]
): Promise<Post[]> => {
  const formattedPosts = await Promise.all(
    posts.map(async (post) => {
      const formattedPost = await formatPost(post)
      return formattedPost
    })
  )
  return formattedPosts
}

const formatPost = async (post: PageObjectResponse): Promise<Post> => {
  const { id, properties } = post
  const {
    title,
    status,
    slug,
    excerpt,
    date,
    update_date,
    cover,
    cover_dark,
    category,
    tags,
    ...options
  } = properties
  const { color_title, original_cover, repost, download } = options

  const postTitle = title.type === 'title' && title.title[0]?.plain_text
  const postStatus =
    status.type === 'status' && status.status && status.status.name
  const postSlug = slug.type === 'rich_text' && slug.rich_text[0]?.plain_text
  const postExcerpt =
    excerpt.type === 'rich_text' && excerpt.rich_text[0]?.plain_text
  const postCreatedDate = date.type === 'date' && date.date && date.date.start
  const postUpdatedDate =
    update_date.type === 'last_edited_time' && update_date.last_edited_time

  const postCoverLightSrc =
    (cover.type === 'url' && cover.url) || CONFIG.DEFAULT_POST_COVER
  const postCoverDarkSrc =
    (cover_dark.type === 'url' && cover_dark.url) || postCoverLightSrc

  // =========================================================
  // 🛡️ 核心修复：媒体死链保护 (Try-Catch)
  // =========================================================
  
  // 默认占位数据，防止 getImageInfo 报错
  const defaultImgInfo = { width: 1200, height: 630, placeholder: '' }

  let infoLight = defaultImgInfo
  let infoDark = defaultImgInfo

  // 1. 尝试抓取浅色封面信息
  try {
    if (postCoverLightSrc) {
      infoLight = await getImageInfo(postCoverLightSrc)
    }
  } catch (e) {
    console.warn(`⚠️ 无法获取浅色封面尺寸 (死链或超时): ${postCoverLightSrc}`)
  }

  // 2. 尝试抓取深色封面信息
  try {
    if (postCoverDarkSrc) {
      if (postCoverDarkSrc === postCoverLightSrc) {
        infoDark = infoLight
      } else {
        infoDark = await getImageInfo(postCoverDarkSrc)
      }
    }
  } catch (e) {
    console.warn(`⚠️ 无法获取深色封面尺寸 (死链或超时): ${postCoverDarkSrc}`)
  }

  const postCoverLight = {
    src: postCoverLightSrc,
    info: {
      placeholder: infoLight.placeholder,
      width: infoLight.width,
      height: infoLight.height,
    },
  }
  const postCoverDark = {
    src: postCoverDarkSrc,
    info: {
      placeholder: infoDark.placeholder,
      width: infoDark.width,
      height: infoDark.height,
    },
  }

  // =========================================================

  const postCategory = category.type === 'select' && {
    ...category.select,
    id: slugify(category.select?.name ?? randomUUID()),
  }
  const postTags =
    tags.type === 'multi_select' &&
    tags.multi_select.map((tag) => {
      return { ...tag, id: slugify(tag.name) }
    })
  const postOptions = {
    colorTitle:
      color_title.type === 'multi_select' &&
      color_title.multi_select.map((color) => color.color as ApiColor),
    originalCover:
      original_cover.type === 'checkbox' && original_cover.checkbox,
    repost: repost.type === 'url' && repost.url,
    // 下载链接：用于后续主题(如 gallery)在卡片上直接提供下载入口；属性缺失时安全降级为空串
    download: (download && download.type === 'url' && download.url) || '',
  }

  const formattedPost = {
    id,
    status: postStatus ?? 'Draft',
    title: postTitle ?? 'Untitled',
    slug: postSlug ?? 'unknown',
    excerpt: postExcerpt ?? '',
    date: {
      created: postCreatedDate ?? postUpdatedDate ?? new Date().toISOString(),
      updated: postUpdatedDate ?? new Date().toISOString(),
    },
    cover: {
      light: postCoverLight,
      dark: postCoverDark,
    },
    category: postCategory ?? {
      id: randomUUID(),
      name: 'Uncategorized',
      color: 'gray' as ApiColor,
    },
    tags: postTags ?? [
      {
        id: randomUUID(),
        name: 'Untagged',
        color: 'gray' as ApiColor,
      },
    ],
    options: {
      colorTitle: postOptions.colorTitle ?? [],
      originalCover: postOptions.originalCover ?? false,
      repost: postOptions.repost ?? '',
      download: postOptions.download ?? '',
    },
  } as Post
  return formattedPost
}

export function getNavigationInfo(
  formattedPosts: Post[],
  post: Post | undefined
) {
  if (!post) return { previousPost: null, nextPost: null }
  const postIndex = formattedPosts.findIndex(
    (p) => p.date.created === post.date.created
  )
  const previousPost = postIndex > 0 ? formattedPosts[postIndex - 1] : null
  const nextPost =
    postIndex < formattedPosts.length - 1 ? formattedPosts[postIndex + 1] : null

  return {
    previousPost: previousPost
      ? {
          title: previousPost.title,
          slug: previousPost.slug,
          cover: previousPost.cover,
        }
      : null,
    nextPost: nextPost
      ? {
          title: nextPost.title,
          slug: nextPost.slug,
          cover: nextPost.cover,
        }
      : null,
  }
}
