'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react'
import { format } from 'date-fns'
import { pdf } from '@react-pdf/renderer'
import { ChecklistStaffGlassesAuditoryPDFDocument } from '@/components/ChecklistPDFStaffGlassesAuditory'
import { uploadChecklistPDF, insertChecklistStaffGlassesAuditory, getNextPdfNumber } from '@/lib/supabase/checklistStaffGlassesAuditory'
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

// Person Entry Interface
interface PersonEntry {
  id: number
  name: string
  area: string
  glassType: string
  conditionIn: 'comply' | 'not_comply' | ''
  conditionOut: 'comply' | 'not_comply' | ''
  observationIn: string
  observationOut: string
}

export default function ChecklistStaffGlassesAuditoryPage() {
  const { showToast } = useToast()
  
  // Section 1: Basic Info
  const [date, setDate] = useState('')
  const [monitorName, setMonitorName] = useState('')
  const [monitorSignature, setMonitorSignature] = useState('')

  // Section 2: Dynamic Persons
  const [persons, setPersons] = useState<PersonEntry[]>([
    {
      id: Date.now(),
      name: '',
      area: '',
      glassType: '',
      conditionIn: '',
      conditionOut: '',
      observationIn: '',
      observationOut: ''
    }
  ])

  // Form state
  const [isInitialSubmitted, setIsInitialSubmitted] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedPersonId, setExpandedPersonId] = useState<number | null>(null)
  const [noFindings, setNoFindings] = useState(false)

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
      const month = format(date, 'MMMM').toUpperCase() // Full month name
      const day = date.getDate().toString().padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      return dateStr
    }
  }

  // Reset form function
  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0]
    const newPersonId = Date.now()
    setDate(today)
    setMonitorName('')
    setMonitorSignature('')
    setPersons([{
      id: newPersonId,
      name: '',
      area: '',
      glassType: '',
      conditionIn: '',
      conditionOut: '',
      observationIn: '',
      observationOut: ''
    }])
    setExpandedPersonId(newPersonId)
    setIsInitialSubmitted(false)
    setPdfUrl(null)
    setNoFindings(false)
  }

  // Persistence hook
  const { clearDraft } = useChecklistPersistence(
    'checklist-staff-glasses-auditory-draft',
    { date, monitorName, monitorSignature, persons, noFindings },
    isInitialSubmitted,
    (data) => {
      if (data.date) setDate(data.date)
      if (data.monitorName) setMonitorName(data.monitorName)
      if (data.monitorSignature) setMonitorSignature(data.monitorSignature)
      if (data.noFindings !== undefined) setNoFindings(data.noFindings)
      if (data.persons && data.persons.length > 0) {
        setPersons(data.persons)
        // Expand the first person if we have saved data
        if (data.persons.length > 0) {
          setExpandedPersonId(data.persons[0].id)
        }
      } else {
        const today = new Date().toISOString().split('T')[0]
        setDate(today)
        const newPersonId = Date.now()
        setPersons([{
          id: newPersonId,
          name: '',
          area: '',
          glassType: '',
          conditionIn: '',
          conditionOut: '',
          observationIn: '',
          observationOut: ''
        }])
        setExpandedPersonId(newPersonId)
      }
    }
  )

  // Initialize dates on mount if no saved data
  useEffect(() => {
    if (!date) {
      const today = new Date().toISOString().split('T')[0]
      setDate(today)
    }
    if (persons.length === 0) {
      const newPersonId = Date.now()
      setPersons([{
        id: newPersonId,
        name: '',
        area: '',
        glassType: '',
        conditionIn: '',
        conditionOut: '',
        observationIn: '',
        observationOut: ''
      }])
      setExpandedPersonId(newPersonId)
    } else if (persons.length > 0 && expandedPersonId === null) {
      // Set first person as expanded if none is expanded
      setExpandedPersonId(persons[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Check if a person has missing data
  const hasMissingData = (person: PersonEntry): boolean => {
    if (!person.name || !person.area || !person.glassType || !person.conditionIn || !person.conditionOut) return true
    
    // If conditionIn is not_comply, observationIn is required
    if (person.conditionIn === 'not_comply' && !person.observationIn) return true
    
    // If conditionOut is not_comply, observationOut is required
    if (person.conditionOut === 'not_comply' && !person.observationOut) return true
    
    return false
  }

  // Add new person
  const handleAddPerson = () => {
    const newPersonId = Date.now()
    setPersons([
      ...persons,
      {
        id: newPersonId,
        name: '',
        area: '',
        glassType: '',
        conditionIn: '',
        conditionOut: '',
        observationIn: '',
        observationOut: ''
      }
    ])
    // Collapse all others and expand the new one
    setExpandedPersonId(newPersonId)
  }

  // Remove person
  const handleRemovePerson = (id: number) => {
    if (persons.length > 1) {
      const newPersons = persons.filter(p => p.id !== id)
      setPersons(newPersons)
      
      // If we removed the expanded person, expand the first remaining person
      if (expandedPersonId === id && newPersons.length > 0) {
        setExpandedPersonId(newPersons[0].id)
      }
    }
  }

  // Update person field
  const handlePersonChange = (
    id: number,
    field: keyof PersonEntry,
    value: string
  ) => {
    setPersons(persons.map(p => {
      if (p.id === id) {
        const updated = { ...p, [field]: value }
        // Clear observation when condition changes to comply
        if (field === 'conditionIn' && value === 'comply') {
          updated.observationIn = ''
        }
        if (field === 'conditionOut' && value === 'comply') {
          updated.observationOut = ''
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
      if (!date || !monitorName || !monitorSignature) {
        showToast('Please fill in all required fields in Section 1', 'error')
        setIsSubmitting(false)
        return
      }

      // If no findings is selected, we can submit without persons
      if (noFindings) {
        // Prepare form data for PDF
        const formData = {
          section1: {
            date: formatDate(date),
            monitorName,
            monitorSignature
          },
          section2: {
            noFindings: true,
            persons: []
          }
        }

        // Generate PDF
        showToast('Generating PDF...', 'info')
        const pdfBlob = await pdf(
          <ChecklistStaffGlassesAuditoryPDFDocument data={formData} />
        ).toBlob()

        // Create filename with date prefix and incrementing number
        const dateForFilename = formatDateForFilename(date)
        const pdfNumber = await getNextPdfNumber(dateForFilename)
        const filename = `${dateForFilename}-Staff-Glasses-Auditory-Control-${pdfNumber}.pdf`

        // Upload PDF to Supabase Storage
        showToast('Uploading PDF to storage...', 'info')
        const uploadedPdfUrl = await uploadChecklistPDF(pdfBlob, filename)

        // Prepare data for database
        const dbData = {
          date_string: formatDate(date),
          monitor_name: monitorName,
          monitor_signature: monitorSignature,
          no_findings: true,
          persons: [],
          pdf_url: uploadedPdfUrl
        }

        // Save to Supabase database
        showToast('Saving to database...', 'info')
        await insertChecklistStaffGlassesAuditory(dbData)

        // Set PDF URL for viewing
        setPdfUrl(uploadedPdfUrl)
        setIsInitialSubmitted(true)

        // Clear localStorage after successful submission
        clearDraft()

        showToast('Checklist submitted successfully!', 'success')
        setIsSubmitting(false)
        return
      }

      // Validate persons
      const hasInvalidPerson = persons.some(p => {
        if (!p.name || !p.area || !p.glassType || !p.conditionIn || !p.conditionOut) return true
        // If conditionIn is not_comply, observationIn is required
        if (p.conditionIn === 'not_comply' && !p.observationIn) return true
        // If conditionOut is not_comply, observationOut is required
        if (p.conditionOut === 'not_comply' && !p.observationOut) return true
        return false
      })

      if (hasInvalidPerson || persons.length === 0) {
        showToast('Please fill in all required fields for all persons or select "No Findings". Observations are required when condition is "Not Comply".', 'error')
        setIsSubmitting(false)
        return
      }

      // Prepare form data for PDF
      const formData = {
        section1: {
          date: formatDate(date),
          monitorName,
          monitorSignature
        },
        section2: {
          noFindings: false,
          persons: persons.map(p => ({
            name: p.name,
            area: p.area,
            glassType: p.glassType,
            conditionIn: p.conditionIn,
            conditionOut: p.conditionOut,
            observationIn: p.observationIn,
            observationOut: p.observationOut
          }))
        }
      }

      // Generate PDF
      showToast('Generating PDF...', 'info')
      const pdfBlob = await pdf(
        <ChecklistStaffGlassesAuditoryPDFDocument data={formData} />
      ).toBlob()

      // Create filename with date prefix and incrementing number
      const dateForFilename = formatDateForFilename(date)
      const pdfNumber = await getNextPdfNumber(dateForFilename)
      const filename = `${dateForFilename}-Staff-Glasses-Auditory-Control-${pdfNumber}.pdf`

      // Upload PDF to Supabase Storage
      showToast('Uploading PDF to storage...', 'info')
      const uploadedPdfUrl = await uploadChecklistPDF(pdfBlob, filename)

      // Prepare data for database
      const dbData = {
        date_string: formatDate(date),
        monitor_name: monitorName,
        monitor_signature: monitorSignature,
        no_findings: false,
        persons: formData.section2.persons,
        pdf_url: uploadedPdfUrl
      }

      // Save to Supabase database
      showToast('Saving to database...', 'info')
      await insertChecklistStaffGlassesAuditory(dbData)

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
          storageKey="checklist-staff-glasses-auditory-draft"
          checklistName="Process area staff glasses and auditory protector control"
          onReset={resetForm}
        />
      </div>

      <h1 className="text-3xl font-bold mb-2 text-center">
        Process area staff glasses and auditory protector control
      </h1>
      <p className="text-center text-sm text-gray-500 mb-2">Control de lentes y/o protector auditivo del personal que ingresa a areas de proceso</p>
      <p className="text-center text-sm text-gray-500 mb-6">Code: CF/PC-PG-ASC-004-RG004</p>

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

          {/* Section 2: Dynamic Persons */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">👥 Section 2 – Persons</h2>
              <button
                type="button"
                onClick={handleAddPerson}
                disabled={noFindings}
                className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Person
              </button>
            </div>

            {/* No Findings Option */}
            <div className="mb-4 p-4 border-2 border-gray-200 rounded-lg">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={noFindings}
                  onChange={(e) => {
                    setNoFindings(e.target.checked)
                    if (e.target.checked) {
                      // Clear all persons when no findings is checked
                      setPersons([{
                        id: Date.now(),
                        name: '',
                        area: '',
                        glassType: '',
                        conditionIn: '',
                        conditionOut: '',
                        observationIn: '',
                        observationOut: ''
                      }])
                      setExpandedPersonId(null)
                    }
                  }}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">
                  Sin hallazgos / No Findings
                </span>
              </label>
            </div>

            {!noFindings && (
              <div className="space-y-4">
                {persons.map((person, index) => {
                  const isExpanded = expandedPersonId === person.id
                  const hasMissing = hasMissingData(person)
                  const displayName = person.name || `Person #${index + 1}`

                  return (
                    <div key={person.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Collapsed Header */}
                      <div
                        className={`flex justify-between items-center p-4 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                        }`}
                        onClick={() => setExpandedPersonId(isExpanded ? null : person.id)}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          )}
                          <h3 className="font-medium text-gray-700">
                            Person #{index + 1}
                            {person.name && (
                              <span className="ml-2 text-gray-500 font-normal">- {person.name}</span>
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
                          {persons.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemovePerson(person.id)
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
                                Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={person.name}
                                onChange={(e) => handlePersonChange(person.id, 'name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Area <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={person.area}
                                onChange={(e) => handlePersonChange(person.id, 'area', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipo de lente / Glass Type <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={person.glassType}
                                onChange={(e) => handlePersonChange(person.id, 'glassType', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Condition In (when going into the process room) <span className="text-red-500">*</span>
                              </label>
                              <div className="flex gap-3">
                                <button
                                  type="button"
                                  onClick={() => handlePersonChange(person.id, 'conditionIn', 'comply')}
                                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                    person.conditionIn === 'comply'
                                      ? 'bg-green-600 text-white shadow-md'
                                      : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                                  }`}
                                >
                                  Comply
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePersonChange(person.id, 'conditionIn', 'not_comply')}
                                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                    person.conditionIn === 'not_comply'
                                      ? 'bg-red-600 text-white shadow-md'
                                      : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                                  }`}
                                >
                                  Not Comply
                                </button>
                              </div>
                              {person.conditionIn === 'not_comply' && (
                                <div className="mt-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Observation / Observación (Condition In) <span className="text-red-500">*</span>
                                  </label>
                                  <textarea
                                    value={person.observationIn}
                                    onChange={(e) => handlePersonChange(person.id, 'observationIn', e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                    placeholder="Enter observation..."
                                  />
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Condition Out (when leaving the process room) <span className="text-red-500">*</span>
                              </label>
                              <div className="flex gap-3">
                                <button
                                  type="button"
                                  onClick={() => handlePersonChange(person.id, 'conditionOut', 'comply')}
                                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                    person.conditionOut === 'comply'
                                      ? 'bg-green-600 text-white shadow-md'
                                      : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                                  }`}
                                >
                                  Comply
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePersonChange(person.id, 'conditionOut', 'not_comply')}
                                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                    person.conditionOut === 'not_comply'
                                      ? 'bg-red-600 text-white shadow-md'
                                      : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                                  }`}
                                >
                                  Not Comply
                                </button>
                              </div>
                              {person.conditionOut === 'not_comply' && (
                                <div className="mt-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Observation / Observación (Condition Out) <span className="text-red-500">*</span>
                                  </label>
                                  <textarea
                                    value={person.observationOut}
                                    onChange={(e) => handlePersonChange(person.id, 'observationOut', e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                    placeholder="Enter observation..."
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Checklist'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

