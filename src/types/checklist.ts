export interface ChecklistItem {
  id: number
  name: string
  estado?: 'cumple' | 'no_cumple'
}

export interface ChecklistRecord {
  id: string
  fecha: string
  marca: string
  material: string
  sku: string
  jefe_linea: string
  operador_maquina: string
  orden_fabricacion: string
  pdf_url: string
  items: ChecklistItem[]
} 