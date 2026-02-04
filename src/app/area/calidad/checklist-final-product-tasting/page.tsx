'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Info, X } from 'lucide-react'
import { formatDateMMMDDYYYY, formatDateForFilename as formatDateForFilenameUtil } from '@/lib/date-utils'
import { pdf } from '@react-pdf/renderer'
import { ChecklistFinalProductTastingPDFDocument } from '@/components/ChecklistPDFFinalProductTasting'
import { useToast } from '@/context/ToastContext'
import { useChecklistPersistence } from '@/lib/hooks/useChecklistPersistence'
import { DeleteDraftButton } from '@/components/DeleteDraftButton'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { uploadChecklistPDF, insertChecklistFinalProductTasting } from '@/lib/supabase/checklistFinalProductTasting'

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
    setIsDrawing(true)
    const point = getCoordinates(e)
    if (point) {
      lastPointRef.current = point
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    e.preventDefault()

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const point = getCoordinates(e)
    if (!point) return

    if (lastPointRef.current) {
      ctx.beginPath()
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
      ctx.lineTo(point.x, point.y)
      ctx.stroke()
    }

    lastPointRef.current = point
  }

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      const canvas = canvasRef.current
      if (canvas) {
        justSavedRef.current = true
        onChange(canvas.toDataURL())
      }
      lastPointRef.current = null
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="border-2 border-gray-300 rounded-md p-2 bg-white">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-32 cursor-crosshair border border-gray-200 rounded"
          style={{ touchAction: 'none' }}
        />
      </div>
      <button
        type="button"
        onClick={() => {
          const canvas = canvasRef.current
          if (canvas) {
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height)
              onChange('')
            }
          }
          onClear()
        }}
        className="mt-2 text-sm text-red-600 hover:text-red-800"
      >
        Clear Signature
      </button>
    </div>
  )
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

// Participant interface
interface Participant {
  id: number
  name: string
  appearance: string
  color: string
  smell: string
  texture: string
  taste: string
}

export default function ChecklistFinalProductTastingPage() {
  const { showToast } = useToast()
  const { user } = useAuth()
  
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
  const [turno, setTurno] = useState('')
  const [monitor, setMonitor] = useState('')
  const [formato, setFormato] = useState('')
  const [barCode, setBarCode] = useState('')
  const [bestBefore, setBestBefore] = useState('')
  const [brix, setBrix] = useState('')
  const [ph, setPh] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [product, setProduct] = useState('')
  const [client, setClient] = useState('')
  const [processDate, setProcessDate] = useState(new Date().toISOString().split('T')[0])
  const [batch, setBatch] = useState('')
  const [variety, setVariety] = useState('')

  // Dropdowns data
  const [brands, setBrands] = useState<string[]>([])
  const [materials, setMaterials] = useState<string[]>([])
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [selectedSku, setSelectedSku] = useState('')

  // Section 2: Participants
  const [participants, setParticipants] = useState<Participant[]>([])

  // Section 3: Results
  const [comments, setComments] = useState('')
  const [result, setResult] = useState<'approved' | 'rejected' | 'hold'>('approved')
  const [analystName, setAnalystName] = useState('')
  const [analystSignature, setAnalystSignature] = useState('')

  // Modal state
  const [showInstructionsModal, setShowInstructionsModal] = useState(false)

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isInitialSubmitted, setIsInitialSubmitted] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Format date as MMM-DD-YYYY
  const formatDate = formatDateMMMDDYYYY

  // Format date for PDF filename
  const formatDateForFilename = (dateStr: string): string => formatDateForFilenameUtil(dateStr, false)

  // Calculate mean grade for a specific item
  const calculateMeanGrade = (item: 'appearance' | 'color' | 'smell' | 'texture' | 'taste'): number => {
    const values = participants
      .map(p => parseFloat(p[item]))
      .filter(v => !isNaN(v) && v >= 3.0 && v <= 6.0)
    
    if (values.length === 0) return 0
    const sum = values.reduce((a, b) => a + b, 0)
    return Math.round((sum / values.length) * 10) / 10
  }

  // Calculate final grade (average of all mean grades)
  const calculateFinalGrade = (): number => {
    const meanGrades = [
      calculateMeanGrade('appearance'),
      calculateMeanGrade('color'),
      calculateMeanGrade('smell'),
      calculateMeanGrade('texture'),
      calculateMeanGrade('taste')
    ].filter(g => g > 0)
    
    if (meanGrades.length === 0) return 0
    const sum = meanGrades.reduce((a, b) => a + b, 0)
    return Math.round((sum / meanGrades.length) * 10) / 10
  }

  // Memoized calculations
  const meanAppearance = useMemo(() => calculateMeanGrade('appearance'), [participants])
  const meanColor = useMemo(() => calculateMeanGrade('color'), [participants])
  const meanSmell = useMemo(() => calculateMeanGrade('smell'), [participants])
  const meanTexture = useMemo(() => calculateMeanGrade('texture'), [participants])
  const meanTaste = useMemo(() => calculateMeanGrade('taste'), [participants])
  const finalGrade = useMemo(() => calculateFinalGrade(), [participants])

  // Load user's name for Monitor field
  useEffect(() => {
    if (user?.id) {
      const fetchUserProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle()
        
        if (data?.full_name) {
          setMonitor(data.full_name)
        } else {
          // Fallback: try to get name from email or user metadata
          const email = user.email || ''
          const nameFromEmail = email.split('@')[0]
          const fullName = user.user_metadata?.full_name || 
                           user.user_metadata?.name || 
                           nameFromEmail.split('.').map((n: string) => 
                             n.charAt(0).toUpperCase() + n.slice(1)
                           ).join(' ')
          setMonitor(fullName)
        }
      }
      fetchUserProfile()
    }
  }, [user])

  // Load brands (clients) from Supabase
  useEffect(() => {
    const loadBrands = async () => {
      const { data, error } = await supabase
        .from('productos')
        .select('brand')
      
      if (!error && data) {
        const uniqueBrands = Array.from(new Set(data.map((p: any) => p.brand).filter(Boolean))).sort()
        setBrands(uniqueBrands)
      }
    }
    loadBrands()
  }, [])

  // Load materials (products) when brand changes
  useEffect(() => {
    if (selectedBrand) {
      const loadMaterials = async () => {
        const { data, error } = await supabase
          .from('productos')
          .select('material')
          .eq('brand', selectedBrand)
        
        if (!error && data) {
          const uniqueMaterials = Array.from(new Set(data.map((p: any) => p.material).filter(Boolean))).sort()
          setMaterials(uniqueMaterials)
        }
      }
      loadMaterials()
    } else {
      setMaterials([])
      setSelectedMaterial('')
      setSelectedSku('')
      setVariety('')
    }
  }, [selectedBrand])

  // Get SKU and fetch fruit info when product is selected
  useEffect(() => {
    if (selectedBrand && selectedMaterial) {
      const fetchSkuAndFruits = async () => {
        // Get SKU
        const { data: skuData, error: skuError } = await supabase
          .from('productos')
          .select('sku')
          .eq('brand', selectedBrand)
          .eq('material', selectedMaterial)
          .limit(1)
        
        if (!skuError && skuData && skuData.length > 0) {
          const sku = skuData[0].sku
          setSelectedSku(sku)
          
          // Fetch fruit composition
          const { data: compData, error: compError } = await supabase
            .from('composicion_productos')
            .select('agrupacion, composicion')
            .eq('sku', sku)
          
          if (!compError && compData && compData.length > 0) {
            // Sort by composition descending (highest to lowest percentage)
            const sorted = compData.sort((a, b) => b.composicion - a.composicion)
            
            // Format variety: if mix, show all fruits ordered by percentage
            if (sorted.length === 1) {
              // Monoproduct
              setVariety(sorted[0].agrupacion)
            } else {
              // Mix product - show fruits ordered by percentage (high to low)
              const varietyString = sorted
                .map(item => `${item.agrupacion} (${(item.composicion * 100).toFixed(1)}%)`)
                .join(', ')
              setVariety(varietyString)
            }
          } else {
            // No composition found, try to get agrupacion from composicion_productos
            const { data: agrupacionData } = await supabase
              .from('composicion_productos')
              .select('agrupacion')
              .eq('sku', sku)
              .limit(1)
            
            if (agrupacionData && agrupacionData.length > 0) {
              setVariety(agrupacionData[0].agrupacion)
            } else {
              setVariety('')
            }
          }
        } else {
          setSelectedSku('')
          setVariety('')
        }
      }
      fetchSkuAndFruits()
    } else {
      setSelectedSku('')
      setVariety('')
    }
  }, [selectedBrand, selectedMaterial])

  // Reset form function
  const resetForm = () => {
    setTurno('')
    setMonitor('')
    setFormato('')
    setBarCode('')
    setBestBefore('')
    setBrix('')
    setPh('')
    setDate(new Date().toISOString().split('T')[0])
    setProduct('')
    setClient('')
    setSelectedBrand('')
    setSelectedMaterial('')
    setSelectedSku('')
    setProcessDate(new Date().toISOString().split('T')[0])
    setBatch('')
    setVariety('')
    setParticipants([])
    setComments('')
    setResult('approved')
    setAnalystName('')
    setAnalystSignature('')
    setPdfUrl(null)
    setIsSubmitted(false)
  }

  // Persistence hook
  const { clearDraft } = useChecklistPersistence(
    'checklist-final-product-tasting-draft',
    {
      turno,
      monitor,
      formato,
      barCode,
      bestBefore,
      brix,
      ph,
      date,
      product,
      client,
      selectedBrand,
      selectedMaterial,
      selectedSku,
      processDate,
      batch,
      variety,
      participants,
      comments,
      result,
      analystName,
      analystSignature
    },
    !!pdfUrl,
    (data) => {
      if (data.turno) setTurno(data.turno)
      if (data.monitor) setMonitor(data.monitor)
      if (data.formato) setFormato(data.formato)
      if (data.barCode) setBarCode(data.barCode)
      if (data.bestBefore) setBestBefore(data.bestBefore)
      if (data.brix) setBrix(data.brix)
      if (data.ph) setPh(data.ph)
      if (data.date) setDate(data.date)
      if (data.product) setProduct(data.product)
      if (data.client) setClient(data.client)
      if (data.selectedBrand) setSelectedBrand(data.selectedBrand)
      if (data.selectedMaterial) setSelectedMaterial(data.selectedMaterial)
      if (data.selectedSku) setSelectedSku(data.selectedSku)
      if (data.processDate) setProcessDate(data.processDate)
      if (data.batch) setBatch(data.batch)
      if (data.variety) setVariety(data.variety)
      if (data.participants && data.participants.length > 0) setParticipants(data.participants)
      if (data.comments) setComments(data.comments)
      if (data.result) setResult(data.result)
      if (data.analystName) setAnalystName(data.analystName)
      if (data.analystSignature) setAnalystSignature(data.analystSignature)
    }
  )

  // Handle adding a new participant
  const handleAddParticipant = () => {
    const newParticipant: Participant = {
      id: Date.now(),
      name: '',
      appearance: '',
      color: '',
      smell: '',
      texture: '',
      taste: ''
    }
    setParticipants([...participants, newParticipant])
  }

  // Handle removing a participant
  const handleRemoveParticipant = (id: number) => {
    setParticipants(participants.filter(p => p.id !== id))
  }

  // Handle participant change
  const handleParticipantChange = (id: number, field: keyof Participant, value: string) => {
    setParticipants(participants.map(p => {
      if (p.id === id) {
        // Validate grade inputs (3.0-6.0)
        if (field === 'appearance' || field === 'color' || field === 'smell' || field === 'texture' || field === 'taste') {
          const numValue = parseFloat(value)
          if (value === '' || (!isNaN(numValue) && numValue >= 3.0 && numValue <= 6.0)) {
            return { ...p, [field]: value }
          }
          return p
        }
        return { ...p, [field]: value }
      }
      return p
    }))
  }

  // Handle form submission (initial submission - Sections 1, 2, and 3 with analyst info)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (participants.length === 0) {
      showToast('Please add at least one participant', 'error')
      return
    }

    if (!analystName || !analystSignature) {
      showToast('Analyst name and signature are required', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare form data
      const formData = {
        section1: {
          turno,
          monitor,
          formato,
          barCode,
          bestBefore,
          brix,
          ph,
          date,
          product: selectedMaterial || product,
          client: selectedBrand || client,
          processDate,
          batch,
          variety
        },
        section2: {
          participants,
          meanAppearance,
          meanColor,
          meanSmell,
          meanTexture,
          meanTaste,
          finalGrade
        },
        section3: {
          comments,
          result,
          analystName,
          analystSignature,
          checkerName: '', // Will be filled by QA Practitioner later
          checkerSignature: '', // Will be filled by QA Practitioner later
          checkerDate: '' // Will be filled by QA Practitioner later
        }
      }

      // Generate PDF
      showToast('Generating PDF...', 'info')
      const pdfBlob = await pdf(
        <ChecklistFinalProductTastingPDFDocument data={formData} />
      ).toBlob()

      // Create filename
      const dateForFilename = formatDateForFilename(date)
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const seconds = now.getSeconds().toString().padStart(2, '0')
      const timeStr = `${hours}${minutes}${seconds}`
      const filename = `${dateForFilename}-${timeStr}-Final-Product-Tasting.pdf`

      // Upload PDF to Supabase Storage
      showToast('Uploading PDF to storage...', 'info')
      const uploadedUrl = await uploadChecklistPDF(pdfBlob, filename)

      // Prepare data for database (without verification - will be added by QA Practitioner)
      const dbData = {
        turno,
        monitor,
        formato,
        bar_code: barCode,
        best_before: bestBefore,
        brix,
        ph,
        date,
        product: selectedMaterial || product,
        client: selectedBrand || client,
        process_date: processDate,
        batch,
        variety,
        participants,
        mean_appearance: meanAppearance,
        mean_color: meanColor,
        mean_smell: meanSmell,
        mean_texture: meanTexture,
        mean_taste: meanTaste,
        final_grade: finalGrade,
        comments: comments || null,
        result,
        analyst_name: analystName,
        analyst_signature: analystSignature,
        checker_name: null, // Will be filled by QA Practitioner
        checker_signature: null, // Will be filled by QA Practitioner
        checker_date: null, // Will be filled by QA Practitioner
        pdf_url: uploadedUrl,
        date_string: formatDate(date)
      }

      // Save to Supabase database
      showToast('Saving to database...', 'info')
      await insertChecklistFinalProductTasting(dbData)

      // Set PDF URL for viewing
      setPdfUrl(uploadedUrl)
      setIsInitialSubmitted(true)
      setIsSubmitted(true)

      // Clear localStorage after successful submission
      clearDraft()

      showToast('Checklist submitted successfully! Email notification sent to QA Practitioner for final verification.', 'success')

      // Log what happened
      console.log('Checklist submitted successfully:')
      console.log('1. PDF generated')
      console.log('2. PDF uploaded to:', uploadedUrl)
      console.log('3. Data saved to Supabase')
      console.log('4. Email notification sent to QA Practitioner')
      console.log('5. Waiting for QA Practitioner final verification')
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
          storageKey="checklist-final-product-tasting-draft"
          checklistName="Final Product Tasting"
          onReset={resetForm}
        />
      </div>

      <h1 className="text-3xl font-bold mb-2 text-center">
        Final product tasting /<br/>
        Degustación de producto terminado
      </h1>
      <p className="text-center text-sm text-gray-500 mb-6">Code: CF/PC-ASC-006-RG008</p>

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

      {!isInitialSubmitted && (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Instructions Button */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={() => setShowInstructionsModal(true)}
                className="inline-flex items-center px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
              >
                <Info className="h-3 w-3 mr-1.5" />
                Instructions / Instrucciones
              </button>
            </div>
          </div>

          {/* Section 1: Basic Info */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">
              Section 1 – Basic Info / Sección 1 – Información Básica
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Fecha, Producto, Cliente, Fecha proceso, Lote, Variedad */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha/Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Producto/Product <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedMaterial}
                    onChange={(e) => {
                      setSelectedMaterial(e.target.value)
                      setProduct(e.target.value)
                    }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={!selectedBrand}
                  >
                    <option value="">Select product</option>
                    {materials.map((material) => (
                      <option key={material} value={material}>
                        {material}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente/Client <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedBrand}
                    onChange={(e) => {
                      setSelectedBrand(e.target.value)
                      setClient(e.target.value)
                      setSelectedMaterial('')
                      setProduct('')
                      setVariety('')
                    }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select client</option>
                    {brands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha proceso/Process date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={processDate}
                    onChange={(e) => setProcessDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lote/Batch <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Variedad/Variety <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={variety}
                    readOnly
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                    required
                  />
                </div>
              </div>

              {/* Right Column: Turno, Monitor (calidad), Formato, Codigo de barra, Best before, Brix and pH */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Turno/Shift <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={turno}
                    onChange={(e) => setTurno(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monitor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={monitor}
                    onChange={(e) => setMonitor(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Formato/Format <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formato}
                    onChange={(e) => setFormato(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código barra/Bar code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={barCode}
                    onChange={(e) => setBarCode(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Best before/BBD <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bestBefore}
                    onChange={(e) => setBestBefore(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ºBrix <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={brix}
                    onChange={(e) => setBrix(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    pH <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={ph}
                    onChange={(e) => setPh(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Participants Table */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Section 2 – Organoleptic Analysis / Sección 2 – Análisis Organoléptico
              </h2>
              <button
                type="button"
                onClick={handleAddParticipant}
                className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Participant
              </button>
            </div>

            {participants.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No participants added yet. Click "Add Participant" to start.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="border border-gray-300 px-4 py-2 text-left">Nº</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Nombre Panelistas / Participants</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">APARIENCIA<br/>Appearance</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">COLOR<br/>Color</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">OLOR<br/>Smell</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">TEXTURA<br/>Texture</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">SABOR<br/>Taste</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((participant, index) => (
                      <tr key={participant.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-4 py-2 text-center font-medium">{index + 1}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="text"
                            value={participant.name}
                            onChange={(e) => handleParticipantChange(participant.id, 'name', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                            placeholder="Participant name"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            min="3.0"
                            max="6.0"
                            step="0.1"
                            value={participant.appearance}
                            onChange={(e) => handleParticipantChange(participant.id, 'appearance', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm text-center"
                            placeholder="3.0-6.0"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            min="3.0"
                            max="6.0"
                            step="0.1"
                            value={participant.color}
                            onChange={(e) => handleParticipantChange(participant.id, 'color', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm text-center"
                            placeholder="3.0-6.0"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            min="3.0"
                            max="6.0"
                            step="0.1"
                            value={participant.smell}
                            onChange={(e) => handleParticipantChange(participant.id, 'smell', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm text-center"
                            placeholder="3.0-6.0"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            min="3.0"
                            max="6.0"
                            step="0.1"
                            value={participant.texture}
                            onChange={(e) => handleParticipantChange(participant.id, 'texture', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm text-center"
                            placeholder="3.0-6.0"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            min="3.0"
                            max="6.0"
                            step="0.1"
                            value={participant.taste}
                            onChange={(e) => handleParticipantChange(participant.id, 'taste', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm text-center"
                            placeholder="3.0-6.0"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveParticipant(participant.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {/* Mean Grades Row */}
                    <tr className="bg-blue-50 font-semibold">
                      <td colSpan={2} className="border border-gray-300 px-4 py-2 text-right">
                        NOTA PROMEDIO/Mean grade
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {meanAppearance > 0 ? meanAppearance.toFixed(1) : '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {meanColor > 0 ? meanColor.toFixed(1) : '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {meanSmell > 0 ? meanSmell.toFixed(1) : '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {meanTexture > 0 ? meanTexture.toFixed(1) : '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {meanTaste > 0 ? meanTaste.toFixed(1) : '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2"></td>
                    </tr>
                    {/* Final Grade Row */}
                    <tr className="bg-green-50 font-bold">
                      <td colSpan={2} className="border border-gray-300 px-4 py-2 text-right">
                        NOTA PROMEDIO FINAL/Final grade
                      </td>
                      <td colSpan={5} className="border border-gray-300 px-4 py-2 text-center text-lg">
                        {finalGrade > 0 ? finalGrade.toFixed(1) : '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Results */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">
              Section 3 – Results / Sección 3 – Resultados
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  COMENTARIOS U OBSERVACIONES SOBRE EL PRODUCTO (OPCIONAL) / Comments or observations about the product (optional)
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter comments or observations..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RESULTADO / Results <span className="text-red-500">*</span>
                </label>
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value as 'approved' | 'rejected' | 'hold')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="approved">Aprobado / Approved</option>
                  <option value="rejected">Rechazado / Rejected</option>
                  <option value="hold">Hold</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre analista / Analyst name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={analystName}
                    onChange={(e) => setAnalystName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <SignatureCanvas
                    value={analystSignature}
                    onChange={setAnalystSignature}
                    onClear={() => setAnalystSignature('')}
                    label="Firma / Signature *"
                  />
                </div>
              </div>
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
      )}

      {/* Instructions Modal */}
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
              <strong>DEAR EVALUATOR:</strong> Analyze the product in its current semi-thawed state, which allows for a better perception of its qualities—noting these differ from fresh fruit. Please consider that the freezing process modifies the natural structure; therefore, evaluate the quality of the processed product following this sequence:
            </p>
            <ol className="list-decimal list-inside space-y-2 mb-4">
              <li><strong>Appearance:</strong> Observe the product. Pieces should be loose and maintain their original shape. The presence of natural juice at the bottom of the plate is normal, but the fruit must not appear broken down or mushy.</li>
              <li><strong>Color:</strong> It must be intense, bright, and uniform. Verify the absence of dark spots (oxidation) or discoloration caused by excess ice.</li>
              <li><strong>Odor:</strong> Perceive the sample's aroma. It must be clean and characteristic of the fruit, without notes of dampness, plastic, or prolonged storage.</li>
              <li><strong>Texture:</strong> Upon biting, the piece should be juicy and offer moderate resistance. It should not feel excessively soft, mealy, or hard due to ice crystals.</li>
              <li><strong>Flavor:</strong> Evaluate the natural balance of sweetness and acidity. It must not leave bitter, metallic, or off-flavors in the mouth.</li>
            </ol>
          </div>
          <div className="border-t pt-4">
            <p className="mb-2">
              <strong>Español:</strong>
            </p>
            <p className="mb-4">
              <strong>ESTIMADO EVALUADOR:</strong> Analice el producto en su estado actual (semidescongelado), el cual permite percibir mejor sus cualidades, las cuales son diferentes al estado fresco. Considere que el proceso de congelación modifica la estructura natural; por ello, evalúe la calidad del producto procesado siguiendo este orden:
            </p>
            <ol className="list-decimal list-inside space-y-2">
              <li><strong>Apariencia:</strong> Observe el conjunto del producto. Las piezas deben estar sueltas y mantener su forma original. Es normal la presencia de jugo natural en el fondo del plato, pero la fruta no debe verse deshecha.</li>
              <li><strong>Color:</strong> Debe ser intenso, brillante y uniforme. Verifique la ausencia de manchas oscuras (oxidación) o decoloraciones por exceso de hielo.</li>
              <li><strong>Olor:</strong> Perciba el olor de la muestra. Debe ser limpio y característico de la fruta, sin notas a humedad, plástico o almacenamiento prolongado.</li>
              <li><strong>Textura:</strong> Al morder, la pieza debe estar jugosa y ofrecer una resistencia moderada. No debe sentirse excesivamente blanda, harinosa ni dura por presencia de cristales de hielo.</li>
              <li><strong>Sabor:</strong> Evalúe el equilibrio natural de dulzor y acidez. No debe dejar sabores amargos, metálicos o extraños en la boca.</li>
            </ol>
          </div>
        </div>
      </Modal>
    </div>
  )
}
