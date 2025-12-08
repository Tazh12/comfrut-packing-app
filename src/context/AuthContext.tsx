'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { AuthContextType } from '@/types/auth'

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Listen for changes on auth state (sign in, sign out, etc.)
    // This will fire immediately with the current session when subscribed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    // Try to sign out, but don't throw if session is already invalid
    // This handles cases where the session might already be expired
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    if (error) {
      // Only throw if it's not a session-related error
      // Session missing errors are common in production and shouldn't block logout
      if (!error.message?.includes('session') && !error.message?.includes('Auth session missing')) {
        throw error
      }
      // Log session errors but don't throw
      console.warn('Session already invalid during logout:', error.message)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 