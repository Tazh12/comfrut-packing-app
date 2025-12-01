'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { pdf } from '@react-pdf/renderer'
import { ChecklistForeignMaterialPDFDocument } from '@/components/ChecklistPDFForeignMaterial'
import { useToast } from '@/context/ToastContext'
import { useChecklistPersistence } from '@/lib/hooks/useChecklistPersistence'
import { DeleteDraftButton } from '@/components/DeleteDraftButton'
import { supabase } from '@/lib/supabase'
import { uploadChecklistPDF, insertChecklistForeignMaterial } from '@/lib/supabase/checklistForeignMaterial'

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

// Foreign Material Finding Entry Interface
interface ForeignMaterialFinding {
  id: number
  hourFrom: string
  hourTo: string
  findingDescription: string
  palletNumberIngredient: string
  productCode: string
  elementType: string
  otherElementType: string
  totalAmount: string
  collapsed?: boolean
}

// Foreign material element types
const ELEMENT_TYPES = [
  { value: 'hair', label: 'Hair / Pelos' },
  { value: 'insects', label: 'Insects / Insectos' },
  { value: 'vegetal_matter', label: 'Vegetal matter / Material vegetal' },
  { value: 'paper', label: 'Paper / Papel' },
  { value: 'hard_plastic', label: 'Hard Plastic / Plástico duro' },
  { value: 'pit', label: 'Pit / Cuesco' },
  { value: 'metal_piece', label: 'Metal piece / Pieza de metal' },
  { value: 'product_mixed', label: 'Product mixed / Mezcla producto' },
  { value: 'wood', label: 'Wood / Madera' },
  { value: 'dirt', label: 'Dirt / Tierra' },
  { value: 'stone', label: 'Stone / Piedra' },
  { value: 'cardboard', label: 'Cardboard / Cartón' },
  { value: 'tape', label: 'Tape / Fibra de cinta' },
  { value: 'textile_fibres', label: 'Textile fibres / Fibra textil' },
  { value: 'spiders', label: 'Spiders / Arañas' },
  { value: 'feathers', label: 'Feathers / Plumas' },
  { value: 'worms_larvae', label: 'Worms-larvae / Gusanos-larvas' },
  { value: 'slug_snail', label: 'Babosas-caracol / Slug-snail' },
  { value: 'soft_plastic', label: 'Soft plastic / Plástico blando' },
  { value: 'other', label: 'Other / Otro' }
]

export default function ChecklistForeignMaterialPage() {
  const { showToast } = useToast()
  const router = useRouter()
  
  // Section 1: Basic Info
  const [date, setDate] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [shift, setShift] = useState('')
  const [monitorName, setMonitorName] = useState('')
  const [monitorSignature, setMonitorSignature] = useState('')

  // Products and brands
  const [brands, setBrands] = useState<string[]>([])
  const [products, setProducts] = useState<string[]>([])

  // Section 2: Dynamic Findings
  const [findings, setFindings] = useState<ForeignMaterialFinding[]>([])
  const [noFindings, setNoFindings] = useState(false)

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  // Reset form function
  const resetForm = () => {
    setDate('')
    setSelectedBrand('')
    setSelectedProduct('')
    setShift('')
    setMonitorName('')
    setMonitorSignature('')
    setFindings([])
    setNoFindings(false)
    setIsSubmitting(false)
    setIsSubmitted(false)
    setPdfUrl(null)
  }

  // Persistence hook
  const { clearDraft } = useChecklistPersistence(
    'checklist-foreign-material-draft',
    { 
      date,
      selectedBrand,
      selectedProduct,
      shift,
      monitorName,
      monitorSignature,
      findings,
      noFindings
    },
    isSubmitted,
    (data) => {
      if (data.date) setDate(data.date)
      if (data.selectedBrand) {
        setSelectedBrand(data.selectedBrand)
        // Load products for the restored brand first, then restore product
        supabase
          .from('productos')
          .select('material')
          .eq('brand', data.selectedBrand)
          .then(({ data: productsData, error }) => {
            if (!error && productsData) {
              const availableProducts = Array.from(new Set(productsData.map((p) => p.material).filter(Boolean)))
              setProducts(availableProducts)
              // Restore product only if it's still valid for this brand
              if (data.selectedProduct && availableProducts.includes(data.selectedProduct)) {
                setSelectedProduct(data.selectedProduct)
              }
            }
          })
      }
      if (data.shift) setShift(data.shift)
      if (data.monitorName) setMonitorName(data.monitorName)
      if (data.monitorSignature) setMonitorSignature(data.monitorSignature)
      if (data.findings && Array.isArray(data.findings)) {
        // Ensure collapsed property exists for each finding
        setFindings(data.findings.map((f: any) => ({
          ...f,
          collapsed: f.collapsed !== undefined ? f.collapsed : false
        })))
      }
      if (data.noFindings !== undefined) {
        setNoFindings(data.noFindings)
      }
    }
  )

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
            const availableProducts = Array.from(new Set(data.map((p) => p.material).filter(Boolean)))
            setProducts(availableProducts)
            // If selectedProduct is not in the new list, clear it
            if (selectedProduct && !availableProducts.includes(selectedProduct)) {
              setSelectedProduct('')
            }
          }
        })
    } else {
      setProducts([])
      setSelectedProduct('')
    }
  }, [selectedBrand, selectedProduct])

  // Initialize date on mount
  useEffect(() => {
    if (!date) {
      const today = new Date().toISOString().split('T')[0]
      setDate(today)
    }
  }, [])

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

  // Format date for PDF filename
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

  // Add new finding
  const handleAddFinding = () => {
    if (noFindings) {
      // Uncheck "No Findings" when user wants to add a finding
      setNoFindings(false)
    }
    setFindings([
      ...findings,
      {
        id: Date.now(),
        hourFrom: '',
        hourTo: '',
        findingDescription: '',
        palletNumberIngredient: '',
        productCode: '',
        elementType: '',
        otherElementType: '',
        totalAmount: '',
        collapsed: false
      }
    ])
  }

  // Toggle finding collapse
  const toggleFindingCollapse = (id: number) => {
    setFindings(findings.map(f => 
      f.id === id ? { ...f, collapsed: !f.collapsed } : f
    ))
  }

  // Handle "No Findings" checkbox change
  const handleNoFindingsChange = (checked: boolean) => {
    setNoFindings(checked)
    if (checked) {
      // Clear all findings when "No Findings" is selected
      setFindings([])
    }
  }

  // Remove finding
  const handleRemoveFinding = (id: number) => {
    setFindings(findings.filter(f => f.id !== id))
  }

  // Update finding
  const handleFindingChange = (id: number, field: keyof ForeignMaterialFinding, value: string) => {
    setFindings(findings.map(f => {
      if (f.id === id) {
        return { ...f, [field]: value }
      }
      return f
    }))
  }

  // Validate form
  const validateForm = (): boolean => {
    if (!date.trim()) {
      showToast('Please enter date', 'error')
      return false
    }
    if (!selectedBrand.trim()) {
      showToast('Please select a brand', 'error')
      return false
    }
    if (!selectedProduct.trim()) {
      showToast('Please select a product', 'error')
      return false
    }
    if (!shift.trim()) {
      showToast('Please enter shift', 'error')
      return false
    }
    if (!monitorName.trim()) {
      showToast('Please enter monitor name', 'error')
      return false
    }
    if (!monitorSignature) {
      showToast('Please provide monitor signature', 'error')
      return false
    }

    // If "No Findings" is selected, skip findings validation
    if (noFindings) {
      return true
    }

    // Validate findings only if "No Findings" is not selected
    if (findings.length === 0) {
      showToast('Please add at least one finding or select "No Findings"', 'error')
      return false
    }

    for (const finding of findings) {
      if (!finding.hourFrom.trim()) {
        showToast('Please enter hour from for all findings', 'error')
        return false
      }
      if (!finding.hourTo.trim()) {
        showToast('Please enter hour to for all findings', 'error')
        return false
      }
      if (!finding.findingDescription.trim()) {
        showToast('Please enter finding description for all findings', 'error')
        return false
      }
      if (!finding.elementType.trim()) {
        showToast('Please select element type for all findings', 'error')
        return false
      }
      if (finding.elementType === 'other' && !finding.otherElementType.trim()) {
        showToast('Please specify other element type', 'error')
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
      const formData = {
        section1: {
          date: formatDate(date),
          brand: selectedBrand,
          product: selectedProduct,
          shift: shift,
          monitorName: monitorName,
          monitorSignature: monitorSignature
        },
        section2: {
          noFindings: noFindings,
          findings: findings.map(f => ({
            hourFrom: f.hourFrom,
            hourTo: f.hourTo,
            findingDescription: f.findingDescription,
            palletNumberIngredient: f.palletNumberIngredient,
            productCode: f.productCode,
            elementType: f.elementType,
            otherElementType: f.otherElementType,
            totalAmount: f.totalAmount
          }))
        }
      }

      console.log('Form Data:', JSON.stringify(formData, null, 2))

      showToast('Generating PDF...', 'info')
      const pdfBlob = await pdf(
        <ChecklistForeignMaterialPDFDocument data={formData} />
      ).toBlob()

      const dateForFilename = formatDateForFilename(date)
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const seconds = now.getSeconds().toString().padStart(2, '0')
      const timeStr = `${hours}${minutes}${seconds}`
      const shiftStr = shift.replace(/\s+/g, '-')
      const filename = `${dateForFilename}-${timeStr}-${shiftStr}-Foreign-Material.pdf`

      // Upload PDF to Supabase Storage
      showToast('Uploading PDF to storage...', 'info')
      const uploadedPdfUrl = await uploadChecklistPDF(pdfBlob, filename)

      // Prepare data for database
      const dbData = {
        date_string: formatDate(date),
        brand: selectedBrand,
        product: selectedProduct,
        shift: shift,
        monitor_name: monitorName,
        monitor_signature: monitorSignature,
        no_findings: noFindings,
        findings: formData.section2.findings,
        pdf_url: uploadedPdfUrl
      }

      // Save to Supabase database
      showToast('Saving to database...', 'info')
      await insertChecklistForeignMaterial(dbData)

      // Set PDF URL for viewing
      setPdfUrl(uploadedPdfUrl)
      setIsSubmitted(true)
      clearDraft()

      showToast('Checklist submitted successfully!', 'success')

      // Log what happened
      console.log('Checklist submitted successfully:')
      console.log('1. PDF generated')
      console.log('2. PDF uploaded to:', uploadedPdfUrl)
      console.log('3. Data saved to Supabase')

      // Redirect to quality page after a short delay
      setTimeout(() => {
        router.push('/area/calidad')
      }, 1500)
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
          storageKey="checklist-foreign-material-draft"
          checklistName="Foreign Material Findings Record"
          onReset={resetForm}
        />
      </div>

      <h1 className="text-3xl font-bold mb-2 text-center">
        Foreign material findings record /<br/>
        Record de hallazgos de materia extraña
      </h1>
      <p className="text-center text-sm text-gray-500 mb-6">Code: CF/PC-PPR-002-RG002</p>

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
            </div>

            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                Brand / Marca <span className="text-red-500">*</span>
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
                <option value="">Select brand / Selecciona marca</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="product" className="block text-sm font-medium text-gray-700 mb-1">
                Product / Producto <span className="text-red-500">*</span>
              </label>
              <select
                id="product"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={!selectedBrand}
              >
                <option value="">Select product / Selecciona producto</option>
                {products.map((product) => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
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

        {/* Section 2: Dynamic Findings */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">🔍 Section 2 – Findings / Hallazgos</h2>
            <div className="flex gap-2">
              <label className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={noFindings}
                  onChange={(e) => handleNoFindingsChange(e.target.checked)}
                  className="mr-2"
                />
                No Findings / Sin Hallazgos
              </label>
              <button
                type="button"
                onClick={handleAddFinding}
                disabled={noFindings}
                className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Finding / Agregar Hallazgo
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {findings.map((finding, index) => (
              <div key={finding.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleFindingCollapse(finding.id)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      {finding.collapsed ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronUp className="h-5 w-5" />
                      )}
                    </button>
                    <h3 className="font-medium text-gray-700">Finding #{index + 1} / Hallazgo #{index + 1}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFinding(finding.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {!finding.collapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hour From / Hora Desde <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={finding.hourFrom}
                      onChange={(e) => handleFindingChange(finding.id, 'hourFrom', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hour To / Hora Hasta <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={finding.hourTo}
                      onChange={(e) => handleFindingChange(finding.id, 'hourTo', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Finding Description / Descripción del Hallazgo <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={finding.findingDescription}
                      onChange={(e) => handleFindingChange(finding.id, 'findingDescription', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      required
                      placeholder="Describe the finding..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pallet Number Ingredient / Número de Pallet de Ingrediente
                    </label>
                    <input
                      type="text"
                      value={finding.palletNumberIngredient}
                      onChange={(e) => handleFindingChange(finding.id, 'palletNumberIngredient', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Code / Código del Producto
                    </label>
                    <input
                      type="text"
                      value={finding.productCode}
                      onChange={(e) => handleFindingChange(finding.id, 'productCode', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Element Type / Tipo de Elemento <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={finding.elementType}
                      onChange={(e) => handleFindingChange(finding.id, 'elementType', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select element type / Selecciona tipo de elemento</option>
                      {ELEMENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {finding.elementType === 'other' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Other Element Type / Otro Tipo de Elemento <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={finding.otherElementType}
                        onChange={(e) => handleFindingChange(finding.id, 'otherElementType', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                        placeholder="Specify other element type..."
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Amount / Cantidad Total
                    </label>
                    <input
                      type="number"
                      value={finding.totalAmount}
                      onChange={(e) => handleFindingChange(finding.id, 'totalAmount', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>
                )}
              </div>
            ))}

            {findings.length === 0 && !noFindings && (
              <div className="text-center py-8 text-gray-500">
                <p>No findings added yet. Click "Add Finding" to add a new finding.</p>
                <p className="text-sm mt-1">No hay hallazgos aún. Haz clic en "Agregar Hallazgo" para agregar uno nuevo.</p>
              </div>
            )}

            {noFindings && (
              <div className="text-center py-8 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <p className="text-blue-700 font-semibold text-lg">No Findings / Sin Hallazgos</p>
                <p className="text-blue-600 text-sm mt-2">No foreign material findings were detected during this inspection.</p>
                <p className="text-blue-600 text-sm">No se detectaron hallazgos de materia extraña durante esta inspección.</p>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Save Checklist / Guardar Checklist'}
          </button>
        </div>
      </form>

      {/* PDF View Section */}
      {isSubmitted && pdfUrl && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">PDF Generated Successfully</h2>
          <div className="flex gap-4">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              View PDF / Ver PDF
            </a>
            <a
              href={pdfUrl}
              download
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Download PDF / Descargar PDF
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

