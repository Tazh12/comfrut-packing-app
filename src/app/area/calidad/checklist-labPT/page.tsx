'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/button'

interface Field {
  label: string
  key: string
  type: 'number' | 'text'
}

export default function ChecklistLabPTPage() {
  const { showToast } = useToast()
  const [order, setOrder] = useState('')
  const [sku, setSku] = useState('')
  const [producto, setProducto] = useState('')
  const [ensayos, setEnsayos] = useState<Record<string, boolean> | null>(null)
  const [dynamicFields, setDynamicFields] = useState<Field[]>([])
  const [results, setResults] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const FIELD_MAP: Field[] = [
    { label: 'APC', key: 'apc', type: 'text' },
    { label: 'Coliformes', key: 'coliformes', type: 'text' },
    { label: 'Yeast', key: 'yeast', type: 'text' },
    { label: 'Mold', key: 'mold', type: 'text' },
    { label: 'E. coli', key: 'e_coli', type: 'text' },
    { label: 'Salmonella', key: 'salmonella', type: 'text' },
    { label: 'Listeria', key: 'listeria', type: 'text' },
    { label: 'S. aureus', key: 's_aureus', type: 'text' },
  ]

  const handleBuscar = async () => {
    if (!order.trim()) {
      showToast('Ingrese una orden de fabricación', 'error')
      return
    }
    setLoading(true)
    let record: { sku: string; producto: string } | null = null

    // Intentar en monoproducto
    const { data: monoData, error: monoError } = await supabase
      .from('checklist_calidad_monoproducto')
      .select('sku, producto')
      .eq('orden_fabricacion', order.trim())
      .limit(1)
      .single()
    if (monoError) {
      showToast('Error al buscar la orden', 'error')
      setLoading(false)
      return
    }
    if (monoData) {
      record = monoData
    } else {
      // Intentar en mix
      const { data: mixData, error: mixError } = await supabase
        .from('checklist_calidad_mix')
        .select('sku, producto')
        .eq('orden_fabricacion', order.trim())
        .maybeSingle()
      if (mixError) {
        showToast('Error al buscar la orden', 'error')
        setLoading(false)
        return
      }
      if (mixData) {
        record = mixData
      }
    }
    if (!record) {
      showToast('Orden no encontrada', 'error')
      setLoading(false)
      return
    }

    setSku(record.sku)
    setProducto(record.producto)

    // Obtener ensayos para SKU
    const { data: ensayoData, error: ensayoError } = await supabase
      .from('ensayos_microbiologicos_por_sku')
      .select('*')
      .eq('sku', record.sku)
      .maybeSingle()
    if (ensayoError) {
      showToast('Error al obtener ensayos microbiológicos', 'error')
      setLoading(false)
      return
    }
    if (!ensayoData) {
      showToast('No se encontraron ensayos microbiológicos para este SKU', 'error')
      setLoading(false)
      return
    }

    setEnsayos(ensayoData)
    // Filtrar campos dinámicos requeridos
    const fields = FIELD_MAP.filter(f => (ensayoData as any)[f.key] === true)
    setDynamicFields(fields)
    // Inicializar resultados
    const initialResults: Record<string, string> = {}
    fields.forEach(f => {
      initialResults[f.key] = ''
    })
    setResults(initialResults)
    setLoading(false)
  }

  const handleGuardar = async () => {
    if (dynamicFields.length === 0) {
      showToast('No hay resultados para guardar', 'error')
      return
    }
    // Validar resultados completos
    for (const field of dynamicFields) {
      const value = results[field.key]?.trim()
      if (!value) {
        showToast(`Ingrese un valor para ${field.label}`, 'error')
        return
      }
    }
    setLoading(true)
    const insertObj: Record<string, any> = {
      orden_fabricacion: order.trim(),
      sku,
      producto,
      fecha: new Date().toISOString(),
      ...results,
    }
    const { error } = await supabase
      .from('resultados_microbiologicos_labpt')
      .insert([insertObj])
    if (error) {
      console.error('Error al guardar resultados:', error)
      showToast('Error al guardar resultados', 'error')
      setLoading(false)
      return
    }
    showToast('Resultados guardados con éxito', 'success', 3000)
    // Limpiar formulario
    setOrder('')
    setSku('')
    setProducto('')
    setEnsayos(null)
    setDynamicFields([])
    setResults({})
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-4">
        <Link href="/area/calidad" className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">Ensayos Microbiológicos Lab PT</h1>

      <div className="flex flex-col sm:flex-row sm:space-x-2 mb-4">
        <input
          type="text"
          placeholder="Orden de fabricación"
          value={order}
          onChange={e => setOrder(e.target.value)}
          className="border border-gray-300 p-2 rounded flex-grow mb-2 sm:mb-0"
        />
        <Button onClick={handleBuscar} disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </Button>
      </div>

      {sku && producto && (
        <div className="mb-4 bg-gray-50 p-4 rounded">
          <p><strong>SKU:</strong> {sku}</p>
          <p><strong>Producto:</strong> {producto}</p>
        </div>
      )}

      {dynamicFields.length > 0 && (
        <div className="space-y-4">
          {dynamicFields.map(field => (
            <div key={field.key} className="flex flex-col sm:flex-row items-center sm:space-x-4">
              <label className="w-full sm:w-40 font-medium">{field.label}</label>
              {['salmonella', 'listeria'].includes(field.key) ? (
                <select
                  value={results[field.key]}
                  onChange={e => setResults(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="border border-gray-300 p-2 rounded flex-grow"
                >
                  <option value="">Seleccione</option>
                  <option value="Ausencia">Ausencia</option>
                  <option value="Presencia">Presencia</option>
                </select>
              ) : (
                <input
                  type={field.type}
                  value={results[field.key]}
                  onChange={e => setResults(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="border border-gray-300 p-2 rounded flex-grow"
                />
              )}
            </div>
          ))}
          <Button onClick={handleGuardar} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar resultados'}
          </Button>
        </div>
      )}
    </div>
  )
} 