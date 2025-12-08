'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Info, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { pdf } from '@react-pdf/renderer'
import { ChecklistCleanlinessControlPackingPDFDocument } from '@/components/ChecklistPDFCleanlinessControlPacking'
import { uploadChecklistPDF, insertChecklistCleanlinessControlPacking, getNextPdfNumber } from '@/lib/supabase/checklistCleanlinessControlPacking'
import { useToast } from '@/context/ToastContext'
import { useChecklistPersistence } from '@/lib/hooks/useChecklistPersistence'
import { DeleteDraftButton } from '@/components/DeleteDraftButton'

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
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
    if (!canvas) return

    const initializeCanvas = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()

      const currentValue = value

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)

      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (currentValue) {
        const img = new Image()
        img.onload = () => {
          ctx.clearRect(0, 0, rect.width, rect.height)
          ctx.drawImage(img, 0, 0, rect.width, rect.height)
        }
        img.src = currentValue
      }
    }

    if (!isInitializedRef.current) {
      initializeCanvas()
      isInitializedRef.current = true
    }

    const resizeObserver = new ResizeObserver(() => {
      if (!isDrawing) {
        initializeCanvas()
      }
    })

    resizeObserver.observe(canvas)

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

// Part Interface
interface Part {
  partName: string
  comply: boolean | null
  observation: string
  correctiveAction: string
  correctiveActionComply: boolean | null
}

// Area Interface
interface Area {
  areaName: string
  parts: Part[]
}

// Bioluminescence Result Interface
interface BioluminescenceResult {
  partName: string
  rlu: string
  retestRlu?: string // Retest RLU value if initial test was CAUTION or REJECTS
}

// Define areas and parts
const initialAreas: Area[] = [
  {
    areaName: 'Packing Machine #1',
    parts: [
      { partName: 'Elevator 1', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Elevator 2', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Elevator 3', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Elevator 4', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Center cone', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Vibrators upstairs (1)', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Platform (upstairs)', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Stairs and rails', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Working rack (upstairs)', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Vibrators downstairs (4)', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Allied Flex Ceiling', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Top dispensers', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Intermediate dosers', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Bottom dispensers', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Discharge kick', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Main dispenser', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Filling cone', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Mixing table', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Rolling table', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Samashing tables (4)', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Sampling trays and tools', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Ladles, white and grey bins', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Bottom of the machine', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Drain', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null }
    ]
  },
  {
    areaName: 'Packing Area',
    parts: [
      { partName: 'Tables', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Sampling trays and tools', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Ladles, white and grey bins', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Weigher checker', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Metal detectors', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Scales', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Conveyer belt and rollers', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Coding video jets', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Pallet jacks (3)', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Rails', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Sealers', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Floors', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Drain', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Racks', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Pallet wrapper', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Walls', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Ceiling', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Gutters', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Trash cans (ALL)', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null }
    ]
  },
  {
    areaName: 'Restrooms (W/M)',
    parts: [
      { partName: 'Floors-Toillets-sinks-walls', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Trash Cans', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null }
    ]
  },
  {
    areaName: 'Handwashing Station/Filtro Sanitario',
    parts: [
      { partName: 'Sinks', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Walls', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Tables', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Hand sanitizer dispenser', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Hand Soap Dispenser', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Hangers', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Paper towels dispenser', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Hand soap dispenser & Hand drier', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Foot bath', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Hamper (Cintas)', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Doors (4)', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Trash Cans', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Floors, Drains', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Ceiling', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null }
    ]
  },
  {
    areaName: 'Hallways',
    parts: [
      { partName: 'Floors-walls', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Microwaves (x2)', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Chemical room', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Entrance Carpet (Cintas)', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Plastic curtains', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null },
      { partName: 'Refrigerator', comply: null, observation: '', correctiveAction: '', correctiveActionComply: null }
    ]
  }
]

export default function ChecklistCleanlinessControlPackingPage() {
  const { showToast } = useToast()
  
  // Section 1: Basic Info
  const [date, setDate] = useState('')
  const [monitorName, setMonitorName] = useState('')
  const [monitorSignature, setMonitorSignature] = useState('')

  // Section 2: Areas and Parts
  const [areas, setAreas] = useState<Area[]>(initialAreas.map(area => ({
    ...area,
    parts: area.parts.map(part => ({ ...part }))
  })))

  // Section 3: Bioluminescence Results (5 columns only)
  const [bioluminescenceResults, setBioluminescenceResults] = useState<BioluminescenceResult[]>(
    Array(5).fill(null).map(() => ({ partName: '', rlu: '', retestRlu: '' }))
  )

  // Modal states
  const [showInstructionsModal, setShowInstructionsModal] = useState(false)
  const [showCorrectiveActionModal, setShowCorrectiveActionModal] = useState(false)
  const [showLimitsTooltip, setShowLimitsTooltip] = useState(false)
  
  // Collapsed areas state
  const [expandedAreas, setExpandedAreas] = useState<Set<number>>(new Set(initialAreas.map((_, index) => index)))

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

  // Reset form function
  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0]
    setDate(today)
    setMonitorName('')
    setMonitorSignature('')
    setAreas(initialAreas.map(area => ({
      ...area,
      parts: area.parts.map(part => ({ ...part }))
    })))
    setBioluminescenceResults(Array(5).fill(null).map(() => ({ partName: '', rlu: '', retestRlu: '' })))
    setExpandedAreas(new Set(initialAreas.map((_, index) => index)))
    setIsSubmitted(false)
    setPdfUrl(null)
  }

  // Persistence hook
  const { clearDraft } = useChecklistPersistence(
    'checklist-cleanliness-control-packing-draft',
    { 
      date, 
      monitorName, 
      monitorSignature, 
      areas,
      bioluminescenceResults
    },
    isSubmitted,
    (data) => {
      if (data.date) setDate(data.date)
      if (data.monitorName) setMonitorName(data.monitorName)
      if (data.monitorSignature) setMonitorSignature(data.monitorSignature)
      if (data.areas && Array.isArray(data.areas)) {
        setAreas(data.areas)
      }
      if (data.bioluminescenceResults && Array.isArray(data.bioluminescenceResults)) {
        setBioluminescenceResults(data.bioluminescenceResults)
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

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showLimitsTooltip && !target.closest('.limits-tooltip-container')) {
        setShowLimitsTooltip(false)
      }
    }

    if (showLimitsTooltip) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showLimitsTooltip])

  // Update part compliance
  const handlePartComplyChange = (areaIndex: number, partIndex: number, comply: boolean) => {
    setAreas(areas.map((area, aIdx) => {
      if (aIdx === areaIndex) {
        return {
          ...area,
          parts: area.parts.map((part, pIdx) => {
            if (pIdx === partIndex) {
              return {
                ...part,
                comply,
                observation: comply ? '' : part.observation,
                correctiveAction: comply ? '' : part.correctiveAction,
                correctiveActionComply: comply ? null : part.correctiveActionComply
              }
            }
            return part
          })
        }
      }
      return area
    }))
  }

  // Update part observation
  const handlePartObservationChange = (areaIndex: number, partIndex: number, observation: string) => {
    setAreas(areas.map((area, aIdx) => {
      if (aIdx === areaIndex) {
        return {
          ...area,
          parts: area.parts.map((part, pIdx) => {
            if (pIdx === partIndex) {
              return { ...part, observation }
            }
            return part
          })
        }
      }
      return area
    }))
  }

  // Update part corrective action
  const handlePartCorrectiveActionChange = (areaIndex: number, partIndex: number, correctiveAction: string) => {
    setAreas(areas.map((area, aIdx) => {
      if (aIdx === areaIndex) {
        return {
          ...area,
          parts: area.parts.map((part, pIdx) => {
            if (pIdx === partIndex) {
              return { ...part, correctiveAction }
            }
            return part
          })
        }
      }
      return area
    }))
  }

  // Update part corrective action comply
  const handlePartCorrectiveActionComplyChange = (areaIndex: number, partIndex: number, correctiveActionComply: boolean) => {
    setAreas(areas.map((area, aIdx) => {
      if (aIdx === areaIndex) {
        return {
          ...area,
          parts: area.parts.map((part, pIdx) => {
            if (pIdx === partIndex) {
              return { ...part, correctiveActionComply }
            }
            return part
          })
        }
      }
      return area
    }))
  }

  // Update bioluminescence result
  const handleBioluminescenceChange = (index: number, field: 'partName' | 'rlu' | 'retestRlu', value: string) => {
    setBioluminescenceResults(bioluminescenceResults.map((result, idx) => {
      if (idx === index) {
        // If updating RLU and it becomes ACCEPT, clear retestRlu
        if (field === 'rlu') {
          const newRlu = value
          const status = getRLUStatus(newRlu)
          if (status.status === 'accept') {
            return { ...result, [field]: value, retestRlu: '' }
          }
        }
        return { ...result, [field]: value }
      }
      return result
    }))
  }

  // Check if area has missing data
  const hasAreaMissingData = (area: Area): boolean => {
    return area.parts.some(part => part.comply === null)
  }

  // Toggle area expansion
  const toggleAreaExpansion = (areaIndex: number) => {
    setExpandedAreas(prev => {
      const newSet = new Set(prev)
      if (newSet.has(areaIndex)) {
        newSet.delete(areaIndex)
      } else {
        newSet.add(areaIndex)
      }
      return newSet
    })
  }

  // Get RLU status color
  // ACCEPT: <20 (RLU) - 0 to 19
  // CAUTION: 21-59 (RLU) - but treating 20 as CAUTION per user requirement, so 20-60
  // REJECTS: >60 (RLU) - 61 and above
  const getRLUStatus = (rlu: string): { status: 'accept' | 'caution' | 'reject' | 'empty', color: string } => {
    if (!rlu || rlu.trim() === '') return { status: 'empty', color: 'bg-gray-100' }
    const rluNum = parseFloat(rlu)
    if (isNaN(rluNum)) return { status: 'empty', color: 'bg-gray-100' }
    if (rluNum < 20) return { status: 'accept', color: 'bg-green-100 border-green-500' }
    if (rluNum >= 20 && rluNum <= 60) return { status: 'caution', color: 'bg-yellow-100 border-yellow-500' }
    return { status: 'reject', color: 'bg-red-100 border-red-500' }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate Section 1
      if (!date || !monitorName || !monitorSignature) {
        showToast('Please fill in all required fields in Section 1', 'error')
        setIsSubmitting(false)
        return
      }

      // Validate Section 2 - check if all parts have comply status
      const areasWithMissing = areas.filter(area => hasAreaMissingData(area))
      if (areasWithMissing.length > 0) {
        const areaNames = areasWithMissing.map(area => area.areaName).join(', ')
        showToast(`Please select Comply or Not Comply for all parts in the following areas: ${areaNames}`, 'error')
        setIsSubmitting(false)
        return
      }

      // Validate Section 2 - check if Not Comply parts have required fields
      const hasInvalidNotComply = areas.some(area =>
        area.parts.some(part => 
          part.comply === false && (
            !part.observation.trim() || 
            !part.correctiveAction.trim() || 
            part.correctiveActionComply === null
          )
        )
      )
      if (hasInvalidNotComply) {
        showToast('Please fill in observation, corrective action, and corrective action status for all Not Comply parts', 'error')
        setIsSubmitting(false)
        return
      }

      // Validate Section 3 - check if retest is required for CAUTION or REJECTS
      const hasMissingRetest = bioluminescenceResults.some((result, index) => {
        const status = getRLUStatus(result.rlu)
        const needsRetest = status.status === 'caution' || status.status === 'reject'
        return needsRetest && (!result.retestRlu || !result.retestRlu.trim())
      })
      if (hasMissingRetest) {
        showToast('Please enter retest RLU values for all CAUTION or REJECTS results in Section 3', 'error')
        setIsSubmitting(false)
        return
      }

      // Format date functions
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
          monitorName,
          monitorSignature
        },
        section2: {
          areas: areas.map(area => ({
            areaName: area.areaName,
            parts: area.parts.map(part => ({
              partName: part.partName,
              comply: part.comply,
              observation: part.observation,
              correctiveAction: part.correctiveAction,
              correctiveActionComply: part.correctiveActionComply
            }))
          }))
        },
        section3: {
          bioluminescenceResults: bioluminescenceResults
            .filter(r => r.partName.trim() || r.rlu.trim())
            .slice(0, 5)
            .map(r => ({
              partName: r.partName,
              rlu: r.rlu,
              retestRlu: r.retestRlu || undefined
            }))
        }
      }

      // Generate PDF
      showToast('Generating PDF...', 'info')
      const pdfBlob = await pdf(
        <ChecklistCleanlinessControlPackingPDFDocument data={formData} />
      ).toBlob()

      // Create filename with date prefix and incrementing number
      const dateForFilename = formatDateForFilename(date)
      const pdfNumber = await getNextPdfNumber(dateForFilename)
      const filename = `${dateForFilename}-Cleanliness-Control-Packing-${pdfNumber}.pdf`

      // Upload PDF to Supabase Storage
      showToast('Uploading PDF to storage...', 'info')
      const uploadedPdfUrl = await uploadChecklistPDF(pdfBlob, filename)

      // Prepare data for database
      const dbData = {
        date_string: formatDate(date),
        monitor_name: monitorName,
        monitor_signature: monitorSignature,
        areas: formData.section2.areas,
        bioluminescence_results: formData.section3.bioluminescenceResults,
        pdf_url: uploadedPdfUrl
      }

      // Save to Supabase database
      showToast('Saving to database...', 'info')
      await insertChecklistCleanlinessControlPacking(dbData)

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
          storageKey="checklist-cleanliness-control-packing-draft"
          checklistName="Cleanliness Control Packing"
          onReset={resetForm}
        />
      </div>

      <h1 className="text-3xl font-bold mb-2 text-center">
        Cleanliness Control Packing
      </h1>
      <p className="text-center text-sm text-gray-500 mb-2">Control de limpieza de empaque</p>
      <p className="text-center text-sm text-gray-500 mb-6">Code: CF/PC-PG-SAN-001-RG005</p>

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
          {/* Info Buttons */}
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
              <button
                type="button"
                onClick={() => setShowCorrectiveActionModal(true)}
                className="inline-flex items-center px-3 py-1.5 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors text-sm"
              >
                <Info className="h-3 w-3 mr-1.5" />
                Corrective Action / Acción Correctiva
              </button>
            </div>
          </div>

          {/* Instructions Modal */}
          <Modal
            isOpen={showInstructionsModal}
            onClose={() => setShowInstructionsModal(false)}
            title="Instructions / Instrucciones"
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">English:</h3>
                <p className="text-sm text-gray-600">
                  A visual inspection must be performed. If the surface to be checked is clean (without any remains of fruit and/or detergents) it is recorded with "Comply". If the surface is found with remains of fruit and/or detergents it must be recorded with "Not Comply". When performing the verification with the bioluminescence method, the result must be recorded in section 3.
                </p>
              </div>
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Español:</h3>
                <p className="text-sm text-gray-600">
                  Se debe realizar una inspección visual. Si la superficie a verificar está limpia (sin restos de fruta y/o detergentes) se registra con un "Cumple". Si la superficie se encuentra con restos de fruta y/o detergentes se debe registrar con un "No Cumple". Al realizar la verificación con el método de bioluminiscencia, se debe registrar el resultado en sección 3.
                </p>
              </div>
            </div>
          </Modal>

          {/* Corrective Action Modal */}
          <Modal
            isOpen={showCorrectiveActionModal}
            onClose={() => setShowCorrectiveActionModal(false)}
            title="Corrective Action / Acción Correctiva"
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">English:</h3>
                <p className="text-sm text-gray-600">
                  If an inspection point is rejected, the cleaning procedure must be repeated according to the hygiene program. The indicated corrective action must be recorded and the point or equipment must be re-inspected before use. The process only starts with the control compliance.
                </p>
              </div>
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Español:</h3>
                <p className="text-sm text-gray-600">
                  Si un punto de inspección es rechazado, el procedimiento de limpieza debe repetirse de acuerdo con el programa de higiene. Se debe registrar la acción correctiva indicada y el punto o equipo debe ser re-inspeccionado antes de su uso. El proceso solo se inicia con el cumplimiento del control.
                </p>
              </div>
            </div>
          </Modal>

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

          {/* Section 2: Areas and Parts */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">✅ Section 2 – Areas and Parts Inspected</h2>
            
            <div className="space-y-4">
              {areas.map((area, areaIndex) => {
                const isExpanded = expandedAreas.has(areaIndex)
                const hasMissing = hasAreaMissingData(area)
                
                return (
                  <div key={areaIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Collapsed Header */}
                    <div
                      className={`flex justify-between items-center p-4 cursor-pointer transition-colors ${
                        isExpanded ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => toggleAreaExpansion(areaIndex)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                        <h3 className={`text-lg font-semibold text-gray-800 ${hasMissing ? 'text-red-600' : ''}`}>
                          {area.areaName}
                          {hasMissing && (
                            <span className="ml-2 text-sm font-normal text-red-600">
                              (Missing selections / Faltan selecciones)
                            </span>
                          )}
                        </h3>
                        {hasMissing && (
                          <div className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-xs font-medium">Missing data</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-gray-200">
                        <div className="space-y-4">
                    {area.parts.map((part, partIndex) => (
                      <div key={partIndex} className="border border-gray-200 rounded-lg p-4">
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {part.partName} <span className="text-red-500">*</span>
                          </label>
                          
                          <div className="flex gap-3 mb-3">
                            <button
                              type="button"
                              onClick={() => handlePartComplyChange(areaIndex, partIndex, true)}
                              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                part.comply === true
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              Comply / Cumple
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePartComplyChange(areaIndex, partIndex, false)}
                              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                part.comply === false
                                  ? 'bg-red-500 text-white hover:bg-red-600'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              Not Comply / No Cumple
                            </button>
                          </div>
                        </div>

                        {part.comply === false && (
                          <div className="space-y-3 mt-3 pl-4 border-l-4 border-red-300">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Observation / Observación <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={part.observation}
                                onChange={(e) => handlePartObservationChange(areaIndex, partIndex, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                rows={2}
                                required={part.comply === false}
                                placeholder="Enter observation..."
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Corrective Action / Acción Correctiva <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={part.correctiveAction}
                                onChange={(e) => handlePartCorrectiveActionChange(areaIndex, partIndex, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                rows={2}
                                required={part.comply === false}
                                placeholder="Enter corrective action..."
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Corrective Action Status / Estado de Acción Correctiva <span className="text-red-500">*</span>
                              </label>
                              <div className="flex gap-3 mb-3">
                                <button
                                  type="button"
                                  onClick={() => handlePartCorrectiveActionComplyChange(areaIndex, partIndex, true)}
                                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                    part.correctiveActionComply === true
                                      ? 'bg-green-500 text-white hover:bg-green-600'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  Comply / Cumple
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePartCorrectiveActionComplyChange(areaIndex, partIndex, false)}
                                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                    part.correctiveActionComply === false
                                      ? 'bg-red-500 text-white hover:bg-red-600'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  Not Comply / No Cumple
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Section 3: Critical Limits Result of Bioluminescence */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold">🔬 Section 3 – Critical Limits Result of Bioluminescence</h2>
              <div className="relative limits-tooltip-container">
                <button
                  type="button"
                  onClick={() => setShowLimitsTooltip(!showLimitsTooltip)}
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                  title="View limits"
                >
                  <Info className="h-4 w-4" />
                </button>
                {showLimitsTooltip && (
                  <div className="absolute left-0 top-8 z-10 w-64 p-3 bg-white border border-gray-300 rounded-lg shadow-lg">
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">English:</p>
                        <ul className="list-disc list-inside text-gray-600 space-y-1">
                          <li>ACCEPT: &lt;20 (RLU)</li>
                          <li>CAUTION: 21-59 (RLU)</li>
                          <li>REJECTS: &gt;60 (RLU)</li>
                        </ul>
                      </div>
                      <div className="border-t pt-2">
                        <p className="font-semibold text-gray-700 mb-1">Español:</p>
                        <ul className="list-disc list-inside text-gray-600 space-y-1">
                          <li>ACEPTAR: &lt;20 (RLU)</li>
                          <li>PRECAUCIÓN: 21-59 (RLU)</li>
                          <li>RECHAZAR: &gt;60 (RLU)</li>
                        </ul>
                      </div>
                    </div>
                    <div className="absolute -top-1 left-4 w-2 h-2 bg-white border-l border-t border-gray-300 transform rotate-45"></div>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    {Array.from({ length: 5 }).map((_, colIndex) => (
                      <th key={colIndex} className="border border-gray-300 px-3 py-3 text-xs font-bold text-center">
                        Column {colIndex + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1: Part Names */}
                  <tr>
                    {Array.from({ length: 5 }).map((_, colIndex) => {
                      const index = colIndex
                      return (
                        <td key={`part-${index}`} className="border border-gray-300 px-3 py-3 bg-white">
                          <input
                            type="text"
                            value={bioluminescenceResults[index]?.partName || ''}
                            onChange={(e) => handleBioluminescenceChange(index, 'partName', e.target.value)}
                            className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Part inspected"
                          />
                        </td>
                      )
                    })}
                  </tr>
                  {/* Row 2: RLU Values */}
                  <tr>
                    {Array.from({ length: 5 }).map((_, colIndex) => {
                      const index = colIndex
                      const rlu = bioluminescenceResults[index]?.rlu || ''
                      const status = getRLUStatus(rlu)
                      const needsRetest = status.status === 'caution' || status.status === 'reject'
                      return (
                        <td key={`rlu-${index}`} className={`border border-gray-300 px-3 py-3 ${status.color}`}>
                          <input
                            type="text"
                            value={rlu}
                            onChange={(e) => handleBioluminescenceChange(index, 'rlu', e.target.value)}
                            className={`w-full text-sm px-2 py-1.5 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              status.status === 'accept' ? 'border-green-500' :
                              status.status === 'caution' ? 'border-yellow-500' :
                              status.status === 'reject' ? 'border-red-500' :
                              'border-gray-300'
                            }`}
                            placeholder="RLU"
                          />
                          {rlu && (
                            <p className="text-xs mt-1 font-medium">
                              {status.status === 'accept' ? 'ACCEPT' :
                               status.status === 'caution' ? 'CAUTION' :
                               status.status === 'reject' ? 'REJECTS' : ''}
                            </p>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                  {/* Row 3: Retest RLU (only for CAUTION or REJECTS) */}
                  {(bioluminescenceResults.some((result, idx) => {
                    const status = getRLUStatus(result.rlu)
                    return status.status === 'caution' || status.status === 'reject'
                  })) && (
                    <tr>
                      {Array.from({ length: 5 }).map((_, colIndex) => {
                        const index = colIndex
                        const rlu = bioluminescenceResults[index]?.rlu || ''
                        const status = getRLUStatus(rlu)
                        const needsRetest = status.status === 'caution' || status.status === 'reject'
                        const retestRlu = bioluminescenceResults[index]?.retestRlu || ''
                        const retestStatus = getRLUStatus(retestRlu)
                        
                        if (!needsRetest) {
                          return <td key={`retest-${index}`} className="border border-gray-300 px-3 py-3 bg-white"></td>
                        }
                        
                        return (
                          <td key={`retest-${index}`} className={`border border-gray-300 px-3 py-3 ${retestStatus.color}`}>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Retest RLU <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={retestRlu}
                              onChange={(e) => handleBioluminescenceChange(index, 'retestRlu', e.target.value)}
                              className={`w-full text-sm px-2 py-1.5 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                retestStatus.status === 'accept' ? 'border-green-500' :
                                retestStatus.status === 'caution' ? 'border-yellow-500' :
                                retestStatus.status === 'reject' ? 'border-red-500' :
                                'border-gray-300'
                              }`}
                              placeholder="Retest RLU"
                              required={needsRetest}
                            />
                            {retestRlu && (
                              <p className="text-xs mt-1 font-medium">
                                {retestStatus.status === 'accept' ? 'ACCEPT' :
                                 retestStatus.status === 'caution' ? 'CAUTION' :
                                 retestStatus.status === 'reject' ? 'REJECTS' : ''}
                              </p>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
