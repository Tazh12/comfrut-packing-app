'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextType {
  theme: ThemeMode
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

const THEME_STORAGE_KEY = 'theme-preference'

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return null
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize theme state - use a function to avoid hydration mismatch
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system'
    const stored = getStoredTheme()
    return stored || 'system'
  })
  
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (typeof window === 'undefined') return 'light'
    const stored = getStoredTheme()
    const initialTheme = stored || 'system'
    const resolved = initialTheme === 'system' ? getSystemTheme() : initialTheme
    // Apply theme immediately during initialization
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', resolved)
    }
    return resolved
  })

  // Initialize theme on mount and apply immediately
  useEffect(() => {
    const stored = getStoredTheme()
    const initialTheme = stored || 'system'
    
    // Sync state with stored preference
    setThemeState(initialTheme)
    
    // Calculate resolved theme
    const resolved = initialTheme === 'system' ? getSystemTheme() : initialTheme
    
    // Update resolved theme and apply
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }, []) // Empty dependency array - only run once on mount

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const newResolved = getSystemTheme()
      setResolvedTheme(newResolved)
      applyTheme(newResolved)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  function applyTheme(resolved: ResolvedTheme) {
    const root = document.documentElement
    root.setAttribute('data-theme', resolved)
  }

  function setTheme(newTheme: ThemeMode) {
    setThemeState(newTheme)
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    
    const resolved = newTheme === 'system' ? getSystemTheme() : newTheme
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

