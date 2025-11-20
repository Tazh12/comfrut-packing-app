'use client'

import { useTheme } from '@/context/ThemeContext'
import { Sun, Moon, Monitor } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div 
      className="flex items-center gap-1 p-1 rounded-lg border"
      style={{
        backgroundColor: 'var(--page-bg)',
        borderColor: 'var(--card-border)'
      }}
    >
      <button
        onClick={() => setTheme('light')}
        className="flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium transition-all"
        style={{
          backgroundColor: theme === 'light' ? 'var(--card-bg)' : 'transparent',
          color: theme === 'light' ? 'var(--title-text)' : 'var(--muted-text)',
          boxShadow: theme === 'light' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none'
        }}
        onMouseEnter={(e) => {
          if (theme !== 'light') {
            e.currentTarget.style.color = 'var(--title-text)'
          }
        }}
        onMouseLeave={(e) => {
          if (theme !== 'light') {
            e.currentTarget.style.color = 'var(--muted-text)'
          }
        }}
        aria-label="Tema claro"
        title="Claro"
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className="flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium transition-all"
        style={{
          backgroundColor: theme === 'dark' ? 'var(--card-bg)' : 'transparent',
          color: theme === 'dark' ? 'var(--title-text)' : 'var(--muted-text)',
          boxShadow: theme === 'dark' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none'
        }}
        onMouseEnter={(e) => {
          if (theme !== 'dark') {
            e.currentTarget.style.color = 'var(--title-text)'
          }
        }}
        onMouseLeave={(e) => {
          if (theme !== 'dark') {
            e.currentTarget.style.color = 'var(--muted-text)'
          }
        }}
        aria-label="Tema oscuro"
        title="Oscuro"
      >
        <Moon className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className="flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium transition-all"
        style={{
          backgroundColor: theme === 'system' ? 'var(--card-bg)' : 'transparent',
          color: theme === 'system' ? 'var(--title-text)' : 'var(--muted-text)',
          boxShadow: theme === 'system' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none'
        }}
        onMouseEnter={(e) => {
          if (theme !== 'system') {
            e.currentTarget.style.color = 'var(--title-text)'
          }
        }}
        onMouseLeave={(e) => {
          if (theme !== 'system') {
            e.currentTarget.style.color = 'var(--muted-text)'
          }
        }}
        aria-label="Tema del sistema"
        title="Sistema"
      >
        <Monitor className="w-4 h-4" />
      </button>
    </div>
  )
}

