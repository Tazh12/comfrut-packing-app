'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Plus, Trash2, Camera, ChevronRight, Check, AlertCircle, Truck, Info, X, Box, Edit2, Loader2 } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'

import { ChecklistLoadingMap, SlotData } from '@/components/ChecklistLoadingMap'
import PhotoUploadSection from '@/components/PhotoUploadSection'
import { DeleteDraftButton } from '@/components/DeleteDraftButton'
import { ChecklistFrozenProductDispatchPDFDocument } from '@/components/ChecklistPDFFrozenProductDispatch'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { uploadChecklistPDF, uploadPhoto } from '@/lib/supabase/checklistFrozenProductDispatch'
import { pdf } from '@react-pdf/renderer'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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
        Clear Signature / Limpiar Firma
      </button>
    </div>
  )
}

// --- TYPES ---

type InspectionStatus = 'G' | 'NG'

interface InspectionPoint {
  status: InspectionStatus
  comment: string
}

const INSPECTION_POINTS = [
  { key: 'left_side', label: 'Left Side / Lado Izquierdo' },
  { key: 'doors', label: 'Inside & Outside Doors / Puertas' },
  { key: 'floor', label: 'Floor (Inside) / Piso Interior' },
  { key: 'undercarriage', label: 'Outside & Undercarriage / Chasis y Exterior' },
  { key: 'front_wall', label: 'Front Wall / Pared Frontal' },
  { key: 'right_side', label: 'Right Side / Lado Derecho' },
  { key: 'ceiling_roof', label: 'Ceiling & Roof / Techo' },
]

interface Product {
  id: string
  brand: string
  material: string
  name: string // Display name: brand + material
  expected_pallets?: number
  cases_per_pallet?: number // Boxes per pallet
}

interface PalletChecks {
  case_condition: boolean
  pallet_condition: boolean
  wrap_condition: boolean
  coding_box: boolean
  label: boolean
  additional_label: boolean
}

interface PalletData {
  slot_id: number
  pallet_id: string
  product_id: string
  cases: number
  checks: PalletChecks
  timestamp: string
}

// --- MAIN COMPONENT ---

export default function ChecklistFrozenProductDispatchPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  // State: Wizard Step
  // 1: Header + Plan, 2: Inspection, 3: Loading Map, 4: Closeout
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [showScanner, setShowScanner] = useState(false)

  // SECTION 1: Header + Dispatch Plan
  const [header, setHeader] = useState({
    po_number: '',
    client: '',
    container_number: '',
    driver: '',
    origin: '',
    destination: '',
    ttr: '',
    inspector_name: '',
    date: new Date().toISOString().split('T')[0],
    start_time: ''
  })
  
  const [dispatchPlan, setDispatchPlan] = useState<Product[]>([])
  const [newProduct, setNewProduct] = useState({ brand: '', material: '', pallets: '', cases_per_pallet: '' })
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editProduct, setEditProduct] = useState({ brand: '', material: '', pallets: '', cases_per_pallet: '' })
  
  // Brand and Product dropdowns
  const [brands, setBrands] = useState<string[]>([])
  const [availableProducts, setAvailableProducts] = useState<string[]>([])
  const [editAvailableProducts, setEditAvailableProducts] = useState<string[]>([])
  const [loadingBrands, setLoadingBrands] = useState(false)

  // SECTION 2: Inspection
  const [inspection, setInspection] = useState<Record<string, InspectionPoint>>({})
  const [inspectionTemps, setInspectionTemps] = useState('')
  const [inspectionPhotos, setInspectionPhotos] = useState<any[]>([])
  const [inspectionResult, setInspectionResult] = useState<'Approve' | 'Reject' | null>(null)
  const [inspectorSignature, setInspectorSignature] = useState('')

  // SECTION 3: Loading Map
  const [slots, setSlots] = useState<PalletData[]>([])
  const [rowPhotos, setRowPhotos] = useState<Record<number, any>>({})
  
  // Popup / Modal State
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null)
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false)
  
  // Current Pallet Edit State
  const [currentPallet, setCurrentPallet] = useState<{
    pallet_id: string
    product_id: string
    cases: string
    checks: PalletChecks
  }>({
    pallet_id: '',
    product_id: '',
    cases: '',
    checks: {
      case_condition: true,
      pallet_condition: true,
      wrap_condition: true,
      coding_box: true,
      label: true,
      additional_label: true
    }
  })
  
  // Sticky values for speed
  const [stickyProduct, setStickyProduct] = useState<string>('')
  const [stickyCases, setStickyCases] = useState<string>('')

  // SECTION 4: Closeout
  const [sealNumber, setSealNumber] = useState('')
  const [sealPhotos, setSealPhotos] = useState<any[]>([])
  const [closeoutSignature, setCloseoutSignature] = useState('')
  const [endTime, setEndTime] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  // --- INITIALIZATION ---
  useEffect(() => {
    const loadDraft = () => {
      const saved = localStorage.getItem('checklist-frozen-product-dispatch-draft')
      if (saved) {
        try {
          const data = JSON.parse(saved)
          setHeader(data.header || header)
          setDispatchPlan(data.dispatchPlan || [])
          setInspection(data.inspection || {})
          setInspectionTemps(data.inspectionTemps || '')
          setInspectionResult(data.inspectionResult || null)
          setSlots(data.slots || [])
          setEndTime(data.endTime || '')
          // Restore sticky
          if (data.slots && data.slots.length > 0) {
            const last = data.slots[data.slots.length - 1]
            setStickyProduct(last.product_id)
            setStickyCases(String(last.cases))
          }
        } catch (e) {
          console.error("Error loading draft", e)
        }
      }
    }
    loadDraft()
  }, [])

  // Load brands from Supabase
  useEffect(() => {
    const loadBrands = async () => {
      setLoadingBrands(true)
      try {
        const { data, error } = await supabase
          .from('productos')
          .select('brand')
        
        if (error) {
          console.error('Error loading brands:', error)
          toast.error('Error al cargar marcas')
          return
        }
        
        if (data) {
          const uniqueBrands = Array.from(new Set(data.map((p: any) => p.brand).filter(Boolean))).sort()
          setBrands(uniqueBrands)
        }
      } catch (error) {
        console.error('Error loading brands:', error)
        toast.error('Error al cargar marcas')
      } finally {
        setLoadingBrands(false)
      }
    }
    
    loadBrands()
  }, [])

  // Load products when brand changes (for new product)
  useEffect(() => {
    const loadProducts = async () => {
      if (!newProduct.brand) {
        setAvailableProducts([])
        setNewProduct(prev => ({ ...prev, material: '' }))
        return
      }
      
      try {
        const { data, error } = await supabase
          .from('productos')
          .select('material')
          .eq('brand', newProduct.brand)
        
        if (error) {
          console.error('Error loading products:', error)
          return
        }
        
        if (data) {
          const uniqueMaterials = Array.from(new Set(data.map((p: any) => p.material).filter(Boolean))).sort()
          setAvailableProducts(uniqueMaterials)
        }
      } catch (error) {
        console.error('Error loading products:', error)
      }
    }
    
    loadProducts()
  }, [newProduct.brand])

  // Load products when edit brand changes
  useEffect(() => {
    const loadEditProducts = async () => {
      if (!editProduct.brand) {
        setEditAvailableProducts([])
        setEditProduct(prev => ({ ...prev, material: '' }))
        return
      }
      
      try {
        const { data, error } = await supabase
          .from('productos')
          .select('material')
          .eq('brand', editProduct.brand)
        
        if (error) {
          console.error('Error loading products:', error)
          return
        }
        
        if (data) {
          const uniqueMaterials = Array.from(new Set(data.map((p: any) => p.material).filter(Boolean))).sort()
          setEditAvailableProducts(uniqueMaterials)
        }
      } catch (error) {
        console.error('Error loading products:', error)
      }
    }
    
    if (editingProductId) {
      loadEditProducts()
    }
  }, [editProduct.brand, editingProductId])

  // Update cases when product changes in pallet modal
  useEffect(() => {
    if (isSlotModalOpen && currentPallet.product_id && dispatchPlan.length > 0) {
      const selectedProduct = dispatchPlan.find(p => p.id === currentPallet.product_id)
      if (selectedProduct && selectedProduct.cases_per_pallet) {
        // Auto-fill cases_per_pallet when product is selected
        setCurrentPallet(prev => ({
          ...prev,
          cases: String(selectedProduct.cases_per_pallet)
        }))
      } else if (selectedProduct && !selectedProduct.cases_per_pallet) {
        // If product doesn't have cases_per_pallet, clear the field
        setCurrentPallet(prev => ({
          ...prev,
          cases: ''
        }))
      }
    }
  }, [currentPallet.product_id, dispatchPlan, isSlotModalOpen])

  // Save draft on changes
  useEffect(() => {
    const data = {
      header,
      dispatchPlan,
      inspection,
      inspectionTemps,
      inspectionResult,
      slots,
      endTime,
      updatedAt: new Date().toISOString()
    }
    localStorage.setItem('checklist-frozen-product-dispatch-draft', JSON.stringify(data))
  }, [header, dispatchPlan, inspection, inspectionTemps, inspectionResult, slots, endTime])

  // --- HANDLERS SECTION 1 ---

  const addProductToPlan = () => {
    if (!newProduct.brand || !newProduct.material) {
      toast.error('Selecciona marca y producto')
      return
    }
    const product: Product = {
      id: uuidv4(),
      brand: newProduct.brand,
      material: newProduct.material,
      name: `${newProduct.brand} - ${newProduct.material}`,
      expected_pallets: newProduct.pallets ? Number(newProduct.pallets) : undefined,
      cases_per_pallet: newProduct.cases_per_pallet ? Number(newProduct.cases_per_pallet) : undefined
    }
    setDispatchPlan([...dispatchPlan, product])
    setNewProduct({ brand: '', material: '', pallets: '', cases_per_pallet: '' })
  }

  const removeProductFromPlan = (id: string) => {
    setDispatchPlan(dispatchPlan.filter(p => p.id !== id))
    if (editingProductId === id) {
      setEditingProductId(null)
    }
  }

  const startEditingProduct = (product: Product) => {
    setEditingProductId(product.id)
    setEditProduct({
      brand: product.brand,
      material: product.material,
      pallets: product.expected_pallets ? String(product.expected_pallets) : '',
      cases_per_pallet: product.cases_per_pallet ? String(product.cases_per_pallet) : ''
    })
  }

  const cancelEditingProduct = () => {
    setEditingProductId(null)
    setEditProduct({ brand: '', material: '', pallets: '', cases_per_pallet: '' })
  }

  const saveEditedProduct = () => {
    if (!editProduct.brand || !editProduct.material) {
      toast.error('Selecciona marca y producto')
      return
    }
    if (!editingProductId) return

    setDispatchPlan(dispatchPlan.map(p => {
      if (p.id === editingProductId) {
        return {
          ...p,
          brand: editProduct.brand,
          material: editProduct.material,
          name: `${editProduct.brand} - ${editProduct.material}`,
          expected_pallets: editProduct.pallets ? Number(editProduct.pallets) : undefined,
          cases_per_pallet: editProduct.cases_per_pallet ? Number(editProduct.cases_per_pallet) : undefined
        }
      }
      return p
    }))
    
    setEditingProductId(null)
    setEditProduct({ brand: '', material: '', pallets: '', cases_per_pallet: '' })
    toast.success('Producto actualizado')
  }

  // --- HANDLERS SECTION 2 ---

  // Compress image function - aggressive compression for PDF (target < 50KB total)
  const compressImage = (file: File, maxWidth = 400, quality = 0.5, maxSizeKB = 50): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const reader = new FileReader()

      reader.onload = (e) => {
        img.src = e.target?.result as string
      }

      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) return reject('No se pudo obtener contexto de canvas')

        ctx.drawImage(img, 0, 0, width, height)

        const tryCompress = (currentQuality: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject('Error al comprimir imagen')
              
              const sizeKB = blob.size / 1024
              
              if (sizeKB > maxSizeKB && currentQuality > 0.3) {
                tryCompress(currentQuality - 0.1)
              } else {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                })
                resolve(compressedFile)
              }
            },
            'image/jpeg',
            currentQuality
          )
        }

        tryCompress(quality)
      }

      img.onerror = () => reject('Error al cargar imagen')
      reader.onerror = () => reject('Error al leer archivo')
      reader.readAsDataURL(file)
    })
  }

  const updateInspectionPoint = (key: string, status: InspectionStatus) => {
    setInspection(prev => ({
      ...prev,
      [key]: { status, comment: prev[key]?.comment || '' }
    }))
  }

  const updateInspectionComment = (key: string, comment: string) => {
    setInspection(prev => ({
      ...prev,
      [key]: { ...prev[key] || { status: 'G' }, comment }
    }))
  }

  const handleInspectionPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && inspectionPhotos.length < 5) {
      const file = e.target.files[0]
      try {
        const compressedFile = await compressImage(file)
        const reader = new FileReader()
        reader.onload = (ev) => {
          setInspectionPhotos([...inspectionPhotos, { file: compressedFile, preview: ev.target?.result }])
        }
        reader.readAsDataURL(compressedFile)
      } catch (error) {
        console.error('Error compressing image:', error)
        toast.error('Error al procesar la imagen')
      }
    }
  }

  const removeInspectionPhoto = (index: number) => {
    setInspectionPhotos(inspectionPhotos.filter((_, i) => i !== index))
  }

  const handleSealPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      try {
        const compressedFile = await compressImage(file)
        const reader = new FileReader()
        reader.onload = (ev) => {
          setSealPhotos([...sealPhotos, { file: compressedFile, preview: ev.target?.result }])
        }
        reader.readAsDataURL(compressedFile)
      } catch (error) {
        console.error('Error compressing image:', error)
        toast.error('Error al procesar la imagen')
      }
    }
  }

  const removeSealPhoto = (index: number) => {
    setSealPhotos(sealPhotos.filter((_, i) => i !== index))
  }

  // --- HANDLERS SECTION 3 (MAP) ---

  const handleSlotClick = (slotId: number) => {
    setSelectedSlotId(slotId)
    
    // Check if slot has data
    const existing = slots.find(s => s.slot_id === slotId)
    if (existing) {
      setCurrentPallet({
        pallet_id: existing.pallet_id,
        product_id: existing.product_id,
        cases: String(existing.cases),
        checks: existing.checks
      })
    } else {
      // New pallet - apply sticky defaults
      setCurrentPallet({
        pallet_id: '',
        product_id: stickyProduct || (dispatchPlan.length === 1 ? dispatchPlan[0].id : ''),
        cases: stickyCases || '',
        checks: {
          case_condition: true,
          pallet_condition: true,
          wrap_condition: true,
          coding_box: true,
          label: true,
          additional_label: true
        }
      })
    }
    setIsSlotModalOpen(true)
  }

  const savePallet = () => {
    if (!selectedSlotId) return
    if (!currentPallet.product_id) {
      toast.error('Selecciona un producto')
      return
    }
    if (!currentPallet.cases) {
      toast.error('Ingresa la cantidad de cajas')
      return
    }
    if (!currentPallet.pallet_id) {
      toast.error('Ingresa el número de pallet')
      return
    }

    // Check duplicate pallet ID
    const duplicate = slots.find(s => s.pallet_id === currentPallet.pallet_id && s.slot_id !== selectedSlotId)
    if (duplicate) {
      if (!confirm(`El pallet ${currentPallet.pallet_id} ya está en la posición ${duplicate.slot_id}. ¿Deseas moverlo aquí?`)) {
        return
      }
      // Remove from old slot
      setSlots(prev => prev.filter(s => s.slot_id !== duplicate.slot_id))
    }

    const newPalletData: PalletData = {
      slot_id: selectedSlotId,
      pallet_id: currentPallet.pallet_id,
      product_id: currentPallet.product_id,
      cases: Number(currentPallet.cases),
      checks: currentPallet.checks,
      timestamp: new Date().toISOString()
    }

    // Save sticky
    setStickyProduct(currentPallet.product_id)
    setStickyCases(currentPallet.cases)

    setSlots(prev => {
      // Remove existing for this slot if any
      const filtered = prev.filter(s => s.slot_id !== selectedSlotId)
      return [...filtered, newPalletData]
    })

    setIsSlotModalOpen(false)
    toast.success('Pallet guardado')
  }

  const deletePallet = () => {
    if (selectedSlotId) {
      setSlots(prev => prev.filter(s => s.slot_id !== selectedSlotId))
      setIsSlotModalOpen(false)
      toast.success('Pallet eliminado de la posición')
    }
  }

  const handleRowCameraClick = async (rowIndex: number) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        try {
          const compressedFile = await compressImage(file)
          const reader = new FileReader()
          reader.onload = (ev) => {
            setRowPhotos(prev => ({
              ...prev,
              [rowIndex]: { file: compressedFile, preview: ev.target?.result, row: rowIndex }
            }))
          }
          reader.readAsDataURL(compressedFile)
        } catch (error) {
          console.error('Error compressing image:', error)
          toast.error('Error al procesar la imagen')
        }
      }
    }
    input.click()
  }

  const handleDeleteRowPhoto = (rowIndex: number) => {
    setRowPhotos(prev => {
      const newPhotos = { ...prev }
      delete newPhotos[rowIndex]
      return newPhotos
    })
    toast.success('Foto eliminada')
  }

  const handleSlotDrop = (fromSlotId: number, toSlotId: number) => {
    const fromSlot = slots.find(s => s.slot_id === fromSlotId)
    const toSlot = slots.find(s => s.slot_id === toSlotId)
    
    if (!fromSlot || !fromSlot.pallet_id) {
      return
    }

    // If target slot is empty, move the pallet
    if (!toSlot || !toSlot.pallet_id) {
      setSlots(prev => prev.map(s => {
        if (s.slot_id === fromSlotId) {
          // Move pallet to target slot
          return { ...s, slot_id: toSlotId }
        }
        return s
      }))
      toast.success(`Pallet movido de slot ${fromSlotId} a slot ${toSlotId}`)
    } else {
      // Swap pallets
      setSlots(prev => prev.map(s => {
        if (s.slot_id === fromSlotId) {
          return { ...toSlot, slot_id: fromSlotId }
        }
        if (s.slot_id === toSlotId) {
          return { ...fromSlot, slot_id: toSlotId }
        }
        return s
      }))
      toast.success(`Pallets intercambiados entre slot ${fromSlotId} y ${toSlotId}`)
    }
  }

  // --- SUBMIT ---

  // Reset form function for DeleteDraftButton
  const resetForm = () => {
    setHeader({
      po_number: '',
      client: '',
      container_number: '',
      driver: '',
      origin: '',
      destination: '',
      ttr: '',
      inspector_name: '',
      date: new Date().toISOString().split('T')[0],
      start_time: ''
    })
    setDispatchPlan([])
    setNewProduct({ brand: '', material: '', pallets: '', cases_per_pallet: '' })
    setInspection({})
    setInspectionTemps('')
    setInspectionPhotos([])
    setInspectionResult(null)
    setSlots([])
    setRowPhotos({})
    setSealNumber('')
    setSealPhotos([])
    setCloseoutSignature('')
    setEndTime('')
    setCurrentStep(1)
    setStickyProduct('')
    setStickyCases('')
  }

  const handleSubmit = async () => {
    // Validation
    if (!header.po_number || !header.client) {
      toast.error('Faltan datos en la cabecera')
      return
    }

    if (!closeoutSignature) {
      toast.error('Por favor proporcione la firma del inspector / Please provide inspector signature')
      return
    }
    
    setLoading(true)
    try {
      // 0. Upload photos first
      toast.info('Subiendo fotos...')
      const uploadedInspectionPhotos: Array<{ url: string, label?: string }> = []
      const uploadedRowPhotos: Array<{ url: string, row: number }> = []
      const uploadedSealPhotos: Array<{ url: string, label?: string }> = []
      
      const checklistId = uuidv4().slice(0, 8)
      const dateStr = header.date.replace(/-/g, '')
      
      // Upload inspection photos
      for (let i = 0; i < inspectionPhotos.length; i++) {
        const photo = inspectionPhotos[i]
        if (photo.file) {
          try {
            const filename = `photos/${dateStr}-${checklistId}-inspection-${i + 1}.jpg`
            const url = await uploadPhoto(photo.file, filename)
            uploadedInspectionPhotos.push({ url, label: `Inspection ${i + 1}` })
          } catch (error) {
            console.error(`Error uploading inspection photo ${i + 1}:`, error)
            // Continue with other photos even if one fails
          }
        }
      }
      
      // Upload row photos
      for (const [rowIndex, photo] of Object.entries(rowPhotos)) {
        if (photo?.file) {
          try {
            const filename = `photos/${dateStr}-${checklistId}-row-${rowIndex}.jpg`
            const url = await uploadPhoto(photo.file, filename)
            uploadedRowPhotos.push({ url, row: Number(rowIndex) + 1 })
          } catch (error) {
            console.error(`Error uploading row photo ${rowIndex}:`, error)
          }
        }
      }
      
      // Upload seal photos
      for (let i = 0; i < sealPhotos.length; i++) {
        const photo = sealPhotos[i]
        if (photo?.file) {
          try {
            const filename = `photos/${dateStr}-${checklistId}-seal-${i + 1}.jpg`
            const url = await uploadPhoto(photo.file, filename)
            uploadedSealPhotos.push({ url, label: `Seal ${i + 1}` })
          } catch (error) {
            console.error(`Error uploading seal photo ${i + 1}:`, error)
          }
        }
      }
      
      // 1. Generate PDF
      toast.info('Generando PDF...')
      let pdfBlob: Blob
      try {
        const pdfDoc = (
          <ChecklistFrozenProductDispatchPDFDocument
            data={{
              header: {
                po_number: header.po_number,
                client: header.client,
                date: header.date,
                start_time: header.start_time,
                container_number: header.container_number,
                driver: header.driver,
                origin: header.origin,
                destination: header.destination,
                ttr: header.ttr,
                inspector_name: header.inspector_name
              },
              dispatchPlan: dispatchPlan,
              inspection: inspection,
              inspectionTemps: inspectionTemps,
              inspectionResult: inspectionResult || 'Approve',
              loadingMap: slots,
              sealNumber: sealNumber,
              endTime: endTime,
              inspectionPhotos: uploadedInspectionPhotos,
              rowPhotos: uploadedRowPhotos,
              sealPhotos: uploadedSealPhotos,
              inspectorSignature: closeoutSignature
            }}
          />
        )

        pdfBlob = await pdf(pdfDoc).toBlob()
        console.log('PDF generated successfully, size:', pdfBlob.size)
      } catch (pdfError: any) {
        console.error('Error generating PDF:', pdfError)
        throw new Error(`Error al generar PDF: ${pdfError?.message || String(pdfError)}`)
      }
      
      // 2. Upload PDF to storage
      toast.info('Subiendo PDF...')
      let pdfUrl: string
      try {
        const filename = `dispatch-${dateStr}-${header.po_number}-${checklistId}.pdf`
        pdfUrl = await uploadChecklistPDF(pdfBlob, filename)
        console.log('PDF uploaded successfully, URL:', pdfUrl)
      } catch (uploadError: any) {
        console.error('Error uploading PDF:', uploadError)
        throw new Error(`Error al subir PDF: ${uploadError?.message || String(uploadError)}`)
      }
      
      // 3. Save to DB with PDF URL
      toast.info('Guardando en base de datos...')
      try {
        // Build insert data object
        const insertData: any = {
          po_number: header.po_number,
          client: header.client,
          date: header.date,
          container_number: header.container_number,
          driver: header.driver,
          origin: header.origin,
          destination: header.destination,
          ttr: header.ttr,
          inspector_name: header.inspector_name,
          dispatch_plan: dispatchPlan,
          container_inspection: inspection,
          inspection_temps: inspectionTemps,
          inspection_result: inspectionResult,
          inspection_photos: uploadedInspectionPhotos.map(p => p.url),
          loading_map: slots,
          row_photos: uploadedRowPhotos.reduce((acc, p) => {
            acc[`row_${p.row}`] = p.url
            return acc
          }, {} as Record<string, string>),
          seal_number: sealNumber,
          seal_photos: uploadedSealPhotos.map(p => p.url),
          closeout_signature: closeoutSignature,
          closeout_status: 'completed'
        }

        // Only include pdf_url if we successfully uploaded the PDF
        if (pdfUrl) {
          insertData.pdf_url = pdfUrl
        }

        const { data: savedData, error } = await supabase
          .from('checklist_frozen_product_dispatch')
          .insert(insertData)
          .select()

        if (error) {
          console.error('Database error:', error)
          
          // If error is about missing pdf_url column, try again without it
          if (error.message?.includes('pdf_url') && pdfUrl) {
            console.warn('pdf_url column not found, retrying without it...')
            delete insertData.pdf_url
            const { data: retryData, error: retryError } = await supabase
              .from('checklist_frozen_product_dispatch')
              .insert(insertData)
              .select()
            
            if (retryError) {
              throw new Error(`Error en base de datos: ${retryError.message || JSON.stringify(retryError)}`)
            }
            
            console.log('Checklist saved successfully (without pdf_url):', retryData)
            toast.warning('Checklist guardado, pero la columna pdf_url no existe. Por favor ejecuta la migración SQL.')
          } else {
            throw new Error(`Error en base de datos: ${error.message || JSON.stringify(error)}`)
          }
        } else {
          console.log('Checklist saved successfully:', savedData)
        }
      } catch (dbError: any) {
        console.error('Error saving to database:', dbError)
        throw new Error(`Error al guardar en base de datos: ${dbError?.message || String(dbError)}`)
      }

      // Set PDF URL and success state
      setPdfUrl(pdfUrl)
      setIsSubmitted(true)
      
      // Clear localStorage after successful submission
      localStorage.removeItem('checklist-frozen-product-dispatch-draft')
      
      toast.success('Checklist guardado exitosamente')

    } catch (error: any) {
      console.error('Error submitting checklist:', error)
      
      // Handle different error types
      let errorMessage = 'Error al guardar el checklist'
      
      if (error?.message) {
        errorMessage += ': ' + error.message
      } else if (typeof error === 'string') {
        errorMessage += ': ' + error
      } else if (error?.error?.message) {
        errorMessage += ': ' + error.error.message
      } else {
        errorMessage += '. Por favor intenta nuevamente.'
      }
      
      // Log full error details for debugging
      console.error('Full error details:', {
        error,
        errorType: typeof error,
        errorKeys: error ? Object.keys(error) : [],
        errorString: String(error)
      })
      
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // --- RENDER HELPERS ---

  const canProceedFromInspection = () => {
    // Check if all 7 points have a status
    const allPointsChecked = INSPECTION_POINTS.every(p => inspection[p.key]?.status)
    const isApproved = inspectionResult === 'Approve'
    // Logic: "If rejected, you can’t proceed to loading."
    return allPointsChecked && isApproved
  }
  
  const mapSlotsToDisplay = slots.map(s => {
    const product = dispatchPlan.find(p => p.id === s.product_id)
    return {
      slot_id: s.slot_id,
      pallet_id: s.pallet_id,
      product_name: product?.name,
      cases: s.cases
    }
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* HEADER NAV */}
      <div className="bg-white border-b sticky top-0 z-30 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/area/logistica" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="font-semibold text-gray-800">Carga de Congelado</h1>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className={`px-2 py-0.5 rounded-full ${currentStep >= 1 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>1. Plan</span>
              <ChevronRight className="h-3 w-3" />
              <span className={`px-2 py-0.5 rounded-full ${currentStep >= 2 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>2. Insp</span>
              <ChevronRight className="h-3 w-3" />
              <span className={`px-2 py-0.5 rounded-full ${currentStep >= 3 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>3. Carga</span>
              <ChevronRight className="h-3 w-3" />
              <span className={`px-2 py-0.5 rounded-full ${currentStep >= 4 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>4. Fin</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DeleteDraftButton 
            storageKey="checklist-frozen-product-dispatch-draft"
            checklistName="Inspection of Frozen Product in Dispatch"
            onReset={resetForm}
          />
          <Button size="sm" variant="outline" onClick={() => toast.success('Borrador guardado')}>
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        
        {/* STEP 1: PLAN */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Datos del Despacho
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente / Client</Label>
                  <Input value={header.client} onChange={e => setHeader({...header, client: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Orden de Compra / PO</Label>
                  <Input value={header.po_number} onChange={e => setHeader({...header, po_number: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Contenedor / Container</Label>
                  <Input value={header.container_number} onChange={e => setHeader({...header, container_number: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Conductor / Driver</Label>
                  <Input value={header.driver} onChange={e => setHeader({...header, driver: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Origen</Label>
                  <Input value={header.origin} onChange={e => setHeader({...header, origin: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Destino</Label>
                  <Input value={header.destination} onChange={e => setHeader({...header, destination: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>TTR</Label>
                  <Input value={header.ttr} onChange={e => setHeader({...header, ttr: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Inspector</Label>
                  <Input value={header.inspector_name} onChange={e => setHeader({...header, inspector_name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Fecha / Date</Label>
                  <Input 
                    type="date"
                    value={header.date} 
                    onChange={e => setHeader({...header, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora de Inicio / Start Time</Label>
                  <Input 
                    type="time"
                    value={header.start_time} 
                    onChange={e => setHeader({...header, start_time: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Box className="h-5 w-5 text-blue-500" />
                Plan de Carga (Dispatch Plan)
              </h2>
              <p className="text-sm text-gray-500 mb-4">Define los productos autorizados para este despacho.</p>
              
              <div className="space-y-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Marca / Brand</Label>
                    <select
                      value={newProduct.brand}
                      onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value, material: '' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                      disabled={loadingBrands}
                    >
                      <option value="">Selecciona marca...</option>
                      {brands.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Producto / Product</Label>
                    <select
                      value={newProduct.material}
                      onChange={(e) => setNewProduct({ ...newProduct, material: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
                      disabled={!newProduct.brand || loadingBrands}
                    >
                      <option value="">Selecciona producto...</option>
                      {availableProducts.map((material) => (
                        <option key={material} value={material}>
                          {material}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="w-24 space-y-1">
                    <Label>Pallets</Label>
                    <Input 
                      type="number" 
                      placeholder="#" 
                      value={newProduct.pallets} 
                      onChange={e => setNewProduct({...newProduct, pallets: e.target.value})}
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <Label>Cajas por Pallet</Label>
                    <Input 
                      type="number" 
                      placeholder="#" 
                      value={newProduct.cases_per_pallet} 
                      onChange={e => setNewProduct({...newProduct, cases_per_pallet: e.target.value})}
                    />
                  </div>
                  <Button 
                    onClick={addProductToPlan} 
                    disabled={!newProduct.brand || !newProduct.material}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {dispatchPlan.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 border-2 border-dashed rounded-lg bg-gray-50">
                    No hay productos definidos
                  </div>
                ) : (
                  dispatchPlan.map(product => {
                    const isEditing = editingProductId === product.id
                    
                    if (isEditing) {
                      return (
                        <div key={product.id} className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200 space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-blue-700">Editando producto</span>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={cancelEditingProduct}
                                className="text-gray-600 hover:text-gray-800"
                              >
                                Cancelar
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={saveEditedProduct}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Guardar
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Marca / Brand</Label>
                              <select
                                value={editProduct.brand}
                                onChange={(e) => setEditProduct({ ...editProduct, brand: e.target.value, material: '' })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                              >
                                <option value="">Selecciona marca...</option>
                                {brands.map((brand) => (
                                  <option key={brand} value={brand}>
                                    {brand}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label>Producto / Product</Label>
                              <select
                                value={editProduct.material}
                                onChange={(e) => setEditProduct({ ...editProduct, material: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
                                disabled={!editProduct.brand}
                              >
                                <option value="">Selecciona producto...</option>
                                {editAvailableProducts.map((material) => (
                                  <option key={material} value={material}>
                                    {material}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <div className="w-24 space-y-1">
                              <Label>Pallets</Label>
                              <Input 
                                type="number" 
                                placeholder="#" 
                                value={editProduct.pallets} 
                                onChange={e => setEditProduct({...editProduct, pallets: e.target.value})}
                              />
                            </div>
                            <div className="w-32 space-y-1">
                              <Label>Cajas por Pallet</Label>
                              <Input 
                                type="number" 
                                placeholder="#" 
                                value={editProduct.cases_per_pallet} 
                                onChange={e => setEditProduct({...editProduct, cases_per_pallet: e.target.value})}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    }
                    
                    return (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-500 space-x-3">
                            {product.expected_pallets && (
                              <span>{product.expected_pallets} pallets esperados</span>
                            )}
                            {product.cases_per_pallet && (
                              <span>{product.cases_per_pallet} cajas por pallet</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => startEditingProduct(product)} 
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => removeProductFromPlan(product.id)} 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                size="lg" 
                onClick={() => {
                  if (dispatchPlan.length === 0) {
                    toast.error('Debes agregar al menos un producto al plan')
                    return
                  }
                  setCurrentStep(2)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Siguiente: Inspección
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: INSPECTION */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
             <div className="bg-white rounded-xl shadow-sm border p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-500" />
                Inspección del Contenedor (7 Puntos)
              </h2>
              
              <div className="space-y-6">
                {INSPECTION_POINTS.map(point => (
                  <div key={point.key} className="border-b pb-4 last:border-0">
                    <div className="flex justify-between items-start mb-2">
                      <Label className="text-base font-medium">{point.label}</Label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateInspectionPoint(point.key, 'G')}
                          className={`px-3 py-1.5 rounded-md text-sm font-bold border transition-colors ${
                            inspection[point.key]?.status === 'G' 
                              ? 'bg-green-100 text-green-700 border-green-200' 
                              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          APROBADO
                        </button>
                        <button
                          onClick={() => updateInspectionPoint(point.key, 'NG')}
                          className={`px-3 py-1.5 rounded-md text-sm font-bold border transition-colors ${
                            inspection[point.key]?.status === 'NG' 
                              ? 'bg-red-100 text-red-700 border-red-200' 
                              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          RECHAZADO
                        </button>
                      </div>
                    </div>
                    {/* Comment always visible if NG, optional otherwise */}
                    <Input 
                      placeholder="Observaciones..." 
                      value={inspection[point.key]?.comment || ''}
                      onChange={e => updateInspectionComment(point.key, e.target.value)}
                      className={inspection[point.key]?.status === 'NG' ? 'border-red-300 bg-red-50' : ''}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="space-y-2 mb-4">
                <Label>Set Point / Temperatura</Label>
                <Input 
                  value={inspectionTemps} 
                  onChange={e => setInspectionTemps(e.target.value)}
                  placeholder="-18°C"
                />
              </div>

              <div className="space-y-2">
                <Label>Fotos de Inspección (Máx 5)</Label>
                <div className="flex flex-wrap gap-2">
                  {inspectionPhotos.map((photo, i) => (
                    <div key={i} className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border">
                       <img src={photo.preview} className="w-full h-full object-cover" />
                       <button 
                        onClick={() => removeInspectionPhoto(i)}
                        className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl"
                       >
                         <X className="h-3 w-3" />
                       </button>
                    </div>
                  ))}
                  {inspectionPhotos.length < 5 && (
                    <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <Camera className="h-6 w-6 text-gray-400" />
                      <span className="text-[10px] text-gray-500 mt-1">Agregar</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleInspectionPhotoUpload} />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold mb-3">Resultado de Inspección</h3>
              <div className="flex gap-4">
                <button
                   onClick={() => setInspectionResult('Approve')}
                   className={`flex-1 py-3 rounded-lg border-2 font-bold flex items-center justify-center gap-2 ${
                     inspectionResult === 'Approve' 
                       ? 'border-green-500 bg-green-50 text-green-700' 
                       : 'border-gray-200 text-gray-500 hover:border-green-200'
                   }`}
                >
                  <Check className="h-5 w-5" />
                  APROBAR CARGA
                </button>
                <button
                   onClick={() => setInspectionResult('Reject')}
                   className={`flex-1 py-3 rounded-lg border-2 font-bold flex items-center justify-center gap-2 ${
                     inspectionResult === 'Reject' 
                       ? 'border-red-500 bg-red-50 text-red-700' 
                       : 'border-gray-200 text-gray-500 hover:border-red-200'
                   }`}
                >
                  <AlertCircle className="h-5 w-5" />
                  RECHAZAR CARGA
                </button>
              </div>
              
              {inspectionResult === 'Reject' && (
                <div className="mt-4 p-4 bg-red-50 text-red-800 rounded-lg text-sm border border-red-100">
                  ⚠️ Si rechazas el contenedor, no podrás continuar con la carga.
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Atrás
              </Button>
              <Button 
                size="lg" 
                disabled={!canProceedFromInspection()}
                onClick={() => setCurrentStep(3)}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                Siguiente: Mapa de Carga
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: LOADING MAP */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Mapa de Carga</h2>
              <div className="text-sm text-gray-500">
                {slots.length} pallets cargados
              </div>
            </div>

            <ChecklistLoadingMap 
              slots={mapSlotsToDisplay}
              rowPhotos={rowPhotos}
              onSlotClick={handleSlotClick}
              onRowCameraClick={handleRowCameraClick}
              onSlotDrop={handleSlotDrop}
              onDeleteRowPhoto={handleDeleteRowPhoto}
            />

            <div className="flex justify-between pt-8 pb-10">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Inspección
              </Button>
              <Button 
                size="lg" 
                onClick={() => setCurrentStep(4)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Finalizar y Cerrar
                <Check className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: CLOSEOUT */}
        {currentStep === 4 && !isSubmitted && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h2 className="text-lg font-semibold mb-4">Cierre de Despacho</h2>
              
              <div className="space-y-4">
                 {/* Summary Comparison */}
                 <div className="p-4 bg-blue-50 text-blue-800 rounded-lg">
                    <h3 className="font-bold mb-3">Resumen General</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-semibold">Total Pallets:</p>
                        <p className="text-lg">{slots.length}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Total Cajas:</p>
                        <p className="text-lg">{slots.reduce((sum, s) => sum + (Number(s.cases) || 0), 0)}</p>
                      </div>
                    </div>
                 </div>

                 {/* Product Comparison Table */}
                 <div className="space-y-3">
                   <h3 className="font-semibold text-gray-700">Comparación por Producto</h3>
                   <div className="overflow-x-auto">
                     <table className="w-full border-collapse border border-gray-300">
                       <thead>
                         <tr className="bg-gray-100">
                           <th className="border border-gray-300 p-2 text-left text-sm font-semibold">Producto</th>
                           <th className="border border-gray-300 p-2 text-center text-sm font-semibold">Pallets Esperados</th>
                           <th className="border border-gray-300 p-2 text-center text-sm font-semibold">Pallets Despachados</th>
                           <th className="border border-gray-300 p-2 text-center text-sm font-semibold">Diferencia</th>
                           <th className="border border-gray-300 p-2 text-center text-sm font-semibold">Cajas Esperadas</th>
                           <th className="border border-gray-300 p-2 text-center text-sm font-semibold">Cajas Despachadas</th>
                           <th className="border border-gray-300 p-2 text-center text-sm font-semibold">Diferencia</th>
                         </tr>
                       </thead>
                       <tbody>
                         {dispatchPlan.map((product) => {
                           const dispatchedPallets = slots.filter(s => s.product_id === product.id).length
                           const dispatchedCases = slots
                             .filter(s => s.product_id === product.id)
                             .reduce((sum, s) => sum + (Number(s.cases) || 0), 0)
                           
                           const expectedPallets = product.expected_pallets || 0
                           const expectedCases = (product.expected_pallets || 0) * (product.cases_per_pallet || 0)
                           
                           const palletDiff = dispatchedPallets - expectedPallets
                           const caseDiff = dispatchedCases - expectedCases
                           
                           return (
                             <tr key={product.id} className={palletDiff !== 0 || caseDiff !== 0 ? 'bg-yellow-50' : ''}>
                               <td className="border border-gray-300 p-2 text-sm">{product.name}</td>
                               <td className="border border-gray-300 p-2 text-center text-sm">{expectedPallets || '-'}</td>
                               <td className="border border-gray-300 p-2 text-center text-sm font-semibold">{dispatchedPallets}</td>
                               <td className={`border border-gray-300 p-2 text-center text-sm font-bold ${
                                 palletDiff > 0 ? 'text-green-600' : palletDiff < 0 ? 'text-red-600' : 'text-gray-600'
                               }`}>
                                 {palletDiff > 0 ? `+${palletDiff}` : palletDiff !== 0 ? palletDiff : '0'}
                               </td>
                               <td className="border border-gray-300 p-2 text-center text-sm">{expectedCases || '-'}</td>
                               <td className="border border-gray-300 p-2 text-center text-sm font-semibold">{dispatchedCases}</td>
                               <td className={`border border-gray-300 p-2 text-center text-sm font-bold ${
                                 caseDiff > 0 ? 'text-green-600' : caseDiff < 0 ? 'text-red-600' : 'text-gray-600'
                               }`}>
                                 {caseDiff > 0 ? `+${caseDiff}` : caseDiff !== 0 ? caseDiff : '0'}
                               </td>
                             </tr>
                           )
                         })}
                       </tbody>
                     </table>
                   </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                   <div className="space-y-2">
                     <Label>Sello / Seal #</Label>
                     <Input value={sealNumber} onChange={e => setSealNumber(e.target.value)} />
                   </div>
                   <div className="space-y-2">
                     <Label>Hora de Finalización / End Time</Label>
                     <Input 
                       type="time"
                       value={endTime} 
                       onChange={e => setEndTime(e.target.value)}
                     />
                   </div>
                 </div>

                 {/* Seal Photos */}
                 <div className="space-y-2">
                   <Label>Fotos de Sello / Seal Photos</Label>
                   <div className="flex flex-wrap gap-2">
                     {sealPhotos.map((photo, i) => (
                       <div key={i} className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border">
                         <img src={photo.preview} className="w-full h-full object-cover" />
                         <button 
                           onClick={() => removeSealPhoto(i)}
                           className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl"
                         >
                           <X className="h-3 w-3" />
                         </button>
                       </div>
                     ))}
                     <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                       <Camera className="h-6 w-6 text-gray-400" />
                       <span className="text-[10px] text-gray-500 mt-1">Agregar</span>
                       <input type="file" accept="image/*" className="hidden" onChange={handleSealPhotoUpload} />
                     </label>
                   </div>
                 </div>

                 {/* Inspector Signature */}
                 <div className="pt-4 border-t">
                   <div className="mb-2">
                     <Label className="text-base font-semibold">Inspector / Inspector</Label>
                     <p className="text-sm text-gray-600 mt-1">{header.inspector_name || 'No especificado'}</p>
                   </div>
                   <SignatureCanvas
                     value={closeoutSignature}
                     onChange={setCloseoutSignature}
                     onClear={() => setCloseoutSignature('')}
                     label="Firma del Inspector / Inspector Signature *"
                   />
                 </div>
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(3)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Volver al Mapa
              </Button>
              <Button 
                size="lg" 
                onClick={handleSubmit}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? 'Guardando...' : 'Finalizar Despacho'}
              </Button>
            </div>
          </div>
        )}

        {/* Success State */}
        {isSubmitted && pdfUrl && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
              <div className="mb-4">
                <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Checklist Guardado Exitosamente</h2>
                <p className="text-gray-600">El checklist ha sido guardado y el PDF ha sido generado.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                <Button
                  onClick={() => window.open(pdfUrl, '_blank')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Ver PDF / View PDF
                </Button>
                <Button
                  onClick={() => router.push('/area/logistica')}
                  variant="outline"
                >
                  Volver al Menú / Back to Menu
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* PALLET MODAL */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg sm:rounded-xl shadow-2xl animate-in slide-in-from-bottom-10 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 sm:rounded-t-xl">
              <h3 className="font-bold text-lg">Posición {selectedSlotId}</h3>
              <button onClick={() => setIsSlotModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-5">
              {/* Product Selection */}
              <div className="space-y-2">
                <Label>Producto</Label>
                <div className="grid grid-cols-2 gap-2">
                  {dispatchPlan.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setCurrentPallet(prev => ({...prev, product_id: p.id}))}
                      className={`p-3 text-sm rounded-lg border-2 text-left transition-all ${
                        currentPallet.product_id === p.id 
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pallet ID & Cases */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pallet ID</Label>
                  <div className="flex gap-2">
                    <Input 
                      autoFocus 
                      placeholder="Escanear o escribir..." 
                      value={currentPallet.pallet_id}
                      onChange={e => setCurrentPallet({...currentPallet, pallet_id: e.target.value})}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowScanner(true)}
                      className="shrink-0"
                      title="Escanear código"
                    >
                      <Camera className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cantidad Cajas</Label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={currentPallet.cases}
                    onChange={e => setCurrentPallet({...currentPallet, cases: e.target.value})}
                  />
                  {stickyCases && !currentPallet.cases && (
                     <div className="text-xs text-blue-500 cursor-pointer" onClick={() => setCurrentPallet({...currentPallet, cases: stickyCases})}>
                        Usar último: {stickyCases}
                     </div>
                  )}
                </div>
              </div>

              {/* Quick Checks */}
              <div className="space-y-3 pt-2">
                 <Label className="text-gray-500 uppercase text-xs tracking-wider font-bold">Verificaciones Rápidas</Label>
                 {[
                   { k: 'case_condition', l: 'Condición Cajas' },
                   { k: 'pallet_condition', l: 'Condición Pallet' },
                   { k: 'wrap_condition', l: 'Film/Wrap' },
                   { k: 'coding_box', l: 'Codificación' },
                   { k: 'label', l: 'Etiqueta' },
                   { k: 'additional_label', l: 'Etiq. Adicional' }
                 ].map((check) => (
                   <div key={check.k} className="flex items-center justify-between py-1">
                     <span className="text-sm font-medium">{check.l}</span>
                     <div className="flex gap-1">
                       <button
                         onClick={() => setCurrentPallet(p => ({...p, checks: {...p.checks, [check.k as keyof PalletChecks]: true}}))}
                         className={`px-3 py-1 text-xs rounded font-bold border ${currentPallet.checks[check.k as keyof PalletChecks] ? 'bg-green-500 text-white border-green-600' : 'bg-white text-gray-400'}`}
                       >
                         CUMPLE
                       </button>
                       <button
                         onClick={() => setCurrentPallet(p => ({...p, checks: {...p.checks, [check.k as keyof PalletChecks]: false}}))}
                         className={`px-3 py-1 text-xs rounded font-bold border ${!currentPallet.checks[check.k as keyof PalletChecks] ? 'bg-red-500 text-white border-red-600' : 'bg-white text-gray-400'}`}
                       >
                         NO CUMPLE
                       </button>
                     </div>
                   </div>
                 ))}
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 sm:rounded-b-xl flex gap-3">
              {slots.find(s => s.slot_id === selectedSlotId) && (
                <Button variant="outline" onClick={deletePallet} className="px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300">
                  <Trash2 className="h-5 w-5" />
                </Button>
              )}
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 text-lg" onClick={savePallet}>
                <Save className="mr-2 h-5 w-5" />
                Guardar Pallet
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4 min-w-[200px]">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">Submitting...</p>
              <p className="text-sm text-gray-600 mt-1">Please wait while we save your checklist</p>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(result) => {
          setCurrentPallet({...currentPallet, pallet_id: result})
          setShowScanner(false)
          toast.success('Código escaneado correctamente')
        }}
        title="Escanear Pallet ID"
      />
    </div>
  )
}

