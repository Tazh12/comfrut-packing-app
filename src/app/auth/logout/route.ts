import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true })
  
  try {
    // Get cookies first
    const cookieStore = await cookies()
    
    // Create Supabase client with cookies
    const supabase = createRouteHandlerClient({ cookies })
    
    // Sign out with global scope to clear all sessions
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      if (error) {
        console.warn('Logout warning (non-blocking):', error.message)
      }
    } catch (signOutError) {
      console.warn('Sign out error (non-blocking):', signOutError)
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
      `sb-${projectRef}-auth-token-code-verifier`,
    ]
    
    // Clear cookies by pattern - try multiple approaches
    cookiePatterns.forEach(name => {
      // Delete the cookie
      response.cookies.delete(name)
      // Also set it to empty with expired date
      response.cookies.set(name, '', {
        expires: new Date(0),
        path: '/',
        maxAge: 0,
      })
    })
    
    // Clear any cookies that match auth/token patterns
    cookieStore.getAll().forEach(cookie => {
      const name = cookie.name.toLowerCase()
      if (name.includes('auth') || name.includes('token') || name.includes('supabase') || name.includes('sb-')) {
        // Delete the cookie
        response.cookies.delete(cookie.name)
        // Also set it to empty with expired date
        response.cookies.set(cookie.name, '', {
          expires: new Date(0),
          path: '/',
          maxAge: 0,
        })
      }
    })
  } catch (error) {
    // Log but don't fail - we'll still return success to allow client-side redirect
    console.warn('Logout error (non-blocking):', error)
  }
  
  return response
}

