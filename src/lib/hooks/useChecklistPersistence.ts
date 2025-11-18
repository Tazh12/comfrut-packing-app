import { useEffect, useRef } from 'react'

/**
 * Custom hook for persisting checklist form data to localStorage
 * 
 * @param storageKey - Unique key for localStorage (e.g., 'checklist-envtemp-draft')
 * @param formData - Object containing all form state to persist
 * @param isSubmitted - Boolean indicating if the form has been submitted
 * @param onLoad - Callback function to restore form data from localStorage
 * @param shouldSave - Optional function to determine if data should be saved (default: !isSubmitted)
 */
export function useChecklistPersistence<T extends Record<string, any>>(
  storageKey: string,
  formData: T,
  isSubmitted: boolean,
  onLoad: (data: Partial<T>) => void,
  shouldSave?: () => boolean
) {
  const isInitialMount = useRef(true)
  const hasLoaded = useRef(false)

  // Load from localStorage on mount
  useEffect(() => {
    if (hasLoaded.current) return

    try {
      const savedData = localStorage.getItem(storageKey)
      if (savedData) {
        const parsed = JSON.parse(savedData)
        onLoad(parsed)
      }
    } catch (error) {
      console.error(`Error loading saved data for ${storageKey}:`, error)
    } finally {
      hasLoaded.current = true
      isInitialMount.current = false
    }
  }, [storageKey, onLoad])

  // Helper function to check if formData has meaningful content
  const hasMeaningfulData = (data: T): boolean => {
    if (!data || typeof data !== 'object') return false
    
    return Object.values(data).some(value => {
      if (value === null || value === undefined) return false
      if (typeof value === 'string' && value.trim() !== '') return true
      if (typeof value === 'number' && value !== 0) return true
      if (Array.isArray(value) && value.length > 0) return true
      if (typeof value === 'object' && Object.keys(value).length > 0) {
        // Recursively check nested objects
        return hasMeaningfulData(value as T)
      }
      return false
    })
  }

  // Save to localStorage whenever form data changes (but not on initial mount or if submitted)
  useEffect(() => {
    if (isInitialMount.current || hasLoaded.current === false) {
      return
    }

    const shouldPersist = shouldSave ? shouldSave() : !isSubmitted

    // Check if localStorage was manually cleared (indicates deletion)
    const currentStorage = localStorage.getItem(storageKey)
    if (!currentStorage && !hasMeaningfulData(formData)) {
      // localStorage is already cleared and form is empty - don't save
      return
    }

    // Only save if there's meaningful data (prevent saving empty forms after reset)
    if (shouldPersist && hasMeaningfulData(formData)) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(formData))
      } catch (error) {
        console.error(`Error saving data for ${storageKey}:`, error)
      }
    } else if (shouldPersist && !hasMeaningfulData(formData)) {
      // If form is empty and we're not submitted, clear localStorage immediately
      try {
        localStorage.removeItem(storageKey)
        // Clear it again to be sure
        localStorage.removeItem(storageKey)
      } catch (error) {
        console.error(`Error clearing empty draft for ${storageKey}:`, error)
      }
    }
  }, [storageKey, formData, isSubmitted, shouldSave])

  // Clear localStorage after successful submission
  const clearDraft = () => {
    try {
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.error(`Error clearing draft for ${storageKey}:`, error)
    }
  }

  return { clearDraft }
}

