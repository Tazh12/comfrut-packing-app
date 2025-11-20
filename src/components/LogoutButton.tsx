'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      // Call server-side logout route to properly handle cookies in production
      const response = await fetch('/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      // Even if the server request fails, try client-side logout as fallback
      if (!response.ok) {
        console.warn('Server logout failed, trying client-side logout')
        try {
          const supabase = createClientComponentClient()
          await supabase.auth.signOut({ scope: 'global' })
        } catch (clientError) {
          // Ignore client-side errors, session might already be invalid
          console.warn('Client-side logout warning:', clientError)
        }
      }
      
      // Always redirect to login with hard redirect to clear any cached state
      window.location.href = '/login'
    } catch (error) {
      // Even if there's an unexpected error, still redirect to login
      console.error('Error al cerrar sesión:', error)
      router.replace('/login')
      window.location.href = '/login'
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