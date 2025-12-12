import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })
  
  // Use getUser() instead of getSession() to avoid network requests
  // getUser() reads from cookies without making an API call
  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname === '/login'
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
                          request.nextUrl.pathname.startsWith('/area')
  
  // Check if this is a logout redirect - don't redirect back to dashboard
  const isLogout = request.nextUrl.searchParams.get('logout') === 'true'

  // Redirigir a dashboard si está autenticado y trata de acceder a /login
  // BUT skip this if it's a logout redirect
  if (isAuthPage && user && !isLogout) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirigir a login si no está autenticado y trata de acceder a una ruta protegida
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    '/login',
    '/dashboard/:path*',
    '/area/:path*'
  ]
} 