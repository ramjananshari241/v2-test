'use client'

import { useState } from 'react'
import { GalleryDownloadModal } from './GalleryDownloadModal'

type GalleryPostDownloadButtonProps = {
  postTitle: string
  downloadContent: string
}

/** 文章内页右上角「作品下载」，与首页卡片下载按钮共用弹窗逻辑 */
export function GalleryPostDownloadButton({
  postTitle,
  downloadContent,
}: GalleryPostDownloadButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-black px-6 py-2.5 text-[15px] font-bold text-white transition-colors hover:bg-neutral-800 active:bg-neutral-900"
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
