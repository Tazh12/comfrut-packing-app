'use client'

import { useState, useEffect } from 'react'
import { Trash2, AlertCircle } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { useRouter } from 'next/navigation'

interface DeleteDraftButtonProps {
  storageKey: string
  checklistName: string
  onDelete?: () => void
  onReset?: () => void // Callback to reset form state
}

// Mapping of storage keys to their area pages for redirect after deletion
const STORAGE_KEY_TO_AREA_PATH: Record<string, string> = {
  'checklist-envtemp-draft': '/area/calidad',
  'checklist-packaging-draft': '/area/produccion',
  'checklist-producto-mix-draft': '/area/calidad',
  'checklist-monoproducto-draft': '/area/calidad',
  'checklist-solicitud-mtto-draft': '/area/mantencion'
}

export function DeleteDraftButton({ storageKey, checklistName, onDelete, onReset }: DeleteDraftButtonProps) {
  const { showToast } = useToast()
  const router = useRouter()
  const [hasDraft, setHasDraft] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Check if there's a draft in localStorage
  useEffect(() => {
    const checkDraft = () => {
      try {
        const draftData = localStorage.getItem(storageKey)
        if (draftData) {
          const parsed = JSON.parse(draftData)
          // Check if the draft has any meaningful data
          const hasData = parsed && Object.keys(parsed).length > 0 && 
            Object.values(parsed).some(value => {
              if (Array.isArray(value)) return value.length > 0
              if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0
              return value !== '' && value !== null && value !== undefined
            })
          setHasDraft(hasData)
        } else {
          setHasDraft(false)
        }
      } catch (error) {
        setHasDraft(false)
      }
    }

    checkDraft()
    
    // Check periodically for changes
    const interval = setInterval(checkDraft, 1000)
    
    // Listen for storage events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey) {
        checkDraft()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [storageKey])

  const handleDelete = async () => {
    try {
      // Clear localStorage FIRST (before resetting form to prevent persistence hook from saving)
      localStorage.removeItem(storageKey)
      
      // Clear it again to be absolutely sure
      localStorage.removeItem(storageKey)
      
      // Reset form state
      if (onReset) {
        onReset()
      }
      
      setHasDraft(false)
      setShowConfirm(false)
      
      // Call optional callback
      if (onDelete) {
        onDelete()
      }
      
      // Dispatch a custom event to notify other components (like status badges)
      window.dispatchEvent(new CustomEvent('localStorageChange', {
        detail: { key: storageKey, value: null }
      }))
      
      // Clear localStorage one more time after a tiny delay to catch any race conditions
      setTimeout(() => {
        localStorage.removeItem(storageKey)
        
        // Verify it's actually cleared
        const verifyCleared = localStorage.getItem(storageKey)
        if (verifyCleared) {
          // If still there, force clear it
          localStorage.removeItem(storageKey)
        }
      }, 50)
      
      showToast(`Borrador de ${checklistName} eliminado exitosamente`, 'success')
      
      // Get the area path
      const areaPath = STORAGE_KEY_TO_AREA_PATH[storageKey] || '/dashboard'
      
      // Use a hard redirect with window.location to ensure a fresh page load
      // This guarantees components will re-mount and check localStorage fresh
      setTimeout(() => {
        // Clear one final time before redirect
        localStorage.removeItem(storageKey)
        window.location.href = areaPath
      }, 500)
    } catch (error) {
      console.error('Error deleting draft:', error)
      showToast('Error al eliminar el borrador', 'error')
    }
  }

  if (!hasDraft) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
        title="Eliminar borrador incompleto"
      >
        <Trash2 className="h-4 w-4" />
        <span>Eliminar Borrador</span>
      </button>

      {showConfirm && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowConfirm(false)}
          />
          
          {/* Confirmation Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    ¿Eliminar borrador?
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Estás a punto de eliminar el borrador incompleto de <strong>{checklistName}</strong>. 
                    Esta acción no se puede deshacer y perderás todos los datos guardados.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

