'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react'
import { format } from 'date-fns'
import { pdf } from '@react-pdf/renderer'
import { ChecklistMaterialsControlPDFDocument } from '@/components/ChecklistPDFMaterialsControl'
import { uploadChecklistPDF, insertChecklistMaterialsControl, getNextPdfNumber } from '@/lib/supabase/checklistMaterialsControl'
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

// Material options
const MATERIAL_OPTIONS = [
  { value: 'Scoop/Cucharón', label: 'Scoop / Cucharón' },
  { value: 'Scissors/Tijeras', label: 'Scissors / Tijeras' },
  { value: 'Gloves/Guantes', label: 'Gloves / Guantes' },
  { value: 'Awl', label: 'Awl' },
  { value: 'Punzón', label: 'Punzón' }
]

// Material status options
const MATERIAL_STATUS_OPTIONS = [
  { value: 'Good/Bueno', label: 'Good / Bueno' },
  { value: 'Bad/Malo', label: 'Bad / Malo' }
]

// Personnel Material Entry Interface
interface PersonnelMaterial {
  id: number
  personName: string
  material: string
  quantity: number
  materialStatus: string // 'Good/Bueno' | 'Bad/Malo'
  observation: string
  // Material returned
  returnMotive: string
  quantityReceived: number | null
  materialStatusReceived: string // 'Good/Bueno' | 'Bad/Malo' | ''
  observationReceived: string
}

export default function ChecklistMaterialsControlPage() {
  const { showToast } = useToast()
  
  // Section 1: Basic Info
  const [date, setDate] = useState('')
  const [productiveArea, setProductiveArea] = useState('')
  const [lineManagerName, setLineManagerName] = useState('')
  const [monitorName, setMonitorName] = useState('')
  const [monitorSignature, setMonitorSignature] = useState('')

  // Section 2: Dynamic Personnel Materials
  const [personnelMaterials, setPersonnelMaterials] = useState<PersonnelMaterial[]>([
    {
      id: Date.now(),
      personName: '',
      material: '',
      quantity: 0,
      materialStatus: '',
      observation: '',
      returnMotive: '',
      quantityReceived: null,
      materialStatusReceived: '',
      observationReceived: ''
    }
  ])

  // Form state
  const [isInitialSubmitted, setIsInitialSubmitted] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedPersonnelId, setExpandedPersonnelId] = useState<number | null>(null)

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

  // Format date for PDF filename: YYYY-MMMM-DD
  const formatDateForFilename = (dateStr: string): string => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = format(date, 'MMMM').toUpperCase()
      const day = date.getDate().toString().padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      return dateStr
    }
  }

  // Reset form function
  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0]
    const newPersonnelId = Date.now()
    setDate(today)
    setProductiveArea('')
    setLineManagerName('')
    setMonitorName('')
    setMonitorSignature('')
    setPersonnelMaterials([{
      id: newPersonnelId,
      personName: '',
      material: '',
      quantity: 0,
      materialStatus: '',
      observation: '',
      returnMotive: '',
      quantityReceived: null,
      materialStatusReceived: '',
      observationReceived: ''
    }])
    setExpandedPersonnelId(newPersonnelId)
    setIsInitialSubmitted(false)
    setPdfUrl(null)
  }

  // Persistence hook
  const { clearDraft } = useChecklistPersistence(
    'checklist-materials-control-draft',
    { date, productiveArea, lineManagerName, monitorName, monitorSignature, personnelMaterials },
    isInitialSubmitted,
    (data) => {
      if (data.date) setDate(data.date)
      if (data.productiveArea) setProductiveArea(data.productiveArea)
      if (data.lineManagerName) setLineManagerName(data.lineManagerName)
      if (data.monitorName) setMonitorName(data.monitorName)
      if (data.monitorSignature) setMonitorSignature(data.monitorSignature)
      if (data.personnelMaterials && data.personnelMaterials.length > 0) {
        setPersonnelMaterials(data.personnelMaterials)
        if (data.personnelMaterials.length > 0) {
          setExpandedPersonnelId(data.personnelMaterials[0].id)
        }
      } else {
        const today = new Date().toISOString().split('T')[0]
        setDate(today)
        const newPersonnelId = Date.now()
        setPersonnelMaterials([{
          id: newPersonnelId,
          personName: '',
          material: '',
          quantity: 0,
          materialStatus: '',
          observation: '',
          returnMotive: '',
          quantityReceived: null,
          materialStatusReceived: '',
          observationReceived: ''
        }])
        setExpandedPersonnelId(newPersonnelId)
      }
    }
  )

  // Initialize dates on mount if no saved data
  useEffect(() => {
    if (!date) {
      const today = new Date().toISOString().split('T')[0]
      setDate(today)
    }
    if (personnelMaterials.length === 0) {
      const newPersonnelId = Date.now()
      setPersonnelMaterials([{
        id: newPersonnelId,
        personName: '',
        material: '',
        quantity: 0,
        materialStatus: '',
        observation: '',
        returnMotive: '',
        quantityReceived: null,
        materialStatusReceived: '',
        observationReceived: ''
      }])
      setExpandedPersonnelId(newPersonnelId)
    } else if (personnelMaterials.length > 0 && expandedPersonnelId === null) {
      setExpandedPersonnelId(personnelMaterials[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Check if quantities match
  const quantitiesMatch = (personnel: PersonnelMaterial): boolean => {
    if (personnel.quantityReceived === null) return true // Not filled yet
    return personnel.quantityReceived === personnel.quantity
  }

  // Check if quantity received exceeds quantity handed out
  const quantityExceeds = (personnel: PersonnelMaterial): boolean => {
    if (personnel.quantityReceived === null) return false
    return personnel.quantityReceived > personnel.quantity
  }

  // Check if a personnel entry has missing data
  const hasMissingData = (personnel: PersonnelMaterial): boolean => {
    // Check required fields
    if (!personnel.personName || !personnel.material || personnel.quantity <= 0 || !personnel.materialStatus) {
      return true
    }
    
    // If status is bad, observation is mandatory
    if (personnel.materialStatus === 'Bad/Malo' && !personnel.observation.trim()) {
      return true
    }
    
    // Material returned fields are required
    if (!personnel.returnMotive.trim() || personnel.quantityReceived === null || personnel.quantityReceived < 0 || !personnel.materialStatusReceived) {
      return true
    }
    
    // Quantity received cannot exceed quantity handed out
    if (quantityExceeds(personnel)) {
      return true
    }
    
    // If quantities don't match, observation is mandatory
    if (!quantitiesMatch(personnel) && !personnel.observationReceived.trim()) {
      return true
    }
    
    // If received status is bad, observation is mandatory
    if (personnel.materialStatusReceived === 'Bad/Malo' && !personnel.observationReceived.trim()) {
      return true
    }
    
    return false
  }

  // Add new personnel material entry
  const handleAddPersonnelMaterial = () => {
    const newPersonnelId = Date.now()
    setPersonnelMaterials([
      ...personnelMaterials,
      {
        id: newPersonnelId,
        personName: '',
        material: '',
        quantity: 0,
        materialStatus: '',
        observation: '',
        returnMotive: '',
        quantityReceived: null,
        materialStatusReceived: '',
        observationReceived: ''
      }
    ])
    setExpandedPersonnelId(newPersonnelId)
  }

  // Remove personnel material entry
  const handleRemovePersonnelMaterial = (id: number) => {
    if (personnelMaterials.length > 1) {
      const newPersonnel = personnelMaterials.filter(p => p.id !== id)
      setPersonnelMaterials(newPersonnel)
      
      if (expandedPersonnelId === id && newPersonnel.length > 0) {
        setExpandedPersonnelId(newPersonnel[0].id)
      }
    }
  }

  // Update personnel material field
  const handlePersonnelMaterialChange = (
    id: number,
    field: keyof PersonnelMaterial,
    value: any
  ) => {
    setPersonnelMaterials(personnelMaterials.map(p => {
      if (p.id === id) {
        const updated = { ...p, [field]: value }
        // Clear observation if status changes to good
        if (field === 'materialStatus' && value === 'Good/Bueno') {
          updated.observation = ''
        }
        if (field === 'materialStatusReceived' && value === 'Good/Bueno') {
          updated.observationReceived = ''
        }
        return updated
      }
      return p
    }))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate form
      if (!date || !productiveArea || !lineManagerName || !monitorName || !monitorSignature) {
        showToast('Please fill in all required fields in Section 1', 'error')
        setIsSubmitting(false)
        return
      }

      // Validate personnel materials
      const hasInvalidPersonnel = personnelMaterials.some(p => hasMissingData(p))

      if (hasInvalidPersonnel) {
        showToast('Please fill in all required fields for all personnel entries', 'error')
        setIsSubmitting(false)
        return
      }

      // Validate quantity constraints
      const hasQuantityIssues = personnelMaterials.some(p => {
        if (p.quantityReceived === null) return false
        if (p.quantityReceived > p.quantity) {
          return true
        }
        if (p.quantityReceived !== p.quantity && !p.observationReceived.trim()) {
          return true
        }
        return false
      })

      if (hasQuantityIssues) {
        showToast('Please fix quantity mismatches and add required observations', 'error')
        setIsSubmitting(false)
        return
      }

      // Prepare form data for PDF
      const formData = {
        section1: {
          date: formatDate(date),
          productiveArea,
          lineManagerName,
          monitorName,
          monitorSignature
        },
        section2: {
          personnelMaterials: personnelMaterials.map(p => ({
            personName: p.personName,
            material: p.material,
            quantity: p.quantity,
            materialStatus: p.materialStatus,
            observation: p.observation,
            returnMotive: p.returnMotive,
            quantityReceived: p.quantityReceived || 0,
            materialStatusReceived: p.materialStatusReceived,
            observationReceived: p.observationReceived
          }))
        }
      }

      // Generate PDF
      showToast('Generating PDF...', 'info')
      const pdfBlob = await pdf(
        <ChecklistMaterialsControlPDFDocument data={formData} />
      ).toBlob()

      // Create filename with date prefix and incrementing number
      const dateForFilename = formatDateForFilename(date)
      const pdfNumber = await getNextPdfNumber(dateForFilename)
      const filename = `${dateForFilename}-Internal-Control-Materials-${pdfNumber}.pdf`

      // Upload PDF to Supabase Storage
      showToast('Uploading PDF to storage...', 'info')
      const uploadedPdfUrl = await uploadChecklistPDF(pdfBlob, filename)

      // Prepare data for database
      const dbData = {
        date_string: formatDate(date),
        productive_area: productiveArea,
        line_manager_name: lineManagerName,
        monitor_name: monitorName,
        monitor_signature: monitorSignature,
        personnel_materials: formData.section2.personnelMaterials,
        pdf_url: uploadedPdfUrl
      }

      // Save to Supabase database
      showToast('Saving to database...', 'info')
      await insertChecklistMaterialsControl(dbData)

      // Set PDF URL for viewing
      setPdfUrl(uploadedPdfUrl)
      setIsInitialSubmitted(true)

      // Clear localStorage after successful submission
      clearDraft()

      showToast('Checklist submitted successfully!', 'success')
    } catch (error) {
      console.error('Error submitting checklist:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      showToast(`Error submitting checklist: ${errorMessage}`, 'error')
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
          storageKey="checklist-materials-control-draft"
          checklistName="Internal control of materials used in production areas"
          onReset={resetForm}
        />
      </div>

      <h1 className="text-3xl font-bold mb-2 text-center">
        Internal control of materials used in production areas
      </h1>
      <p className="text-center text-sm text-gray-500 mb-2">Control interno de materiales usados en áreas productivas</p>
      <p className="text-center text-sm text-gray-500 mb-6">Code: CF/PC-ASC-004-RG008</p>

      {pdfUrl && isInitialSubmitted ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold mb-4">Checklist Submitted Successfully!</h2>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            View PDF
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
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
                <label htmlFor="productiveArea" className="block text-sm font-medium text-gray-700 mb-1">
                  Productive Area <span className="text-red-500">*</span>
                </label>
                <input
                  id="productiveArea"
                  type="text"
                  value={productiveArea}
                  onChange={(e) => setProductiveArea(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="lineManagerName" className="block text-sm font-medium text-gray-700 mb-1">
                  Line Manager Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="lineManagerName"
                  type="text"
                  value={lineManagerName}
                  onChange={(e) => setLineManagerName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
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

          {/* Section 2: Dynamic Personnel Materials */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">👥 Section 2 – Personnel Materials</h2>
              <button
                type="button"
                onClick={handleAddPersonnelMaterial}
                className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Personnel
              </button>
            </div>

            <div className="space-y-4">
              {personnelMaterials.map((personnel, index) => {
                const isExpanded = expandedPersonnelId === personnel.id
                const hasMissing = hasMissingData(personnel)
                const displayName = personnel.personName || `Personnel #${index + 1}`

                return (
                  <div key={personnel.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Collapsed Header */}
                    <div
                      className={`flex justify-between items-center p-4 cursor-pointer transition-colors ${
                        isExpanded ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => setExpandedPersonnelId(isExpanded ? null : personnel.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                        <h3 className="font-medium text-gray-700">
                          Personnel #{index + 1}
                          {personnel.personName && (
                            <span className="ml-2 text-gray-500 font-normal">- {personnel.personName}</span>
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
                        {personnelMaterials.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemovePersonnelMaterial(personnel.id)
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
                        <div className="space-y-6">
                          {/* Person Name */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Person Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={personnel.personName}
                              onChange={(e) => handlePersonnelMaterialChange(personnel.id, 'personName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>

                          {/* Material Handed Out Section */}
                          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                            <h4 className="text-lg font-semibold mb-4 text-blue-900 flex items-center gap-2">
                              <span>📤</span>
                              Material Handed Out / Material Entregado
                            </h4>
                            
                            <div className="space-y-4">
                              {/* Material Selection */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Material <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={personnel.material}
                                  onChange={(e) => handlePersonnelMaterialChange(personnel.id, 'material', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                                  required
                                >
                                  <option value="">Select material</option>
                                  {MATERIAL_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Quantity */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Quantity <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={personnel.quantity || ''}
                                  onChange={(e) => handlePersonnelMaterialChange(personnel.id, 'quantity', parseInt(e.target.value) || 0)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                                  required
                                />
                              </div>

                              {/* Material Status */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Material Status <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-3">
                                  {MATERIAL_STATUS_OPTIONS.map(option => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => handlePersonnelMaterialChange(personnel.id, 'materialStatus', option.value)}
                                      className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                        personnel.materialStatus === option.value
                                          ? option.value === 'Good/Bueno'
                                            ? 'bg-green-600 text-white shadow-md'
                                            : 'bg-red-600 text-white shadow-md'
                                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                      }`}
                                    >
                                      {option.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Observation (mandatory if bad, optional if good) */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Observation {personnel.materialStatus === 'Bad/Malo' && <span className="text-red-500">*</span>}
                                </label>
                                <textarea
                                  value={personnel.observation}
                                  onChange={(e) => handlePersonnelMaterialChange(personnel.id, 'observation', e.target.value)}
                                  rows={2}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                                  required={personnel.materialStatus === 'Bad/Malo'}
                                  placeholder={personnel.materialStatus === 'Bad/Malo' ? 'Observation is required for bad status' : 'Optional observation'}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Material Returned Section */}
                          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                            <h4 className="text-lg font-semibold mb-4 text-green-900 flex items-center gap-2">
                              <span>📥</span>
                              Material Returned / Material Devuelto
                            </h4>
                            
                            <div className="space-y-4">
                              {/* Return Motive */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Return Motive / Motivo de Devolución <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={personnel.returnMotive}
                                  onChange={(e) => handlePersonnelMaterialChange(personnel.id, 'returnMotive', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                                  required
                                  placeholder="Enter return motive..."
                                />
                              </div>

                              {/* Quantity Received */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Quantity Received / Cantidad Recibida <span className="text-red-500">*</span>
                                  {personnel.quantity > 0 && (
                                    <span className="text-xs text-gray-500 font-normal ml-2">
                                      (Max: {personnel.quantity})
                                    </span>
                                  )}
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max={personnel.quantity || undefined}
                                  value={personnel.quantityReceived || ''}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || null
                                    if (value !== null && value > personnel.quantity) {
                                      // Prevent entering more than quantity handed out
                                      return
                                    }
                                    handlePersonnelMaterialChange(personnel.id, 'quantityReceived', value)
                                  }}
                                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white ${
                                    quantityExceeds(personnel)
                                      ? 'border-red-500 bg-red-50'
                                      : !quantitiesMatch(personnel) && personnel.quantityReceived !== null
                                      ? 'border-amber-500 bg-amber-50'
                                      : 'border-gray-300'
                                  }`}
                                  required
                                />
                                {quantityExceeds(personnel) && (
                                  <p className="mt-1 text-sm text-red-600">
                                    ⚠️ Quantity received cannot exceed quantity handed out ({personnel.quantity})
                                  </p>
                                )}
                                {!quantitiesMatch(personnel) && personnel.quantityReceived !== null && !quantityExceeds(personnel) && (
                                  <p className="mt-1 text-sm text-amber-600">
                                    ⚠️ Quantities don't match. Handed out: {personnel.quantity}, Received: {personnel.quantityReceived}. Observation is required.
                                  </p>
                                )}
                              </div>

                              {/* Material Status Received */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Material Status Received / Estado del Material Recibido <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-3">
                                  {MATERIAL_STATUS_OPTIONS.map(option => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => handlePersonnelMaterialChange(personnel.id, 'materialStatusReceived', option.value)}
                                      className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                        personnel.materialStatusReceived === option.value
                                          ? option.value === 'Good/Bueno'
                                            ? 'bg-green-600 text-white shadow-md'
                                            : 'bg-red-600 text-white shadow-md'
                                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                      }`}
                                    >
                                      {option.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Observation Received (mandatory if bad, mandatory if quantities don't match, optional if good) */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Observation Received / Observación Recibida 
                                  {(personnel.materialStatusReceived === 'Bad/Malo' || !quantitiesMatch(personnel)) && (
                                    <span className="text-red-500">*</span>
                                  )}
                                </label>
                                <textarea
                                  value={personnel.observationReceived}
                                  onChange={(e) => handlePersonnelMaterialChange(personnel.id, 'observationReceived', e.target.value)}
                                  rows={2}
                                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white ${
                                    (personnel.materialStatusReceived === 'Bad/Malo' || !quantitiesMatch(personnel)) && !personnel.observationReceived.trim()
                                      ? 'border-red-500 bg-red-50'
                                      : 'border-gray-300'
                                  }`}
                                  required={personnel.materialStatusReceived === 'Bad/Malo' || !quantitiesMatch(personnel)}
                                  placeholder={
                                    personnel.materialStatusReceived === 'Bad/Malo'
                                      ? 'Observation is required for bad status'
                                      : !quantitiesMatch(personnel)
                                      ? 'Observation is required when quantities do not match'
                                      : 'Optional observation'
                                  }
                                />
                                {!quantitiesMatch(personnel) && !personnel.observationReceived.trim() && (
                                  <p className="mt-1 text-sm text-red-600">
                                    ⚠️ Observation is required when quantities don't match
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">📄 Controls</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              {isInitialSubmitted && pdfUrl && (
                <a
                  href={`${pdfUrl}?t=${Date.now()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-center"
                >
                  View PDF / Ver PDF
                </a>
              )}
              {!isInitialSubmitted && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Checklist / Enviar Checklist'}
                </button>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

