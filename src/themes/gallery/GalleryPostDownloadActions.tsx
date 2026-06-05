'use client'

import { useState } from 'react'
import { trackGalleryPostStatOnce } from './GalleryPostStats'
import { GalleryDownloadModal } from './GalleryDownloadModal'

type GalleryPostDownloadActionsProps = {
  postSlug: string
  postTitle: string
  downloadContent: string
}

/** 下载页右侧：居中下载按钮，点击弹出文章专属下载信息 */
export function GalleryPostDownloadActions({
  postSlug,
  postTitle,
  downloadContent,
}: GalleryPostDownloadActionsProps) {
  const [open, setOpen] = useState(false)

  const handleOpen = () => {
    if (postSlug) trackGalleryPostStatOnce(postSlug, 'download')
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="min-w-[200px] rounded-md bg-black px-10 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-neutral-800 active:bg-neutral-900 sm:min-w-[240px]"
      >
        下载
      </button>
      <GalleryDownloadModal
        open={open}
        postTitle={postTitle}
        content={downloadContent}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
