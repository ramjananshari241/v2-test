import React, { useState } from 'react'
import Link from 'next/link'
import { Post } from '@/src/types/blog'
import { ProfileWidget } from '../widget/ProfileWidget'
import { StatsWidget } from '../widget/StatsWidget'
import CONFIG from '@/blog.config'

export const TouchgalLayout = ({ posts, widgets }: { posts: Post[], widgets: any }) => {
  const allPosts = posts && posts.length > 0 ? posts : []
  const { ARCHIVE } = CONFIG.DEFAULT_SPECIAL_PAGES

  // 🟢 分页逻辑
  const [currentPage, setCurrentPage] = useState(1)
  const postsPerPage = 12 // 每页显示数量 (3行x4列)
  
  const totalPages = Math.ceil(allPosts.length / postsPerPage)
  const startIndex = (currentPage - 1) * postsPerPage
  const displayPosts = allPosts.slice(startIndex, startIndex + postsPerPage)

  // 处理页码切换并滚动到列表顶部
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    const anchor = document.getElementById('post-list-anchor')
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="mx-auto block max-w-7xl px-4 md:px-8 lg:px-12">
      
      {/* 1. 顶部双栏 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10 pt-6">
        <div className="flex flex-col h-full"><ProfileWidget data={widgets?.profile} /></div>
        <div className="flex flex-col h-full"><StatsWidget data={widgets?.announcement} /></div>
      </div>

      {/* 2. 标题装饰区 - 添加 ID 用于翻页锚点 */}
      <div id="post-list-anchor" className="flex items-end justify-between mb-8 scroll-mt-20">
        <div className="flex items-center gap-4 flex-1">
          <h3 className="text-2xl font-black tracking-tighter uppercase text-neutral-800 dark:text-white">
            最新内容
          </h3>
          <div className="h-[2px] flex-1 bg-gradient-to-r from-neutral-200 to-transparent dark:from-neutral-800"></div>
        </div>
        <Link href={`/${ARCHIVE}/1`} className="ml-4 text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1 group">
          全部归档 <span className="group-hover:translate-x-1 transition-transform">→</span>
        </Link>
      </div>

      {/* 3. 核心列表：1行4列 */}
      {displayPosts.length === 0 ? (
        <div className="py-24 text-center opacity-20 font-black uppercase tracking-widest">No Content Found</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-10">
            {displayPosts.map((post) => (
              <Link key={post.id} href={`/post/${post.slug}`} className="group flex flex-col h-full">
                <div className="relative flex flex-col h-full overflow-hidden rounded-[1.5rem] bg-white dark:bg-[#111] border border-neutral-100 dark:border-neutral-800 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:-translate-y-1.5">
                  
                  {/* 封面图 */}
                  <div className="aspect-[16/10] relative overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                    {post.cover?.light?.src ? (
                      <img src={post.cover.light.src} alt={post.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-300 font-black text-4xl">P</div>
                    )}
                    {/* 分类标签 */}
                    <div className="absolute top-3 left-3 px-2 py-0.5 bg-amber-500 text-[10px] text-white font-black rounded-md shadow-lg shadow-amber-500/30 uppercase">
                      {post.category?.name || 'Post'}
                    </div>
                  </div>

                  {/* 内容区域 */}
                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className="text-[16px] font-bold line-clamp-2 mb-3 leading-[1.4] text-neutral-800 dark:text-neutral-100 group-hover:text-blue-500 transition-colors min-h-[44px]">
                        {post.title}
                      </h4>
                      
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {post.tags?.slice(0, 2).map(tag => (
                          <span key={tag.id} className="text-[10px] px-2 py-0.5 bg-purple-500/10 text-purple-500 dark:text-purple-400 rounded-md font-bold tracking-tight">
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between opacity-40 text-[10px] font-bold">
                      <span>{post.date?.created?.split('T')[0]}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* 🟢 4. 翻页功能区 (插入在指定位置) */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mb-16">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 disabled:opacity-30 hover:bg-blue-600 hover:text-white transition-all font-bold shadow-sm"
              >
                ←
              </button>
              
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                // 当页码过多时，你可以后期考虑添加省略号逻辑，目前按常规博客处理
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${
                      currentPage === pageNum 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 translate-y-[-2px]' 
                        : 'bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-700 shadow-sm'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}

              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 disabled:opacity-30 hover:bg-blue-600 hover:text-white transition-all font-bold shadow-sm"
              >
                →
              </button>
            </div>
          )}
        </>
      )}

      {/* 5. 底部引流区：紫橙撞色 */}
      <div className="bg-neutral-100 dark:bg-neutral-900 rounded-[2.5rem] p-12 border border-neutral-200 dark:border-neutral-800 mb-16 text-center relative overflow-hidden">
         <div className="absolute -left-20 -top-20 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl"></div>
         <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl"></div>
         
         <div className="inline-block px-4 py-1 bg-gradient-to-r from-purple-600 to-orange-600 text-white text-[10px] font-black rounded-full mb-6 uppercase tracking-widest shadow-xl shadow-purple-500/20">
            作品购买
         </div>
         
         <h4 className="text-3xl font-black mb-10 tracking-tighter text-neutral-800 dark:text-white">立即前往贩售机购买我的作品吧！</h4>
         
         <div className="flex flex-wrap justify-center gap-6 relative z-10">
            <button 
              onClick={() => window.open('https://van.pro-plus.top/buy', '_blank')} 
              className="px-10 py-4 bg-[#A855F7] text-white rounded-2xl text-sm font-black hover:bg-[#9333EA] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-500/40 flex items-center gap-2"
            >
              <span>🛒</span> 前往贩售机
            </button>
            
            <Link 
              href="/vending"
              className="px-10 py-4 bg-[#F97316] text-white rounded-2xl text-sm font-black hover:bg-[#EA580C] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-orange-500/40 flex items-center gap-2"
            >
              <span>👑</span> 贩售机使用说明
            </Link>
         </div>
      </div>
    </div>
  )
}