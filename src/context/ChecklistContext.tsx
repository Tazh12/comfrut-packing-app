'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Tipos
export interface ChecklistItem {
  id: number
  name: string
  status: 'cumple' | 'no_cumple' | 'no_aplica'
  comment?: string
  correctiveAction?: string
}

export interface PhotoUpload {
  file: File | null
  preview: string | null
}

export interface ChecklistPhotos {
  photo1: PhotoUpload
  photo2: PhotoUpload
  photo3: PhotoUpload
}

interface ChecklistContextType {
  formData: ChecklistItem[]
  setFormData: (data: ChecklistItem[]) => void
  photos: ChecklistPhotos
  setPhotos: (photos: ChecklistPhotos) => void
  lineManager: string
  setLineManager: (name: string) => void
  machineOperator: string
  setMachineOperator: (name: string) => void
  checklistDate: Date | null
  setChecklistDate: (date: Date | null) => void
  selectedBrand: string
  setSelectedBrand: (brand: string) => void
  selectedMaterial: string
  setSelectedMaterial: (material: string) => void
  selectedSku: string
  setSelectedSku: (sku: string) => void
  clearContext: () => void
}

const defaultPhotos: ChecklistPhotos = {
  photo1: { file: null, preview: null },
  photo2: { file: null, preview: null },
  photo3: { file: null, preview: null }
}

// Lista inicial de ítems del checklist
const initialChecklistItems: Omit<ChecklistItem, 'status' | 'comment' | 'correctiveAction'>[] = [
  { id: 1, name: 'Air pressure' },
  { id: 2, name: 'Multihead hopper position' },
  { id: 3, name: 'Upper capachos state' },
  { id: 4, name: 'Intermediate capachos state' },
  { id: 5, name: 'Lower capachos state' },
  { id: 6, name: 'Elevator ignition' },
  { id: 7, name: 'Multihead atoche sensors' },
  { id: 8, name: 'Videojet power' },
  { id: 9, name: 'Videojet message or label (Box)' },
  { id: 10, name: '% of ink and disolvent (Box)' },
  { id: 11, name: 'Videojet message or label (Bag)' },
  { id: 12, name: '% of ink and disolvent (Bag)' },
  { id: 13, name: 'Equipment ignition' },
  { id: 14, name: 'Bag feed clamp' },
  { id: 15, name: 'Suction and singularization of bags' },
  { id: 16, name: 'Conveyor clamp' },
  { id: 17, name: 'Bag encoder' },
  { id: 18, name: 'Initial bag opening' },
  { id: 19, name: 'Air pulse' },
  { id: 20, name: 'Bag opening' },
  { id: 21, name: 'Bag filling' },
  { id: 22, name: 'Sealing bar 1' },
  { id: 23, name: 'Sealing bar 2' },
  { id: 24, name: 'Heater on (T°)' },
  { id: 25, name: 'Bag unloading' }
]

const defaultFormData = initialChecklistItems.map(item => ({
  ...item,
  status: 'no_aplica' as const,
  comment: '',
  correctiveAction: ''
}))

const ChecklistContext = createContext<ChecklistContextType | undefined>(undefined)

export function ChecklistProvider({ children }: { children: ReactNode }) {
  // Estado para el formulario
  const [formData, setFormDataState] = useState<ChecklistItem[]>(defaultFormData)
  const [photos, setPhotosState] = useState<ChecklistPhotos>(defaultPhotos)
  const [lineManager, setLineManager] = useState('')
  const [machineOperator, setMachineOperator] = useState('')
  const [checklistDate, setChecklistDate] = useState<Date | null>(null)
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [selectedSku, setSelectedSku] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)

  // Cargar datos guardados solo en el cliente
  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized) {
      const savedFormData = localStorage.getItem('checklistFormData')
      const savedPhotos = localStorage.getItem('checklistPhotos')
      
      if (savedFormData) {
        setFormDataState(JSON.parse(savedFormData))
      }
      if (savedPhotos) {
        setPhotosState(JSON.parse(savedPhotos))
      }
      
      setIsInitialized(true)
    }
  }, [isInitialized])

  // Guardar datos en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialized) {
      localStorage.setItem('checklistFormData', JSON.stringify(formData))
    }
  }, [formData, isInitialized])

  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialized) {
      localStorage.setItem('checklistPhotos', JSON.stringify(photos))
    }
  }, [photos, isInitialized])

  // Función para actualizar el formData
  const setFormData = (data: ChecklistItem[]) => {
    setFormDataState(data)
  }

  // Función para actualizar las fotos
  const setPhotos = (newPhotos: ChecklistPhotos) => {
    setPhotosState(newPhotos)
  }

  // Función para limpiar el contexto
  const clearContext = () => {
    setFormDataState(defaultFormData)
    setPhotosState(defaultPhotos)
    setLineManager('')
    setMachineOperator('')
    setChecklistDate(null)
    setSelectedBrand('')
    setSelectedMaterial('')
    setSelectedSku('')
    if (typeof window !== 'undefined') {
      localStorage.removeItem('checklistFormData')
      localStorage.removeItem('checklistPhotos')
    }
  }

  return (
    <ChecklistContext.Provider 
      value={{ 
        formData, 
        setFormData, 
        photos, 
        setPhotos,
        lineManager,
        setLineManager,
        machineOperator,
        setMachineOperator,
        checklistDate,
        setChecklistDate,
        selectedBrand,
        setSelectedBrand,
        selectedMaterial,
        setSelectedMaterial,
        selectedSku,
        setSelectedSku,
        clearContext
      }}
    >
      {children}
    </ChecklistContext.Provider>
  )
}

export function useChecklist() {
  const context = useContext(ChecklistContext)
  if (context === undefined) {
    throw new Error('useChecklist must be used within a ChecklistProvider')
  }
  return context
} 