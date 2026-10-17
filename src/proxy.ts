import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCachedMenus } from '@/lib/menu/cache'
import { resolveMenuAccess } from '@/lib/menu/resolve'
import { NextResponse } from 'next/server'

export default auth(async (req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth
  const isAuthPage = pathname.startsWith('/login')
  const isPublicPage = pathname.startsWith('/portfolio/')

  if (!isAuthenticated && !isAuthPage && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (isAuthenticated && !isPublicPage) {
    const userId = req.auth?.user?.id
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true } })
      : null
    if (!user || !user.isActive) {
      return NextResponse.redirect(new URL('/api/logout', req.url))
    }
    if (resolveMenuAccess(await getCachedMenus(), user.role, pathname) === 'NONE') {
      return NextResponse.rewrite(new URL('/__forbidden', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
