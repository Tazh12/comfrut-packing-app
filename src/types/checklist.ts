export interface ChecklistItem {
  id: number
  nombre: string
  estado: 'pendiente' | 'cumple' | 'no_cumple'
  status?: 'cumple' | 'no_cumple' | 'no_aplica'
  comment?: string
  correctiveAction?: string
}

export interface ProductEntry {
  id: string
  brand: string
  material: string
  sku: string
  estado: 'pendiente' | 'completado'
}

export interface ProductsData {
  [key: string]: {
    brand: string
    material: string
    sku: string
  }
}

export interface ChecklistRegistro {
  id: string
  fecha: string
  orden_fabricacion: string
  marca: string
  material: string
  sku: string
  jefe_linea: string
  operador_maquina: string
  items: ChecklistItem[]
  pdf_url?: string
}

export interface ChecklistContextType {
  items: ChecklistItem[]
  setItems: (items: ChecklistItem[]) => void
  updateItem: (id: number, updates: Partial<ChecklistItem>) => void
  resetItems: () => void
} 