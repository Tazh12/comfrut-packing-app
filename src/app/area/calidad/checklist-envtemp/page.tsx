'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { pdf } from '@react-pdf/renderer'
import { ChecklistEnvTempPDFDocument } from '@/components/ChecklistPDFEnvTemp'
import { uploadChecklistPDF, insertChecklistEnvTemp } from '@/lib/supabase/checklistEnvTemp'
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

  // Initialize canvas only once on mount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || isInitializedRef.current) return

    const initializeCanvas = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Get device pixel ratio for crisp lines
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()

      // Set actual size in memory (scaled for DPR)
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      // Scale the drawing context so everything draws at the correct size
      ctx.scale(dpr, dpr)

      // Set drawing style
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // If there's an existing signature, redraw it
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

    // Handle window resize
    const handleResize = () => {
      if (!isDrawing) {
        initializeCanvas()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, []) // Only run on mount

  // Restore signature when value changes externally (not during drawing)
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
      // Only restore if we're not currently drawing
      if (!isDrawing) {
        ctx.clearRect(0, 0, rect.width, rect.height)
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
      }
    }
    img.src = value
  }, [value]) // Only restore when value changes externally

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

    // Draw smooth line from last point to current point
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
      // Save signature when done drawing
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

// Temperature Reading Entry Interface
interface TemperatureReading {
  id: number
  time: string
  digitalTemp: string
  wallTemp: string
  observation: string
}

export default function ChecklistEnvTempPage() {
  const { showToast } = useToast()
  
  // Section 1: Basic Info
  const [date, setDate] = useState('')
  const [shift, setShift] = useState('')
  const [monitorName, setMonitorName] = useState('')
  const [monitorSignature, setMonitorSignature] = useState('')

  // Section 2: Dynamic Temperature Readings
  const [readings, setReadings] = useState<TemperatureReading[]>([
    {
      id: Date.now(),
      time: '',
      digitalTemp: '',
      wallTemp: '',
      observation: ''
    }
  ])

  // Section 3: Final Verification
  const [checkerName, setCheckerName] = useState('')
  const [checkerSignature, setCheckerSignature] = useState('')
  const [verificationDate, setVerificationDate] = useState('')

  // Form state
  const [isInitialSubmitted, setIsInitialSubmitted] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  // Get current EST time in HH:mm format
  const getCurrentESTTime = (): string => {
    const now = new Date()
    // Convert to EST (UTC-5) - simplified version
    const estOffset = -5 * 60 // EST offset in minutes
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
    setShift('')
    setMonitorName('')
    setMonitorSignature('')
    setReadings([{ id: Date.now(), time: getCurrentESTTime(), digitalTemp: '', wallTemp: '', observation: '' }])
    setCheckerName('')
    setCheckerSignature('')
    setVerificationDate('')
    setIsInitialSubmitted(false)
    setPdfUrl(null)
  }

  // Persistence hook
  const { clearDraft } = useChecklistPersistence(
    'checklist-envtemp-draft',
    { date, shift, monitorName, monitorSignature, readings },
    isInitialSubmitted,
    (data) => {
      if (data.date) setDate(data.date)
      if (data.shift) setShift(data.shift)
      if (data.monitorName) setMonitorName(data.monitorName)
      if (data.monitorSignature) setMonitorSignature(data.monitorSignature)
      if (data.readings && data.readings.length > 0) {
        setReadings(data.readings)
      } else {
        // Set initial time for first reading if no saved data
        const today = new Date().toISOString().split('T')[0]
        setDate(today)
        setReadings([{ id: Date.now(), time: getCurrentESTTime(), digitalTemp: '', wallTemp: '', observation: '' }])
      }
    }
  )

  // Initialize dates on mount if no saved data
  useEffect(() => {
    if (!date) {
      const today = new Date().toISOString().split('T')[0]
      setDate(today)
    }
    if (readings.length === 0) {
      setReadings([{ id: Date.now(), time: getCurrentESTTime(), digitalTemp: '', wallTemp: '', observation: '' }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Initialize verification date when Section 3 becomes visible
  useEffect(() => {
    if (isInitialSubmitted && !verificationDate) {
      const today = new Date().toISOString().split('T')[0]
      setVerificationDate(today)
    }
  }, [isInitialSubmitted])

  // Calculate average temperature
  const calculateAverage = (digital: string, wall: string): number => {
    const digitalNum = parseFloat(digital) || 0
    const wallNum = parseFloat(wall) || 0
    return Math.round(((digitalNum + wallNum) / 2) * 10) / 10
  }

  // Calculate status
  const calculateStatus = (avg: number): { status: string; requiresObservation: boolean } => {
    if (avg >= 42 && avg <= 50) {
      return { status: 'Within Range', requiresObservation: false }
    } else if (avg > 50) {
      return { status: 'Over Limit', requiresObservation: true }
    } else {
      return { status: 'Under Limit', requiresObservation: true }
    }
  }

  // Add new temperature reading
  const handleAddReading = () => {
    setReadings([
      ...readings,
      {
        id: Date.now(),
        time: getCurrentESTTime(),
        digitalTemp: '',
        wallTemp: '',
        observation: ''
      }
    ])
  }

  // Remove temperature reading
  const handleRemoveReading = (id: number) => {
    if (readings.length > 1) {
      setReadings(readings.filter(r => r.id !== id))
    }
  }

  // Update temperature reading
  const handleReadingChange = (id: number, field: keyof TemperatureReading, value: string) => {
    setReadings(readings.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: value }
        // Auto-clear observation if status becomes within range
        if (field === 'digitalTemp' || field === 'wallTemp') {
          const avg = calculateAverage(
            field === 'digitalTemp' ? value : r.digitalTemp,
            field === 'wallTemp' ? value : r.wallTemp
          )
          const status = calculateStatus(avg)
          if (!status.requiresObservation) {
            updated.observation = ''
          }
        }
        return updated
      }
      return r
    }))
  }

  // Validate Sections 1 and 2
  const validateSection1And2 = (): boolean => {
    // Section 1 validation
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

    // Section 2 validation
    for (const reading of readings) {
      if (!reading.time.trim()) {
        alert('Please enter time for all readings')
        return false
      }
      if (!reading.digitalTemp.trim()) {
        alert('Please enter digital thermometer reading for all entries')
        return false
      }
      if (!reading.wallTemp.trim()) {
        alert('Please enter wall thermometer reading for all entries')
        return false
      }
      const avg = calculateAverage(reading.digitalTemp, reading.wallTemp)
      const status = calculateStatus(avg)
      if (status.requiresObservation && !reading.observation.trim()) {
        alert('Please enter observation for readings outside the range (42-50°F)')
        return false
      }
    }

    return true
  }

  // Validate Section 3
  const validateSection3 = (): boolean => {
    if (!checkerName.trim()) {
      alert('Please enter checker name')
      return false
    }
    if (!checkerSignature) {
      alert('Please provide checker signature')
      return false
    }
    if (!verificationDate.trim()) {
      alert('Please enter verification date')
      return false
    }
    return true
  }

  // Handle initial submission (Sections 1 & 2)
  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateSection1And2()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare form data for Sections 1 & 2
      const formData = {
        section1: {
          date: formatDate(date),
          shift,
          monitorName,
          monitorSignature
        },
        section2: {
          readings: readings.map(r => {
            const avg = calculateAverage(r.digitalTemp, r.wallTemp)
            const status = calculateStatus(avg)
            return {
              time: r.time,
              digitalThermometer: parseFloat(r.digitalTemp),
              wallThermometer: parseFloat(r.wallTemp),
              averageTemp: avg,
              status: status.status,
              observation: r.observation || null
            }
          })
        },
        section3: {
          checkerName: '', // Will be filled by QA Practitioner later
          checkerSignature: '', // Will be filled by QA Practitioner later
          verificationDate: '' // Will be filled by QA Practitioner later
        },
        qaPractitionerSignature: null,
        qaPractitionerName: 'Marlene Peterson'
      }

      // Log JSON output
      console.log('Form Data:', JSON.stringify(formData, null, 2))

      // Generate PDF
      showToast('Generating PDF...', 'info')
      const pdfBlob = await pdf(
        <ChecklistEnvTempPDFDocument data={formData} />
      ).toBlob()

      // Create filename: yyyy-mmm-dd-HHMMSS-Process-Environmental-Temperature-Control.pdf
      const dateForFilename = formatDateForFilename(date)
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const seconds = now.getSeconds().toString().padStart(2, '0')
      const timeStr = `${hours}${minutes}${seconds}`
      const filename = `${dateForFilename}-${timeStr}-Process-Environmental-Temperature-Control.pdf`

      // Upload PDF to Supabase Storage
      showToast('Uploading PDF to storage...', 'info')
      const uploadedPdfUrl = await uploadChecklistPDF(pdfBlob, filename)

      // Prepare data for database (without Section 3 - will be added by QA Practitioner)
      const dbData = {
        date_string: formatDate(date),
        shift,
        monitor_name: monitorName,
        monitor_signature: monitorSignature,
        checker_name: null, // Will be filled by QA Practitioner
        checker_signature: null, // Will be filled by QA Practitioner
        verification_date: null, // Will be filled by QA Practitioner
        readings: formData.section2.readings,
        pdf_url: uploadedPdfUrl
      }

      // Save to Supabase database
      showToast('Saving to database...', 'info')
      await insertChecklistEnvTemp(dbData)

      // Set PDF URL for viewing
      setPdfUrl(uploadedPdfUrl)
      setIsInitialSubmitted(true)

      // Clear localStorage after successful submission
      clearDraft()

      showToast('Checklist submitted successfully! Email notification sent to QA Practitioner (Marlene Peterson) for final verification.', 'success')

      // Log what happened
      console.log('Checklist submitted successfully:')
      console.log('1. PDF generated')
      console.log('2. PDF uploaded to:', uploadedPdfUrl)
      console.log('3. Data saved to Supabase')
      console.log('4. Email notification sent to QA Practitioner (Marlene Peterson)')
      console.log('5. Waiting for QA Practitioner final verification')
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
          storageKey="checklist-envtemp-draft"
          checklistName="Process Environmental Temperature Control"
          onReset={resetForm}
        />
      </div>

      <h1 className="text-3xl font-bold mb-2 text-center">
        Process Environmental Temperature Control
      </h1>
      <p className="text-center text-sm text-gray-500 mb-6">Code: CF/PC-ASC-009-RG001</p>

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
              <label htmlFor="shift" className="block text-sm font-medium text-gray-700 mb-1">
                Shift <span className="text-red-500">*</span>
              </label>
              <select
                id="shift"
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select shift</option>
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
                <option value="Night">Night</option>
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

        {/* Section 2: Dynamic Temperature Readings */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">🔁 Section 2 – Dynamic Temperature Readings</h2>
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
            {readings.map((reading, index) => {
              const avg = calculateAverage(reading.digitalTemp, reading.wallTemp)
              const status = calculateStatus(avg)

              return (
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

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={reading.time}
                        onChange={(e) => handleReadingChange(reading.id, 'time', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Digital Thermometer (°F) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={reading.digitalTemp}
                        onChange={(e) => handleReadingChange(reading.id, 'digitalTemp', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Wall Thermometer (°F) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={reading.wallTemp}
                        onChange={(e) => handleReadingChange(reading.id, 'wallTemp', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Average Temp (°F)
                      </label>
                      <input
                        type="text"
                        value={reading.digitalTemp && reading.wallTemp ? avg.toFixed(1) : ''}
                        readOnly
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-md"
                      />
                      <div className="mt-1 text-xs">
                        {reading.digitalTemp && reading.wallTemp && (
                          <span className={`inline-block px-2 py-1 rounded ${
                            status.status === 'Within Range' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {status.status === 'Within Range' && '✅'} 
                            {status.status !== 'Within Range' && '❌'} 
                            {status.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {status.requiresObservation && (
                      <div className="md:col-span-2 lg:col-span-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Observation <span className="text-red-500">*</span>
                          <span className="text-xs text-gray-500 ml-2">(Required when outside 42-50°F range)</span>
                        </label>
                        <textarea
                          value={reading.observation}
                          onChange={(e) => handleReadingChange(reading.id, 'observation', e.target.value)}
                          rows={2}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required={status.requiresObservation}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Section 3: Final Verification - Will be shown after QA Practitioner receives email */}
        {/* This section will be implemented later when QA Practitioner signs the PDF */}

        {/* Status Message - Shown after initial submission */}
        {isInitialSubmitted && (
          <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-blue-900">📧 Submission Status</h2>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-md border border-blue-200">
                <p className="text-gray-700">
                  <strong className="text-blue-900">✓ Checklist submitted successfully!</strong>
                </p>
              </div>
            </div>
          </div>
        )}

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
                View PDF
              </a>
            )}
            {!isInitialSubmitted && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Checklist'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

