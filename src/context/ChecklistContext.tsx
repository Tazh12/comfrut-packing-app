'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

// Tipos
export interface ChecklistItem {
  id: number
  nombre: string
  estado: string
  status?: string
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

export const initialPhotos: ChecklistPhotos = {
  photo1: { file: null, preview: '' },
  photo2: { file: null, preview: '' },
  photo3: { file: null, preview: '' }
}

export interface ChecklistRecord {
  id: string
  fecha: string
  jefe_linea: string
  operador_maquina: string
  marca: string
  material: string
  sku: string
  orden_fabricacion: string
  items: ChecklistItem[]
  pdf_url: string
}

export interface ChecklistContextType {
  formData: ChecklistItem[]
  setFormData: (data: ChecklistItem[]) => void
  photos: ChecklistPhotos
  setPhotos: (photos: ChecklistPhotos) => void
  lineManager: string
  setLineManager: (name: string) => void
  machineOperator: string
  setMachineOperator: (name: string) => void
  checklistDate: string | null
  setChecklistDate: (date: string | null) => void
  selectedBrand: string
  setSelectedBrand: (brand: string) => void
  selectedMaterial: string
  setSelectedMaterial: (material: string) => void
  selectedSku: string
  setSelectedSku: (sku: string) => void
  ordenFabricacion: string
  setOrdenFabricacion: (orden: string) => void
  clearContext: () => void
  records: ChecklistRecord[]
  loading: boolean
  error: string | null
  loadRecords: () => Promise<void>
  saveRecord: (record: ChecklistRecord) => Promise<void>
}

// Lista inicial de ítems del checklist
const initialChecklistItems: Omit<ChecklistItem, 'status' | 'comment' | 'correctiveAction'>[] = [
  { id: 1, nombre: 'Air pressure', estado: 'pendiente' },
  { id: 2, nombre: 'Multihead hopper position', estado: 'pendiente' },
  { id: 3, nombre: 'Upper capachos state', estado: 'pendiente' },
  { id: 4, nombre: 'Intermediate capachos state', estado: 'pendiente' },
  { id: 5, nombre: 'Lower capachos state', estado: 'pendiente' },
  { id: 6, nombre: 'Elevator ignition', estado: 'pendiente' },
  { id: 7, nombre: 'Multihead atoche sensors', estado: 'pendiente' },
  { id: 8, nombre: 'Videojet power', estado: 'pendiente' }
]

const defaultFormData = initialChecklistItems.map(item => ({
  ...item,
  status: 'no_aplica' as const,
  comment: '',
  correctiveAction: ''
}))

const ChecklistContext = createContext<ChecklistContextType | null>(null)

export function ChecklistProvider({ children }: { children: ReactNode }) {
  const [formData, setFormDataState] = useState<ChecklistItem[]>(defaultFormData)
  const [photos, setPhotosState] = useState<ChecklistPhotos>(initialPhotos)
  const [lineManager, setLineManager] = useState('')
  const [machineOperator, setMachineOperator] = useState('')
  const [checklistDate, setChecklistDate] = useState<string | null>(null)
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [selectedSku, setSelectedSku] = useState('')
  const [ordenFabricacion, setOrdenFabricacion] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [records, setRecords] = useState<ChecklistRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setPhotosState(initialPhotos)
    setLineManager('')
    setMachineOperator('')
    setChecklistDate(null)
    setSelectedBrand('')
    setSelectedMaterial('')
    setSelectedSku('')
    setOrdenFabricacion('')
    if (typeof window !== 'undefined') {
      localStorage.removeItem('checklistFormData')
      localStorage.removeItem('checklistPhotos')
    }
  }

  const loadRecords = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('checklist_packing')
        .select('*')
        .order('fecha', { ascending: false })

      if (error) throw error

      setRecords(data as ChecklistRecord[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading records')
    } finally {
      setLoading(false)
    }
  }

  const saveRecord = async (record: ChecklistRecord) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase
        .from('checklist_packing')
        .insert([record])

      if (error) throw error

      await loadRecords()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving record')
    } finally {
      setLoading(false)
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
        ordenFabricacion,
        setOrdenFabricacion,
        clearContext,
        records,
        loading,
        error,
        loadRecords,
        saveRecord
      }}
    >
      {children}
    </ChecklistContext.Provider>
  )
}

export function useChecklist() {
  const context = useContext(ChecklistContext)
  if (!context) {
    throw new Error('useChecklist must be used within a ChecklistProvider')
  }
  return context
} 