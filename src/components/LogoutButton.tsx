'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function LogoutButton() {
  const handleLogout = async () => {
    try {
      // Create a fresh client instance for logout
      const supabase = createClientComponentClient()
      
      // First, call server-side logout route to properly handle cookies
      // This must happen first to clear server-side session
      try {
        const response = await fetch('/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })
        
        // Wait for response to ensure cookies are cleared
        if (!response.ok) {
          console.warn('Server logout response not OK:', response.status)
        }
      } catch (fetchError) {
        console.warn('Server logout request failed:', fetchError)
      }
      
      // Then sign out client-side
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' })
      
      if (signOutError) {
        console.warn('Sign out error:', signOutError.message)
      }
      
      // Clear any local storage items that might be related to auth
      try {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
            localStorage.removeItem(key)
          }
        })
      } catch (e) {
        // Ignore localStorage errors
      }
      
      // Clear session storage
      try {
        sessionStorage.clear()
      } catch (e) {
        // Ignore sessionStorage errors
      }
      
      // Redirect with logout flag to prevent middleware redirect loop
      // The flag tells middleware to allow access to login page even if cookies aren't fully cleared yet
      window.location.href = '/login?logout=true'
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      // Still redirect even on error with logout flag
      window.location.href = '/login?logout=true'
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
    >
      Cerrar Sesión
    </button>
  )
} 