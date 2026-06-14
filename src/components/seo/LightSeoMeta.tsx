import Head from 'next/head'
import {
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_NAME,
  DEFAULT_OG_IMAGE,
  PageSeoFlat,
  SITE_KEYWORDS,
  absoluteUrl,
  getPublicSiteUrl,
} from '@/src/lib/seo/lightSeo'

type LightSeoMetaProps = {
  /** 由 getStaticProps 预计算的扁平 SEO（绝不传 post 对象） */
  seo?: PageSeoFlat | null
  siteName?: string
  /** 无 seo 时用于组合标题（分类名等） */
  pageSubtitle?: string
  isAdmin?: boolean
}

/**
 * 轻量 SEO meta：只消费纯字符串 props，不访问 post / cover 等复杂对象。
 */
export function LightSeoMeta({
  seo,
  siteName,
  pageSubtitle,
  isAdmin,
}: LightSeoMetaProps) {
  const name = (siteName || '').trim() || DEFAULT_SITE_NAME
  const sub = (pageSubtitle || '').trim()

  if (isAdmin) {
    return (
      <Head>
        <title>Blog Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
    )
  }

  const pageTitle = seo?.title
    ? seo.title === name
      ? name
      : `${seo.title} | ${name}`
    : sub && sub !== name
      ? `${sub} | ${name}`
      : name

  const description = (seo?.description || '').trim() || DEFAULT_SITE_DESCRIPTION
  const baseUrl = getPublicSiteUrl()
  const canonicalPath = seo?.canonicalPath || ''
  const canonical =
    baseUrl && canonicalPath ? absoluteUrl(baseUrl, canonicalPath) : ''
  const image = (seo?.image || '').trim() || DEFAULT_OG_IMAGE
  const keywords = [seo?.keywords, SITE_KEYWORDS].filter(Boolean).join(', ')
  const ogType = seo?.canonicalPath?.startsWith('/post/') ? 'article' : 'website'

  return (
    <Head>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow" />
      {canonical ? <link rel="canonical" href={canonical} /> : null}

      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={name} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:locale" content="zh_CN" />
      {image ? <meta property="og:image" content={image} /> : null}
      {canonical ? <meta property="og:url" content={canonical} /> : null}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      {image ? <meta name="twitter:image" content={image} /> : null}
    </Head>
  )
}
