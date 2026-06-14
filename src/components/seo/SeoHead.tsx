import Head from 'next/head'
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_NAME,
  SITE_KEYWORDS_CONTENT,
  absoluteUrl,
  getPublicSiteUrl,
} from '@/src/lib/seo/seoConfig'

/** 从 Post 对象安全提取 SEO 字段（cover/date/category/tags 均为结构化对象，不是字符串） */
type SeoPostInput = {
  title?: string
  excerpt?: string
  cover?: unknown
  date?: unknown
  category?: unknown
  tags?: unknown
  slug?: string
}

function pickCoverUrl(cover: unknown): string {
  if (!cover) return ''
  if (typeof cover === 'string') return cover.trim()
  if (typeof cover === 'object') {
    const c = cover as {
      light?: { src?: string }
      dark?: { src?: string }
      src?: string
    }
    return (c.light?.src || c.dark?.src || c.src || '').trim()
  }
  return ''
}

function pickPostDate(date: unknown): string {
  if (!date) return ''
  if (typeof date === 'string') return date.trim()
  if (typeof date === 'object') {
    const d = date as { updated?: string; created?: string }
    return (d.updated || d.created || '').trim()
  }
  return ''
}

function pickCategoryName(category: unknown): string {
  if (!category) return ''
  if (typeof category === 'string') return category.trim()
  if (typeof category === 'object') {
    const c = category as { name?: string }
    return (c.name || '').trim()
  }
  return ''
}

function pickTagNames(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  return tags
    .map((t) => {
      if (typeof t === 'string') return t.trim()
      if (t && typeof t === 'object') {
        const tag = t as { name?: string }
        return (tag.name || '').trim()
      }
      return ''
    })
    .filter(Boolean)
}

type SeoHeadProps = {
  siteName?: string
  /** 页面级副标题（文章标题 / 分类名等） */
  pageSubtitle?: string
  /** 当前路径（来自 router.asPath），用于 canonical / og:url */
  path?: string
  /** 文章页数据（存在时输出 BlogPosting 结构化数据 + article OG） */
  post?: SeoPostInput | null
  /** 后台路由：输出 noindex，避免被搜索引擎收录 */
  isAdmin?: boolean
}

/**
 * 统一的 SEO <head> 输出：标题、描述、关键词、robots、canonical、
 * Open Graph、Twitter Card 与 JSON-LD 结构化数据。
 * 这些内容仅出现在 <head>，不会显示在前端可见区域。
 */
export default function SeoHead({
  siteName,
  pageSubtitle,
  path,
  post,
  isAdmin,
}: SeoHeadProps) {
  const name = (siteName || '').trim() || DEFAULT_SITE_NAME
  const sub = (pageSubtitle || '').trim()
  const title = sub && sub !== name ? `${sub} | ${name}` : name

  const baseUrl = getPublicSiteUrl()
  const cleanPath = (path || '/').split('#')[0].split('?')[0] || '/'
  const canonical = baseUrl ? absoluteUrl(baseUrl, cleanPath) : ''

  const postExcerpt = (post?.excerpt || '').trim()
  const description = postExcerpt || DEFAULT_SITE_DESCRIPTION
  const coverUrl = pickCoverUrl(post?.cover)
  const image = coverUrl || DEFAULT_OG_IMAGE
  const publishedDate = pickPostDate(post?.date)
  const categoryName = pickCategoryName(post?.category)
  const tagNames = pickTagNames(post?.tags)
  const ogType = post ? 'article' : 'website'

  // 关键词：平台长尾词 + 当前文章的分类/标签（若有）
  const keywords = [categoryName, ...tagNames, SITE_KEYWORDS_CONTENT]
    .filter(Boolean)
    .join(', ')

  // 后台页面：仅输出标题 + noindex，避免被收录
  if (isAdmin) {
    return (
      <Head>
        <title>{title}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
    )
  }

  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    description: DEFAULT_SITE_DESCRIPTION,
    inLanguage: 'zh-CN',
    ...(baseUrl ? { url: baseUrl } : {}),
  }

  const articleLd = post
    ? {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title || title,
        description,
        image: image ? [image] : undefined,
        ...(publishedDate
          ? { datePublished: publishedDate, dateModified: publishedDate }
          : {}),
        ...(canonical ? { mainEntityOfPage: canonical } : {}),
        ...(categoryName ? { articleSection: categoryName } : {}),
        ...(tagNames.length ? { keywords: tagNames.join(', ') } : {}),
        author: { '@type': 'Organization', name },
        publisher: { '@type': 'Organization', name },
      }
    : null

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
      {canonical ? <link rel="canonical" href={canonical} /> : null}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={name} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:locale" content="zh_CN" />
      {image ? <meta property="og:image" content={image} /> : null}
      {canonical ? <meta property="og:url" content={canonical} /> : null}
      {publishedDate ? (
        <meta property="article:published_time" content={publishedDate} />
      ) : null}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image ? <meta name="twitter:image" content={image} /> : null}

      {/* 结构化数据 JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
      />
      {articleLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
        />
      ) : null}
    </Head>
  )
}
