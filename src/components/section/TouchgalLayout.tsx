import React from 'react'
import Link from 'next/link'
import { Post } from '@/src/types/blog'
import { ProfileWidget } from '../widget/ProfileWidget'
import { StatsWidget } from '../widget/StatsWidget'

export const TouchgalLayout = ({ posts, widgets }: { posts: Post[], widgets: any }) => {
  // 🛡️ 终极容错：如果 props 里的 posts 没拿到，尝试从全局 widgets 数据里看看有没有残留数据
  const displayPosts = posts && posts.length > 0 ? posts : []

  return (
    <div className="mx-auto block lg:w-screen-lg lg:px-11 px-4">
      
      {/* 1. 顶部双栏 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8 pt-4">
        <div className="flex flex-col h-full">
           <ProfileWidget data={widgets?.profile} />
        </div>
        <div className="flex flex-col h-full">
           <StatsWidget data={widgets?.announcement} />
        </div>
      </div>

      {/* 2. 最新作品标题 */}
      <div className="flex items-center gap-4 mb-6">
        <h3 className="text-xl font-black tracking-tighter whitespace-nowrap uppercase italic text-neutral-800 dark:text-neutral-200">
          Latest Works
        </h3>
        <div className="h-[1px] w-full bg-neutral-200 dark:bg-neutral-800"></div>
      </div>

      {/* 3. 核心列表 */}
      {displayPosts.length === 0 ? (
        <div className="py-24 text-center">
           <p className="text-sm font-bold opacity-20 tracking-[0.2em] uppercase mb-2">Data Synchronization in Progress</p>
           <p className="text-[10px] opacity-10">Waiting for Notion API Response...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
          {displayPosts.map((post) => (
            <Link key={post.id} href={`/post/${post.slug}`} className="group flex flex-col h-full">
              <div className="relative flex flex-col h-full overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] group-hover:-translate-y-1">
                
                {/* 封面图 */}
                <div className="aspect-[4/3] relative overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                  {post.cover?.light?.src ? (
                    <img 
                      src={post.cover.light.src} 
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-300 font-black text-4xl">P</div>
                  )}
                  {/* 分类标签 */}
                  <div className="absolute top-3 left-3 px-2 py-0.5 bg-blue-600/90 backdrop-blur-md rounded-lg text-[9px] text-white font-black uppercase tracking-tighter">
                    {post.category?.name || 'Art'}
                  </div>
                </div>

                {/* 标题文字 */}
                <div className="p-4 flex flex-col justify-between flex-1">
                  <h4 className="text-[14px] font-bold line-clamp-2 mb-3 leading-snug group-hover:text-blue-500 transition-colors h-10">
                    {post.title}
                  </h4>
                  <div className="flex items-center justify-between opacity-30 text-[10px] font-black tracking-tighter uppercase">
                    <span>{post.date?.created?.split('T')[0] || 'Recently'}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 4. 底部引流区 */}
      <div className="bg-gradient-to-br from-blue-500/5 to-transparent dark:from-blue-500/10 rounded-[2rem] p-10 border border-blue-500/10 mb-10 text-center relative overflow-hidden group">
         <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors"></div>
         <div className="inline-block px-4 py-1 bg-blue-500 text-white text-[10px] font-black rounded-full mb-4 uppercase tracking-widest shadow-lg shadow-blue-500/30">
            Support Area
         </div>
         <h4 className="text-2xl font-black mb-6 tracking-tighter">需要更多补丁或历史版本？</h4>
         <div className="flex flex-wrap justify-center gap-4 relative z-10">
            <button 
              onClick={() => window.open('https://van.pro-plus.top/dashboard', '_blank')} 
              className="px-10 py-3 bg-blue-500 text-white rounded-2xl text-sm font-black hover:bg-blue-600 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-500/25"
            >
              前往贩售机
            </button>
            <button className="px-10 py-3 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white rounded-2xl text-sm font-black border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all hover:scale-105">
              加入社区
            </button>
         </div>
      </div>
    </div>
  )
}