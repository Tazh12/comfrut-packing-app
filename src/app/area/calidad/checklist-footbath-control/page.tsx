'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, AlertTriangle, ChevronDown, ChevronUp, Info, X } from 'lucide-react'
import { format } from 'date-fns'
import { pdf } from '@react-pdf/renderer'
import { ChecklistFootbathControlPDFDocument } from '@/components/ChecklistPDFFootbathControl'
import { uploadChecklistPDF, insertChecklistFootbathControl } from '@/lib/supabase/checklistFootbathControl'
import { useToast } from '@/context/ToastContext'
import { useChecklistPersistence } from '@/lib/hooks/useChecklistPersistence'
import { DeleteDraftButton } from '@/components/DeleteDraftButton'

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
        Clear Signature
      </button>
    </div>
  )
}

// Measurement Entry Interface
interface MeasurementEntry {
  id: number
  hour: string
  filter: string
  measurePpmValue: string
  correctiveAction: string
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
            Close / Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ChecklistFootbathControlPage() {
  const { showToast } = useToast()
  
  // Get current time in HH:mm format
  const getCurrentTime = (): string => {
    const now = new Date()
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }
  
  // Section 1: Basic Info
  const [date, setDate] = useState('')
  const [shift, setShift] = useState('')
  const [monitorName, setMonitorName] = useState('')
  const [monitorSignature, setMonitorSignature] = useState('')

  // Section 2: Dynamic Measurements
  const [measurements, setMeasurements] = useState<MeasurementEntry[]>([
    {
      id: Date.now(),
      hour: getCurrentTime(),
      filter: '',
      measurePpmValue: '',
      correctiveAction: ''
    }
  ])

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [expandedMeasurementId, setExpandedMeasurementId] = useState<number | null>(null)

  // Modal states
  const [showFrequencyModal, setShowFrequencyModal] = useState(false)
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [showColorChartModal, setShowColorChartModal] = useState(false)
  const [showProblemsModal, setShowProblemsModal] = useState(false)

  // Format date as MMM-DD-YYYY
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      return format(date, 'MMM-dd-yyyy').toUpperCase()
    } catch {
      return dateStr
    }
  }

  // Format date for PDF filename: yyyy-mmm-dd
  const formatDateForFilename = (dateStr: string): string => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = format(date, 'MMM').toUpperCase()
      const day = date.getDate().toString().padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      return dateStr
    }
  }

  // Reset form function
  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0]
    const newMeasurementId = Date.now()
    setDate(today)
    setShift('')
    setMonitorName('')
    setMonitorSignature('')
    setMeasurements([{
      id: newMeasurementId,
      hour: getCurrentTime(),
      filter: '',
      measurePpmValue: '',
      correctiveAction: ''
    }])
    setExpandedMeasurementId(newMeasurementId)
    setPdfUrl(null)
  }

  // Persistence hook
  const { clearDraft } = useChecklistPersistence(
    'checklist-footbath-control-draft',
    { date, shift, monitorName, monitorSignature, measurements },
    !!pdfUrl,
    (data) => {
      if (data.date) setDate(data.date)
      if (data.shift) setShift(data.shift)
      if (data.monitorName) setMonitorName(data.monitorName)
      if (data.monitorSignature) setMonitorSignature(data.monitorSignature)
      if (data.measurements && data.measurements.length > 0) {
        setMeasurements(data.measurements)
        setExpandedMeasurementId(data.measurements[0]?.id || null)
      } else {
        const today = new Date().toISOString().split('T')[0]
        setDate(today)
        const newMeasurementId = Date.now()
        const newMeasurement = {
          id: newMeasurementId,
          hour: getCurrentTime(),
          filter: '',
          measurePpmValue: '',
          correctiveAction: ''
        }
        setMeasurements([newMeasurement])
        setExpandedMeasurementId(newMeasurementId)
      }
    }
  )

  // Handle adding a new measurement
  const handleAddMeasurement = () => {
    const newMeasurement: MeasurementEntry = {
      id: Date.now(),
      hour: getCurrentTime(),
      filter: '',
      measurePpmValue: '',
      correctiveAction: ''
    }
    setMeasurements([...measurements, newMeasurement])
    setExpandedMeasurementId(newMeasurement.id)
  }

  // Handle removing a measurement
  const handleRemoveMeasurement = (id: number) => {
    const updated = measurements.filter(m => m.id !== id)
    if (updated.length === 0) {
      const newMeasurement: MeasurementEntry = {
        id: Date.now(),
        hour: getCurrentTime(),
        filter: '',
        measurePpmValue: '',
        correctiveAction: ''
      }
      setMeasurements([newMeasurement])
      setExpandedMeasurementId(newMeasurement.id)
    } else {
      setMeasurements(updated)
      if (expandedMeasurementId === id) {
        setExpandedMeasurementId(updated[0]?.id || null)
      }
    }
  }

  // Handle measurement change
  const handleMeasurementChange = (id: number, field: keyof MeasurementEntry, value: string) => {
    setMeasurements(measurements.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: value }
        // Clear corrective action if PPM value is >= 200
        if (field === 'measurePpmValue') {
          const ppmValue = parseFloat(value)
          if (!isNaN(ppmValue) && ppmValue >= 200) {
            updated.correctiveAction = ''
          }
        }
        return updated
      }
      return m
    }))
  }

  // Check if measurement has missing data
  const hasMissingData = (measurement: MeasurementEntry): boolean => {
    return !measurement.hour || !measurement.filter || !measurement.measurePpmValue ||
           (parseFloat(measurement.measurePpmValue) < 200 && !measurement.correctiveAction)
  }

  // Validate form
  const validateForm = (): boolean => {
    if (!date.trim()) {
      alert('Please enter a date')
      return false
    }
    if (!shift.trim()) {
      alert('Please select a shift')
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

    for (const measurement of measurements) {
      if (!measurement.hour.trim()) {
        alert('Please enter hour for all measurements')
        return false
      }
      if (!measurement.filter.trim()) {
        alert('Please enter filter for all measurements')
        return false
      }
      if (!measurement.measurePpmValue.trim()) {
        alert('Please enter Measure PPM Value for all measurements')
        return false
      }
      const ppmValue = parseFloat(measurement.measurePpmValue)
      if (isNaN(ppmValue)) {
        alert('Measure PPM Value must be a valid number')
        return false
      }
      if (ppmValue < 200 && !measurement.correctiveAction.trim()) {
        alert('Please enter corrective action for measurements with PPM Value < 200')
        return false
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
      const formData = {
        section1: {
          date: formatDate(date),
          shift,
          monitorName,
          monitorSignature
        },
        section2: {
          measurements: measurements.map(m => ({
            hour: m.hour,
            filter: m.filter,
            measurePpmValue: parseFloat(m.measurePpmValue),
            correctiveAction: m.correctiveAction || null
          }))
        }
      }

      // Generate PDF
      showToast('Generating PDF...', 'info')
      const pdfBlob = await pdf(
        <ChecklistFootbathControlPDFDocument data={formData} />
      ).toBlob()

      // Create filename
      const dateForFilename = formatDateForFilename(date)
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const seconds = now.getSeconds().toString().padStart(2, '0')
      const timeStr = `${hours}${minutes}${seconds}`
      const filename = `${dateForFilename}-${timeStr}-Footbath-Control.pdf`

      // Upload PDF to Supabase Storage
      showToast('Uploading PDF to storage...', 'info')
      const uploadedPdfUrl = await uploadChecklistPDF(pdfBlob, filename)

      // Prepare data for database
      const dbData = {
        date_string: formatDate(date),
        shift,
        monitor_name: monitorName,
        monitor_signature: monitorSignature,
        measurements: formData.section2.measurements,
        pdf_url: uploadedPdfUrl
      }

      // Save to Supabase database
      showToast('Saving to database...', 'info')
      await insertChecklistFootbathControl(dbData)

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
          storageKey="checklist-footbath-control-draft"
          checklistName="Footbath Control"
          onReset={resetForm}
        />
      </div>

      <h1 className="text-3xl font-bold mb-2 text-center">
        Footbath Control
      </h1>
      <p className="text-center text-sm text-gray-500 mb-6">Code: CF/PC-SAN-001-RG007</p>

      {/* Info Buttons */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            type="button"
            onClick={() => setShowFrequencyModal(true)}
            className="inline-flex items-center px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
          >
            <Info className="h-3 w-3 mr-1.5" />
            Frequency / Frecuencia
          </button>
          <button
            type="button"
            onClick={() => setShowProcessModal(true)}
            className="inline-flex items-center px-3 py-1.5 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors text-sm"
          >
            <Info className="h-3 w-3 mr-1.5" />
            Process / Proceso
          </button>
          <button
            type="button"
            onClick={() => setShowColorChartModal(true)}
            className="inline-flex items-center px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
          >
            <Info className="h-3 w-3 mr-1.5" />
            Color Chart / Carta de Colores
          </button>
          <button
            type="button"
            onClick={() => setShowProblemsModal(true)}
            className="inline-flex items-center px-3 py-1.5 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors text-sm"
          >
            <Info className="h-3 w-3 mr-1.5" />
            Problems & Corrective Actions / Problemas y Acciones Correctivas
          </button>
        </div>
      </div>

      {!isSubmitted && (
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basic Info */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">🧩 Section 1 – Basic Info / Información Básica</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Date / Fecha <span className="text-red-500">*</span>
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
              <label htmlFor="shift" className="block text-sm font-medium text-gray-700 mb-1">
                Shift / Turno <span className="text-red-500">*</span>
              </label>
              <select
                id="shift"
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select shift / Selecciona turno</option>
                <option value="Morning">Morning / Mañana</option>
                <option value="Afternoon">Afternoon / Tarde</option>
                <option value="Night">Night / Noche</option>
              </select>
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
          </div>
        </div>

        {/* Section 2: Dynamic Measurements */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">📊 Section 2 – Measurements / Mediciones</h2>
            <button
              type="button"
              onClick={handleAddMeasurement}
              className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Measurement / Agregar Medición
            </button>
          </div>

          <div className="space-y-4">
            {measurements.map((measurement, index) => {
              const isExpanded = expandedMeasurementId === measurement.id
              const hasMissing = hasMissingData(measurement)
              const ppmValue = parseFloat(measurement.measurePpmValue)
              const showCorrectiveAction = !isNaN(ppmValue) && ppmValue < 200

              return (
                <div key={measurement.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Collapsed Header */}
                  <div
                    className={`flex justify-between items-center p-4 cursor-pointer transition-colors ${
                      isExpanded ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => setExpandedMeasurementId(isExpanded ? null : measurement.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                      <h3 className="font-medium text-gray-700">
                        Measurement #{index + 1} / Medición #{index + 1}
                        {measurement.filter && (
                          <span className="ml-2 text-gray-500 font-normal">- {measurement.filter}</span>
                        )}
                      </h3>
                      {hasMissing && (
                        <div className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-xs font-medium">Missing data</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {measurements.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveMeasurement(measurement.id)
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Hour / Hora <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="time"
                            value={measurement.hour}
                            onChange={(e) => handleMeasurementChange(measurement.id, 'hour', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Filter / Filtro <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={measurement.filter}
                            onChange={(e) => handleMeasurementChange(measurement.id, 'filter', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Measure PPM Value / Valor PPM Medido <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={measurement.measurePpmValue}
                            onChange={(e) => handleMeasurementChange(measurement.id, 'measurePpmValue', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                          {!isNaN(ppmValue) && ppmValue < 200 && (
                            <p className="mt-1 text-xs text-red-600">
                              ⚠️ PPM Value is below 200. Corrective action required.
                            </p>
                          )}
                        </div>

                        {showCorrectiveAction && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Corrective Action / Acción Correctiva <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              value={measurement.correctiveAction}
                              onChange={(e) => handleMeasurementChange(measurement.id, 'correctiveAction', e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              required
                              placeholder="Enter corrective action..."
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Checklist / Enviar Checklist'}
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
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-center"
            >
              View PDF / Ver PDF
            </a>
            <a
              href={pdfUrl}
              download
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-center"
            >
              Download PDF / Descargar PDF
            </a>
            <Link
              href="/area/calidad"
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-center"
            >
              Back to Quality / Volver a Calidad
            </Link>
          </div>
        </div>
      )}

      {/* Frequency Modal */}
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
              3 times in the turn, first sample at the beginning of the turn
            </p>
          </div>
          <div className="border-t pt-4">
            <p className="mb-2">
              <strong>Español:</strong>
            </p>
            <p>
              3 veces en el turno, primera muestra al inicio del turno
            </p>
          </div>
        </div>
      </Modal>

      {/* Process Modal */}
      <Modal
        isOpen={showProcessModal}
        onClose={() => setShowProcessModal(false)}
        title="Process / Proceso"
      >
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <p className="mb-2">
              <strong>English:</strong>
            </p>
            <p className="mb-4">
              Take the Chlorine indicator tape and place it in the solution found in the footbaths for 10 seconds, compare the result with the color chart. The value must be PPM ≥ 200 (blue tone indicator tape, See images) to indicate the presence of sanitizer.
            </p>
          </div>
          <div className="border-t pt-4">
            <p className="mb-2">
              <strong>Español:</strong>
            </p>
            <p>
              Tome la cinta indicadora de Cloro y colóquela en la solución encontrada en los pediluvios por 10 segundos, compare el resultado con la carta de colores. El valor debe ser PPM ≥ 200 (tono azul de la cinta indicadora, Ver imágenes) para indicar la presencia de sanitizante.
            </p>
          </div>
        </div>
      </Modal>

      {/* Color Chart Modal */}
      <Modal
        isOpen={showColorChartModal}
        onClose={() => setShowColorChartModal(false)}
        title="Color Chart / Carta de Colores"
      >
        <div className="space-y-4 text-sm text-gray-700">
          <div className="flex items-center gap-1 border-2 border-gray-300 rounded p-2 bg-white">
            <div className="flex-1 bg-gray-100 h-16 rounded flex items-center justify-center text-xs font-medium border border-gray-300">0</div>
            <div className="flex-1 bg-sky-200 h-16 rounded flex items-center justify-center text-xs font-medium border border-gray-300">25</div>
            <div className="flex-1 bg-blue-400 h-16 rounded flex items-center justify-center text-xs font-medium border-2 border-black">50</div>
            <div className="flex-1 bg-teal-600 h-16 rounded flex items-center justify-center text-xs font-medium border-2 border-black" style={{ backgroundColor: '#0d9488', outline: '3px solid #22c55e' }}>
              <span className="text-white font-bold">200</span>
            </div>
            <div className="flex-1 bg-amber-700 h-16 rounded flex items-center justify-center text-xs font-medium border-2 border-black">500</div>
            <div className="flex-1 bg-amber-600 h-16 rounded flex items-center justify-center text-xs font-medium border-2 border-black">800</div>
            <div className="flex-1 bg-orange-500 h-16 rounded flex items-center justify-center text-xs font-medium">1500</div>
            <div className="flex-1 bg-orange-400 h-16 rounded flex items-center justify-center text-xs font-medium">2000</div>
            <div className="ml-2 text-xs text-gray-600">ppm (mg/L)</div>
          </div>
          <p className="text-xs text-gray-600 text-center">Target: PPM ≥ 200 (highlighted in green)</p>
        </div>
      </Modal>

      {/* Problems and Corrective Actions Modal */}
      <Modal
        isOpen={showProblemsModal}
        onClose={() => setShowProblemsModal(false)}
        title="Problems and Corrective Actions / Problemas y Acciones Correctivas"
      >
        <div className="space-y-6 text-sm text-gray-700">
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Problem / Problema</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Corrective Action / Acción Correctiva</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-3 py-2">
                    <div className="font-medium mb-1">ChlorGuard under lower limit</div>
                    <div className="text-gray-600">ChlorGuard bajo el límite inferior</div>
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    <div className="mb-1">• Identify the point.</div>
                    <div className="mb-1">• Identificar el punto.</div>
                    <div className="mb-1">• Apply ChlorGuard solution until the concentration is within the established limits, recording the new result on the spreadsheet.</div>
                    <div className="text-gray-600">• Aplicar solución ChlorGuard hasta que la concentración esté dentro de los límites establecidos, registrando el nuevo resultado en la hoja de cálculo.</div>
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2">
                    <div className="font-medium mb-1">Dirty footbath.</div>
                    <div className="text-gray-600">Pediluvio sucio.</div>
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    <div className="mb-1">• Notify the person in charge of supplying the points to carry out the replacement.</div>
                    <div className="text-gray-600">• Notificar a la persona encargada de suministrar los puntos para realizar el reemplazo.</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  )
}

