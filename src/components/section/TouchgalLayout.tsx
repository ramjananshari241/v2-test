import React from 'react'
import Link from 'next/link'
import { Post } from '@/src/types/blog'
import { ProfileWidget } from '../widget/ProfileWidget'
import { StatsWidget } from '../widget/StatsWidget'

export const TouchgalLayout = ({ posts, widgets }: { posts: Post[], widgets: any }) => {
  return (
    <div className="mx-auto block lg:w-screen-lg lg:px-11 px-4">
      
      {/* 🟢 1. 顶部双栏：左侧介绍 + 右侧贩售机/公告 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8 pt-4">
        <div className="flex flex-col h-full">
           <ProfileWidget data={widgets.profile} />
        </div>
        <div className="flex flex-col h-full">
           {/* 这里的 announcement 就是我们在 index.tsx 里拦截并注入的公告数据 */}
           <StatsWidget data={widgets.announcement} />
        </div>
      </div>

      {/* 🟢 2. 分割标题线 */}
      <div className="flex items-center gap-4 mb-6 opacity-80">
        <h3 className="text-xl font-bold tracking-tighter whitespace-nowrap uppercase">Latest Works</h3>
        <div className="h-[1px] w-full bg-neutral-200 dark:bg-neutral-800"></div>
      </div>

      {/* 🟢 3. 核心：1行4列网格列表 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
        {posts.map((post) => (
          <Link key={post.id} href={`/post/${post.slug}`} className="group cursor-pointer">
            <div className="relative flex flex-col h-full overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
              
              {/* 封面图容器 - 固定 16:9 比例 */}
              <div className="aspect-video relative overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                {post.cover?.light?.src ? (
                  <img 
                    src={post.cover.light.src} 
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-neutral-300 font-bold text-2xl">P</div>
                )}
                {/* 分类标签 */}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-blue-500/80 backdrop-blur-md rounded text-[9px] text-white font-bold uppercase tracking-wider">
                  {post.category?.name || 'Art'}
                </div>
              </div>

              {/* 文字区域 */}
              <div className="p-3 flex flex-col justify-between flex-1">
                <h4 className="text-[13px] font-bold line-clamp-2 mb-2 leading-snug group-hover:text-blue-500 transition-colors">
                  {post.title}
                </h4>
                <div className="flex items-center justify-between opacity-40 text-[10px] font-mono">
                  <span>{post.date?.created?.split('T')[0]}</span>
                  <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 🟢 4. 底部“补丁下载”风格区域 */}
      <div className="bg-blue-500/5 dark:bg-blue-500/10 rounded-3xl p-8 border border-dashed border-blue-500/20 mb-10 text-center">
         <div className="inline-block px-3 py-1 bg-blue-500 text-white text-[10px] font-black rounded-full mb-3 uppercase tracking-tighter">Support Area</div>
         <h4 className="text-lg font-bold mb-4 italic">需要更多补丁或历史版本？</h4>
         <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => window.open('https://van.pro-plus.top/dashboard', '_blank')} className="px-8 py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-blue-500/20">前往贩售机</button>
            <button className="px-8 py-2.5 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-xl text-xs font-bold border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 transition-all">加入社区</button>
         </div>
      </div>
    </div>
  )
}