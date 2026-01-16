'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Info, X } from 'lucide-react'
import { format } from 'date-fns'
import { formatDateMMMDDYYYY, formatDateForFilename as formatDateForFilenameUtil } from '@/lib/date-utils'
import { pdf } from '@react-pdf/renderer'
import { ChecklistMetalDetectorPDFDocument } from '@/components/ChecklistPDFMetalDetector'
import { useToast } from '@/context/ToastContext'
import { useChecklistPersistence } from '@/lib/hooks/useChecklistPersistence'
import { DeleteDraftButton } from '@/components/DeleteDraftButton'
import { supabase } from '@/lib/supabase'
import { uploadChecklistPDF, insertChecklistMetalDetector } from '@/lib/supabase/checklistMetalDetector'

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
  }, [value])

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
        Clear Signature
      </button>
    </div>
  )
}

// Metal Detector Reading Entry Interface
interface MetalDetectorReading {
  id: number
  hour: string
  bf: string[] // Array of 3 BF values
  bnf: string[] // Array of 3 B.NF values
  bss: string[] // Array of 3 B.S.S values
  sensitivity: string // Numeric value
  noiseAlarm: string
  rejectingArm: string
  beaconLight: string
  observation: string
  correctiveActions: string
}

// Modal Component
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
        <div className="p-6 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ChecklistMetalDetectorPage() {
  const { showToast } = useToast()
  
  // Section 1: Basic Info
  const [date, setDate] = useState('')
  const [processLine, setProcessLine] = useState('')
  const [metalDetectorId, setMetalDetectorId] = useState('CEIATHS/MS21')
  const [metalDetectorStartTime, setMetalDetectorStartTime] = useState('')
  const [metalDetectorFinishTime, setMetalDetectorFinishTime] = useState('')
  const [orden, setOrden] = useState('')
  const [monitorName, setMonitorName] = useState('')
  const [monitorSignature, setMonitorSignature] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')

  // Products and brands
  const [brands, setBrands] = useState<string[]>([])
  const [products, setProducts] = useState<string[]>([])

  // Section 2: Dynamic Readings
  const [readings, setReadings] = useState<MetalDetectorReading[]>([
    {
      id: Date.now(),
      hour: '',
      bf: ['', '', ''],
      bnf: ['', '', ''],
      bss: ['', '', ''],
      sensitivity: '',
      noiseAlarm: '',
      rejectingArm: '',
      beaconLight: '',
      observation: '',
      correctiveActions: ''
    }
  ])

  // Modal states
  const [showInstructionsModal, setShowInstructionsModal] = useState(false)
  const [showSimbologyModal, setShowSimbologyModal] = useState(false)
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [showFrequencyModal, setShowFrequencyModal] = useState(false)
  const [showCorrectiveActionsModal, setShowCorrectiveActionsModal] = useState(false)

  // Form state
  const [isInitialSubmitted, setIsInitialSubmitted] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Format date as MMM-DD-YYYY - uses utility to avoid timezone issues
  const formatDate = formatDateMMMDDYYYY

  // Format date for PDF filename - uses utility to avoid timezone issues
  const formatDateForFilename = (dateStr: string): string => formatDateForFilenameUtil(dateStr, false)

  // Get current EST time in HH:mm format
  const getCurrentESTTime = (): string => {
    const now = new Date()
    const estOffset = -5 * 60
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
    const estTime = new Date(utc + (estOffset * 60000))
    const hours = estTime.getHours().toString().padStart(2, '0')
    const minutes = estTime.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // Reset form function
  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0]
    setDate(today)
    setProcessLine('')
    setMetalDetectorId('CEIATHS/MS21')
    setMetalDetectorStartTime('')
    setMetalDetectorFinishTime('')
    setOrden('')
    setMonitorName('')
    setMonitorSignature('')
    setSelectedBrand('')
    setSelectedProduct('')
    setReadings([{ id: Date.now(), hour: '', bf: ['', '', ''], bnf: ['', '', ''], bss: ['', '', ''], sensitivity: '', noiseAlarm: '', rejectingArm: '', beaconLight: '', observation: '', correctiveActions: '' }])
    setIsInitialSubmitted(false)
    setPdfUrl(null)
  }

  // Clear form data without resetting submission state
  const clearFormData = () => {
    const today = new Date().toISOString().split('T')[0]
    setDate(today)
    setProcessLine('')
    setMetalDetectorId('CEIATHS/MS21')
    setMetalDetectorStartTime('')
    setMetalDetectorFinishTime('')
    setOrden('')
    setMonitorName('')
    setMonitorSignature('')
    setSelectedBrand('')
    setSelectedProduct('')
    setReadings([{ id: Date.now(), hour: '', bf: ['', '', ''], bnf: ['', '', ''], bss: ['', '', ''], sensitivity: '', noiseAlarm: '', rejectingArm: '', beaconLight: '', observation: '', correctiveActions: '' }])
  }

  // Persistence hook
  const { clearDraft } = useChecklistPersistence(
    'checklist-metal-detector-draft',
    { date, processLine, metalDetectorId, metalDetectorStartTime, metalDetectorFinishTime, orden, monitorName, monitorSignature, selectedBrand, selectedProduct, readings },
    isInitialSubmitted,
    (data) => {
      if (data.date) setDate(data.date)
      if (data.processLine) setProcessLine(data.processLine)
      if (data.metalDetectorId) setMetalDetectorId(data.metalDetectorId)
      if (data.metalDetectorStartTime) setMetalDetectorStartTime(data.metalDetectorStartTime)
      if (data.metalDetectorFinishTime) setMetalDetectorFinishTime(data.metalDetectorFinishTime)
      if (data.orden) setOrden(data.orden)
      if (data.monitorName) setMonitorName(data.monitorName)
      if (data.monitorSignature) setMonitorSignature(data.monitorSignature)
      if (data.selectedBrand) setSelectedBrand(data.selectedBrand)
      if (data.selectedProduct) setSelectedProduct(data.selectedProduct)
      if (data.readings && data.readings.length > 0) {
        // Migrate old format to new format if needed
        const migratedReadings = data.readings.map((r: any) => {
          if (typeof r.bf === 'string') {
            return {
              ...r,
              bf: Array.isArray(r.bf) ? r.bf : [r.bf || '', '', ''],
              bnf: Array.isArray(r.bnf) ? r.bnf : [r.bnf || '', '', ''],
              bss: Array.isArray(r.bss) ? r.bss : [r.bss || '', '', '']
            }
          }
          return r
        })
        setReadings(migratedReadings)
      } else {
        const today = new Date().toISOString().split('T')[0]
        setDate(today)
        setReadings([{ id: Date.now(), hour: '', bf: ['', '', ''], bnf: ['', '', ''], bss: ['', '', ''], sensitivity: '', noiseAlarm: '', rejectingArm: '', beaconLight: '', observation: '', correctiveActions: '' }])
      }
    }
  )

  // Load brands from Supabase
  useEffect(() => {
    supabase
      .from('productos')
      .select('brand')
      .then(({ data, error }) => {
        if (!error && data) {
          setBrands(Array.from(new Set(data.map((p) => p.brand).filter(Boolean))))
        }
      })
  }, [])

  // Load products (materials) when brand changes
  useEffect(() => {
    if (selectedBrand) {
      supabase
        .from('productos')
        .select('material')
        .eq('brand', selectedBrand)
        .then(({ data, error }) => {
          if (!error && data) {
            setProducts(Array.from(new Set(data.map((p) => p.material).filter(Boolean))))
          }
        })
    } else {
      setProducts([])
      setSelectedProduct('')
    }
  }, [selectedBrand])

  // Initialize dates on mount
  useEffect(() => {
    if (!date) {
      const today = new Date().toISOString().split('T')[0]
      setDate(today)
    }
    if (!metalDetectorId) {
      setMetalDetectorId('CEIATHS/MS21')
    }
    if (readings.length === 0) {
      setReadings([{ id: Date.now(), hour: '', bf: ['', '', ''], bnf: ['', '', ''], bss: ['', '', ''], sensitivity: '', noiseAlarm: '', rejectingArm: '', beaconLight: '', observation: '', correctiveActions: '' }])
    }
  }, [])

  // Add new reading
  const handleAddReading = () => {
    setReadings([
      ...readings,
      {
        id: Date.now(),
        hour: '',
        bf: ['', '', ''],
        bnf: ['', '', ''],
        bss: ['', '', ''],
        sensitivity: '',
        noiseAlarm: '',
        rejectingArm: '',
        beaconLight: '',
        observation: '',
        correctiveActions: ''
      }
    ])
  }

  // Check if reading has ND or No comply
  const hasDeviation = (reading: MetalDetectorReading): boolean => {
    const hasBFND = reading.bf.some(val => val === 'ND')
    const hasBNFND = reading.bnf.some(val => val === 'ND')
    const hasBSSND = reading.bss.some(val => val === 'ND')
    return hasBFND || hasBNFND || hasBSSND || 
           reading.noiseAlarm === 'No comply' || 
           reading.rejectingArm === 'No comply' ||
           reading.beaconLight === 'No comply'
  }

  // Remove reading
  const handleRemoveReading = (id: number) => {
    if (readings.length > 1) {
      setReadings(readings.filter(r => r.id !== id))
    }
  }

  // Update reading
  const handleReadingChange = (id: number, field: keyof MetalDetectorReading, value: string) => {
    setReadings(readings.map(r => {
      if (r.id === id) {
        return { ...r, [field]: value }
      }
      return r
    }))
  }

  // Update array field (for BF, BNF, BSS)
  const handleArrayFieldChange = (id: number, field: 'bf' | 'bnf' | 'bss', index: number, value: string) => {
    setReadings(readings.map(r => {
      if (r.id === id) {
        const newArray = [...r[field]]
        newArray[index] = value
        return { ...r, [field]: newArray }
      }
      return r
    }))
  }

  // Validate Sections 1 and 2
  const validateSection1And2 = (): boolean => {
    if (!date.trim()) {
      alert('Please enter a date')
      return false
    }
    if (!processLine.trim()) {
      alert('Please enter process line')
      return false
    }
    if (!metalDetectorId.trim()) {
      alert('Please enter metal detector ID')
      return false
    }
    if (!metalDetectorStartTime.trim()) {
      alert('Please enter metal detector start time')
      return false
    }
    if (!metalDetectorFinishTime.trim()) {
      alert('Please enter metal detector finish time')
      return false
    }
    if (!orden.trim()) {
      alert('Please enter orden')
      return false
    }
    if (!selectedBrand.trim()) {
      alert('Please select a brand')
      return false
    }
    if (!selectedProduct.trim()) {
      alert('Please select a product')
      return false
    }
    if (!monitorName.trim()) {
      alert('Please enter monitor name')
      return false
    }
    if (!monitorSignature) {
      alert('Please provide monitor signature')
      return false
    }

    for (const reading of readings) {
      if (!reading.hour.trim()) {
        alert('Please enter hour for all readings')
        return false
      }
      
      // Check if deviation exists and validate observation/corrective actions
      if (hasDeviation(reading)) {
        if (!reading.observation.trim()) {
          alert('Please enter observation for readings with ND or No comply')
          return false
        }
        if (!reading.correctiveActions.trim()) {
          alert('Please enter corrective actions for readings with ND or No comply')
          return false
        }
      }
    }

    return true
  }

  // Handle initial submission
  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateSection1And2()) {
      return
    }

    setIsSubmitting(true)

    try {
      const formData = {
        section1: {
          date: formatDate(date),
          processLine,
          metalDetectorId,
          metalDetectorStartTime,
          metalDetectorFinishTime,
          orden,
          brand: selectedBrand,
          product: selectedProduct,
          monitorName,
          monitorSignature
        },
        section2: {
          readings: readings.map(r => ({
            hour: r.hour,
            bf: r.bf,
            bnf: r.bnf,
            bss: r.bss,
            sensitivity: r.sensitivity,
            noiseAlarm: r.noiseAlarm,
            rejectingArm: r.rejectingArm,
            beaconLight: r.beaconLight,
            observation: r.observation || '',
            correctiveActions: r.correctiveActions || ''
          }))
        }
      }

      console.log('Form Data:', JSON.stringify(formData, null, 2))

      showToast('Generating PDF...', 'info')
      const pdfBlob = await pdf(
        <ChecklistMetalDetectorPDFDocument data={formData} />
      ).toBlob()

      const dateForFilename = formatDateForFilename(date)
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const seconds = now.getSeconds().toString().padStart(2, '0')
      const timeStr = `${hours}${minutes}${seconds}`
      const filename = `${dateForFilename}-${timeStr}-Metal-Detector-PCC1.pdf`

      // Upload PDF to Supabase Storage
      showToast('Uploading PDF to storage...', 'info')
      const uploadedPdfUrl = await uploadChecklistPDF(pdfBlob, filename)

      // Prepare data for database
      const dbData = {
        date_string: formatDate(date),
        process_line: processLine,
        metal_detector_id: metalDetectorId,
        metal_detector_start_time: metalDetectorStartTime,
        metal_detector_finish_time: metalDetectorFinishTime,
        orden: orden,
        brand: selectedBrand,
        product: selectedProduct,
        monitor_name: monitorName,
        monitor_signature: monitorSignature,
        readings: formData.section2.readings,
        pdf_url: uploadedPdfUrl
      }

      // Save to Supabase database
      showToast('Saving to database...', 'info')
      await insertChecklistMetalDetector(dbData)

      // Set PDF URL for viewing
      setPdfUrl(uploadedPdfUrl)
      setIsInitialSubmitted(true)
      clearDraft()

      // Clear form data after successful submission (without resetting submission state)
      clearFormData()

      showToast('Checklist submitted successfully!', 'success')

      // Log what happened
      console.log('Checklist submitted successfully:')
      console.log('1. PDF generated')
      console.log('2. PDF uploaded to:', uploadedPdfUrl)
      console.log('3. Data saved to Supabase')
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
          storageKey="checklist-metal-detector-draft"
          checklistName="Metal Detector PCC#1"
          onReset={resetForm}
        />
      </div>

      {/* Success Message */}
      {isInitialSubmitted && pdfUrl && (
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

      {!(isInitialSubmitted && pdfUrl) && (
        <>
          <h1 className="text-3xl font-bold mb-2 text-center">
            Metal detector PCC#1 control /<br/>
            Control PCC#1 detector de metales
          </h1>
          <p className="text-center text-sm text-gray-500 mb-6">Code: CF/PC-PL-HACCP-001-RG001</p>

          {/* Info Buttons */}
          <div className="mb-6 flex flex-col items-center gap-2">
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={() => setShowInstructionsModal(true)}
                className="inline-flex items-center px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
              >
                <Info className="h-3 w-3 mr-1.5" />
                Instructions / Instrucciones
              </button>
              <button
                type="button"
                onClick={() => setShowSimbologyModal(true)}
                className="inline-flex items-center px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
              >
                <Info className="h-3 w-3 mr-1.5" />
                Simbology / Simbología
              </button>
              <button
                type="button"
                onClick={() => setShowProcessModal(true)}
                className="inline-flex items-center px-3 py-1.5 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors text-sm"
              >
                <Info className="h-3 w-3 mr-1.5" />
                Process / Procedimiento
              </button>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={() => setShowFrequencyModal(true)}
                className="inline-flex items-center px-3 py-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors text-sm"
              >
                <Info className="h-3 w-3 mr-1.5" />
                Frequency / Frecuencia
              </button>
              <button
                type="button"
                onClick={() => setShowCorrectiveActionsModal(true)}
                className="inline-flex items-center px-3 py-1.5 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors text-sm"
              >
                <Info className="h-3 w-3 mr-1.5" />
                Corrective Actions / Acciones correctivas
              </button>
            </div>
          </div>

          <form onSubmit={handleInitialSubmit} className="space-y-8">
        {/* Section 1: Basic Info */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">🧩 Section 1 – Basic Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
              {date && (
                <p className="mt-1 text-xs text-gray-500">Formatted: {formatDate(date)}</p>
              )}
            </div>

            <div>
              <label htmlFor="processLine" className="block text-sm font-medium text-gray-700 mb-1">
                Process Line <span className="text-red-500">*</span>
              </label>
              <input
                id="processLine"
                type="text"
                value={processLine}
                onChange={(e) => setProcessLine(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="metalDetectorId" className="block text-sm font-medium text-gray-700 mb-1">
                Metal Detector ID <span className="text-red-500">*</span>
              </label>
              <input
                id="metalDetectorId"
                type="text"
                value={metalDetectorId}
                onChange={(e) => setMetalDetectorId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="metalDetectorStartTime" className="block text-sm font-medium text-gray-700 mb-1">
                Metal Detector Start Time <span className="text-red-500">*</span>
              </label>
              <input
                id="metalDetectorStartTime"
                type="time"
                value={metalDetectorStartTime}
                onChange={(e) => setMetalDetectorStartTime(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="metalDetectorFinishTime" className="block text-sm font-medium text-gray-700 mb-1">
                Metal Detector Finish Time <span className="text-red-500">*</span>
              </label>
              <input
                id="metalDetectorFinishTime"
                type="time"
                value={metalDetectorFinishTime}
                onChange={(e) => setMetalDetectorFinishTime(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="orden" className="block text-sm font-medium text-gray-700 mb-1">
                Orden <span className="text-red-500">*</span>
              </label>
              <input
                id="orden"
                type="text"
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                Brand <span className="text-red-500">*</span>
              </label>
              <select
                id="brand"
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value)
                  setSelectedProduct('')
                }}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select brand</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="product" className="block text-sm font-medium text-gray-700 mb-1">
                Product <span className="text-red-500">*</span>
              </label>
              <select
                id="product"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={!selectedBrand}
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="monitorName" className="block text-sm font-medium text-gray-700 mb-1">
                Monitor Name <span className="text-red-500">*</span>
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
                label="Monitor Signature *"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Dynamic Readings */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">🔁 Section 2 – Metal Detector Readings</h2>
            <button
              type="button"
              onClick={handleAddReading}
              className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </button>
          </div>

          <div className="space-y-4">
            {readings.map((reading, index) => (
              <div key={reading.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-700">Reading #{index + 1}</h3>
                  {readings.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveReading(reading.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Hour and Sensitivity Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hour (indicated in equipment) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={reading.hour}
                        onChange={(e) => handleReadingChange(reading.id, 'hour', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sensitivity / Sensibilidad
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={reading.sensitivity}
                        onChange={(e) => handleReadingChange(reading.id, 'sensitivity', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter sensitivity value"
                      />
                    </div>
                  </div>

                  {/* Table for BF, B.NF, B.S.S */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Test</th>
                          <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">1</th>
                          <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">2</th>
                          <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">3</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 text-sm font-medium">BF</td>
                          {[0, 1, 2].map((idx) => (
                            <td key={idx} className="border border-gray-300 px-3 py-2">
                              <select
                                value={reading.bf[idx] || ''}
                                onChange={(e) => handleArrayFieldChange(reading.id, 'bf', idx, e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select</option>
                                <option value="D">D</option>
                                <option value="ND">ND</option>
                              </select>
                            </td>
                          ))}
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 text-sm font-medium">B.NF</td>
                          {[0, 1, 2].map((idx) => (
                            <td key={idx} className="border border-gray-300 px-3 py-2">
                              <select
                                value={reading.bnf[idx] || ''}
                                onChange={(e) => handleArrayFieldChange(reading.id, 'bnf', idx, e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select</option>
                                <option value="D">D</option>
                                <option value="ND">ND</option>
                              </select>
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 text-sm font-medium">B.S.S</td>
                          {[0, 1, 2].map((idx) => (
                            <td key={idx} className="border border-gray-300 px-3 py-2">
                              <select
                                value={reading.bss[idx] || ''}
                                onChange={(e) => handleArrayFieldChange(reading.id, 'bss', idx, e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select</option>
                                <option value="D">D</option>
                                <option value="ND">ND</option>
                              </select>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Noise Alarm, Rejecting Arm, and Beacon Light */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Noise Alarm / Alarma sonora
                      </label>
                      <select
                        value={reading.noiseAlarm}
                        onChange={(e) => handleReadingChange(reading.id, 'noiseAlarm', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select</option>
                        <option value="Ok">Ok</option>
                        <option value="No comply">No comply</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rejecting arm / Brazo rechazado
                      </label>
                      <select
                        value={reading.rejectingArm}
                        onChange={(e) => handleReadingChange(reading.id, 'rejectingArm', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select</option>
                        <option value="Ok">Ok</option>
                        <option value="No comply">No comply</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Beacon light / Encendido de baliza
                      </label>
                      <select
                        value={reading.beaconLight}
                        onChange={(e) => handleReadingChange(reading.id, 'beaconLight', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select</option>
                        <option value="Ok">Ok</option>
                        <option value="No comply">No comply</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Observation and Corrective Actions - Show when there's a deviation */}
                {hasDeviation(reading) && (
                  <div className="mt-4 pt-4 border-t border-red-200 bg-red-50 rounded-md p-4">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-red-700 mb-1">
                        Observation <span className="text-red-500">*</span>
                        <span className="text-xs text-gray-600 ml-2">(Required when ND or No comply is detected)</span>
                      </label>
                      <textarea
                        value={reading.observation}
                        onChange={(e) => handleReadingChange(reading.id, 'observation', e.target.value)}
                        rows={3}
                        className="mt-1 block w-full px-3 py-2 border border-red-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                        required={hasDeviation(reading)}
                        placeholder="Describe what happened..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-red-700 mb-1">
                        Corrective Actions <span className="text-red-500">*</span>
                        <span className="text-xs text-gray-600 ml-2">(Required when ND or No comply is detected)</span>
                      </label>
                      <textarea
                        value={reading.correctiveActions}
                        onChange={(e) => handleReadingChange(reading.id, 'correctiveActions', e.target.value)}
                        rows={3}
                        className="mt-1 block w-full px-3 py-2 border border-red-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                        required={hasDeviation(reading)}
                        placeholder="Describe the corrective actions taken..."
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
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
        </>
      )}

      {/* Modals */}
      <Modal
        isOpen={showInstructionsModal}
        onClose={() => setShowInstructionsModal(false)}
        title="Instructions / Instrucciones"
      >
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <p className="mb-2">
              <strong>English:</strong>
            </p>
            <p className="mb-4">
              The following monitoring will be carried out by the Quality Control personnel, who must check the proper functioning of the metal detector, with the standard bars of the equipment provided by the manufacturer.
            </p>
            <p className="mb-4">
              This will be done in the room where the metal detector is located, at the beginning of the process and from there with a frequency of no more than 1 hour, each time there is a detection, in the event of a need to adjust the equipment, power outage. or a process stop, for example, in the lunch hour. A check must necessarily be made at the end of the process. Every time a deviation is detected (no detection of the standard bars) the incident must be registered and investigated together by the Quality Control, Production and Maintenance team. If any of the rejection systems do not work, the production person in charge will be called to adjust, if adjustment is not achieved, the equipment will be withdrawn from the process.
            </p>
          </div>
          <div className="border-t pt-4">
            <p className="mb-2">
              <strong>Español:</strong>
            </p>
            <p className="mb-4">
              El siguiente monitoreo será realizado por el personal de Control de Calidad, el cual deberá chequear el buen funcionamiento del detector de metales, con las barras patrón del equipo entregadas por el fabricante.
            </p>
            <p>
              Esto se realizará en la sala en la cual este ubicado el detector de metales, al inicio del proceso y desde ahí con una frecuencia no mayor a 1 hora, cada vez que exista una detección, ante una necesidad de ajuste del equipo, corte de energía o una detención de proceso, por ejemplo, en el horario de colación. Se debe necesariamente hacer un chequeo al finalizar el proceso. Cada vez que se detecte una desviación (no detección de las barras patrón) el incidente debe ser registrado e investigado en conjunto por el equipo de Control de Calidad, Producción y Mantenimiento. En caso de no funcionar alguno de los sistemas de rechazo, se llamará al responsable de producción para ajustar, si no se logra ajuste, el equipo será retirado del proceso.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showSimbologyModal}
        onClose={() => setShowSimbologyModal(false)}
        title="Simbology / Simbología"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div>
                <strong>D:</strong> Detected / Detectado
              </div>
              <div>
                <strong>ND:</strong> Non-detected / No Detectado
              </div>
              <div>
                <strong>Barra F.:</strong> Ferrous 2.0 mm / Ferroso 2.0 mm
              </div>
              <div>
                <strong>Barra NF:</strong> Non Ferrous 2.0 mm / No Ferroso 2.0 mm
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <strong>Barra S.S.:</strong> Stainless Steel 3.0 mm / Acero Inoxidable 3.0 mm
              </div>
              <div>
                <strong>Sens.:</strong> Programmed sensibility / Sensibilidad programada
              </div>
              <div>
                <strong>Señal:</strong> Programmed sign / Señal programada
              </div>
              <div>
                <strong>F.F.P:</strong> Fake positive failure / Fallo por falsos positivo
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showProcessModal}
        onClose={() => setShowProcessModal(false)}
        title="Process / Procedimiento"
      >
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <p className="mb-2">
              <strong>English:</strong>
            </p>
            <p className="mb-4">
              Put the patron bars over the bag's surface to prove the metal detector proper functioning (Colocar barras patrón sobre la superficie de la bolsa, para comprobar el correcto funcionamiento del detector de metales.)
            </p>
            <p className="mb-4">
              Repeat this control process three times, with each bar (Este control se debe realizar tres veces, con cada una de las barras.)
            </p>
            <p className="mb-4">
              In case one of these bars are not detected by the metal detector some of the corrective actions below must be taken. Request a re-calibration by the production person in charge and an equipment re-check following the same methods and patterns (En el caso de no ser detectada una de las barras por el detector de metales, se debe tomar alguna de las acciones correctivas enunciadas a continuación y solicitar recalibración por parte del encargado de la producción y re-checkear el equipo de la misma forma con los patrones.)
            </p>
          </div>
          <div className="border-t pt-4">
            <p className="mb-2">
              <strong>Español:</strong>
            </p>
            <p className="mb-4">
              Colocar barras patrón sobre la superficie de la bolsa, para comprobar el correcto funcionamiento del detector de metales.
            </p>
            <p className="mb-4">
              Este control se debe realizar tres veces, con cada una de las barras.
            </p>
            <p>
              En el caso de no ser detectada una de las barras por el detector de metales, se debe tomar alguna de las acciones correctivas enunciadas a continuación y solicitar recalibración por parte del encargado de la producción y re-checkear el equipo de la misma forma con los patrones.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showFrequencyModal}
        onClose={() => setShowFrequencyModal(false)}
        title="Frequency / Frecuencia"
      >
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <p className="mb-2">
              <strong>English:</strong>
            </p>
            <p className="mb-4">
              At the beginning of the process and from there at least every hour, upon return from snack, when there is arrest due to electrical incidents or equipment operation and at the end of the process.
            </p>
          </div>
          <div className="border-t pt-4">
            <p className="mb-2">
              <strong>Español:</strong>
            </p>
            <p>
              Al inicio del proceso y desde ahí al menos cada una hora, al regreso de merienda, cuando se produce detención por incidentes eléctricos o de funcionamiento del equipo y al finalizar el proceso.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showCorrectiveActionsModal}
        onClose={() => setShowCorrectiveActionsModal(false)}
        title="Corrective Actions / Acciones correctivas"
      >
        <div className="space-y-6 text-sm text-gray-700">
          {/* English Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">English</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">BAR</th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">SITUATION</th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">CORRECTIVE ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3 align-top" rowSpan={2}>
                      Ferrous 2.0 mm
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      No detection of the pattern bars
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Isolate the product from the last control until the non-detected</li>
                        <li>Pass the bag once again through the metal detector. If the product is on hold to pass through the metal detector it will be identified with an adhesive</li>
                        <li>Recheck the metal detector with the pattern bars</li>
                      </ol>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3">
                      Product temperature issues
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Isolate the product from the last control until the non-detected</li>
                        <li>Pass the bag once again through the metal detector. If the product is on hold to pass through the metal detector it will be identified with an adhesive</li>
                        <li>Recheck the metal detector with the pattern bars</li>
                      </ol>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3 align-top" rowSpan={3}>
                      Nonferrous 2.0 mm
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      No detection of the pattern bars
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Isolate the product from the last control until the non-detected</li>
                        <li>Pass the bag once again through the metal detector. If the product is on hold to pass through the metal detector it will be identified with an adhesive</li>
                        <li>Recheck the metal detector with the pattern bars</li>
                      </ol>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3">
                      Product temperature issues
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Isolate the product from the last control until the non-detected</li>
                        <li>Pass the bag once again through the metal detector. If the product is on hold to pass through the metal detector it will be identified with an adhesive</li>
                        <li>Recheck the metal detector with the pattern bars</li>
                      </ol>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3">
                      Baliza automatic not functioning and line stop
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Isolate all the production from the last control until the non-detected</li>
                        <li>Notify the electric department to get the functioning back</li>
                        <li>Re check with the pattern bars</li>
                        <li>Restart the process</li>
                      </ol>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3 align-top" rowSpan={3}>
                      Stainless Steel 3.0 mm
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      No detection of the pattern bars
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Isolate the product from the last control until the non-detected</li>
                        <li>Pass the bag once again through the metal detector. If the product is on hold to pass through the metal detector it will be identified with an adhesive</li>
                        <li>Recheck the metal detector with the pattern bars</li>
                      </ol>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3">
                      Bag rejection's mechanical arm not functioning
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Isolate all the production from the last control until the non-detected</li>
                        <li>Notify the electric department to get the functioning back</li>
                        <li>Re check with the pattern bars</li>
                        <li>Restart the process</li>
                      </ol>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3">
                      Metal detector failure
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Isolate all the production from the last control until the non-detected</li>
                        <li>Notify the electric department to get the functioning back</li>
                        <li>Re check with the pattern bars</li>
                        <li>Restart the process</li>
                      </ol>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Spanish Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Español</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">BARRAS</th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">SITUACIÓN</th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">ACCIÓN CORRECTIVA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3 align-top" rowSpan={2}>
                      Ferroso 2.0 mm
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      No detección de barras patrón
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Aislar todo el producto desde el control anterior hasta el no detectado</li>
                        <li>Pasar nuevamente el producto por el detector. Si el producto quedara por pasar por detector queda identificado con un adhesivo</li>
                        <li>Rechequear detector de metales con barras patrón</li>
                      </ol>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3">
                      Problemas de temperatura del producto
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Aislar todo el producto desde el control anterior hasta el no detectado</li>
                        <li>Pasar nuevamente el producto por el detector. Si el producto quedara por pasar por detector queda identificado con un adhesivo</li>
                        <li>Rechequear detector de metales con barras patrón</li>
                      </ol>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3 align-top" rowSpan={3}>
                      No Ferroso 2.0 mm
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      No detección de barras patrón
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Aislar todo el producto desde el control anterior hasta el no detectado</li>
                        <li>Pasar nuevamente el producto por el detector. Si el producto quedara por pasar por detector queda identificado con un adhesivo</li>
                        <li>Rechequear detector de metales con barras patrón</li>
                      </ol>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3">
                      Problemas de temperatura del producto
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Aislar todo el producto desde el control anterior hasta el no detectado</li>
                        <li>Pasar nuevamente el producto por el detector. Si el producto quedara por pasar por detector queda identificado con un adhesivo</li>
                        <li>Rechequear detector de metales con barras patrón</li>
                      </ol>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3">
                      No accionamiento automático de Baliza y detención de cinta
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Aislar todo el producto desde el control anterior hasta el no detectado</li>
                        <li>Avisar a departamento eléctrico para recuperar su funcionamiento</li>
                        <li>Rechequear con barras patrones</li>
                        <li>Reiniciar proceso</li>
                      </ol>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3 align-top" rowSpan={3}>
                      Acero Inox. 3.0 mm
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      No detección de barras patrón
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Aislar todo el producto desde el control anterior hasta el no detectado</li>
                        <li>Pasar nuevamente el producto por el detector. Si el producto quedara por pasar por detector queda identificado con un adhesivo</li>
                        <li>Rechequear detector de metales con barras patrón</li>
                      </ol>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3">
                      No accionamiento automático del brazo mecánico de rechazo de bolsas
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Aislar todo el producto desde el control anterior hasta el no detectado</li>
                        <li>Avisar a departamento eléctrico para recuperar su funcionamiento</li>
                        <li>Rechequear con barras patrones</li>
                        <li>Reiniciar proceso</li>
                      </ol>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3">
                      Falla detector de metales
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Aislar todo el producto desde el control anterior hasta el no detectado</li>
                        <li>Avisar a departamento eléctrico para recuperar su funcionamiento</li>
                        <li>Rechequear con barras patrones</li>
                        <li>Reiniciar proceso</li>
                      </ol>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

