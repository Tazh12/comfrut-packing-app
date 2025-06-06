import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Si no hay sesión y el usuario intenta acceder a una ruta protegida
    if (!session && (
      req.nextUrl.pathname.startsWith('/dashboard') ||
      req.nextUrl.pathname.startsWith('/area')
    )) {
      const redirectUrl = new URL('/login', req.url)
      redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Si hay sesión y el usuario intenta acceder a login/signup
    if (session && (
      req.nextUrl.pathname === '/login' ||
      req.nextUrl.pathname === '/signup'
    )) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return res
  } catch (error) {
    console.error('Error en middleware:', error)
    return res
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/area/:path*',
    '/login',
    '/signup'
  ],
} 