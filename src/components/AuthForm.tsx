'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabaseClient } from '@supabase/auth-helpers-react'

export default function AuthForm() {
  const router = useRouter()
  const supabase = useSupabaseClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLogin, setIsLogin] = useState(true)
  const [isResetPassword, setIsResetPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isResetPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        })
        if (error) throw error
        setMessage('Revisa tu correo para restablecer tu contraseña')
      } else if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) throw error
        
        if (!data.session) {
          throw new Error('No se pudo establecer la sesión')
        }

        console.log('Sesión establecida correctamente:', data.session.user.email)
        router.refresh() // Refrescar la página para actualizar el estado de la sesión
        router.replace('/dashboard')
      } else {
        // Validación manual de emails permitidos
        const allowedEmails = ['guti.33.03@gmail.com']
        if (!allowedEmails.includes(email)) {
          setError('Este correo no está autorizado para registrarse.')
          return
        }
      
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        })
        
        if (error) throw error
        
        if (data?.user?.identities?.length === 0) {
          setError('Este correo ya está registrado. Por favor, inicia sesión.')
          return
        }
        
        setMessage('Por favor revisa tu correo para confirmar tu cuenta.')
      }
    } catch (error) {
      console.error('Error de autenticación:', error)
      setError(error instanceof Error ? error.message : 'Ocurrió un error durante la autenticación')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md w-full mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">
        {isResetPassword ? 'Restablecer Contraseña' : isLogin ? 'Iniciar Sesión' : 'Registrarse'}
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        {!isResetPassword && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isResetPassword}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Cargando...' : isResetPassword ? 'Enviar correo de recuperación' : isLogin ? 'Iniciar Sesión' : 'Registrarse'}
        </button>
      </form>

      <div className="mt-4 space-y-2">
        {!isResetPassword && (
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-sm text-indigo-600 hover:text-indigo-500"
          >
            {isLogin ? "¿No tienes cuenta? Regístrate" : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        )}

        <button
          onClick={() => {
            setIsResetPassword(!isResetPassword)
            setError(null)
            setMessage(null)
          }}
          className="w-full text-sm text-indigo-600 hover:text-indigo-500"
        >
          {isResetPassword ? 'Volver al inicio de sesión' : '¿Olvidaste tu contraseña?'}
        </button>
      </div>
    </div>
  )
} 