import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const cookieStore = cookies()
  const response = NextResponse.json({ success: true })
  
  try {
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Sign out with global scope to clear all sessions
    // This should automatically clear cookies managed by Supabase
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    
    if (error) {
      // Log the error but don't fail the request
      // Session might already be invalid, which is fine in production
      console.warn('Logout warning (non-blocking):', error.message)
    }
  } catch (error) {
    // Log but don't fail - we'll still clear cookies manually
    console.warn('Logout error (non-blocking):', error)
  }
  
  // Manually clear all possible Supabase auth cookies
  // Get the project ref from the Supabase URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || ''
  
  // List of common Supabase cookie patterns
  const cookiePatterns = [
    'sb-access-token',
    'sb-refresh-token',
    'supabase-auth-token',
    `${projectRef}-auth-token`,
    `sb-${projectRef}-auth-token`,
  ]
  
  // Clear cookies by pattern
  cookiePatterns.forEach(name => {
    response.cookies.set(name, '', {
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
    response.cookies.delete(name)
  })
  
  // Clear any cookies that match auth/token patterns
  cookieStore.getAll().forEach(cookie => {
    const name = cookie.name.toLowerCase()
    if (name.includes('auth') || name.includes('token') || name.includes('supabase') || name.includes('sb-')) {
      response.cookies.set(cookie.name, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
      response.cookies.delete(cookie.name)
    }
  })
  
  return response
}

