'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const supabase = createClientComponentClient()
      await supabase.auth.signOut()
      router.replace('/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
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