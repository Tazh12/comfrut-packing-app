import { useState, useEffect } from 'react'

export interface IncompleteChecklist {
  id: string
  name: string
  path: string
  area: string
  storageKey: string
}

// Mapping of checklist storage keys to their display info
const CHECKLIST_MAP: Record<string, Omit<IncompleteChecklist, 'storageKey'>> = {
  'checklist-envtemp-draft': {
    id: 'envtemp',
    name: 'Process Environmental Temperature Control',
    path: '/area/calidad/checklist-envtemp',
    area: 'calidad'
  },
  'checklist-packaging-draft': {
    id: 'packaging',
    name: 'Checklist de Packaging',
    path: '/area/produccion/checklist-packaging',
    area: 'produccion'
  },
  'checklist-producto-mix-draft': {
    id: 'producto-mix',
    name: 'Checklist Mix Producto',
    path: '/area/calidad/checklist_producto_mix',
    area: 'calidad'
  },
  'checklist-monoproducto-draft': {
    id: 'monoproducto',
    name: 'Checklist Monoproducto',
    path: '/area/calidad/checklist-monoproducto',
    area: 'calidad'
  },
  'checklist-metal-detector-draft': {
    id: 'metal-detector',
    name: 'Metal Detector (PCC #1)',
    path: '/area/calidad/checklist-metal-detector',
    area: 'calidad'
  },
  'checklist-solicitud-mtto-draft': {
    id: 'solicitud-mtto',
    name: 'Solicitud de Mantenimiento',
    path: '/area/mantencion/checklist/solicitud_mtto',
    area: 'mantencion'
  }
}

/**
 * Hook to detect incomplete checklists stored in localStorage
 * Returns a map of area names to incomplete checklists
 */
export function useIncompleteChecklists() {
  // Initial synchronous check to avoid showing badges for cleared drafts
  const initialCheck = (): Record<string, IncompleteChecklist[]> => {
    const incomplete: Record<string, IncompleteChecklist[]> = {}
    
    Object.entries(CHECKLIST_MAP).forEach(([storageKey, checklistInfo]) => {
      try {
        const draftData = localStorage.getItem(storageKey)
        if (!draftData) return
        
        const parsed = JSON.parse(draftData)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return
        
        const hasData = Object.keys(parsed).length > 0 && 
          Object.values(parsed).some(value => {
            if (value === null || value === undefined) return false
            if (Array.isArray(value)) return value.length > 0
            if (typeof value === 'object') return Object.keys(value).length > 0
            if (typeof value === 'string') return value.trim() !== ''
            if (typeof value === 'number') return value !== 0
            return true
          })

        if (hasData) {
          const area = checklistInfo.area
          if (!incomplete[area]) {
            incomplete[area] = []
          }
          incomplete[area].push({
            ...checklistInfo,
            storageKey
          })
        }
      } catch (error) {
        // Skip on error
      }
    })
    
    return incomplete
  }

  const [incompleteChecklists, setIncompleteChecklists] = useState<Record<string, IncompleteChecklist[]>>(() => initialCheck())

  useEffect(() => {
    const checkForIncompleteChecklists = () => {
      const incomplete: Record<string, IncompleteChecklist[]> = {}

      // Check each checklist storage key
      Object.entries(CHECKLIST_MAP).forEach(([storageKey, checklistInfo]) => {
        try {
          const draftData = localStorage.getItem(storageKey)
          if (!draftData) {
            // No data in localStorage, skip
            return
          }
          
          const parsed = JSON.parse(draftData)
          
          // If parsed data is null, undefined, or not an object, skip
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return
          }
          
          // Check if the draft has any meaningful data (not just empty object)
          const hasData = Object.keys(parsed).length > 0 && 
            Object.values(parsed).some(value => {
              if (value === null || value === undefined) return false
              if (Array.isArray(value)) return value.length > 0
              if (typeof value === 'object') return Object.keys(value).length > 0
              if (typeof value === 'string') return value.trim() !== ''
              if (typeof value === 'number') return value !== 0
              return true
            })

          if (hasData) {
            const area = checklistInfo.area
            if (!incomplete[area]) {
              incomplete[area] = []
            }
            incomplete[area].push({
              ...checklistInfo,
              storageKey
            })
          }
        } catch (error) {
          // If there's an error parsing, skip this checklist
          console.error(`Error checking ${storageKey}:`, error)
        }
      })

      setIncompleteChecklists(incomplete)
    }

    // Check on mount
    checkForIncompleteChecklists()

    // Listen for storage changes (when user saves/clears drafts from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && CHECKLIST_MAP[e.key]) {
        checkForIncompleteChecklists()
      }
    }

    // Listen for custom localStorageChange event (for same-window changes)
    const handleCustomStorageChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string; value: any }>
      if (customEvent.detail?.key && CHECKLIST_MAP[customEvent.detail.key]) {
        // Check immediately when custom event fires
        setTimeout(checkForIncompleteChecklists, 0)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('localStorageChange', handleCustomStorageChange)
    
    // Also check periodically (in case localStorage is updated in same window)
    // Using a shorter interval for better responsiveness
    const interval = setInterval(checkForIncompleteChecklists, 1000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('localStorageChange', handleCustomStorageChange)
      clearInterval(interval)
    }
  }, [])

  return incompleteChecklists
}

/**
 * Get incomplete checklists for a specific area
 */
export function useIncompleteChecklistsForArea(area: string) {
  const allIncomplete = useIncompleteChecklists()
  return allIncomplete[area] || []
}

