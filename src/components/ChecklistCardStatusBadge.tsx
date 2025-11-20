'use client'

import { AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

interface ChecklistCardStatusBadgeProps {
  storageKey: string
  className?: string
}

export function ChecklistCardStatusBadge({ storageKey, className = '' }: ChecklistCardStatusBadgeProps) {
  // Always start with false to avoid hydration mismatch
  // We'll check localStorage only after mount (client-side)
  const [hasIncomplete, setHasIncomplete] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    const checkIncomplete = () => {
      try {
        const draftData = localStorage.getItem(storageKey)
        if (!draftData) {
          setHasIncomplete(false)
          return
        }
        
        const parsed = JSON.parse(draftData)
        
        // If parsed data is null, undefined, or not an object, it's not incomplete
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          setHasIncomplete(false)
          return
        }
        
        // Check if the draft has any meaningful data
        const hasData = Object.keys(parsed).length > 0 && 
          Object.values(parsed).some(value => {
            if (value === null || value === undefined) return false
            if (Array.isArray(value)) return value.length > 0
            if (typeof value === 'object') return Object.keys(value).length > 0
            if (typeof value === 'string') return value.trim() !== ''
            if (typeof value === 'number') return value !== 0
            return true
          })
        
        setHasIncomplete(hasData)
      } catch (error) {
        // If there's any error parsing, treat as no incomplete draft
        setHasIncomplete(false)
      }
    }

    // Check immediately on mount (client-side only)
    checkIncomplete()
    
    // Check periodically for changes (localStorage changes in same window don't trigger storage event)
    const interval = setInterval(checkIncomplete, 1000)
    
    // Listen for storage events (for changes from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey) {
        checkIncomplete()
      }
    }

    // Listen for custom localStorageChange event (for same-window changes)
    const handleCustomStorageChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string; value: any }>
      if (customEvent.detail?.key === storageKey) {
        // Check immediately when custom event fires
        setTimeout(checkIncomplete, 0)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('localStorageChange', handleCustomStorageChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('localStorageChange', handleCustomStorageChange)
    }
  }, [storageKey, isMounted])

  if (!hasIncomplete) {
    return null
  }

  return (
    <div className={`absolute top-2 right-2 ${className}`}>
      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded-md shadow-sm">
        <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
        <span className="text-xs font-medium text-amber-800">Incompleto</span>
      </div>
    </div>
  )
}

