'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ThemeToggle from '@/components/ThemeToggle'
import { Loader2, Eye, EyeOff } from 'lucide-react'

interface FormErrors {
  email?: string
  password?: string
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(false)
  const lastSubmitTimeRef = useRef<number>(0)
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null)
  const retryAttemptRef = useRef<{ email: string; password: string } | null>(null)

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current)
      }
    }
  }, [])

  // Auto-retry after cooldown expires
  useEffect(() => {
    if (cooldownSeconds === 0 && autoRetryEnabled && retryAttemptRef.current && !loading) {
      setAutoRetryEnabled(false)
      // Automatically retry login
      const attemptLogin = async () => {
        if (!retryAttemptRef.current) return
        
        setLoading(true)
        setSubmitError(null)
        const { email: retryEmail, password: retryPassword } = retryAttemptRef.current
        
        try {
          const { error } = await supabase.auth.signInWithPassword({
            email: retryEmail,
            password: retryPassword
          })

          if (error) {
            if (isRateLimitError(error)) {
              // Still rate limited, set another cooldown
              setCooldownSeconds(30)
              setAutoRetryEnabled(true)
              startCooldownTimer()
              setSubmitError('Aún hay un límite de intentos activo. Reintentando automáticamente en 30 segundos...')
            } else {
              setSubmitError(error.message || 'Error al iniciar sesión')
              retryAttemptRef.current = null
            }
          } else {
            // Success!
            retryAttemptRef.current = null
            router.push('/dashboard')
          }
        } catch (error) {
          console.error('Error en reintento automático:', error)
          setSubmitError(error instanceof Error ? error.message : 'Error al iniciar sesión')
          retryAttemptRef.current = null
        } finally {
          setLoading(false)
        }
      }
      attemptLogin()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cooldownSeconds, autoRetryEnabled, loading])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!email.trim()) {
      newErrors.email = 'Este campo es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Correo electrónico no válido'
    }

    if (!password.trim()) {
      newErrors.password = 'Este campo es obligatorio'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isRateLimitError = (error: any): boolean => {
    return error?.message?.toLowerCase().includes('rate limit') || 
           error?.message?.toLowerCase().includes('too many requests') ||
           error?.status === 429
  }

  const startCooldownTimer = () => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current)
    }
    
    cooldownTimerRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current)
            cooldownTimerRef.current = null
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const clearErrorAndRetry = () => {
    setSubmitError(null)
    setCooldownSeconds(0)
    setAutoRetryEnabled(false)
    retryAttemptRef.current = null
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current)
      cooldownTimerRef.current = null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    
    if (!validateForm()) {
      return
    }

    // Prevent rapid-fire submissions (debounce)
    const now = Date.now()
    const timeSinceLastSubmit = now - lastSubmitTimeRef.current
    if (timeSinceLastSubmit < 1000) {
      return
    }
    lastSubmitTimeRef.current = now

    // Check if we're in cooldown period
    if (cooldownSeconds > 0) {
      setSubmitError(`Por favor espera ${cooldownSeconds} segundos antes de intentar nuevamente.`)
      return
    }

    if (loading) return
    
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        // Handle rate limit errors specifically
        if (isRateLimitError(error)) {
          // Set a 30-second cooldown period
          setCooldownSeconds(30)
          setAutoRetryEnabled(true)
          retryAttemptRef.current = { email, password }
          startCooldownTimer()
          
          throw new Error('Se ha alcanzado el límite de intentos. El sistema reintentará automáticamente en 30 segundos.')
        }
        throw error
      }

      // Clear any cooldown on successful login
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current)
        cooldownTimerRef.current = null
      }
      setCooldownSeconds(0)
      setAutoRetryEnabled(false)
      retryAttemptRef.current = null

      // Si no hay error, redirigir al dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error al iniciar sesión'
      setSubmitError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--page-bg)' }}>
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center px-4 py-12" style={{ paddingTop: '15vh' }}>
        <div className="w-full max-w-[460px] min-w-[420px]">
          {/* Card */}
          <div 
            className="rounded-lg shadow-lg p-8 md:p-10"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)'
            }}
          >
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-bold"
                style={{
                  backgroundColor: 'var(--primary-bg)',
                  color: 'var(--primary-text)'
                }}
              >
                C
              </div>
            </div>

            {/* Title */}
            <h1 
              className="text-2xl font-bold text-center mb-2"
              style={{ color: 'var(--title-text)' }}
            >
              Iniciar sesión
            </h1>

            {/* Subtitle */}
            <p 
              className="text-sm text-center mb-8"
              style={{ color: 'var(--muted-text)' }}
            >
              Ingresa tus credenciales para acceder al sistema.
            </p>

            {/* Error Message */}
            {submitError && (
              <div 
                className="mb-6 p-3 rounded-md border"
                style={{
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  borderColor: 'var(--error-border)',
                  color: 'var(--error-text)'
                }}
              >
                <p className="text-sm">{submitError}</p>
                {cooldownSeconds > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">
                      Tiempo de espera: {cooldownSeconds} segundos
                    </p>
                    {autoRetryEnabled && (
                      <p className="text-xs mt-1 opacity-75">
                        Reintentando automáticamente cuando expire el tiempo de espera...
                      </p>
                    )}
                  </div>
                )}
                {cooldownSeconds === 0 && submitError && (
                  <button
                    type="button"
                    onClick={clearErrorAndRetry}
                    className="mt-2 text-sm underline hover:no-underline"
                    style={{ color: 'var(--error-text)' }}
                  >
                    Limpiar error e intentar de nuevo
                  </button>
                )}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label 
                  htmlFor="email" 
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--muted-text)' }}
                >
                  Correo Electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errors.email) {
                      setErrors({ ...errors, email: undefined })
                    }
                  }}
                  placeholder="ej: usuario@comfrut.com"
                  className={`w-full px-3 py-2 rounded-md text-sm transition-colors login-input ${errors.email ? 'error' : ''}`}
                />
                {errors.email && (
                  <p 
                    className="mt-1 text-sm"
                    style={{ color: 'var(--error-text)' }}
                  >
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--muted-text)' }}
                >
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (errors.password) {
                        setErrors({ ...errors, password: undefined })
                      }
                    }}
                    className={`w-full px-3 py-2 pr-10 rounded-md text-sm transition-colors login-input ${errors.password ? 'error' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    style={{ color: 'var(--muted-text)' }}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p 
                    className="mt-1 text-sm"
                    style={{ color: 'var(--error-text)' }}
                  >
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="mr-2 w-4 h-4 rounded"
                    style={{
                      accentColor: 'var(--primary-bg)'
                    }}
                  />
                  <span 
                    className="text-sm"
                    style={{ color: 'var(--muted-text)' }}
                  >
                    Mantener sesión iniciada
                  </span>
                </label>
                <a
                  href="#"
                  className="text-sm hover:underline"
                  style={{ color: 'var(--primary-bg)' }}
                  onClick={(e) => {
                    e.preventDefault()
                    // TODO: Implement forgot password flow
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || cooldownSeconds > 0}
                className="w-full py-2.5 px-4 rounded-md text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  backgroundColor: loading || cooldownSeconds > 0 ? 'var(--muted-text)' : 'var(--primary-bg)',
                  color: 'var(--primary-text)'
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Ingresando…</span>
                  </>
                ) : cooldownSeconds > 0 ? (
                  `Espera ${cooldownSeconds}s`
                ) : (
                  'Iniciar sesión'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer 
        className="py-4 px-6 border-t flex items-center justify-between"
        style={{
          backgroundColor: 'var(--page-bg)',
          borderColor: 'var(--footer-border)'
        }}
      >
        <span 
          className="text-sm"
          style={{ color: 'var(--muted-text)' }}
        >
          © FACENIC
        </span>
        <div className="flex items-center gap-4">
          <a
            href="#"
            className="text-sm hover:underline"
            style={{ color: 'var(--muted-text)' }}
            onClick={(e) => {
              e.preventDefault()
              // TODO: Implement terms link
            }}
          >
            Términos
          </a>
          <span style={{ color: 'var(--muted-text)' }}>•</span>
          <a
            href="#"
            className="text-sm hover:underline"
            style={{ color: 'var(--muted-text)' }}
            onClick={(e) => {
              e.preventDefault()
              // TODO: Implement support link
            }}
          >
            Soporte
          </a>
        </div>
      </footer>
    </div>
  )
}
