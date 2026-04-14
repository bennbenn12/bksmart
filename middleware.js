import { NextResponse } from 'next/server'

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Skip middleware entirely for static files and API routes — avoids Supabase call overhead
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    /\.(.*)$/.test(pathname)   // any file extension
  ) {
    return NextResponse.next()
  }

  const session = request.cookies.get('booksmart_session')?.value || null

  const pub = ['/login', '/register', '/forgot-password', '/reset-password']

  if (!session && !pub.some(p => pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (session && !pathname.startsWith('/reset-password') && pub.some(p => pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Only run middleware on actual page routes — not _next, not images, not API
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/|api/).*)',
  ],
}
