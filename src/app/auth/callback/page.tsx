'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Obtener el código de autenticación de los parámetros de la URL
        const code = searchParams.get('code')
        
        if (code) {
          // Intercambiar el código por una sesión
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            throw error
          }
        }

        // Redirigir al dashboard o a la página de cambio de contraseña
        const type = searchParams.get('type')
        if (type === 'recovery') {
          router.push('/auth/reset-password')
        } else {
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Error en el callback de autenticación:', error)
        router.push('/login?error=auth-callback-error')
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-4 bg-white rounded-lg shadow-md">
        <p className="text-gray-600">Procesando autenticación...</p>
      </div>
    </div>
  )
} 