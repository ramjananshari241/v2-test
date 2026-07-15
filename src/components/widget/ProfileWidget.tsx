/* eslint-disable @next/next/no-img-element */
import { useScreenSize } from '@/src/hooks/useScreenSize'
import { isValidUrl } from '@/src/lib/util'
import Link from 'next/link'
import React from 'react'
import { DynamicIcon } from '../DynamicIcon'
import { ProfileBioText } from './ProfileBioText'
import { SocialLinks } from './SocialLinks'

const LinkIcon = ({ icon }: { icon: string }) => {
  if (!icon) return null;
  const size = 18; 
  if (isValidUrl(icon) || icon.startsWith('/')) {
    // ✨ 修改点：将 mr-1.5 改为 md:mr-1.5。这样在手机端没有右边距，图标才能绝对居中
    return <img className="drop-shadow-sm md:mr-1.5" style={{width: size, height: size}} src={icon} alt="icon" />
  }
  // ✨ 修改点：同上，md:mr-1.5
  return <div className="drop-shadow-sm md:mr-1.5"><DynamicIcon nameIcon={icon} propsIcon={{ size }} /></div>
}

export const ProfileWidget = ({ data }: { data: any }) => {
  const { isMobile } = useScreenSize()

  const avatarSrc = data?.logo?.src || data?.image || data?.avatar || '';
  const name = data?.name || 'PRO BLOG';
  const bio = data?.description || '';
  const socialLinks = Array.isArray(data?.links) ? data.links : null;

  return (
    <React.StrictMode>
      <style jsx global>{`
        @keyframes shimmer { 0% { transform: translateX(-150%) skewX(-20deg); } 100% { transform: translateX(150%) skewX(-20deg); } }
        @keyframes borderFlow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .animate-border-flow { background-size: 200% 200%; animation: borderFlow 3s ease infinite; }
        .animate-shimmer { animation: shimmer 1.5s infinite; }
      `}</style>

      <div className="relative h-full w-full group/card transition-transform duration-500 ease-out hover:scale-[1.015]">
        
        {/* 1. 流光边缘 */}
        <div className="absolute -inset-[1px] rounded-[26px] bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 opacity-0 group-hover/card:opacity-100 blur-[2px] transition-opacity animate-border-flow"></div>

        {/* 2. 毛玻璃主体 */}
        <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-[#151516]/80 backdrop-blur-2xl flex flex-col p-5 md:p-6">
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            
            {/* 上半部分内容 */}
            <div className="flex flex-row items-center gap-5">
                <div className="relative shrink-0">
                  <div className="absolute -inset-1 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full blur opacity-30 group-hover/card:opacity-50 transition duration-500"></div>
                  <div className="relative w-16 h-16 md:w-18 md:h-18 rounded-full ring-2 ring-white/10 overflow-hidden bg-neutral-800">
                    {avatarSrc ? <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-500 text-2xl font-bold">P</div>}
                  </div>
                </div>

                <div className="flex flex-col min-w-0">
                    <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight antialiased drop-shadow-md truncate">
                      {name}
                    </h2>
                    <ProfileBioText
                      text={bio}
                      className="text-xs md:text-sm text-gray-400 font-medium line-clamp-2 leading-snug antialiased mt-1"
                      linkClassName="text-sky-400 hover:text-sky-300 underline underline-offset-2 break-all"
                    />
                    {socialLinks ? (
                      <SocialLinks
                        links={socialLinks}
                        variant="standard"
                        className="mt-2"
                      />
                    ) : null}
                </div>
            </div>

            {/* 3. 下半部分：按钮组 */}
            <div className="w-full mt-4">
              <div className="grid grid-cols-3 gap-2 w-full">
                
                {/* 按钮 1 */}
                <Link href="/about" className="group/btn relative h-11 md:h-12 w-full rounded-xl overflow-hidden flex items-center justify-center text-[11px] md:text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95 shadow-lg" style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)' }}>
                  <div className="relative z-10 flex items-center justify-center">
                    <LinkIcon icon="FaCrown" />
                    {/* ✨ 修改点：添加 hidden md:inline 类。在手机端隐藏文字 */}
                    <span className="hidden md:inline leading-none">关于本站</span>
                  </div>
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-shimmer z-0 pointer-events-none"></div>
                </Link>

                {/* 按钮 2 */}
                <Link href="/download" className="group/btn relative h-11 md:h-12 w-full rounded-xl overflow-hidden flex items-center justify-center text-[11px] md:text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95 shadow-lg" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                  <div className="relative z-10 flex items-center justify-center">
                    <LinkIcon icon="IoMdCloudDownload" />
                    {/* ✨ 修改点：同上 */}
                    <span className="hidden md:inline leading-none">下载方式</span>
                  </div>
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-shimmer z-0 pointer-events-none"></div>
                </Link>

                {/* 按钮 3 */}
                <Link href="/friends" className="group/btn relative h-11 md:h-12 w-full rounded-xl overflow-hidden flex items-center justify-center text-[11px] md:text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95 shadow-lg" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #0284c7 100%)' }}>
                  <div className="relative z-10 flex items-center justify-center">
                    <LinkIcon icon="HiOutlineViewGridAdd" />
                    {/* ✨ 修改点：同上 */}
                    <span className="hidden md:inline leading-none">更多内容</span>
                  </div>
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-shimmer z-0 pointer-events-none"></div>
                </Link>

              </div>
            </div>

          </div>
        </div>
      </div>
    </React.StrictMode>
  )
}
