'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Info, X } from 'lucide-react'
import { format } from 'date-fns'
import { formatDateMMMDDYYYY, formatDateForFilename as formatDateForFilenameUtil } from '@/lib/date-utils'
import { pdf } from '@react-pdf/renderer'
import { ChecklistPreOperationalReviewPDFDocument } from '@/components/ChecklistPDFPreOperationalReview'
import { useToast } from '@/context/ToastContext'
import { useChecklistPersistence } from '@/lib/hooks/useChecklistPersistence'
import { DeleteDraftButton } from '@/components/DeleteDraftButton'
import { supabase } from '@/lib/supabase'
import { uploadChecklistPDF, insertChecklistPreOperationalReview } from '@/lib/supabase/checklistPreOperationalReview'


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

// Checklist Item Interface
interface ChecklistItem {
  id: string
  nameEn: string
  nameEs: string
  comply: boolean | null
  observation: string
  correctiveAction: string
  correctiveActionComply: boolean | null
  correctiveActionObservation: string
}

// Checklist Items
const CHECKLIST_ITEMS: Omit<ChecklistItem, 'comply' | 'observation' | 'correctiveAction' | 'correctiveActionComply' | 'correctiveActionObservation'>[] = [
  {
    id: 'item_1',
    nameEn: 'Footbath with correct amount of sanitizer',
    nameEs: 'Baño de pies con la cantidad correcta de desinfectante'
  },
  {
    id: 'item_2',
    nameEn: 'Hand washing station with cleaning supplies',
    nameEs: 'Estación para lavado de manos con insumos de limpieza'
  },
  {
    id: 'item_3',
    nameEn: 'Staff clothing clean and on good condition',
    nameEs: 'Indumentaria del personal limpia y en buenas condiciones'
  },
  {
    id: 'item_4',
    nameEn: 'Process belts in good condition (structures) and clean',
    nameEs: 'Elevadores de proceso en buen estado (estructuras) y limpias'
  },
  {
    id: 'item_5',
    nameEn: 'Scale "YAMATO"',
    nameEs: 'Balanza "YAMATO"'
  },
  {
    id: 'item_6',
    nameEn: 'Structure of "ALLIEDFELX" is good condition, parts, lights, cables, acrylic & supports',
    nameEs: 'Estructura de Envasadora "ALLIEDFELX" en buen estado, integra, acrilico intacto, luces, cables y soportes integras'
  },
  {
    id: 'item_7',
    nameEn: 'Rollers Conditions',
    nameEs: 'Condición de rodillos (En Elevadores y Selladora) íntegros y limpios'
  },
  {
    id: 'item_8',
    nameEn: 'Scale "ISHIDA" (Functional and Cleaning)',
    nameEs: 'Balanza "ISHIDA" (Funcional y Limpia)'
  },
  {
    id: 'item_9',
    nameEn: 'Metal detector "CEIA" (Operational, acrylic without breaking and Clean)',
    nameEs: 'Detector de Metales "CEIA" (Funcional, Limpio y el acrílico sin quebrar)'
  },
  {
    id: 'item_10',
    nameEn: 'Sealer (Funtional and Cleaning)',
    nameEs: 'Selladora (Funcional, integro y limpio)'
  },
  {
    id: 'item_11',
    nameEn: 'Boards and electrical contacts closed and clean',
    nameEs: 'Tableros eléctricos cerrados y limpios'
  },
  {
    id: 'item_12',
    nameEn: 'General lights are in good condition, no broken and clean',
    nameEs: 'Condiciones de las luces generales, sin quebrar y limpias'
  },
  {
    id: 'item_13',
    nameEn: 'There is no point of presence or point of contact that puts the product at risk',
    nameEs: 'No existe punto de presencia o punto de contacto que pongan en riesgo el producto'
  },
  {
    id: 'item_14',
    nameEn: 'Fans working properly, clean and without product under',
    nameEs: 'Ventiladores funcionando correctamente, límpios y sin producto debajo'
  },
  {
    id: 'item_15',
    nameEn: 'Only for white trays, they are clean and dry',
    nameEs: 'Solo para las bandejas de blanco, están limpias, integras y secas'
  },
  {
    id: 'item_16',
    nameEn: 'Glove sanitizing stations clean and with correct amount of sanitizer',
    nameEs: 'Estaciones para sanitizado de guantes, limpio y con la concentración sanitizante establecida'
  },
  {
    id: 'item_17',
    nameEn: 'There is no Condensation',
    nameEs: 'No existe presencia de condensación'
  },
  {
    id: 'item_18',
    nameEn: 'Tables clean, dry and well-maintained',
    nameEs: 'Mesas limpias, secas y en buen estado'
  },
  {
    id: 'item_19',
    nameEn: 'Coding corresponds to the day of production of all coding units',
    nameEs: 'La codificación corresponde al día de producción de todas las unidades de codificacion'
  },
  {
    id: 'item_20',
    nameEn: 'There are no packaging materials from the previous production or that do not correspond to the SKU to be processed',
    nameEs: 'No existen materiales de empaque de la producción anterior o que no correspondan al SKU a procesar'
  },
  {
    id: 'item_21',
    nameEn: 'Trash containers, with bag for garbage disposal, clean and positioned',
    nameEs: 'Basureros con bolsa, limpios y bien posicionados'
  },
  {
    id: 'item_22',
    nameEn: 'Floor clean, dry and well-maintained',
    nameEs: 'Pisos Limpios, secos y bien mantenidos'
  },
  {
    id: 'item_23',
    nameEn: 'Walls and Ceiling clean and well-maintained',
    nameEs: 'Paredes y techos limpos y bien mantenidos'
  },
  {
    id: 'item_24',
    nameEn: 'Floor Drains with cover, without obstruction and clean',
    nameEs: 'Desagües con rejilla, sin obstrucción y limpio'
  },
  {
    id: 'item_25',
    nameEn: 'There is no presence of temporary repairs that constitute a risk to the safety of the producto',
    nameEs: 'No existe presencia de reparaciones temporales que constituyen riesgo para la inocuidad del producto'
  },
  {
    id: 'item_26',
    nameEn: 'Integrity of Plastic door\'s window',
    nameEs: 'Integridad de la ventana de plástico en puerta'
  }
]

export default function ChecklistPreOperationalReviewPage() {
  const { showToast } = useToast()
  const router = useRouter()
  
  // Section 1: Basic Info
  const [date, setDate] = useState('')
  const [hour, setHour] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [monitorName, setMonitorName] = useState('')
  const [monitorSignature, setMonitorSignature] = useState('')

  // Products and brands
  const [brands, setBrands] = useState<string[]>([])
  const [products, setProducts] = useState<string[]>([])

  // Section 2: Checklist Items
  const [items, setItems] = useState<ChecklistItem[]>(
    CHECKLIST_ITEMS.map(item => ({
      ...item,
      comply: null,
      observation: '',
      correctiveAction: '',
      correctiveActionComply: null,
      correctiveActionObservation: ''
    }))
  )

  // Procedure Modal
  const [showProcedureModal, setShowProcedureModal] = useState(false)

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  // Reset form function
  const resetForm = () => {
    setDate('')
    setHour('')
    setSelectedBrand('')
    setSelectedProduct('')
    setMonitorName('')
    setMonitorSignature('')
    setItems(CHECKLIST_ITEMS.map(item => ({
      ...item,
      comply: null,
      observation: '',
      correctiveAction: '',
      correctiveActionComply: null,
      correctiveActionObservation: ''
    })))
    setIsSubmitting(false)
    setIsSubmitted(false)
    setPdfUrl(null)
  }

  // Persistence hook
  const { clearDraft } = useChecklistPersistence(
    'checklist-pre-operational-review-draft',
    { 
      date,
      hour,
      selectedBrand,
      selectedProduct,
      monitorName,
      monitorSignature,
      items
    },
    isSubmitted,
    (data) => {
      if (data.date) setDate(data.date)
      if (data.hour) setHour(data.hour)
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
      if (data.monitorName) setMonitorName(data.monitorName)
      if (data.monitorSignature) setMonitorSignature(data.monitorSignature)
      if (data.items && Array.isArray(data.items)) {
        setItems(data.items)
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

  // Initialize date and hour on mount
  useEffect(() => {
    if (!date) {
      const today = new Date().toISOString().split('T')[0]
      setDate(today)
    }
    if (!hour) {
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      setHour(`${hours}:${minutes}`)
    }
  }, [])

  // Format date as MMM-DD-YYYY - uses utility to avoid timezone issues
  const formatDate = formatDateMMMDDYYYY

  // Format date for PDF filename - uses utility to avoid timezone issues
  const formatDateForFilename = (dateStr: string): string => formatDateForFilenameUtil(dateStr, false)

  // Update item
  const handleItemChange = (id: string, field: keyof ChecklistItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value }
      }
      return item
    }))
  }

  // Validate form
  const validateForm = (): boolean => {
    if (!date.trim()) {
      showToast('Please enter date', 'error')
      return false
    }
    if (!hour.trim()) {
      showToast('Please enter hour', 'error')
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
    if (!monitorName.trim()) {
      showToast('Please enter monitor name', 'error')
      return false
    }
    if (!monitorSignature) {
      showToast('Please provide monitor signature', 'error')
      return false
    }

    // Validate that all items have comply status
    for (const item of items) {
      if (item.comply === null) {
        showToast(`Please select compliance status for all items`, 'error')
        return false
      }
      // If not comply, require observation and corrective action
      if (item.comply === false) {
        if (!item.observation.trim()) {
          showToast(`Please enter observation for: ${item.nameEn}`, 'error')
          return false
        }
        if (!item.correctiveAction.trim()) {
          showToast(`Please enter corrective action for: ${item.nameEn}`, 'error')
          return false
        }
        // If corrective action is not comply, require observation
        if (item.correctiveActionComply === false && !item.correctiveActionObservation.trim()) {
          showToast(`Please enter observation for corrective action: ${item.nameEn}`, 'error')
          return false
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
      const formData = {
        section1: {
          date: formatDate(date),
          hour: hour,
          brand: selectedBrand,
          product: selectedProduct,
          monitorName: monitorName,
          monitorSignature: monitorSignature
        },
        section2: {
          items: items.map(item => ({
            id: item.id,
            nameEn: item.nameEn,
            nameEs: item.nameEs,
            comply: item.comply,
            observation: item.observation,
            correctiveAction: item.correctiveAction,
            correctiveActionComply: item.correctiveActionComply,
            correctiveActionObservation: item.correctiveActionObservation
          }))
        }
      }

      console.log('Form Data:', JSON.stringify(formData, null, 2))

      showToast('Generating PDF...', 'info')
      const pdfBlob = await pdf(
        <ChecklistPreOperationalReviewPDFDocument data={formData} />
      ).toBlob()

      const dateForFilename = formatDateForFilename(date)
      const hourForFilename = hour.replace(':', '')
      const filename = `${dateForFilename}-${hourForFilename}-Pre-Operational-Review.pdf`

      // Upload PDF to Supabase Storage
      showToast('Uploading PDF to storage...', 'info')
      const uploadedPdfUrl = await uploadChecklistPDF(pdfBlob, filename)

      // Prepare data for database
      const dbData = {
        date_string: formatDate(date),
        hour_string: hour,
        brand: selectedBrand,
        product: selectedProduct,
        monitor_name: monitorName,
        monitor_signature: monitorSignature,
        items: formData.section2.items.map(item => ({
          id: item.id,
          name: `${item.nameEn} / ${item.nameEs}`,
          comply: item.comply,
          observation: item.observation,
          correctiveAction: item.correctiveAction,
          correctiveActionComply: item.correctiveActionComply,
          correctiveActionObservation: item.correctiveActionObservation
        })),
        pdf_url: uploadedPdfUrl
      }

      // Save to Supabase database
      showToast('Saving to database...', 'info')
      await insertChecklistPreOperationalReview(dbData)

      // Set PDF URL for viewing
      setPdfUrl(uploadedPdfUrl)
      setIsSubmitted(true)
      clearDraft()

      showToast('Checklist submitted successfully!', 'success')

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
          storageKey="checklist-pre-operational-review-draft"
          checklistName="Pre-Operational Review Processing Areas"
          onReset={resetForm}
        />
      </div>

      <h1 className="text-3xl font-bold mb-2 text-center">
        Pre-Operational Review Processing Areas /<br/>
        Áreas de procesamiento de revisión preoperacional
      </h1>
      <p className="text-center text-sm text-gray-500 mb-6">Code: CF/PC-ASC-017-RG001</p>

      {/* Procedure Button */}
      <div className="mb-6 flex justify-center">
        <button
          type="button"
          onClick={() => setShowProcedureModal(true)}
          className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
        >
          <Info className="h-4 w-4 mr-2" />
          Procedure / Procedimiento
        </button>
      </div>

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
              <label htmlFor="hour" className="block text-sm font-medium text-gray-700 mb-1">
                Hour / Hora <span className="text-red-500">*</span>
              </label>
              <input
                id="hour"
                type="time"
                value={hour}
                onChange={(e) => setHour(e.target.value)}
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

        {/* Section 2: Checklist Items */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">✅ Section 2 – Checklist Items / Elementos del Checklist</h2>
          
          <div className="space-y-6">
            {items.map((item, index) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {index + 1}. {item.nameEn} / {item.nameEs} <span className="text-red-500">*</span>
                  </label>
                  
                  <div className="flex gap-3 mb-3">
                    <button
                      type="button"
                      onClick={() => handleItemChange(item.id, 'comply', true)}
                      className={`px-4 py-2 rounded-md font-medium transition-colors ${
                        item.comply === true
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Comply / Cumple
                    </button>
                    <button
                      type="button"
                      onClick={() => handleItemChange(item.id, 'comply', false)}
                      className={`px-4 py-2 rounded-md font-medium transition-colors ${
                        item.comply === false
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Not Comply / No Cumple
                    </button>
                  </div>
                </div>

                {item.comply === false && (
                  <div className="space-y-3 mt-3 pl-4 border-l-4 border-red-300">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observation / Observación <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={item.observation}
                        onChange={(e) => handleItemChange(item.id, 'observation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        rows={2}
                        required={item.comply === false}
                        placeholder="Enter observation..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Corrective Action / Acción Correctiva <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={item.correctiveAction}
                        onChange={(e) => handleItemChange(item.id, 'correctiveAction', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        rows={2}
                        required={item.comply === false}
                        placeholder="Enter corrective action..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Corrective Action Status / Estado de Acción Correctiva
                      </label>
                      <div className="flex gap-3 mb-3">
                        <button
                          type="button"
                          onClick={() => handleItemChange(item.id, 'correctiveActionComply', true)}
                          className={`px-4 py-2 rounded-md font-medium transition-colors ${
                            item.correctiveActionComply === true
                              ? 'bg-green-500 text-white hover:bg-green-600'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Comply / Cumple
                        </button>
                        <button
                          type="button"
                          onClick={() => handleItemChange(item.id, 'correctiveActionComply', false)}
                          className={`px-4 py-2 rounded-md font-medium transition-colors ${
                            item.correctiveActionComply === false
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Not Comply / No Cumple
                        </button>
                      </div>

                      {item.correctiveActionComply === false && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Corrective Action Observation / Observación de Acción Correctiva <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={item.correctiveActionObservation}
                            onChange={(e) => handleItemChange(item.id, 'correctiveActionObservation', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            rows={2}
                            required={item.correctiveActionComply === false}
                            placeholder="Enter observation for corrective action..."
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">📄 Controls</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            {!isSubmitted && (
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
            )}
          </div>
        </div>
      </form>

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

      {/* Procedure Modal */}
      <Modal
        isOpen={showProcedureModal}
        onClose={() => setShowProcedureModal(false)}
        title="Procedure / Procedimiento"
      >
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <p className="mb-2">
              <strong>English:</strong>
            </p>
            <p className="mb-4">
              Before the start of each process, the QC should review all their working area recording it in this document, if the working area is not in conditions, they inform the line boss and they should indicate the corrective action to be taken, the result and the final decision to then verify it by both QC and Line Manager.
            </p>
          </div>
          <div className="border-t pt-4">
            <p className="mb-2">
              <strong>Español:</strong>
            </p>
            <p>
              Antes de comenzar cada proceso, el QC deberá revisar toda su área de trabajo registrándolo en este documento, en caso de NO encontrar en forma óptima registrará el hallazgo, informará a la jefa de línea la cual debe indicar la acción correctiva a tomar, el resultado de ésta y la decisión final para posteriormente verificarlo por ambos QC y jefe de línea.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}

