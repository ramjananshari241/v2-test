import { BlockRender } from '@/src/components/blocks/BlockRender'
import { BlockResponse } from '@/src/types/notion'
import { MathJaxContext } from 'better-react-mathjax'
import { GalleryBreadcrumb } from './GalleryBreadcrumb'
import { galleryPostTitleClass, galleryProseClass } from './galleryFonts'

type GalleryArticlePageProps = {
  title: string
  blocks: BlockResponse[]
  /** 面包屑末级文案，默认与 title 相同 */
  breadcrumbLabel?: string
  /** 标题下简介（Notion Page excerpt） */
  excerpt?: string | null
}

/**
 * Gallery 静态内容页（About、使用说明等）：与文章页相同的正文排版，无 Widget / 上下篇
 */
export function GalleryArticlePage({
  title,
  blocks,
  breadcrumbLabel,
  excerpt,
}: GalleryArticlePageProps) {
  const crumbLabel = breadcrumbLabel || title

  return (
    <>
      <GalleryBreadcrumb
        items={[{ label: '首页', href: '/' }, { label: crumbLabel }]}
      />
      <main className="flex-1 bg-white px-6 py-6">
        <article className="mx-auto max-w-3xl">
          <h1 className={`mb-3 ${galleryPostTitleClass}`}>{title}</h1>

          {excerpt?.trim() ? (
            <p className="mb-8 font-gallery text-sm font-normal leading-relaxed tracking-wide text-neutral-500">
              {excerpt}
            </p>
          ) : (
            <div className="mb-8" />
          )}

          <MathJaxContext>
            <div className={`${galleryProseClass} overflow-hidden break-words`}>
              <BlockRender blocks={blocks} />
            </div>
          </MathJaxContext>
        </article>
      </main>
    </>
  )
}
