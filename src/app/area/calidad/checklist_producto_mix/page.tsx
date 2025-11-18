'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { ArrowLeft, Plus, Pencil } from 'lucide-react'
import { useChecklistPersistence } from '@/lib/hooks/useChecklistPersistence'
import { DeleteDraftButton } from '@/components/DeleteDraftButton'

export default function ChecklistMixPage() {
  const { showToast } = useToast()
  // Refs para campos del encabezado
  const headerRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({})
  // Refs para inputs de cada pallet
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  // Campos de encabezado
  const [orderNumber, setOrderNumber] = useState('')
  const [date, setDate] = useState('')
  const [lineManager, setLineManager] = useState('')
  const [qualityControl, setQualityControl] = useState('')
  // Listas para selects
  const [brands, setBrands] = useState<string[]>([])
  const [materials, setMaterials] = useState<string[]>([])
  // Valores seleccionados
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [selectedSku, setSelectedSku] = useState('')
  // Carga de datos para pallets
  const [loading, setLoading] = useState<boolean>(false)
  // Estado para pallets dinámicos
  const [pallets, setPallets] = useState<any[]>([])
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Reset form function
  const resetForm = () => {
    setOrderNumber('')
    setDate('')
    setLineManager('')
    setQualityControl('')
    setSelectedBrand('')
    setSelectedMaterial('')
    setSelectedSku('')
    setPallets([])
    setIsSubmitted(false)
  }

  // Persistence hook
  const { clearDraft } = useChecklistPersistence(
    'checklist-producto-mix-draft',
    { 
      orderNumber, 
      date, 
      lineManager, 
      qualityControl, 
      selectedBrand, 
      selectedMaterial, 
      selectedSku,
      pallets: pallets.map(p => ({ 
        id: p.id, 
        collapsed: p.collapsed, 
        values: p.values,
        fieldsByFruit: p.fieldsByFruit,
        commonFields: p.commonFields
      }))
    },
    isSubmitted,
    (data) => {
      if (data.orderNumber) setOrderNumber(data.orderNumber)
      if (data.date) setDate(data.date)
      if (data.lineManager) setLineManager(data.lineManager)
      if (data.qualityControl) setQualityControl(data.qualityControl)
      if (data.selectedBrand) setSelectedBrand(data.selectedBrand)
      if (data.selectedMaterial) setSelectedMaterial(data.selectedMaterial)
      if (data.selectedSku) setSelectedSku(data.selectedSku)
      if (data.pallets && Array.isArray(data.pallets)) {
        setPallets(data.pallets)
      }
    }
  )

  // Utilitario: obtiene campos comunes entre varios arreglos de nombres
  const getCommonFields = (arrays: string[][]): string[] => {
    if (arrays.length === 0) return []
    return arrays.reduce((common, arr) => common.filter(item => arr.includes(item)))
  }

  // Función para agregar un nuevo pallet con campos por fruta y campos comunes
  const handleAddPallet = async () => {
    if (!selectedSku) return
    setLoading(true)
    try {
      // 1. Obtener composición de frutas para este SKU
      const { data: compData, error: compError } = await supabase
        .from('composicion_productos')
        .select('agrupacion, composicion')
        .eq('sku', selectedSku)
      if (compError) {
        throw new Error(`Error fetching composition for SKU ${selectedSku}: ${compError.message}`)
      }
      if (!compData || compData.length === 0) {
        throw new Error(`No composition data found for SKU ${selectedSku}`)
      }
      // Orden descendente por composicion
      const sorted = compData.sort((a, b) => b.composicion - a.composicion)
      // 2. Para cada fruta, obtener campos de su agrupacion
      const fieldsByFruit: Record<string, { campo: string; unidad: string }[]> = {}
      for (const item of sorted) {
        const { agrupacion } = item
        const { data: camposData, error: camposError } = await supabase
          .from('campos_por_agrupacion')
          .select('campo, unidad')
          .eq('agrupacion', agrupacion)
        if (camposError) {
          throw new Error(`Error fetching fields for agrupacion ${agrupacion}: ${camposError.message}`)
        }
        if (!camposData || camposData.length === 0) {
          throw new Error(`No fields found for agrupacion ${agrupacion}`)
        }
        fieldsByFruit[agrupacion] = camposData
      }
      // 3. Separar campos comunes predefinidos
      const predefinedCommon = [
        'Peso Bolsa (gr)',
        'Temperatura Pulpa (F)',
        'Temperatura Sala (F)',
        'Código Caja',
        'Código Barra Pallet',
        'Observaciones'
      ]
      // Extraer commonFields de agrupaciones
      const commonFields = predefinedCommon.reduce((acc, name) => {
        for (const arr of Object.values(fieldsByFruit)) {
          const found = arr.find((f: any) => f.campo === name)
          if (found) {
            acc.push(found)
            break
          }
        }
        return acc
      }, [] as { campo: string; unidad: string }[])
      // 4. Remover estos campos de cada agrupacion
      Object.keys(fieldsByFruit).forEach(key => {
        fieldsByFruit[key] = fieldsByFruit[key].filter((f: any) => !predefinedCommon.includes(f.campo))
      })
      // 5. Crear nuevo pallet
      const newPallet = {
        id: Date.now(),
        collapsed: false,
        fieldsByFruit,
        commonFields,
        values: {}
      }
      setPallets(prev => [...prev, newPallet])
    } catch (error: any) {
      const msg = error?.message || JSON.stringify(error)
      console.error(`Error al agregar pallet: ${msg}`, error)
      showToast(`Error al agregar pallet: ${msg}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Cargar clientes (brands)
  useEffect(() => {
    supabase.from('productos').select('brand').then(({ data, error }) => {
      if (!error && data) {
        setBrands(Array.from(new Set(data.map(p => p.brand))))
      }
    })
  }, [])

  // Cargar materiales al cambiar cliente
  useEffect(() => {
    if (selectedBrand) {
      supabase.from('productos').select('material').eq('brand', selectedBrand)
        .then(({ data, error }) => {
          if (!error && data) {
            setMaterials(Array.from(new Set(data.map(p => p.material))))
          }
        })
    } else {
      setMaterials([])
      setSelectedMaterial('')
    }
  }, [selectedBrand])

  // Asignar SKU al cambiar cliente y producto
  useEffect(() => {
    if (selectedBrand && selectedMaterial) {
      supabase.from('productos').select('sku').eq('brand', selectedBrand).eq('material', selectedMaterial)
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) setSelectedSku(data[0].sku)
          else setSelectedSku('')
        })
    } else {
      setSelectedSku('')
    }
  }, [selectedBrand, selectedMaterial])

  const handleFieldChange = (palletId: any, fieldName: string, value: string) => {
    setPallets(prev =>
      prev.map(pallet =>
        pallet.id === palletId
          ? { ...pallet, values: { ...pallet.values, [fieldName]: value } }
          : pallet
      )
    )
  }
  // Función para finalizar un pallet individual
  const finalizePallet = (id: number) => {
    // Limpiar bordes de error previos
    Object.keys(inputRefs.current)
      .filter(key => key.startsWith(`${id}-`))
      .forEach(key => inputRefs.current[key]?.classList.remove('border-red-500'))
    const pallet = pallets.find(p => p.id === id)
    if (!pallet) return
    // Validar campos por agrupacion
    for (const arr of (Object.values(pallet.fieldsByFruit) as any[])) {
      for (const f of arr) {
        const key = `${id}-${f.campo}`
        if (!pallet.values[f.campo]?.trim()) {
          const el = inputRefs.current[key]
          if (el) {
            el.classList.add('border-red-500')
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            el.focus()
          }
          showToast('Completa todos los campos antes de finalizar el pallet', 'error')
          return
        }
      }
    }
    // Validar campos comunes
    for (const f of (pallet.commonFields as any[])) {
      const key = `${id}-${f.campo}`
      if (!pallet.values[f.campo]?.trim()) {
        const el = inputRefs.current[key]
        if (el) {
          el.classList.add('border-red-500')
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.focus()
        }
        showToast('Completa todos los campos antes de finalizar el pallet', 'error')
        return
      }
    }
    // Colapsar pallet
    setPallets(prev => prev.map(p => (p.id === id ? { ...p, collapsed: true } : p)))
  }
  // Función para expandir (editar) un pallet colapsado
  const expandPallet = (id: number) => {
    Object.keys(inputRefs.current)
      .filter(key => key.startsWith(`${id}-`))
      .forEach(key => inputRefs.current[key]?.classList.remove('border-red-500'))
    setPallets(prev => prev.map(p => (p.id === id ? { ...p, collapsed: false } : p)))
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-4 flex justify-between items-start">
        <Link href="/area/calidad" className="inline-flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver
        </Link>
        <DeleteDraftButton 
          storageKey="checklist-producto-mix-draft"
          checklistName="Checklist Mix Producto"
          onReset={resetForm}
        />
      </div>
      <h1 className="text-3xl font-bold mb-2 text-center">
        Quality control of freezing fruit process (Mix) /<br/>
        Control de calidad del proceso de congelado de frutas (mix)
      </h1>
      <p className="text-center text-sm text-gray-500 mb-6">CF/PC-PG-ASC-006-RG001</p>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Orden de fabricación */}
        <div>
          <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Orden de fabricación
          </label>
          <input
            id="orderNumber"
            ref={el => { headerRefs.current['orderNumber'] = el }}
            type="text"
            value={orderNumber}
            onChange={e => setOrderNumber(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* Fecha */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
            Fecha
          </label>
          <input
            id="date"
            ref={el => { headerRefs.current['date'] = el }}
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* Jefe de línea */}
        <div>
          <label htmlFor="lineManager" className="block text-sm font-medium text-gray-700 mb-1">
            Jefe de línea
          </label>
          <input
            id="lineManager"
            ref={el => { headerRefs.current['lineManager'] = el }}
            type="text"
            value={lineManager}
            onChange={e => setLineManager(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* Control de calidad */}
        <div>
          <label htmlFor="qualityControl" className="block text-sm font-medium text-gray-700 mb-1">
            Control de calidad
          </label>
          <input
            id="qualityControl"
            ref={el => { headerRefs.current['qualityControl'] = el }}
            type="text"
            value={qualityControl}
            onChange={e => setQualityControl(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* Cliente (Brand) */}
        <div>
          <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
            Cliente
          </label>
          <select
            id="brand"
            ref={el => { headerRefs.current['selectedBrand'] = el }}
            value={selectedBrand}
            onChange={e => setSelectedBrand(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Selecciona un cliente</option>
            {brands.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Producto (Material) */}
        <div>
          <label htmlFor="material" className="block text-sm font-medium text-gray-700 mb-1">
            Producto
          </label>
          <select
            id="material"
            value={selectedMaterial}
            onChange={e => setSelectedMaterial(e.target.value)}
            disabled={!selectedBrand}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Selecciona un producto</option>
            {materials.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* SKU */}
        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
            SKU
          </label>
          <input
            id="sku"
            type="text"
            value={selectedSku}
            readOnly
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-md"
          />
        </div>
        {/* Botón Agregar Pallet */}
        <div className="sm:col-span-2">
          <button
            onClick={handleAddPallet}
            className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Pallet
          </button>
        </div>
      </div> {/* Cierra grid de encabezado */}
      {/* Render pallets agregados */}
      {pallets.length > 0 && (
        <div className="mt-6">
          {pallets.map((pallet, index) => (
            <div key={pallet.id} className="border p-4 mb-4 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold">Pallet #{index + 1}</h2>
                {!pallet.collapsed ? (
                  <button
                    onClick={() => finalizePallet(pallet.id)}
                    className="inline-flex items-center px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Finalizar Pallet
                  </button>
                ) : (
                  <button
                    onClick={() => expandPallet(pallet.id)}
                    className="inline-flex items-center text-gray-600 hover:text-gray-900"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                )}
              </div>
              {!pallet.collapsed && (
                <>
                  {/* Campos por agrupacion */}
                  {Object.entries(pallet.fieldsByFruit).map(([agrupacion, fields]) => {
                    const fieldsArr = fields as any[]
                    return (
                      <div key={agrupacion} className="mb-4">
                        <h3 className="font-medium mb-2">{agrupacion}</h3>
                        <div className="space-y-2">
                          {fieldsArr.map((f: any, i: number) => (
                            <div key={i}>
                              <label className="block text-sm font-medium text-gray-700">
                                {f.campo}{f.unidad ? ` (${f.unidad})` : ''}
                              </label>
                              <input
                                ref={el => { inputRefs.current[`${pallet.id}-${f.campo}`] = el }}
                                type="text"
                                value={pallet.values[f.campo] || ''}
                                onChange={e => handleFieldChange(pallet.id, f.campo, e.target.value)}
                                className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {/* Campos comunes */}
                  {pallet.commonFields && (pallet.commonFields as any[]).length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">Campos comunes</h3>
                      <div className="space-y-2">
                        {(pallet.commonFields as any[]).map((f: any, i: number) => (
                          <div key={i}>
                            <label className="block text-sm font-medium text-gray-700">
                              {f.campo}{f.unidad ? ` (${f.unidad})` : ''}
                            </label>
                            <input
                              ref={el => { inputRefs.current[`${pallet.id}-${f.campo}`] = el }}
                              type="text"
                              value={pallet.values[f.campo] || ''}
                              onChange={e => handleFieldChange(pallet.id, f.campo, e.target.value)}
                              className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}