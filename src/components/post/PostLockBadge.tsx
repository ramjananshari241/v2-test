import React from 'react'

export function PostLockBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-amber-600 ring-1 ring-amber-500/30 dark:text-amber-300 ${className}`}
      title="文章已加密"
      aria-label="文章已加密"
    >
      🔒
    </span>
  )
}
