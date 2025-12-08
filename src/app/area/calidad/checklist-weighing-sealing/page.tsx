'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { pdf } from '@react-pdf/renderer'
import { ChecklistWeighingSealingPDFDocument } from '@/components/ChecklistPDFWeighingSealing'
import { uploadChecklistPDF, insertChecklistWeighingSealing, getNextPdfNumber } from '@/lib/supabase/checklistWeighingSealing'
import { useToast } from '@/context/ToastContext'
import { useChecklistPersistence } from '@/lib/hooks/useChecklistPersistence'
import { DeleteDraftButton } from '@/components/DeleteDraftButton'
import { supabase } from '@/lib/supabase'

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

      // Store current value before resizing
      const currentValue = value

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)

      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // Restore signature if it exists
      if (currentValue) {
        const img = new Image()
        img.onload = () => {
          ctx.clearRect(0, 0, rect.width, rect.height)
          ctx.drawImage(img, 0, 0, rect.width, rect.height)
        }
        img.src = currentValue
      }
    }

    // Initialize on mount
    if (!isInitializedRef.current) {
      initializeCanvas()
      isInitializedRef.current = true
    }

    // Use ResizeObserver to detect layout changes
    const resizeObserver = new ResizeObserver(() => {
      if (!isDrawing) {
        initializeCanvas()
      }
    })

    resizeObserver.observe(canvas)

    // Also listen to window resize
    const handleResize = () => {
      if (!isDrawing) {
        initializeCanvas()
      }
    }

    window.addEventListener('resize', handleResize)
    
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
    }
  }, [value, isDrawing])

  useEffect(() => {
    if (isDrawing || !value || justSavedRef.current) {
      justSavedRef.current = false
      return
    }
    
    const canvas = canvasRef.current
    if (!canvas) return

    // Use requestAnimationFrame to ensure layout has settled
    requestAnimationFrame(() => {
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
    })
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

// Bag Entry Interface
interface BagEntry {
  id: number
  time: string
  bagCode: string
  weights: string[] // 10 weights
  sealed: string[] // 10 sealed statuses (Comply/not comply)
  otherCodification: string
  declarationOfOrigin: string // Comply/not comply
}

export default function ChecklistWeighingSealingPage() {
  const { showToast } = useToast()
  
  // Section 1: Basic Info
  const [date, setDate] = useState('')
  const [shift, setShift] = useState('')
  const [processRoom, setProcessRoom] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [monitorName, setMonitorName] = useState('')
  const [monitorSignature, setMonitorSignature] = useState('')

  // Products and brands
  const [brands, setBrands] = useState<string[]>([])
  const [products, setProducts] = useState<string[]>([])

  // Section 2: Dynamic Bag Entries
  const [bagEntries, setBagEntries] = useState<BagEntry[]>([])
  const [expandedEntryId, setExpandedEntryId] = useState<number | null>(null)

  // Section 3: Comments
  const [comments, setComments] = useState<string>('')
  const [showCommentsInput, setShowCommentsInput] = useState(false)

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

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

  // Get current time in HH:mm format
  const getCurrentTime = (): string => {
    const now = new Date()
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // Reset form function
  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0]
    setDate(today)
    setShift('')
    setProcessRoom('')
    setSelectedBrand('')
    setSelectedProduct('')
    setMonitorName('')
    setMonitorSignature('')
    setBagEntries([])
    setExpandedEntryId(null)
    setComments('')
    setShowCommentsInput(false)
    setIsSubmitted(false)
    setPdfUrl(null)
  }

  // Persistence hook
  const { clearDraft } = useChecklistPersistence(
    'checklist-weighing-sealing-draft',
    { 
      date, 
      shift, 
      processRoom, 
      selectedBrand, 
      selectedProduct, 
      monitorName, 
      monitorSignature, 
      bagEntries,
      comments
    },
    isSubmitted,
    (data) => {
      if (data.date) setDate(data.date)
      if (data.shift) setShift(data.shift)
      if (data.processRoom) setProcessRoom(data.processRoom)
      if (data.selectedBrand) {
        setSelectedBrand(data.selectedBrand)
        // Load products for the restored brand
        supabase
          .from('productos')
          .select('material')
          .eq('brand', data.selectedBrand)
          .then(({ data: productsData, error }) => {
            if (!error && productsData) {
              const availableProducts = Array.from(new Set(productsData.map((p) => p.material).filter(Boolean)))
              setProducts(availableProducts)
              if (data.selectedProduct && availableProducts.includes(data.selectedProduct)) {
                setSelectedProduct(data.selectedProduct)
              }
            }
          })
      }
      if (data.selectedProduct) setSelectedProduct(data.selectedProduct)
      if (data.monitorName) setMonitorName(data.monitorName)
      if (data.monitorSignature) setMonitorSignature(data.monitorSignature)
      if (data.bagEntries && Array.isArray(data.bagEntries)) {
        setBagEntries(data.bagEntries)
        if (data.bagEntries.length > 0) {
          setExpandedEntryId(data.bagEntries[0].id)
        }
      }
    }
  )

  // Initialize date on mount
  useEffect(() => {
    if (!date) {
      const today = new Date().toISOString().split('T')[0]
      setDate(today)
    }
  }, [date])

  // Load brands
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

  // Load products when brand changes
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

  // Add new bag entry
  const handleAddBagEntry = () => {
    const newEntry: BagEntry = {
      id: Date.now(),
      time: getCurrentTime(),
      bagCode: '',
      weights: Array(10).fill(''),
      sealed: Array(10).fill(''),
      otherCodification: '',
      declarationOfOrigin: ''
    }
    setBagEntries([...bagEntries, newEntry])
    setExpandedEntryId(newEntry.id)
  }

  // Remove bag entry
  const handleRemoveBagEntry = (id: number) => {
    const newEntries = bagEntries.filter(e => e.id !== id)
    setBagEntries(newEntries)
    if (expandedEntryId === id && newEntries.length > 0) {
      setExpandedEntryId(newEntries[0].id)
    } else if (expandedEntryId === id) {
      setExpandedEntryId(null)
    }
  }

  // Update bag entry field
  const handleBagEntryChange = (
    id: number,
    field: keyof BagEntry,
    value: any
  ) => {
    setBagEntries(bagEntries.map(entry => {
      if (entry.id === id) {
        return { ...entry, [field]: value }
      }
      return entry
    }))
  }

  // Update weight at specific index
  const handleWeightChange = (id: number, index: number, value: string) => {
    setBagEntries(bagEntries.map(entry => {
      if (entry.id === id) {
        const newWeights = [...entry.weights]
        newWeights[index] = value
        return { ...entry, weights: newWeights }
      }
      return entry
    }))
  }

  // Update sealed at specific index
  const handleSealedChange = (id: number, index: number, value: string) => {
    setBagEntries(bagEntries.map(entry => {
      if (entry.id === id) {
        const newSealed = [...entry.sealed]
        newSealed[index] = value
        return { ...entry, sealed: newSealed }
      }
      return entry
    }))
  }

  // Check if entry has missing required data
  const hasMissingData = (entry: BagEntry): boolean => {
    if (!entry.time || !entry.bagCode || !entry.otherCodification || !entry.declarationOfOrigin) {
      return true
    }
    // Check if at least some weights are filled (not all required, but at least one)
    if (entry.weights.every(w => !w.trim())) {
      return true
    }
    // Check sealed - only required where weight is filled
    // If a weight is filled, the corresponding sealed should be filled
    for (let i = 0; i < entry.weights.length; i++) {
      if (entry.weights[i] && entry.weights[i].trim()) {
        // If weight is filled, sealed should also be filled
        if (!entry.sealed[i] || !entry.sealed[i].trim()) {
          return true
        }
      }
      // If weight is empty, sealed can be empty (no requirement)
    }
    return false
  }

  // Check for missing weights and return details
  const checkMissingWeights = (): Array<{ entryIndex: number; bagCode: string; missingIndices: number[] }> => {
    const missing: Array<{ entryIndex: number; bagCode: string; missingIndices: number[] }> = []
    
    bagEntries.forEach((entry, entryIndex) => {
      const missingIndices: number[] = []
      entry.weights.forEach((weight, index) => {
        if (!weight || !weight.trim()) {
          missingIndices.push(index + 1) // 1-based for user display
        }
      })
      
      if (missingIndices.length > 0) {
        missing.push({
          entryIndex: entryIndex + 1, // 1-based for user display
          bagCode: entry.bagCode || `Entry #${entryIndex + 1}`,
          missingIndices
        })
      }
    })
    
    return missing
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate Section 1
      if (!date || !shift || !processRoom || !selectedBrand || !selectedProduct || !monitorName || !monitorSignature) {
        showToast('Please fill in all required fields in Section 1', 'error')
        setIsSubmitting(false)
        return
      }

      // Validate Section 2
      if (bagEntries.length === 0) {
        showToast('Please add at least one bag entry', 'error')
        setIsSubmitting(false)
        return
      }

      const hasInvalidEntries = bagEntries.some(e => hasMissingData(e))
      if (hasInvalidEntries) {
        showToast('Please fill in all required fields for all bag entries', 'error')
        setIsSubmitting(false)
        return
      }

      // Check for missing weights and ask for confirmation
      const missingWeights = checkMissingWeights()
      if (missingWeights.length > 0) {
        const missingDetails = missingWeights.map(m => 
          `Bag Entry #${m.entryIndex} (${m.bagCode}): Missing weights #${m.missingIndices.join(', ')}`
        ).join('\n')
        
        const confirmMessage = `Some weights are missing:\n\n${missingDetails}\n\n` +
          `If you proceed:\n` +
          `- The average will be calculated only using filled weights\n` +
          `- Sealed status is not required for missing weight columns\n\n` +
          `Do you want to proceed with the submission?`
        
        const userConfirmed = window.confirm(confirmMessage)
        if (!userConfirmed) {
          setIsSubmitting(false)
          return
        }
      }

      // Format date functions
      const formatDate = (dateStr: string): string => {
        if (!dateStr) return ''
        try {
          const date = new Date(dateStr)
          return format(date, 'MMM-dd-yyyy').toUpperCase()
        } catch {
          return dateStr
        }
      }

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

      // Prepare form data for PDF
      const formData = {
        section1: {
          date: formatDate(date),
          shift,
          processRoom,
          brand: selectedBrand,
          product: selectedProduct,
          monitorName,
          monitorSignature
        },
        section2: {
          bagEntries: bagEntries.map(entry => ({
            id: entry.id,
            time: entry.time,
            bagCode: entry.bagCode,
            weights: entry.weights,
            sealed: entry.sealed,
            otherCodification: entry.otherCodification,
            declarationOfOrigin: entry.declarationOfOrigin
          }))
        },
        comments: comments || undefined
      }

      // Debug: Log comments to verify they're being passed
      console.log('Form data comments:', comments)
      console.log('Form data for PDF:', { ...formData, section1: { ...formData.section1, monitorSignature: '[signature data]' } })

      // Generate PDF
      showToast('Generating PDF...', 'info')
      const pdfBlob = await pdf(
        <ChecklistWeighingSealingPDFDocument data={formData} />
      ).toBlob()

      // Create filename with date prefix and incrementing number
      const dateForFilename = formatDateForFilename(date)
      const pdfNumber = await getNextPdfNumber(dateForFilename)
      const filename = `${dateForFilename}-Check-Weighing-Sealing-${pdfNumber}.pdf`

      // Upload PDF to Supabase Storage
      showToast('Uploading PDF to storage...', 'info')
      const uploadedPdfUrl = await uploadChecklistPDF(pdfBlob, filename)

      // Prepare data for database
      const dbData = {
        date_string: formatDate(date),
        shift,
        process_room: processRoom,
        brand: selectedBrand,
        product: selectedProduct,
        monitor_name: monitorName,
        monitor_signature: monitorSignature,
        bag_entries: formData.section2.bagEntries,
        comments: comments && comments.trim() ? comments.trim() : null,
        pdf_url: uploadedPdfUrl
      }

      // Debug: Log database data to verify comments are included
      console.log('Database data comments:', dbData.comments)

      // Save to Supabase database
      showToast('Saving to database...', 'info')
      await insertChecklistWeighingSealing(dbData)

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
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-4 flex justify-between items-start">
        <Link href="/area/calidad" className="inline-flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver
        </Link>
        <DeleteDraftButton 
          storageKey="checklist-weighing-sealing-draft"
          checklistName="Check weighing and sealing of packaged products"
          onReset={resetForm}
        />
      </div>

      <h1 className="text-3xl font-bold mb-2 text-center">
        Check weighing and sealing of packaged products
      </h1>
      <p className="text-center text-sm text-gray-500 mb-2">Chequeo de pesaje y sellado de los productos envasados</p>
      <p className="text-center text-sm text-gray-500 mb-6">Code: CF/PC-ASC-006-RG005</p>

      {isSubmitted ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold mb-4">Checklist Submitted Successfully!</h2>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              View PDF
            </a>
          )}
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
                <label htmlFor="processRoom" className="block text-sm font-medium text-gray-700 mb-1">
                  Process Room <span className="text-red-500">*</span>
                </label>
                <input
                  id="processRoom"
                  type="text"
                  value={processRoom}
                  onChange={(e) => setProcessRoom(e.target.value)}
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
                  onChange={(e) => setSelectedBrand(e.target.value)}
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

          {/* Section 2: Dynamic Bag Entries */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">📦 Section 2 – Bag Entries</h2>
              <button
                type="button"
                onClick={handleAddBagEntry}
                className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Data / Agregar Dato
              </button>
            </div>

            <div className="space-y-4">
              {bagEntries.map((entry, index) => {
                const isExpanded = expandedEntryId === entry.id
                const hasMissing = hasMissingData(entry)

                return (
                  <div key={entry.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Collapsed Header */}
                    <div
                      className={`flex justify-between items-center p-4 cursor-pointer transition-colors ${
                        isExpanded ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                        <h3 className="font-medium text-gray-700">
                          Entry #{index + 1}
                          {entry.bagCode && (
                            <span className="ml-2 text-gray-500 font-normal">- {entry.bagCode}</span>
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveBagEntry(entry.id)
                          }}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="p-6 bg-white border-t border-gray-200 space-y-4">
                        {/* Table 1: Time and Bag Code */}
                        <div className="overflow-x-auto shadow-sm rounded-lg border border-gray-200">
                          <table className="min-w-full border-collapse">
                            <thead>
                              <tr className="bg-blue-600 text-white">
                                <th className="border border-gray-300 px-3 py-3 text-xs font-bold text-center" style={{ width: '20%' }}>
                                  TIME / Hora
                                </th>
                                <th className="border border-gray-300 px-3 py-3 text-xs font-bold text-center" style={{ width: '80%' }}>
                                  BAG CODE / Código bolsa
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border border-gray-300 px-3 py-3 bg-white">
                                  <input
                                    type="time"
                                    value={entry.time}
                                    onChange={(e) => handleBagEntryChange(entry.id, 'time', e.target.value)}
                                    className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                    required
                                  />
                                </td>
                                <td className="border border-gray-300 px-3 py-3 bg-white">
                                  <input
                                    type="text"
                                    value={entry.bagCode}
                                    onChange={(e) => handleBagEntryChange(entry.id, 'bagCode', e.target.value)}
                                    className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                    placeholder="Bag code"
                                    required
                                  />
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Table 2: Weight and Sealed with Average */}
                        <div className="overflow-x-auto shadow-sm rounded-lg border border-gray-200">
                          <table className="min-w-full border-collapse">
                            <thead>
                              <tr className="bg-blue-600 text-white">
                                <th className="border border-gray-300 px-3 py-3 text-xs font-bold text-center" style={{ width: '8%' }}>
                                  WEIGHT / Peso
                                </th>
                                {Array.from({ length: 10 }).map((_, i) => (
                                  <th key={`weight-header-${i}`} className="border border-gray-300 px-3 py-3 text-xs font-bold text-center" style={{ width: '7.2%' }}>
                                    {i + 1}
                                  </th>
                                ))}
                                <th className="border border-gray-300 px-3 py-3 text-xs font-bold text-center" style={{ width: '20%' }}>
                                  AVERAGE / Promedio
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Weight row */}
                              <tr>
                                <td className="border border-gray-300 px-3 py-3 bg-blue-600 text-white text-sm font-bold">
                                  WEIGHT / Peso
                                </td>
                                {Array.from({ length: 10 }).map((_, i) => (
                                  <td key={`weight-${i}`} className="border border-gray-300 px-3 py-3 bg-white">
                                    <input
                                      type="text"
                                      value={entry.weights[i] || ''}
                                      onChange={(e) => handleWeightChange(entry.id, i, e.target.value)}
                                      className={`w-full text-sm px-2 py-1.5 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                        entry.weights[i] ? 'bg-white border-gray-300' : 'bg-gray-100 border-gray-300 text-gray-500'
                                      }`}
                                      placeholder="Weight"
                                    />
                                  </td>
                                ))}
                                <td className="border border-gray-300 px-3 py-3 bg-gray-50">
                                  <input
                                    type="text"
                                    className="w-full text-sm px-2 py-1.5 border-0 bg-gray-50 text-gray-700 font-medium"
                                    placeholder="Average"
                                    readOnly
                                    value={(() => {
                                      const weights = entry.weights.filter(w => w.trim()).map(w => parseFloat(w)).filter(w => !isNaN(w))
                                      return weights.length === 0 ? '' : (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(2)
                                    })()}
                                  />
                                </td>
                              </tr>

                              {/* Sealed row */}
                              <tr>
                                <td className="border border-gray-300 px-3 py-3 bg-blue-600 text-white text-sm font-bold">
                                  SEALED / Sellado
                                </td>
                                {Array.from({ length: 10 }).map((_, i) => {
                                  const sealedValue = entry.sealed[i] || ''
                                  const sealedStyles = sealedValue === 'Comply'
                                    ? 'bg-green-600 text-white border-green-600'
                                    : sealedValue === 'not comply'
                                    ? 'bg-red-600 text-white border-red-600'
                                    : 'bg-gray-200 text-gray-500 border-gray-300'
                                  return (
                                    <td key={`sealed-${i}`} className="border border-gray-300 px-3 py-3 bg-white">
                                      <select
                                        value={sealedValue}
                                        onChange={(e) => handleSealedChange(entry.id, i, e.target.value)}
                                        className={`w-full text-sm px-2 py-1.5 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-medium ${sealedStyles}`}
                                      >
                                        <option value="">Select</option>
                                        <option value="Comply">Comply</option>
                                        <option value="not comply">not comply</option>
                                      </select>
                                    </td>
                                  )
                                })}
                                <td className="border border-gray-300 px-3 py-3 bg-gray-50"></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Table 3: Other Codification and Declaration of Origin */}
                        <div className="overflow-x-auto shadow-sm rounded-lg border border-gray-200">
                          <table className="min-w-full border-collapse">
                            <thead>
                              <tr className="bg-blue-600 text-white">
                                <th className="border border-gray-300 px-3 py-3 text-xs font-bold text-center" style={{ width: '50%' }}>
                                  OTHER CODIF. / Otra codificación
                                </th>
                                <th className="border border-gray-300 px-3 py-3 text-xs font-bold text-center" style={{ width: '50%' }}>
                                  DECLARATION OF ORIGIN COINCIDES WITH RAW MATERIAL / La declaración de origen coincide con la materia prima
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border border-gray-300 px-3 py-3 bg-white">
                                  <input
                                    type="text"
                                    value={entry.otherCodification}
                                    onChange={(e) => handleBagEntryChange(entry.id, 'otherCodification', e.target.value)}
                                    className={`w-full text-sm px-2 py-1.5 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                      entry.otherCodification ? 'bg-white border-gray-300' : 'bg-gray-100 border-gray-300 text-gray-500'
                                    }`}
                                    placeholder="Other codification"
                                  />
                                </td>
                                <td className="border border-gray-300 px-3 py-3 bg-white">
                                  <select
                                    value={entry.declarationOfOrigin || ''}
                                    onChange={(e) => handleBagEntryChange(entry.id, 'declarationOfOrigin', e.target.value)}
                                    className={`w-full text-sm px-2 py-1.5 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-medium ${
                                      entry.declarationOfOrigin === 'Comply'
                                        ? 'bg-green-600 text-white border-green-600'
                                        : entry.declarationOfOrigin === 'not comply'
                                        ? 'bg-red-600 text-white border-red-600'
                                        : 'bg-gray-200 text-gray-500 border-gray-300'
                                    }`}
                                  >
                                    <option value="">Select</option>
                                    <option value="Comply">Comply</option>
                                    <option value="not comply">not comply</option>
                                  </select>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Section 3: Comments / Observaciones */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">💬 Section 3 – Comments / Observaciones</h2>
              {!showCommentsInput && (
                <button
                  type="button"
                  onClick={() => setShowCommentsInput(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Comments / Agregar Observaciones
                </button>
              )}
            </div>

            {showCommentsInput && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
                    Comments / Observaciones
                  </label>
                  <textarea
                    id="comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter any comments or observations here / Ingrese comentarios u observaciones aquí"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCommentsInput(false)
                      setComments('')
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Remove / Eliminar
                  </button>
                </div>
              </div>
            )}

            {!showCommentsInput && comments && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{comments}</p>
                <button
                  type="button"
                  onClick={() => setShowCommentsInput(true)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Edit / Editar
                </button>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">📄 Controls</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Checklist / Enviar Checklist'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

