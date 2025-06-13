export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      checklist_packing: {
        Row: {
          id: string
          fecha: string
          marca: string
          material: string
          sku: string
          jefe_linea: string
          operador_maquina: string
          orden_fabricacion: string
          pdf_url: string
          items: Json
        }
        Insert: {
          id?: string
          fecha: string
          marca: string
          material: string
          sku: string
          jefe_linea: string
          operador_maquina: string
          orden_fabricacion: string
          pdf_url: string
          items: Json
        }
        Update: {
          id?: string
          fecha?: string
          marca?: string
          material?: string
          sku?: string
          jefe_linea?: string
          operador_maquina?: string
          orden_fabricacion?: string
          pdf_url?: string
          items?: Json
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 