'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDateMMMDDYYYY, formatDateForFilename as formatDateForFilenameUtil } from '@/lib/date-utils'
import { pdf } from '@react-pdf/renderer'
import { ChecklistRawMaterialQualityPDFDocument } from '@/components/ChecklistPDFRawMaterialQuality'
import { uploadChecklistPDF, insertChecklistRawMaterialQuality } from '@/lib/supabase/checklistRawMaterialQuality'
import { useToast } from '@/context/ToastContext'
import { useChecklistPersistence } from '@/lib/hooks/useChecklistPersistence'
import { DeleteDraftButton } from '@/components/DeleteDraftButton'

// Signature Canvas Component (reused from footbath control)
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
    if (!canvas || isInitializedRef.current) return

    const initializeCanvas = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)

      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (value) {
        const img = new Image()
        img.onload = () => {
          ctx.clearRect(0, 0, rect.width, rect.height)
          ctx.drawImage(img, 0, 0, rect.width, rect.height)
        }
        img.src = value
      }
    }

    initializeCanvas()
    isInitializedRef.current = true

    const handleResize = () => {
      if (!isDrawing) {
        initializeCanvas()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!isInitializedRef.current || isDrawing || !value || justSavedRef.current) {
      justSavedRef.current = false
      return
    }
    
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const img = new Image()
    img.onload = () => {
      if (!isDrawing) {
        ctx.clearRect(0, 0, rect.width, rect.height)
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
      }
    }
    img.src = value
  }, [value, isDrawing])

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      }
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setIsDrawing(true)
    
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const coords = getCoordinates(e)
    if (!coords) return

    lastPointRef.current = coords
    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    
    e.preventDefault()

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const coords = getCoordinates(e)
    if (!coords) return

    if (lastPointRef.current) {
      ctx.beginPath()
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
      ctx.lineTo(coords.x, coords.y)
      ctx.stroke()
    }

    lastPointRef.current = coords
  }

  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current
      if (canvas) {
        justSavedRef.current = true
        const dataUrl = canvas.toDataURL('image/png')
        onChange(dataUrl)
      }
    }
    setIsDrawing(false)
    lastPointRef.current = null
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width, rect.height)
    lastPointRef.current = null
    onClear()
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="border-2 border-gray-300 rounded-md relative">
        <canvas
          ref={canvasRef}
          className="w-full h-32 cursor-crosshair touch-none"
          style={{ touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
        />
      </div>
      <button
        type="button"
        onClick={handleClear}
        className="text-sm text-red-600 hover:text-red-800 underline"
      >
        Clear Signature / Limpiar Firma
      </button>
    </div>
  )
}

// Fruit Column Definition Interface
interface FruitColumn {
  name: string
  nameEs: string
  unit: '%' | 'units' | ''
  required: boolean
}

// Fruit Definitions
const FRUIT_DEFINITIONS: Record<string, FruitColumn[]> = {
  'Piña / Pineapple': [
    { name: 'Seeds %', nameEs: 'Semillas %', unit: '%', required: true },
    { name: 'Mold damage %', nameEs: 'Daño por moho %', unit: '%', required: true },
    { name: 'Crunchy %', nameEs: 'Crujiente %', unit: '%', required: true },
    { name: 'Color variation %', nameEs: 'Variación de color %', unit: '%', required: true },
    { name: 'Insect damage %', nameEs: 'Daño por insectos %', unit: '%', required: true },
    { name: 'Small pieces %', nameEs: 'Piezas pequeñas %', unit: '%', required: true },
    { name: 'Skin %', nameEs: 'Piel %', unit: '%', required: true },
    { name: 'Spots %', nameEs: 'Manchas %', unit: '%', required: true },
    { name: 'Foreign matter %', nameEs: 'Materia extraña %', unit: '%', required: true },
    { name: 'Oxidation %', nameEs: 'Oxidación %', unit: '%', required: true },
    { name: 'Blockade %', nameEs: 'Bloqueo %', unit: '%', required: true },
    { name: 'Vegetal residue %', nameEs: 'Residuo vegetal %', unit: '%', required: true },
    { name: 'Organoleptic', nameEs: 'Organoléptico', unit: '', required: true }
  ],
  'Fresa / Strawberries': [
    { name: 'Overmaturity %', nameEs: 'Sobremadurez %', unit: '%', required: true },
    { name: 'Color variation %', nameEs: 'Variación de color %', unit: '%', required: true },
    { name: 'Stems %', nameEs: 'Tallos %', unit: '%', required: true },
    { name: 'Insect damage %', nameEs: 'Daño por insectos %', unit: '%', required: true },
    { name: 'Green tips %', nameEs: 'Puntas verdes %', unit: '%', required: true },
    { name: 'Deformed %', nameEs: 'Deformado %', unit: '%', required: true },
    { name: 'Mechanical damage %', nameEs: 'Daño mecánico %', unit: '%', required: true },
    { name: 'Foreign matter %', nameEs: 'Materia extraña %', unit: '%', required: true },
    { name: 'Broken/crumble %', nameEs: 'Roto/desmenuzado %', unit: '%', required: true },
    { name: 'Mold damage %', nameEs: 'Daño por moho %', unit: '%', required: true },
    { name: 'Vegetal residue %', nameEs: 'Residuo vegetal %', unit: '%', required: true },
    { name: 'Organoleptic', nameEs: 'Organoléptico', unit: '', required: true }
  ],
  'Mora / Blackberries': [
    { name: 'Stems %', nameEs: 'Tallos %', unit: '%', required: true },
    { name: 'Overmaturity %', nameEs: 'Sobremadurez %', unit: '%', required: true },
    { name: 'Color variation %', nameEs: 'Variación de color %', unit: '%', required: true },
    { name: 'Albinism %', nameEs: 'Albinismo %', unit: '%', required: true },
    { name: 'Insect damage %', nameEs: 'Daño por insectos %', unit: '%', required: true },
    { name: 'Foreign matter %', nameEs: 'Materia extraña %', unit: '%', required: true },
    { name: 'Mold damage %', nameEs: 'Daño por moho %', unit: '%', required: true },
    { name: 'Vegetal residue %', nameEs: 'Residuo vegetal %', unit: '%', required: true },
    { name: 'Larvae units', nameEs: 'Unidades de larvas', unit: 'units', required: true },
    { name: 'Organoleptic', nameEs: 'Organoléptico', unit: '', required: true }
  ],
  'Mango': [
    { name: 'Crunchy %', nameEs: 'Crujiente %', unit: '%', required: true },
    { name: 'Seeds %', nameEs: 'Semillas %', unit: '%', required: true },
    { name: 'Color variation %', nameEs: 'Variación de color %', unit: '%', required: true },
    { name: 'Skin %', nameEs: 'Piel %', unit: '%', required: true },
    { name: 'Insect damage %', nameEs: 'Daño por insectos %', unit: '%', required: true },
    { name: 'Mold damage %', nameEs: 'Daño por moho %', unit: '%', required: true },
    { name: 'Small pieces %', nameEs: 'Piezas pequeñas %', unit: '%', required: true },
    { name: 'Blockade %', nameEs: 'Bloqueo %', unit: '%', required: true },
    { name: 'Foreign matter %', nameEs: 'Materia extraña %', unit: '%', required: true },
    { name: 'Spots %', nameEs: 'Manchas %', unit: '%', required: true },
    { name: 'Organoleptic', nameEs: 'Organoléptico', unit: '', required: true }
  ],
  'Cerezas / Cherries': [
    { name: 'Pits (units)', nameEs: 'Huesos (unidades)', unit: 'units', required: true },
    { name: 'Peduncles %', nameEs: 'Pedúnculos %', unit: '%', required: true },
    { name: 'Broken fruit %', nameEs: 'Fruta rota %', unit: '%', required: true },
    { name: 'Color variation %', nameEs: 'Variación de color %', unit: '%', required: true },
    { name: 'Mold damage %', nameEs: 'Daño por moho %', unit: '%', required: true },
    { name: 'Oxidation %', nameEs: 'Oxidación %', unit: '%', required: true },
    { name: 'Blockade %', nameEs: 'Bloqueo %', unit: '%', required: true },
    { name: 'Foreign matter %', nameEs: 'Materia extraña %', unit: '%', required: true },
    { name: 'Overmature/crushed %', nameEs: 'Sobremaduro/aplastado %', unit: '%', required: true },
    { name: 'Low size %', nameEs: 'Tamaño pequeño %', unit: '%', required: true },
    { name: 'Organoleptic', nameEs: 'Organoléptico', unit: '', required: true }
  ],
  'Durazno / Peach': [
    { name: 'Seeds %', nameEs: 'Semillas %', unit: '%', required: true },
    { name: 'Crunchy %', nameEs: 'Crujiente %', unit: '%', required: true },
    { name: 'Insect damage %', nameEs: 'Daño por insectos %', unit: '%', required: true },
    { name: 'Color variation %', nameEs: 'Variación de color %', unit: '%', required: true },
    { name: 'Small pieces %', nameEs: 'Piezas pequeñas %', unit: '%', required: true },
    { name: 'Skin %', nameEs: 'Piel %', unit: '%', required: true },
    { name: 'Spots %', nameEs: 'Manchas %', unit: '%', required: true },
    { name: 'Foreign matter %', nameEs: 'Materia extraña %', unit: '%', required: true },
    { name: 'Mold damage %', nameEs: 'Daño por moho %', unit: '%', required: true },
    { name: 'Blockade %', nameEs: 'Bloqueo %', unit: '%', required: true },
    { name: 'Oxidation %', nameEs: 'Oxidación %', unit: '%', required: true },
    { name: 'Organoleptic', nameEs: 'Organoléptico', unit: '', required: true }
  ],
  'Arándanos / Blueberries': [
    { name: 'Crushed %', nameEs: 'Aplastado %', unit: '%', required: true },
    { name: 'Overmaturity %', nameEs: 'Sobremadurez %', unit: '%', required: true },
    { name: 'Color variation %', nameEs: 'Variación de color %', unit: '%', required: true },
    { name: 'Russet %', nameEs: 'Russet %', unit: '%', required: true },
    { name: 'Insect damage %', nameEs: 'Daño por insectos %', unit: '%', required: true },
    { name: 'Stems %', nameEs: 'Tallos %', unit: '%', required: true },
    { name: 'Mold damage %', nameEs: 'Daño por moho %', unit: '%', required: true },
    { name: 'Foreign matter %', nameEs: 'Materia extraña %', unit: '%', required: true },
    { name: 'Vegetal residue %', nameEs: 'Residuo vegetal %', unit: '%', required: true },
    { name: 'Organoleptic', nameEs: 'Organoléptico', unit: '', required: true }
  ],
  'Uva / Grapes': [
    { name: 'Color variation %', nameEs: 'Variación de color %', unit: '%', required: true },
    { name: 'Mold damage %', nameEs: 'Daño por moho %', unit: '%', required: true },
    { name: 'Optimal color %', nameEs: 'Color óptimo %', unit: '%', required: true },
    { name: 'Stems %', nameEs: 'Tallos %', unit: '%', required: true },
    { name: 'Caramelized %', nameEs: 'Caramelizado %', unit: '%', required: true },
    { name: 'Insect/sun damage %', nameEs: 'Daño por insectos/sol %', unit: '%', required: true },
    { name: 'Mechanical damage %', nameEs: 'Daño mecánico %', unit: '%', required: true },
    { name: 'Overmaturity & crushed %', nameEs: 'Sobremadurez y aplastado %', unit: '%', required: true },
    { name: 'Foreign matter (count)', nameEs: 'Materia extraña (conteo)', unit: 'units', required: true },
    { name: 'Vegetal matter %', nameEs: 'Materia vegetal %', unit: '%', required: true },
    { name: 'Minor fissures w/o pulp exposure', nameEs: 'Fisuras menores sin exposición de pulpa', unit: '', required: true }
  ],
  'Papaya': [
    { name: 'Overmaturity %', nameEs: 'Sobremadurez %', unit: '%', required: true },
    { name: 'Crushed %', nameEs: 'Aplastado %', unit: '%', required: true },
    { name: 'Color variation %', nameEs: 'Variación de color %', unit: '%', required: true },
    { name: 'Skin %', nameEs: 'Piel %', unit: '%', required: true },
    { name: 'Insect damage %', nameEs: 'Daño por insectos %', unit: '%', required: true },
    { name: 'Mold damage %', nameEs: 'Daño por moho %', unit: '%', required: true },
    { name: 'Small pieces %', nameEs: 'Piezas pequeñas %', unit: '%', required: true },
    { name: 'Blockade %', nameEs: 'Bloqueo %', unit: '%', required: true },
    { name: 'Foreign matter %', nameEs: 'Materia extraña %', unit: '%', required: true },
    { name: 'Spots %', nameEs: 'Manchas %', unit: '%', required: true },
    { name: 'Organoleptic', nameEs: 'Organoléptico', unit: '', required: true }
  ],
  'Banana': [
    { name: 'Crunchy %', nameEs: 'Crujiente %', unit: '%', required: true },
    { name: 'Insect damage %', nameEs: 'Daño por insectos %', unit: '%', required: true },
    { name: 'Color variation %', nameEs: 'Variación de color %', unit: '%', required: true },
    { name: 'Cold damage (hongo/cold damage)', nameEs: 'Daño por frío (hongo/daño por frío)', unit: '%', required: true },
    { name: 'Skin %', nameEs: 'Piel %', unit: '%', required: true },
    { name: 'Small pieces %', nameEs: 'Piezas pequeñas %', unit: '%', required: true },
    { name: 'Blockade %', nameEs: 'Bloqueo %', unit: '%', required: true },
    { name: 'Foreign matter %', nameEs: 'Materia extraña %', unit: '%', required: true },
    { name: 'Spots %', nameEs: 'Manchas %', unit: '%', required: true },
    { name: 'Organoleptic', nameEs: 'Organoléptico', unit: '', required: true }
  ],
  'Kiwi': [
    { name: 'Overmaturity %', nameEs: 'Sobremadurez %', unit: '%', required: true },
    { name: 'Mold damage %', nameEs: 'Daño por hongo %', unit: '%', required: true },
    { name: 'Thickness >10mm %', nameEs: 'Espesor >10mm %', unit: '%', required: true },
    { name: 'Small pieces %', nameEs: 'Pedazos pequeños %', unit: '%', required: true },
    { name: 'Skin %', nameEs: 'Piel %', unit: '%', required: true },
    { name: 'Insect damage %', nameEs: 'Daño por insecto %', unit: '%', required: true },
    { name: 'Foreign matter %', nameEs: 'Materia extraña %', unit: '%', required: true },
    { name: 'Oxidation %', nameEs: 'Oxidación %', unit: '%', required: true },
    { name: 'Blockade %', nameEs: 'Bloqueo %', unit: '%', required: true },
    { name: 'Vegetal residue %', nameEs: 'Residuo vegetal %', unit: '%', required: true },
    { name: 'Organoleptic', nameEs: 'Organoléptico', unit: '', required: true }
  ]
}

// Box Sample Interface
interface BoxSample {
  id: number
  boxNumber: string
  weightBox: string
  weightSample: string
  values: Record<string, string>
}

export default function ChecklistRawMaterialQualityPage() {
  const { showToast } = useToast()
  
  // Get current date/time
  const getCurrentDateTime = (): string => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Section 1: Basic Info
  const [supplier, setSupplier] = useState('')
  const [fruit, setFruit] = useState('')
  const [sku, setSku] = useState('')
  const [formatPresentation, setFormatPresentation] = useState('')
  const [originCountry, setOriginCountry] = useState('')
  const [receptionDateTime, setReceptionDateTime] = useState(getCurrentDateTime())
  const [containerNumber, setContainerNumber] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [lotNumber, setLotNumber] = useState('')
  const [monitorName, setMonitorName] = useState('')
  const [monitorSignature, setMonitorSignature] = useState('')
  const [processingPlant, setProcessingPlant] = useState('')
  const [inspectionDateTime, setInspectionDateTime] = useState(getCurrentDateTime())
  const [coldStorageTemp, setColdStorageTemp] = useState('')
  const [ttr, setTtr] = useState('')
  const [microPesticideSample, setMicroPesticideSample] = useState('')

  // Section 2: Box Samples
  const [boxSamples, setBoxSamples] = useState<BoxSample[]>([])

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [expandedBoxId, setExpandedBoxId] = useState<number | null>(null)

  // Format date as MMM-DD-YYYY
  const formatDate = formatDateMMMDDYYYY

  // Format date for PDF filename
  const formatDateForFilename = (dateStr: string): string => formatDateForFilenameUtil(dateStr, false)

  // Get columns for selected fruit
  const getFruitColumns = (): FruitColumn[] => {
    if (!fruit) return []
    return FRUIT_DEFINITIONS[fruit] || []
  }

  // Reset form function
  const resetForm = () => {
    setSupplier('')
    setFruit('')
    setSku('')
    setFormatPresentation('')
    setOriginCountry('')
    setReceptionDateTime(getCurrentDateTime())
    setContainerNumber('')
    setPoNumber('')
    setLotNumber('')
    setMonitorName('')
    setMonitorSignature('')
    setProcessingPlant('')
    setInspectionDateTime(getCurrentDateTime())
    setColdStorageTemp('')
    setTtr('')
    setMicroPesticideSample('')
    setBoxSamples([])
    setExpandedBoxId(null)
    setPdfUrl(null)
  }

  // Persistence hook
  const { clearDraft } = useChecklistPersistence(
    'checklist-raw-material-quality-draft',
    {
      supplier,
      fruit,
      sku,
      formatPresentation,
      originCountry,
      receptionDateTime,
      containerNumber,
      poNumber,
      lotNumber,
      monitorName,
      monitorSignature,
      processingPlant,
      inspectionDateTime,
      coldStorageTemp,
      ttr,
      microPesticideSample,
      boxSamples
    },
    !!pdfUrl,
    (data) => {
      if (data.supplier) setSupplier(data.supplier)
      if (data.fruit) setFruit(data.fruit)
      if (data.sku) setSku(data.sku)
      if (data.formatPresentation) setFormatPresentation(data.formatPresentation)
      if (data.originCountry) setOriginCountry(data.originCountry)
      if (data.receptionDateTime) setReceptionDateTime(data.receptionDateTime)
      if (data.containerNumber) setContainerNumber(data.containerNumber)
      if (data.poNumber) setPoNumber(data.poNumber)
      if (data.lotNumber) setLotNumber(data.lotNumber)
      if (data.monitorName) setMonitorName(data.monitorName)
      if (data.monitorSignature) setMonitorSignature(data.monitorSignature)
      if (data.processingPlant) setProcessingPlant(data.processingPlant)
      if (data.inspectionDateTime) setInspectionDateTime(data.inspectionDateTime)
      if (data.coldStorageTemp) setColdStorageTemp(data.coldStorageTemp)
      if (data.ttr) setTtr(data.ttr)
      if (data.microPesticideSample) setMicroPesticideSample(data.microPesticideSample)
      if (data.boxSamples && data.boxSamples.length > 0) {
        // Ensure all box samples have weightBox and weightSample fields
        const normalizedBoxSamples = data.boxSamples.map((box: any) => ({
          ...box,
          weightBox: box.weightBox || '',
          weightSample: box.weightSample || ''
        }))
        setBoxSamples(normalizedBoxSamples)
        setExpandedBoxId(normalizedBoxSamples[0]?.id || null)
      }
    }
  )

  // Handle fruit change - reset box samples when fruit changes
  useEffect(() => {
    if (fruit && boxSamples.length > 0) {
      // Reset box samples when fruit changes
      setBoxSamples([])
      setExpandedBoxId(null)
    }
  }, [fruit])

  // Calculate percentage from grams
  const calculatePercentage = (grams: string, weightSample: string): string => {
    if (!grams || !weightSample) return ''
    const gramsNum = parseFloat(grams)
    const weightSampleNum = parseFloat(weightSample)
    if (isNaN(gramsNum) || isNaN(weightSampleNum) || weightSampleNum === 0) return ''
    const percentage = (gramsNum / weightSampleNum) * 100
    return percentage.toFixed(2)
  }

  // Handle adding a new box sample
  const handleAddBoxSample = () => {
    const columns = getFruitColumns()
    const initialValues: Record<string, string> = {}
    columns.forEach(col => {
      initialValues[col.name] = ''
    })
    
    const newBox: BoxSample = {
      id: Date.now(),
      boxNumber: `Box ${boxSamples.length + 1}`,
      weightBox: '',
      weightSample: '',
      values: initialValues
    }
    setBoxSamples([...boxSamples, newBox])
    setExpandedBoxId(newBox.id)
  }

  // Handle removing a box sample
  const handleRemoveBoxSample = (id: number) => {
    const updated = boxSamples.filter(b => b.id !== id)
    setBoxSamples(updated)
    if (expandedBoxId === id) {
      setExpandedBoxId(updated[0]?.id || null)
    }
  }

  // Handle box sample change
  const handleBoxSampleChange = (id: number, field: string, value: string) => {
    setBoxSamples(boxSamples.map(box => {
      if (box.id === id) {
        return {
          ...box,
          values: {
            ...box.values,
            [field]: value
          }
        }
      }
      return box
    }))
  }

  // Handle box number change
  const handleBoxNumberChange = (id: number, value: string) => {
    setBoxSamples(boxSamples.map(box => {
      if (box.id === id) {
        return {
          ...box,
          boxNumber: value
        }
      }
      return box
    }))
  }

  // Handle weight box change
  const handleWeightBoxChange = (id: number, value: string) => {
    setBoxSamples(boxSamples.map(box => {
      if (box.id === id) {
        return {
          ...box,
          weightBox: value
        }
      }
      return box
    }))
  }

  // Handle weight sample change
  const handleWeightSampleChange = (id: number, value: string) => {
    setBoxSamples(boxSamples.map(box => {
      if (box.id === id) {
        return {
          ...box,
          weightSample: value
        }
      }
      return box
    }))
  }

  // Check if box sample has missing data
  const hasMissingData = (box: BoxSample): boolean => {
    if (!box.boxNumber || box.boxNumber.trim() === '') return true
    if (!box.weightBox || box.weightBox.trim() === '') return true
    if (!box.weightSample || box.weightSample.trim() === '') return true
    
    const columns = getFruitColumns()
    return columns.some(col => {
      if (col.required) {
        const value = box.values[col.name]
        return !value || value.trim() === ''
      }
      return false
    })
  }

  // Validate form
  const validateForm = (): boolean => {
    if (!supplier.trim()) {
      alert('Please enter supplier / Por favor ingrese el proveedor')
      return false
    }
    if (!fruit) {
      alert('Please select a fruit / Por favor seleccione una fruta')
      return false
    }
    if (!originCountry.trim()) {
      alert('Please enter origin/country / Por favor ingrese el origen/país')
      return false
    }
    if (!receptionDateTime) {
      alert('Please enter reception date/time / Por favor ingrese la fecha/hora de recepción')
      return false
    }
    if (!monitorName.trim()) {
      alert('Please enter monitor name / Por favor ingrese el nombre del monitor')
      return false
    }
    if (!monitorSignature) {
      alert('Please provide monitor signature / Por favor proporcione la firma del monitor')
      return false
    }
    if (!processingPlant.trim()) {
      alert('Please enter processing plant / Por favor ingrese la planta de procesamiento')
      return false
    }
    if (!inspectionDateTime) {
      alert('Please enter inspection date/time / Por favor ingrese la fecha/hora de inspección')
      return false
    }
    if (!microPesticideSample) {
      alert('Please select micro/pesticide sample taken / Por favor seleccione si se tomó muestra micro/pesticida')
      return false
    }
    if (boxSamples.length === 0) {
      alert('Please add at least one box sample / Por favor agregue al menos una muestra de caja')
      return false
    }

    for (const box of boxSamples) {
      if (!box.boxNumber || box.boxNumber.trim() === '') {
        alert(`Please enter box number for all boxes / Por favor ingrese el número de caja para todas las cajas`)
        return false
      }
      if (!box.weightBox || box.weightBox.trim() === '') {
        alert(`Please enter weight box for ${box.boxNumber} / Por favor ingrese el peso de caja para ${box.boxNumber}`)
        return false
      }
      if (!box.weightSample || box.weightSample.trim() === '') {
        alert(`Please enter weight sample for ${box.boxNumber} / Por favor ingrese el peso de muestra para ${box.boxNumber}`)
        return false
      }
      const columns = getFruitColumns()
      for (const col of columns) {
        if (col.required) {
          const value = box.values[col.name]
          if (!value || value.trim() === '') {
            alert(`Please fill all required fields for ${box.boxNumber} / Por favor complete todos los campos requeridos para ${box.boxNumber}`)
            return false
          }
        }
      }
    }

    return true
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare form data
      const inspectionDate = new Date(inspectionDateTime)
      const dateString = formatDate(inspectionDate.toISOString().split('T')[0])

      const formData = {
        section1: {
          supplier,
          fruit,
          sku: sku || null,
          formatPresentation: formatPresentation || null,
          originCountry,
          receptionDateTime: new Date(receptionDateTime).toISOString(),
          containerNumber: containerNumber || null,
          poNumber: poNumber || null,
          lotNumber: lotNumber || null,
          monitorName,
          monitorSignature,
          processingPlant,
          inspectionDateTime: inspectionDate.toISOString(),
          coldStorageTemp: coldStorageTemp ? parseFloat(coldStorageTemp) : null,
          ttr: ttr || null,
          microPesticideSampleTaken: microPesticideSample
        },
        section2: {
          boxSamples: boxSamples.map(box => ({
            id: box.id,
            boxNumber: box.boxNumber,
            weightBox: box.weightBox,
            weightSample: box.weightSample,
            values: box.values
          }))
        }
      }

      // Generate PDF
      showToast('Generating PDF...', 'info')
      const pdfBlob = await pdf(
        <ChecklistRawMaterialQualityPDFDocument data={formData} />
      ).toBlob()

      // Create filename
      const dateForFilename = formatDateForFilename(inspectionDate.toISOString().split('T')[0])
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const seconds = now.getSeconds().toString().padStart(2, '0')
      const timeStr = `${hours}${minutes}${seconds}`
      const filename = `${dateForFilename}-${timeStr}-Raw-Material-Quality.pdf`

      // Upload PDF to Supabase Storage
      showToast('Uploading PDF to storage...', 'info')
      const uploadedPdfUrl = await uploadChecklistPDF(pdfBlob, filename)

      // Prepare data for database
      const dbData = {
        supplier,
        fruit,
        sku: sku || null,
        format_presentation: formatPresentation || null,
        origin_country: originCountry,
        reception_date_time: new Date(receptionDateTime).toISOString(),
        container_number: containerNumber || null,
        po_number: poNumber || null,
        lot_number: lotNumber || null,
        monitor_name: monitorName,
        monitor_signature: monitorSignature,
        processing_plant: processingPlant,
        inspection_date_time: inspectionDate.toISOString(),
        cold_storage_receiving_temperature: coldStorageTemp ? parseFloat(coldStorageTemp) : null,
        ttr: ttr || null,
        micro_pesticide_sample_taken: microPesticideSample,
        box_samples: formData.section2.boxSamples,
        pdf_url: uploadedPdfUrl,
        date_string: dateString
      }

      // Save to Supabase database
      showToast('Saving to database...', 'info')
      await insertChecklistRawMaterialQuality(dbData)

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

  const fruitColumns = getFruitColumns()

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-4 flex justify-between items-start">
        <Link href="/area/calidad" className="inline-flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver
        </Link>
        <DeleteDraftButton 
          storageKey="checklist-raw-material-quality-draft"
          checklistName="Raw Material Quality Report"
          onReset={resetForm}
        />
      </div>

      <h1 className="text-3xl font-bold mb-2 text-center">
        Raw Material Quality Report /<br/>
        Reporte de calidad materia prima
      </h1>
      <p className="text-center text-sm text-gray-500 mb-6">Code: CF-ASC-011-RG001</p>

      {!isSubmitted && (
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basic Info */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">📋 Section 1 – Basic Info / Información Básica</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">
                Supplier / Proveedor <span className="text-red-500">*</span>
              </label>
              <input
                id="supplier"
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="fruit" className="block text-sm font-medium text-gray-700 mb-1">
                Fruit / Fruta <span className="text-red-500">*</span>
              </label>
              <select
                id="fruit"
                value={fruit}
                onChange={(e) => setFruit(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select fruit / Seleccione fruta</option>
                {Object.keys(FRUIT_DEFINITIONS).map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
                SKU (if available)
              </label>
              <input
                id="sku"
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="formatPresentation" className="block text-sm font-medium text-gray-700 mb-1">
                Format / Presentation / Formato / Presentación
              </label>
              <input
                id="formatPresentation"
                type="text"
                value={formatPresentation}
                onChange={(e) => setFormatPresentation(e.target.value)}
                placeholder="IQF, chunks, slices, etc."
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="originCountry" className="block text-sm font-medium text-gray-700 mb-1">
                Origin / Country / Origen / País <span className="text-red-500">*</span>
              </label>
              <input
                id="originCountry"
                type="text"
                value={originCountry}
                onChange={(e) => setOriginCountry(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="receptionDateTime" className="block text-sm font-medium text-gray-700 mb-1">
                Reception Date/Time / Fecha/Hora de Recepción <span className="text-red-500">*</span>
              </label>
              <input
                id="receptionDateTime"
                type="datetime-local"
                value={receptionDateTime}
                onChange={(e) => setReceptionDateTime(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="containerNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Container # (if available) / Contenedor # (si está disponible)
              </label>
              <input
                id="containerNumber"
                type="text"
                value={containerNumber}
                onChange={(e) => setContainerNumber(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="poNumber" className="block text-sm font-medium text-gray-700 mb-1">
                PO # (if available) / PO # (si está disponible)
              </label>
              <input
                id="poNumber"
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="lotNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Lot # (if available) / Lote # (si está disponible)
              </label>
              <input
                id="lotNumber"
                type="text"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="monitorName" className="block text-sm font-medium text-gray-700 mb-1">
                Monitor Name / Nombre del Monitor <span className="text-red-500">*</span>
              </label>
              <input
                id="monitorName"
                type="text"
                value={monitorName}
                onChange={(e) => setMonitorName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <SignatureCanvas
                value={monitorSignature}
                onChange={setMonitorSignature}
                onClear={() => setMonitorSignature('')}
                label="Monitor Signature / Firma del Monitor *"
              />
            </div>

            <div>
              <label htmlFor="processingPlant" className="block text-sm font-medium text-gray-700 mb-1">
                Processing Plant / Planta de Procesamiento <span className="text-red-500">*</span>
              </label>
              <input
                id="processingPlant"
                type="text"
                value={processingPlant}
                onChange={(e) => setProcessingPlant(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="inspectionDateTime" className="block text-sm font-medium text-gray-700 mb-1">
                Inspection Date/Time / Fecha/Hora de Inspección <span className="text-red-500">*</span>
              </label>
              <input
                id="inspectionDateTime"
                type="datetime-local"
                value={inspectionDateTime}
                onChange={(e) => setInspectionDateTime(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="coldStorageTemp" className="block text-sm font-medium text-gray-700 mb-1">
                Cold Storage Receiving Temperature / Temperatura de Recepción en Frío (°C)
              </label>
              <input
                id="coldStorageTemp"
                type="number"
                step="0.1"
                value={coldStorageTemp}
                onChange={(e) => setColdStorageTemp(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="ttr" className="block text-sm font-medium text-gray-700 mb-1">
                TTR
              </label>
              <input
                id="ttr"
                type="text"
                value={ttr}
                onChange={(e) => setTtr(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="microPesticideSample" className="block text-sm font-medium text-gray-700 mb-1">
                Micro/Pesticide Sample Taken / Muestra Micro/Pesticida Tomada <span className="text-red-500">*</span>
              </label>
              <select
                id="microPesticideSample"
                value={microPesticideSample}
                onChange={(e) => setMicroPesticideSample(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select / Seleccione</option>
                <option value="Y">Yes / Sí</option>
                <option value="N">No</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Box Samples - Dynamic Grid */}
        {fruit && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                📊 Section 2 – Box Samples / Muestras de Caja ({fruit})
              </h2>
              <button
                type="button"
                onClick={handleAddBoxSample}
                className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Box Sample / Agregar Muestra de Caja
              </button>
            </div>

            {fruitColumns.length > 0 && (
              <div className="mb-4 p-4 bg-blue-50 rounded-md">
                <h3 className="font-semibold text-sm mb-2">Fruit-specific columns / Columnas específicas de la fruta:</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                  {fruitColumns.map((col, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span className="font-medium">{col.name}</span>
                      {col.unit && <span className="text-gray-500">({col.unit})</span>}
                      {col.required && <span className="text-red-500">*</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {boxSamples.map((box, index) => {
                const isExpanded = expandedBoxId === box.id
                const hasMissing = hasMissingData(box)

                return (
                  <div key={box.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Collapsed Header */}
                    <div
                      className={`flex justify-between items-center p-4 cursor-pointer transition-colors ${
                        isExpanded ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => setExpandedBoxId(isExpanded ? null : box.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                        <h3 className="font-medium text-gray-700">
                          {box.boxNumber}
                        </h3>
                        {hasMissing && (
                          <div className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-xs font-medium">Missing data / Datos faltantes</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {boxSamples.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveBoxSample(box.id)
                            }}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Box Number / Número de Caja <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={box.boxNumber}
                              onChange={(e) => handleBoxNumberChange(box.id, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Weight Box / Peso de Caja (grs) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={box.weightBox}
                              onChange={(e) => handleWeightBoxChange(box.id, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              required
                              placeholder="Enter grams"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Weight Sample / Peso de Muestra (grs) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={box.weightSample}
                              onChange={(e) => handleWeightSampleChange(box.id, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              required
                              placeholder="Enter grams"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {fruitColumns.map((col) => (
                            <div key={col.name}>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {col.name} / {col.nameEs}
                                {col.unit && col.unit !== '%' && <span className="text-gray-500"> ({col.unit})</span>}
                                {col.required && <span className="text-red-500"> *</span>}
                              </label>
                              {col.name === 'Organoleptic' || col.name.includes('Organoleptic') ? (
                                <select
                                  value={box.values[col.name] || ''}
                                  onChange={(e) => handleBoxSampleChange(box.id, col.name, e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                  required={col.required}
                                >
                                  <option value="">Select / Seleccione</option>
                                  <option value="Excellent">Excellent / Excelente</option>
                                  <option value="Good">Good / Bueno</option>
                                  <option value="Fair">Fair / Regular</option>
                                  <option value="Poor">Poor / Pobre</option>
                                </select>
                              ) : col.unit === '%' ? (
                                <div className="space-y-1">
                                  <div className="flex gap-2">
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={box.values[col.name] || ''}
                                      onChange={(e) => handleBoxSampleChange(box.id, col.name, e.target.value)}
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                      required={col.required}
                                      placeholder="Enter grams"
                                    />
                                    {box.weightSample && box.values[col.name] && (
                                      <div className="flex items-center px-3 py-2 bg-blue-50 border border-blue-200 rounded-md min-w-[80px]">
                                        <span className="text-sm font-medium text-blue-700">
                                          {calculatePercentage(box.values[col.name], box.weightSample)}%
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {!box.weightSample && (
                                    <p className="text-xs text-gray-500">Enter weight sample to calculate %</p>
                                  )}
                                </div>
                              ) : col.unit === 'units' ? (
                                <input
                                  type="number"
                                  step="1"
                                  value={box.values[col.name] || ''}
                                  onChange={(e) => handleBoxSampleChange(box.id, col.name, e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                  required={col.required}
                                  placeholder="Enter units"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={box.values[col.name] || ''}
                                  onChange={(e) => handleBoxSampleChange(box.id, col.name, e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                  required={col.required}
                                  placeholder="Enter value"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {boxSamples.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No box samples added yet. Click "Add Box Sample" to start.</p>
                <p className="text-sm mt-1">Aún no se han agregado muestras de caja. Haga clic en "Agregar Muestra de Caja" para comenzar.</p>
              </div>
            )}
          </div>
        )}

        {!fruit && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
            <p className="text-yellow-800">
              Please select a fruit in Section 1 to enable Section 2.
            </p>
            <p className="text-yellow-800 text-sm mt-1">
              Por favor seleccione una fruta en la Sección 1 para habilitar la Sección 2.
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex flex-col items-center"
          >
            {isSubmitting ? (
              'Submitting... / Enviando...'
            ) : (
              <>
                <span>Submit Checklist / Enviar Checklist</span>
              </>
            )}
          </button>
        </div>
      </form>
      )}

      {/* Success Message */}
      {isSubmitted && pdfUrl && (
        <div className="mt-8 bg-green-50 border-2 border-green-200 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-green-900">✓ Checklist Submitted Successfully! / ¡Checklist Enviado Exitosamente!</h2>
          <p className="text-gray-700 mb-4">Your checklist has been saved and the PDF has been generated.</p>
          <p className="text-gray-700 mb-4 text-sm">Su checklist ha sido guardado y el PDF ha sido generado.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-center flex flex-col items-center"
            >
              <span>View PDF / Ver PDF</span>
            </a>
            <a
              href={pdfUrl}
              download
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-center flex flex-col items-center"
            >
              <span>Download PDF / Descargar PDF</span>
            </a>
            <Link
              href="/area/calidad"
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-center flex flex-col items-center"
            >
              <span>Back to Quality / Volver a Calidad</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

