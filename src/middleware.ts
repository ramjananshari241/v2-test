import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl

  // 1. 只针对 /admin 路径
  if (pathname.startsWith('/admin')) {
    // --- 【新增逻辑】识别来自管理端的“接头暗号” ---
    const auth_u = searchParams.get('auth_u')
    const auth_p = searchParams.get('auth_p')
    
    // 获取环境变量中的正确账号密码
    const validUser = process.env.AUTH_USER || 'admin'
    const validPass = process.env.AUTH_PASS || '123456'

    // 如果 URL 带有参数且匹配成功
    if (auth_u === validUser && auth_p === validPass) {
      // 验证通过：创建一个重定向响应，并种下 Basic Auth 的 Base64 凭证到 Cookie（模拟已登录）
      const response = NextResponse.redirect(new URL('/admin', req.url))
      const authValue = btoa(`${validUser}:${validPass}`)
      
      // 种下辅助 Cookie，有效期 1 天，这样以后访问都不用弹窗
      response.cookies.set('internal_auth', authValue, { 
        path: '/', 
        maxAge: 86400, 
        httpOnly: true 
      })
      return response
    }

    // --- 【原有逻辑】检查请求头或 Cookie ---
    const basicAuth = req.headers.get('authorization')
    const cookieAuth = req.cookies.get('internal_auth')?.value

    // 检查是否有原生 Header 或者我们刚才种下的 Cookie
    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1]
      const [user, pwd] = atob(authValue).split(':')
      if (user === validUser && pwd === validPass) return NextResponse.next()
    }
    
    if (cookieAuth) {
      const [user, pwd] = atob(cookieAuth).split(':')
      if (user === validUser && pwd === validPass) return NextResponse.next()
    }

    // --- 验证失败：返回 401 触发弹窗 ---
    return new NextResponse(null, {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/admin'],
}