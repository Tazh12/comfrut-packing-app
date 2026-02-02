'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { ArrowLeft, Plus, Pencil, ChevronDown, ChevronUp, AlertCircle, Trash2 } from 'lucide-react'
import { useChecklistPersistence } from '@/lib/hooks/useChecklistPersistence'
import { DeleteDraftButton } from '@/components/DeleteDraftButton'
import { formatDateMMMDDYYYY, formatDateForFilename } from '@/lib/date-utils'
import { pdf } from '@react-pdf/renderer'
import { ChecklistPDFProductoMixDocument } from '@/components/ChecklistPDFProductoMix'
import { uploadChecklistPDF, insertChecklistProductoMix } from '@/lib/supabase/checklistProductoMix'

// Signature Canvas Component
interface SignatureCanvasProps {
  value: string
  onChange: (dataUrl: string) => void
  onClear: () => void
  label: string
}

function SignatureCanvas({ value, onChange, onClear, label }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const isInitializedRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const justSavedRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const initializeCanvas = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()

      const currentValue = value

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)

      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (currentValue) {
        const img = new Image()
        img.onload = () => {
          ctx.clearRect(0, 0, rect.width, rect.height)
          ctx.drawImage(img, 0, 0, rect.width, rect.height)
        }
        img.src = currentValue
      }
    }

    if (!isInitializedRef.current) {
      initializeCanvas()
      isInitializedRef.current = true
    }

    const handleResize = () => {
      initializeCanvas()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [value])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    setIsDrawing(true)
    lastPointRef.current = { x, y }
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    if (lastPointRef.current) {
      ctx.beginPath()
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
      ctx.lineTo(x, y)
      ctx.stroke()
    }

    lastPointRef.current = { x, y }
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    lastPointRef.current = null

    const canvas = canvasRef.current
    if (!canvas) return

    if (!justSavedRef.current) {
      justSavedRef.current = true
      const dataUrl = canvas.toDataURL('image/png')
      onChange(dataUrl)
      setTimeout(() => {
        justSavedRef.current = false
      }, 100)
    }
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    onChange('')
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="border-2 border-gray-300 rounded-md bg-white relative">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-32 cursor-crosshair touch-none"
          style={{ display: 'block' }}
        />
      </div>
      <button
        type="button"
        onClick={handleClear}
        className="text-sm text-red-600 hover:text-red-800"
      >
        Clear Signature
      </button>
    </div>
  )
}

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
  const [monitorSignature, setMonitorSignature] = useState('')
  // Listas para selects
  const [brands, setBrands] = useState<string[]>([])
  const [materials, setMaterials] = useState<string[]>([])
  // Valores seleccionados
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [selectedSku, setSelectedSku] = useState('')
  const [materialsLoaded, setMaterialsLoaded] = useState(false)
  // Carga de datos para pallets
  const [loading, setLoading] = useState<boolean>(false)
  // Estado para pallets dinámicos
  const [pallets, setPallets] = useState<any[]>([])
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  // Reset form function
  const resetForm = () => {
    setOrderNumber('')
    setDate('')
    setLineManager('')
    setQualityControl('')
    setMonitorSignature('')
    setSelectedBrand('')
    setSelectedMaterial('')
    setSelectedSku('')
    setPallets([])
    setIsSubmitted(false)
    setIsSubmitting(false)
    setPdfUrl(null)
  }

  // Persistence hook
  const { clearDraft } = useChecklistPersistence(
    'checklist-producto-mix-draft',
    { 
      orderNumber, 
      date, 
      lineManager, 
      qualityControl, 
      monitorSignature,
      selectedBrand, 
      selectedMaterial, 
      selectedSku,
      pallets: pallets.map(p => ({ 
        id: p.id, 
        collapsed: p.collapsed, 
        values: p.values,
        fieldsByFruit: p.fieldsByFruit,
        commonFields: p.commonFields,
        expectedCompositions: p.expectedCompositions
      }))
    },
    isSubmitted,
    (data) => {
      if (data.orderNumber) setOrderNumber(data.orderNumber)
      if (data.date) setDate(data.date)
      if (data.lineManager) setLineManager(data.lineManager)
      if (data.qualityControl) setQualityControl(data.qualityControl)
      if (data.monitorSignature) setMonitorSignature(data.monitorSignature)
      // Restore brand first, then material after materials are loaded
      if (data.selectedBrand) {
        setSelectedBrand(data.selectedBrand)
        // Store material to restore after materials are loaded
        const materialToRestore = data.selectedMaterial
        if (materialToRestore && typeof materialToRestore === 'string') {
          setTimeout(() => {
            setSelectedMaterial(materialToRestore)
          }, 100)
        }
      } else if (data.selectedMaterial && typeof data.selectedMaterial === 'string') {
        // If no brand but material exists, restore material directly
        setSelectedMaterial(data.selectedMaterial)
      }
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
      // 3. Definir campos comunes que deben estar siempre presentes
      const alwaysCommonFields = [
        { campo: 'Hora', unidad: '' },
        { campo: 'pH', unidad: '' },
        { campo: 'Brix', unidad: '' }
      ]

      // Campos que pueden venir de las agrupaciones pero deben estar en comunes
      const commonFieldNames = [
        'Peso Bolsa (gr)', 'Peso Bolsa',
        'Temperatura Pulpa (F)', 'Temperatura Pulpa', 'Temp de la pulpa', 'Temperatura Pulpa (C)',
        'Código Caja', 'Codigo caja',
        'Código Barra Pallet', 'Codigo Pallet',
        'Observaciones'
      ]

      // Variaciones de pH y Brix que deben ser removidas de frutas
      const phVariations = ['pH', 'PH', 'PH (DEG)', 'pH (DEG)']
      const brixVariations = ['Brix', 'Brix (Bx)', 'Brix (BRX)', 'Brix (Bx)', 'Brix']
      
      // Lista negra de campos a excluir completamente
      const blacklistFields = [
        'Temperatura Sala (F)', 
        'Temperatura Sala'
      ]

      // Extraer commonFields de agrupaciones
      const commonFields: { campo: string; unidad: string }[] = []
      
      // Primero agregar campos que siempre deben estar
      alwaysCommonFields.forEach(field => {
        if (!commonFields.some(f => f.campo.toLowerCase() === field.campo.toLowerCase())) {
          commonFields.push(field)
        }
      })

      // Buscar otros campos comunes en las agrupaciones
      commonFieldNames.forEach(name => {
        for (const arr of Object.values(fieldsByFruit)) {
          const match = arr.find((f: any) => f.campo === name)
          if (match && !commonFields.some(f => f.campo === match.campo)) {
            commonFields.push(match)
            break
          }
        }
      })

      // Buscar pH y Brix en las agrupaciones para obtener sus unidades si existen
      for (const arr of Object.values(fieldsByFruit)) {
        const phMatch = arr.find((f: any) => phVariations.some(v => f.campo === v || f.campo.toLowerCase().includes('ph')))
        if (phMatch) {
          const existingPh = commonFields.find(f => f.campo.toLowerCase() === 'ph')
          if (existingPh && phMatch.unidad) {
            existingPh.unidad = phMatch.unidad
          }
        }
        
        const brixMatch = arr.find((f: any) => brixVariations.some(v => f.campo === v || f.campo.toLowerCase().includes('brix')))
        if (brixMatch) {
          const existingBrix = commonFields.find(f => f.campo.toLowerCase() === 'brix')
          if (existingBrix && brixMatch.unidad) {
            existingBrix.unidad = brixMatch.unidad
          }
        }
      }

      // Asegurar que Observaciones esté presente
      if (!commonFields.some(f => f.campo === 'Observaciones')) {
        commonFields.push({ campo: 'Observaciones', unidad: '' })
      }

      // Ordenar campos comunes en el orden deseado: Hora, Peso Bolsa, Temp Pulpa, pH, Brix, Codigo Caja, Codigo Pallet, Observaciones
      const getFieldOrder = (campo: string): number => {
        const campoLower = campo.toLowerCase()
        if (campoLower.includes('hora')) return 1
        if (campoLower.includes('peso') && campoLower.includes('bolsa')) return 2
        if (campoLower.includes('temperatura') && campoLower.includes('pulpa')) return 3
        if (campoLower.includes('temp') && campoLower.includes('pulpa')) return 3
        if (campoLower === 'ph' || campoLower.includes('ph')) return 4
        if (campoLower.includes('brix')) return 5
        if (campoLower.includes('código caja') || campoLower.includes('codigo caja')) return 6
        if (campoLower.includes('código barra') || campoLower.includes('codigo pallet') || campoLower.includes('código barra pallet')) return 7
        if (campoLower.includes('observaciones')) return 8
        return 99 // Otros campos al final
      }
      commonFields.sort((a, b) => getFieldOrder(a.campo) - getFieldOrder(b.campo))

      // 4. Remover campos comunes, pH, Brix y blacklist de cada agrupacion
      Object.keys(fieldsByFruit).forEach(key => {
        fieldsByFruit[key] = fieldsByFruit[key].filter((f: any) => {
          const campoLower = f.campo.toLowerCase()
          // Excluir campos comunes
          if (commonFieldNames.includes(f.campo)) return false
          // Excluir blacklist
          if (blacklistFields.includes(f.campo)) return false
          // Excluir cualquier variación de pH
          if (phVariations.some(v => f.campo === v || campoLower.includes('ph'))) return false
          // Excluir cualquier variación de Brix
          if (brixVariations.some(v => f.campo === v || campoLower.includes('brix'))) return false
          return true
        })
      })
      // 5. Crear mapa de composiciones esperadas por fruta
      const expectedCompositions: Record<string, number> = {}
      sorted.forEach(item => {
        expectedCompositions[item.agrupacion] = item.composicion
      })

      // 6. Crear nuevo pallet
      // Get current time in HH:MM format for hour field
      const now = new Date()
      const currentHour = now.getHours().toString().padStart(2, '0')
      const currentMinute = now.getMinutes().toString().padStart(2, '0')
      const presetHour = `${currentHour}:${currentMinute}`
      
      const newPallet = {
        id: Date.now(),
        collapsed: false,
        fieldsByFruit,
        commonFields,
        expectedCompositions, // Guardar composiciones esperadas
        values: {
          'Hora': presetHour
        }
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
            const materialsList = Array.from(new Set(data.map(p => p.material)))
            setMaterials(materialsList)
            setMaterialsLoaded(true)
            
            // Restore selectedMaterial from localStorage if it exists and is valid
            const savedData = localStorage.getItem('checklist-producto-mix-draft')
            if (savedData) {
              try {
                const parsed = JSON.parse(savedData)
                if (parsed.selectedMaterial && typeof parsed.selectedMaterial === 'string' && materialsList.includes(parsed.selectedMaterial)) {
                  setSelectedMaterial(parsed.selectedMaterial)
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        })
    } else {
      setMaterials([])
      setSelectedMaterial('')
      setMaterialsLoaded(false)
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

  // Función para calcular la desviación total de frutas vs Peso Bolsa
  const calculateWeightDeviation = (pallet: any): { totalFruitWeight: number; deviation: number; pesoBolsa: number | null } => {
    // Buscar Peso Bolsa
    let pesoBolsa: number | null = null
    const pesoBolsaKeys = ['Peso Bolsa (gr)', 'Peso Bolsa']
    for (const key of pesoBolsaKeys) {
      const value = pallet.values[key]
      if (value) {
        const parsed = parseFloat(value.toString().replace(/[^\d.]/g, ''))
        if (!isNaN(parsed) && parsed > 0) {
          pesoBolsa = parsed
          break
        }
      }
    }

    // Sumar todos los Peso Fruta
    let totalFruitWeight = 0
    for (const agrupacion of Object.keys(pallet.fieldsByFruit)) {
      const pesoFrutaKey = `Peso Fruta ${agrupacion}`
      const pesoFrutaValue = pallet.values[pesoFrutaKey]
      if (pesoFrutaValue) {
        const parsed = parseFloat(pesoFrutaValue.toString().replace(/[^\d.]/g, ''))
        if (!isNaN(parsed)) {
          totalFruitWeight += parsed
        }
      }
    }

    const deviation = pesoBolsa !== null ? totalFruitWeight - pesoBolsa : 0
    return { totalFruitWeight, deviation, pesoBolsa }
  }

  // Función para calcular el porcentaje de una fruta
  const calculateFruitPercentage = (pallet: any, fruitName: string): { percentage: number | null; isValid: boolean | null } => {
    // Buscar Peso Bolsa en los valores (puede tener diferentes nombres)
    let pesoBolsa: number | null = null
    const pesoBolsaKeys = ['Peso Bolsa (gr)', 'Peso Bolsa']
    for (const key of pesoBolsaKeys) {
      const value = pallet.values[key]
      if (value) {
        const parsed = parseFloat(value.toString().replace(/[^\d.]/g, ''))
        if (!isNaN(parsed) && parsed > 0) {
          pesoBolsa = parsed
          break
        }
      }
    }

    const pesoFrutaKey = `Peso Fruta ${fruitName}`
    const pesoFrutaValue = pallet.values[pesoFrutaKey]

    if (!pesoBolsa || !pesoFrutaValue) {
      return { percentage: null, isValid: null }
    }

    const pesoFrutaNum = parseFloat(pesoFrutaValue.toString().replace(/[^\d.]/g, ''))

    if (isNaN(pesoFrutaNum) || pesoFrutaNum === 0) {
      return { percentage: null, isValid: null }
    }

    const percentage = (pesoFrutaNum / pesoBolsa) * 100
    const expectedPercentageDecimal = pallet.expectedCompositions?.[fruitName] || null

    if (expectedPercentageDecimal === null) {
      return { percentage, isValid: null }
    }

    // Convert decimal to percentage (0.35 -> 35)
    const expectedPercentage = expectedPercentageDecimal * 100
    const isValid = Math.abs(percentage - expectedPercentage) <= 5
    return { percentage, isValid }
  }
  // Función para finalizar un pallet individual
  const finalizePallet = (id: number) => {
    // Limpiar bordes de error previos
    Object.keys(inputRefs.current)
      .filter(key => key.startsWith(`${id}-`))
      .forEach(key => inputRefs.current[key]?.classList.remove('border-red-500'))
    const pallet = pallets.find(p => p.id === id)
    if (!pallet) return
    
    // Validar Peso Fruta para cada fruta
    for (const agrupacion of Object.keys(pallet.fieldsByFruit)) {
      const pesoFrutaKey = `Peso Fruta ${agrupacion}`
      if (!pallet.values[pesoFrutaKey]?.trim()) {
        const el = inputRefs.current[`${id}-${pesoFrutaKey}`]
        if (el) {
          el.classList.add('border-red-500')
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.focus()
        }
        showToast('Completa el Peso Fruta para todas las frutas antes de finalizar el pallet', 'error')
        return
      }
    }
    
    // Validar campos por agrupacion
    for (const [agrupacion, arr] of Object.entries(pallet.fieldsByFruit)) {
      for (const f of (arr as any[])) {
        const fieldKey = `${agrupacion}-${f.campo}`
        const refKey = `${id}-${fieldKey}`
        if (!pallet.values[fieldKey]?.trim()) {
          const el = inputRefs.current[refKey]
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
    // Validar campos comunes (excepto Observaciones que es opcional)
    for (const f of (pallet.commonFields as any[])) {
      // Skip Observaciones - it's optional
      if (f.campo === 'Observaciones') continue
      
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

  const deletePallet = (id: number) => {
    setPallets(prev => prev.filter(p => p.id !== id))
  }

  const togglePalletCollapse = (id: number) => {
    setPallets(prev => prev.map(p => (p.id === id ? { ...p, collapsed: !p.collapsed } : p)))
  }

  // Helper function to format field label (convert F to C for temperature)
  const formatFieldLabel = (campo: string, unidad: string): string => {
    let displayCampo = campo
    let displayUnidad = unidad
    
    // Replace Fahrenheit labels with Celsius for temperature fields
    if (campo.includes('Temperatura Pulpa') || campo.includes('Temp de la pulpa')) {
      // Remove (F) from field name
      displayCampo = campo.replace('(F)', '').replace('Temperatura Pulpa (F)', 'Temperatura Pulpa').trim()
      
      // Handle unit conversion
      if (unidad && (unidad.includes('°F') || unidad.includes('F'))) {
        displayUnidad = unidad.replace('°F', '°C').replace('F', 'C').replace('(F)', '(C)')
      } else if (!unidad || unidad === '') {
        // If no unit specified but field has (F), add °C
        displayUnidad = '°C'
      }
      
      // Return formatted label
      return displayUnidad ? `${displayCampo} (${displayUnidad})` : displayCampo
    }
    
    // For other fields, return as normal
    return displayUnidad ? `${displayCampo} (${displayUnidad})` : displayCampo
  }

  const isPalletComplete = (pallet: any) => {
    // Check Peso Fruta for each fruit
    for (const agrupacion of Object.keys(pallet.fieldsByFruit)) {
      const pesoFrutaKey = `Peso Fruta ${agrupacion}`
      if (!pallet.values[pesoFrutaKey]?.trim()) return false
    }
    // Check fruit fields
    for (const [agrupacion, arr] of Object.entries(pallet.fieldsByFruit)) {
      for (const f of (arr as any[])) {
        const fieldKey = `${agrupacion}-${f.campo}`
        if (!pallet.values[fieldKey]?.trim()) return false
      }
    }
    // Check common fields (excepto Observaciones que es opcional)
    for (const f of (pallet.commonFields as any[])) {
      // Skip Observaciones - it's optional
      if (f.campo === 'Observaciones') continue
      
      if (!pallet.values[f.campo]?.trim()) return false
    }
    return true
  }

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate required fields and scroll to first missing field
      if (!orderNumber.trim()) {
        showToast('Please fill in Orden de fabricación', 'error')
        const el = headerRefs.current['orderNumber']
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.focus()
        }
        setIsSubmitting(false)
        return
      }
      if (!date.trim()) {
        showToast('Please fill in Fecha', 'error')
        const el = headerRefs.current['date']
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.focus()
        }
        setIsSubmitting(false)
        return
      }
      if (!lineManager.trim()) {
        showToast('Please fill in Jefe de línea', 'error')
        const el = headerRefs.current['lineManager']
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.focus()
        }
        setIsSubmitting(false)
        return
      }
      if (!qualityControl.trim()) {
        showToast('Please fill in Monitor de calidad', 'error')
        const el = headerRefs.current['qualityControl']
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.focus()
        }
        setIsSubmitting(false)
        return
      }
      if (!monitorSignature.trim()) {
        showToast('Please provide Firma monitor de calidad', 'error')
        setIsSubmitting(false)
        return
      }
      if (!selectedBrand || !selectedMaterial || !selectedSku) {
        showToast('Please select Cliente, Producto, and SKU', 'error')
        const el = !selectedBrand ? headerRefs.current['selectedBrand'] : 
                   !selectedMaterial ? document.getElementById('material') : null
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.focus()
        }
        setIsSubmitting(false)
        return
      }
      if (pallets.length === 0) {
        showToast('Please add at least one pallet', 'error')
        setIsSubmitting(false)
        return
      }

      // Validate all pallets are complete and scroll to first missing field
      for (const pallet of pallets) {
        // Check Peso Fruta for each fruit
        for (const agrupacion of Object.keys(pallet.fieldsByFruit)) {
          const pesoFrutaKey = `Peso Fruta ${agrupacion}`
          if (!pallet.values[pesoFrutaKey]?.trim()) {
            showToast('Please complete all fields for all pallets before submitting', 'error')
            const el = inputRefs.current[`${pallet.id}-${pesoFrutaKey}`]
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' })
              el.focus()
            }
            setIsSubmitting(false)
            return
          }
        }
        
        // Check fruit fields
        for (const [agrupacion, arr] of Object.entries(pallet.fieldsByFruit)) {
          for (const f of (arr as any[])) {
            const fieldKey = `${agrupacion}-${f.campo}`
            if (!pallet.values[fieldKey]?.trim()) {
              showToast('Please complete all fields for all pallets before submitting', 'error')
              const el = inputRefs.current[`${pallet.id}-${fieldKey}`]
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                el.focus()
              }
              setIsSubmitting(false)
              return
            }
          }
        }
        
        // Check common fields (excepto Observaciones que es opcional)
        for (const f of (pallet.commonFields as any[])) {
          // Skip Observaciones - it's optional
          if (f.campo === 'Observaciones') continue
          
          if (!pallet.values[f.campo]?.trim()) {
            showToast('Please complete all fields for all pallets before submitting', 'error')
            const el = inputRefs.current[`${pallet.id}-${f.campo}`]
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' })
              el.focus()
            }
            setIsSubmitting(false)
            return
          }
        }
      }

      // Prepare form data for PDF
      const formData = {
        pallets: pallets.map(p => ({
          id: p.id,
          fieldsByFruit: p.fieldsByFruit,
          commonFields: p.commonFields,
          expectedCompositions: p.expectedCompositions,
          values: p.values
        })),
        metadata: {
          date,
          ordenFabricacion: orderNumber,
          lineManager,
          controlQuality: qualityControl,
          monitorSignature: monitorSignature,
          cliente: selectedBrand,
          producto: selectedMaterial,
          sku: selectedSku
        }
      }

      // Generate PDF
      showToast('Generating PDF...', 'info')
      const pdfBlob = await pdf(
        <ChecklistPDFProductoMixDocument 
          pallets={formData.pallets} 
          metadata={formData.metadata} 
        />
      ).toBlob()

      // Create filename
      const dateForFilename = formatDateForFilename(date)
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const seconds = now.getSeconds().toString().padStart(2, '0')
      const timeStr = `${hours}${minutes}${seconds}`
      const filename = `${dateForFilename}-${timeStr}-Mix-Product.pdf`

      // Upload PDF to Supabase Storage
      showToast('Uploading PDF to storage...', 'info')
      const uploadedPdfUrl = await uploadChecklistPDF(pdfBlob, filename)

      // Prepare data for database
      const dbData = {
        date_string: formatDateMMMDDYYYY(date),
        orden_fabricacion: orderNumber,
        jefe_linea: lineManager,
        control_calidad: qualityControl,
        firma_monitor_calidad: monitorSignature,
        cliente: selectedBrand,
        producto: selectedMaterial,
        sku: selectedSku,
        pallets: pallets.map(p => ({
          id: p.id,
          collapsed: p.collapsed,
          fieldsByFruit: p.fieldsByFruit,
          commonFields: p.commonFields,
          expectedCompositions: p.expectedCompositions,
          values: p.values
        })),
        pdf_url: uploadedPdfUrl
      }

      // Save to Supabase database
      showToast('Saving to database...', 'info')
      await insertChecklistProductoMix(dbData)

      // Set PDF URL for viewing
      setPdfUrl(uploadedPdfUrl)
      setIsSubmitted(true)

      // Clear localStorage after successful submission
      clearDraft()

      showToast('Checklist submitted successfully!', 'success')
    } catch (error) {
      console.error('Error submitting checklist:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      showToast(`Error submitting checklist: ${errorMessage}`, 'error')
      alert(`Error submitting checklist: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
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

      {!isSubmitted && (
      <form onSubmit={handleSubmit} className="space-y-8">
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

        {/* Monitor de calidad */}
        <div>
          <label htmlFor="qualityControl" className="block text-sm font-medium text-gray-700 mb-1">
            Monitor de calidad
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

        {/* Firma monitor de calidad */}
        <div className="col-span-1 sm:col-span-2">
          <SignatureCanvas
            value={monitorSignature}
            onChange={setMonitorSignature}
            onClear={() => setMonitorSignature('')}
            label="Firma monitor de calidad"
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
            type="button"
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
        <div className="mt-6 space-y-4">
          {pallets.map((pallet, index) => (
            <div key={pallet.id} className={`border rounded-md shadow-sm transition-all duration-200 ${pallet.collapsed ? 'p-4 bg-gray-50' : 'p-6 bg-white'}`}>
              
              {/* Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => togglePalletCollapse(pallet.id)}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    {pallet.collapsed ? <ChevronDown className="h-5 w-5 text-gray-500" /> : <ChevronUp className="h-5 w-5 text-gray-500" />}
                  </button>
                  <h2 className="text-lg font-bold text-gray-800">Pallet #{index + 1}</h2>
                  
                  {pallet.collapsed && !isPalletComplete(pallet) && (
                    <div className="flex items-center text-amber-600 text-sm font-medium bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Faltan datos
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                   {!pallet.collapsed ? (
                      <button
                        type="button"
                        onClick={() => deletePallet(pallet.id)}
                        className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                        title="Eliminar pallet"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                   ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => deletePallet(pallet.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Eliminar pallet"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => expandPallet(pallet.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                      </div>
                   )}
                </div>
              </div>

              {/* Content */}
              {!pallet.collapsed && (
                <div className="mt-6 animate-in slide-in-from-top-2 duration-200">
                  
                  {/* Campos Comunes - First */}
                  {pallet.commonFields && (pallet.commonFields as any[]).length > 0 && (
                    <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Campos Comunes</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {(pallet.commonFields as any[])
                          .filter((f: any) => !f.campo.includes('Temperatura Sala') && f.campo !== 'Temperatura Sala (F)')
                          .map((f: any, i: number) => {
                            const isCodigoPallet = f.campo.includes('Codigo Pallet') || f.campo.includes('Código Barra Pallet') || f.campo.includes('Código Pallet')
                            const { deviation, pesoBolsa, totalFruitWeight } = calculateWeightDeviation(pallet)
                            const showDeviation = isCodigoPallet && pesoBolsa !== null
                            
                            return (
                              <div key={i} className={
                                f.campo === 'Observaciones' 
                                  ? 'col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4' 
                                  : showDeviation 
                                    ? 'col-span-1 sm:col-span-2 md:col-span-2 lg:col-span-2' 
                                    : ''
                              }>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                  {formatFieldLabel(f.campo, f.unidad || '')}
                                </label>
                                {f.campo === 'Observaciones' ? (
                                    <textarea
                                      ref={el => { inputRefs.current[`${pallet.id}-${f.campo}`] = el as any }}
                                      value={pallet.values[f.campo] || ''}
                                      onChange={e => handleFieldChange(pallet.id, f.campo, e.target.value)}
                                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
                                    />
                                ) : (
                                    <div className={showDeviation ? 'flex gap-3 items-start' : ''}>
                                      <div className={showDeviation ? 'flex-1' : 'w-full'}>
                                        <input
                                          ref={el => { inputRefs.current[`${pallet.id}-${f.campo}`] = el }}
                                          type={f.campo.toLowerCase() === 'hora' ? 'time' : 'text'}
                                          value={pallet.values[f.campo] || ''}
                                          onChange={e => handleFieldChange(pallet.id, f.campo, e.target.value)}
                                          className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                      </div>
                                      {showDeviation && (
                                        <div className="flex-1 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                          <div className="text-xs text-gray-600 space-y-1">
                                            <div className="flex justify-between">
                                              <span>Peso bolsa:</span>
                                              <span className="font-medium">{pesoBolsa!.toFixed(1)} gr</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span>Suma frutas:</span>
                                              <span className="font-medium">{totalFruitWeight.toFixed(1)} gr</span>
                                            </div>
                                            <div className="flex justify-between pt-1 border-t border-blue-200">
                                              <span className="font-semibold">Desviación:</span>
                                              <span className={`font-bold ${deviation === 0 ? 'text-gray-700' : deviation > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {deviation > 0 ? '+' : ''}{deviation.toFixed(1)} gr
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )}

                  {/* Frutas - Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Object.entries(pallet.fieldsByFruit).map(([agrupacion, fields]) => {
                      const fieldsArr = fields as any[]
                      const pesoFrutaKey = `Peso Fruta ${agrupacion}`
                      const { percentage, isValid } = calculateFruitPercentage(pallet, agrupacion)
                      const expectedPercentage = pallet.expectedCompositions?.[agrupacion] || null
                      
                      return (
                        <div key={agrupacion} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                          <h3 className="font-bold text-gray-800 mb-3 pb-2 border-b border-gray-100 flex items-center justify-between">
                            {agrupacion}
                            {expectedPercentage !== null && (
                              <span className="text-xs font-normal text-gray-500">
                                Esperado: {(expectedPercentage * 100).toFixed(1)}%
                              </span>
                            )}
                          </h3>
                          <div className="space-y-3">
                            {/* Peso Fruta field - First */}
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Peso Fruta (gr)
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  ref={el => { inputRefs.current[`${pallet.id}-${pesoFrutaKey}`] = el }}
                                  type="number"
                                  step="0.1"
                                  value={pallet.values[pesoFrutaKey] || ''}
                                  onChange={e => handleFieldChange(pallet.id, pesoFrutaKey, e.target.value)}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="0"
                                />
                                {percentage !== null && (
                                  <span 
                                    className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                                      isValid === true 
                                        ? 'bg-green-100 text-green-700 border border-green-300' 
                                        : isValid === false
                                        ? 'bg-red-100 text-red-700 border border-red-300'
                                        : 'bg-gray-100 text-gray-700 border border-gray-300'
                                    }`}
                                  >
                                    {percentage.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Other fields */}
                            {fieldsArr.map((f: any, i: number) => {
                              const fieldKey = `${agrupacion}-${f.campo}`
                              return (
                                <div key={i}>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">
                                    {formatFieldLabel(f.campo, f.unidad || '')}
                                  </label>
                                  <input
                                    ref={el => { inputRefs.current[`${pallet.id}-${fieldKey}`] = el }}
                                    type="text"
                                    value={pallet.values[fieldKey] || ''}
                                    onChange={e => handleFieldChange(pallet.id, fieldKey, e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Finalizar Pallet button at bottom */}
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => finalizePallet(pallet.id)}
                      className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm transition-colors"
                    >
                      Finalizar Pallet
                    </button>
                  </div>

                </div>
              )}
            </div>
          ))}
        </div>
      )}

        {/* Submit Button */}
        <div className="flex justify-end mt-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex flex-col items-center"
          >
            {isSubmitting ? (
              'Submitting...'
            ) : (
              <>
                <span>Submit Checklist</span>
                <span className="text-xs opacity-90">Enviar Checklist</span>
              </>
            )}
          </button>
        </div>
      </form>
      )}

      {/* Success Message */}
      {isSubmitted && pdfUrl && (
        <div className="mt-8 bg-green-50 border-2 border-green-200 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-green-900">✓ Checklist Submitted Successfully!</h2>
          <p className="text-gray-700 mb-4">Your checklist has been saved and the PDF has been generated.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-center flex flex-col items-center"
            >
              <span>View PDF</span>
              <span className="text-xs opacity-90">Ver PDF</span>
            </a>
            <a
              href={pdfUrl}
              download
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-center flex flex-col items-center"
            >
              <span>Download PDF</span>
              <span className="text-xs opacity-90">Descargar PDF</span>
            </a>
            <Link
              href="/area/calidad"
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-center flex flex-col items-center"
            >
              <span>Back to Quality</span>
              <span className="text-xs opacity-90">Volver a Calidad</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}