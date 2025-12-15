'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, AlertTriangle, ChevronDown, ChevronUp, Info, X } from 'lucide-react'
import { format } from 'date-fns'
import { formatDateMMMDDYYYY, formatDateForFilename as formatDateForFilenameUtil } from '@/lib/date-utils'
import { pdf } from '@react-pdf/renderer'
import { ChecklistStaffPracticesPDFDocument } from '@/components/ChecklistPDFStaffPractices'
import { uploadChecklistPDF, insertChecklistStaffPractices, getNextPdfNumber } from '@/lib/supabase/checklistStaffPractices'
import { useToast } from '@/context/ToastContext'
import { useChecklistPersistence } from '@/lib/hooks/useChecklistPersistence'
import { DeleteDraftButton } from '@/components/DeleteDraftButton'

// Field Information Modal Component
interface FieldInfoModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: {
    en: string
    es: string
  }
}

function FieldInfoModal({ isOpen, onClose, title, description }: FieldInfoModalProps) {
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
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">English:</h3>
              <p className="text-sm text-gray-600">{description.en}</p>
            </div>
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Español:</h3>
              <p className="text-sm text-gray-600">{description.es}</p>
            </div>
          </div>
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

// Field descriptions
const fieldDescriptions: Record<string, { en: string; es: string }> = {
  staffAppearance: {
    en: 'Clean and tidy uniform.',
    es: 'Uniforme limpio y ordenado.'
  },
  completeUniform: {
    en: 'Wears all the clothes given by the Factory',
    es: 'Uso de toda la vestimenta otorgada por la Empresa'
  },
  accessoriesAbsence: {
    en: 'Rings, earrings, watches, bracelets, piercings, candies, etc. Absence',
    es: 'Ausencia de anillos, aros, reloj, pulseras, piercing, dulces, etc.'
  },
  workToolsUsage: {
    en: 'Head net, mask, gloves, etc. use',
    es: 'Uso de toca, mascarilla, guantes, etc.'
  },
  cutCleanNotPolishedNails: {
    en: 'Nails with the conditions mentioned',
    es: 'Uñas en las condiciones mencionadas'
  },
  noMakeupOn: {
    en: 'Lipstick, eye shadow, eyeliner, etc. Absence',
    es: 'Ausencia de lápiz labial, sombra, delineador, etc.'
  },
  staffBehavior: {
    en: 'Wash their hands in sanitary filter previous entering processing area, not to chew gum',
    es: 'Lavarse las manos en filtro sanitario, no masticar chicle, etc.'
  },
  staffHealth: {
    en: 'Staff should not be sick. If so, they can\'t enter the process room until they feel better',
    es: 'El personal no debe estar resfriado. Si está resfriado, no puede entrar a la sala de producción'
  }
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

// Staff Member Entry Interface
interface StaffMember {
  id: number
  name: string
  area: string
  staffAppearance: 'comply' | 'not_comply' | ''
  completeUniform: 'comply' | 'not_comply' | ''
  accessoriesAbsence: 'comply' | 'not_comply' | ''
  workToolsUsage: 'comply' | 'not_comply' | ''
  cutCleanNotPolishedNails: 'comply' | 'not_comply' | ''
  noMakeupOn: 'comply' | 'not_comply' | ''
  staffBehavior: 'comply' | 'not_comply' | ''
  staffHealth: 'comply' | 'not_comply' | ''
  // Corrective actions and observations for each field
  staffAppearanceCorrectiveAction: string
  staffAppearanceObservation: string
  completeUniformCorrectiveAction: string
  completeUniformObservation: string
  accessoriesAbsenceCorrectiveAction: string
  accessoriesAbsenceObservation: string
  workToolsUsageCorrectiveAction: string
  workToolsUsageObservation: string
  cutCleanNotPolishedNailsCorrectiveAction: string
  cutCleanNotPolishedNailsObservation: string
  noMakeupOnCorrectiveAction: string
  noMakeupOnObservation: string
  staffBehaviorCorrectiveAction: string
  staffBehaviorObservation: string
  staffHealthCorrectiveAction: string
  staffHealthObservation: string
}

export default function ChecklistStaffPracticesPage() {
  const { showToast } = useToast()
  
  // Section 1: Basic Info
  const [date, setDate] = useState('')
  const [shift, setShift] = useState('')
  const [monitorName, setMonitorName] = useState('')
  const [monitorSignature, setMonitorSignature] = useState('')

  // Section 2: Dynamic Staff Members
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([
    {
      id: Date.now(),
      name: '',
      area: '',
      staffAppearance: '',
      completeUniform: '',
      accessoriesAbsence: '',
      workToolsUsage: '',
      cutCleanNotPolishedNails: '',
      noMakeupOn: '',
      staffBehavior: '',
      staffHealth: '',
      staffAppearanceCorrectiveAction: '',
      staffAppearanceObservation: '',
      completeUniformCorrectiveAction: '',
      completeUniformObservation: '',
      accessoriesAbsenceCorrectiveAction: '',
      accessoriesAbsenceObservation: '',
      workToolsUsageCorrectiveAction: '',
      workToolsUsageObservation: '',
      cutCleanNotPolishedNailsCorrectiveAction: '',
      cutCleanNotPolishedNailsObservation: '',
      noMakeupOnCorrectiveAction: '',
      noMakeupOnObservation: '',
      staffBehaviorCorrectiveAction: '',
      staffBehaviorObservation: '',
      staffHealthCorrectiveAction: '',
      staffHealthObservation: ''
    }
  ])

  // Form state
  const [isInitialSubmitted, setIsInitialSubmitted] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedMemberId, setExpandedMemberId] = useState<number | null>(null)
  const [infoModal, setInfoModal] = useState<{ field: string; title: string } | null>(null)

  // Format date as MMM-DD-YYYY - uses utility to avoid timezone issues
  const formatDate = formatDateMMMDDYYYY

  // Format date for PDF filename - uses utility to avoid timezone issues
  const formatDateForFilename = (dateStr: string): string => formatDateForFilenameUtil(dateStr, true)

  // Reset form function
  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0]
    const newMemberId = Date.now()
    setDate(today)
    setShift('')
    setMonitorName('')
    setMonitorSignature('')
    setStaffMembers([{
      id: newMemberId,
      name: '',
      area: '',
      staffAppearance: '',
      completeUniform: '',
      accessoriesAbsence: '',
      workToolsUsage: '',
      cutCleanNotPolishedNails: '',
      noMakeupOn: '',
      staffBehavior: '',
      staffHealth: '',
      staffAppearanceCorrectiveAction: '',
      staffAppearanceObservation: '',
      completeUniformCorrectiveAction: '',
      completeUniformObservation: '',
      accessoriesAbsenceCorrectiveAction: '',
      accessoriesAbsenceObservation: '',
      workToolsUsageCorrectiveAction: '',
      workToolsUsageObservation: '',
      cutCleanNotPolishedNailsCorrectiveAction: '',
      cutCleanNotPolishedNailsObservation: '',
      noMakeupOnCorrectiveAction: '',
      noMakeupOnObservation: '',
      staffBehaviorCorrectiveAction: '',
      staffBehaviorObservation: '',
      staffHealthCorrectiveAction: '',
      staffHealthObservation: ''
    }])
    setExpandedMemberId(newMemberId)
    setIsInitialSubmitted(false)
    setPdfUrl(null)
  }

  // Persistence hook
  const { clearDraft } = useChecklistPersistence(
    'checklist-staff-practices-draft',
    { date, shift, monitorName, monitorSignature, staffMembers },
    isInitialSubmitted,
    (data) => {
      if (data.date) setDate(data.date)
      if (data.shift) setShift(data.shift)
      if (data.monitorName) setMonitorName(data.monitorName)
      if (data.monitorSignature) setMonitorSignature(data.monitorSignature)
      if (data.staffMembers && data.staffMembers.length > 0) {
        setStaffMembers(data.staffMembers)
        // Expand the first member if we have saved data
        if (data.staffMembers.length > 0) {
          setExpandedMemberId(data.staffMembers[0].id)
        }
      } else {
        const today = new Date().toISOString().split('T')[0]
        setDate(today)
        const newMemberId = Date.now()
        setStaffMembers([{
          id: newMemberId,
          name: '',
          area: '',
          staffAppearance: '',
          completeUniform: '',
          accessoriesAbsence: '',
          workToolsUsage: '',
          cutCleanNotPolishedNails: '',
          noMakeupOn: '',
          staffBehavior: '',
          staffHealth: '',
          staffAppearanceCorrectiveAction: '',
          staffAppearanceObservation: '',
          completeUniformCorrectiveAction: '',
          completeUniformObservation: '',
          accessoriesAbsenceCorrectiveAction: '',
          accessoriesAbsenceObservation: '',
          workToolsUsageCorrectiveAction: '',
          workToolsUsageObservation: '',
          cutCleanNotPolishedNailsCorrectiveAction: '',
          cutCleanNotPolishedNailsObservation: '',
          noMakeupOnCorrectiveAction: '',
          noMakeupOnObservation: '',
          staffBehaviorCorrectiveAction: '',
          staffBehaviorObservation: '',
          staffHealthCorrectiveAction: '',
          staffHealthObservation: ''
        }])
        setExpandedMemberId(newMemberId)
      }
    }
  )

  // Initialize dates on mount if no saved data
  useEffect(() => {
    if (!date) {
      const today = new Date().toISOString().split('T')[0]
      setDate(today)
    }
    if (staffMembers.length === 0) {
      const newMemberId = Date.now()
      setStaffMembers([{
        id: newMemberId,
        name: '',
        area: '',
        staffAppearance: '',
        completeUniform: '',
        accessoriesAbsence: '',
        workToolsUsage: '',
        cutCleanNotPolishedNails: '',
        noMakeupOn: '',
        staffBehavior: '',
        staffHealth: '',
        staffAppearanceCorrectiveAction: '',
        staffAppearanceObservation: '',
        completeUniformCorrectiveAction: '',
        completeUniformObservation: '',
        accessoriesAbsenceCorrectiveAction: '',
        accessoriesAbsenceObservation: '',
        workToolsUsageCorrectiveAction: '',
        workToolsUsageObservation: '',
        cutCleanNotPolishedNailsCorrectiveAction: '',
        cutCleanNotPolishedNailsObservation: '',
        noMakeupOnCorrectiveAction: '',
        noMakeupOnObservation: '',
        staffBehaviorCorrectiveAction: '',
        staffBehaviorObservation: '',
        staffHealthCorrectiveAction: '',
        staffHealthObservation: ''
      }])
      setExpandedMemberId(newMemberId)
    } else if (staffMembers.length > 0 && expandedMemberId === null) {
      // Set first member as expanded if none is expanded
      setExpandedMemberId(staffMembers[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Check if a staff member has missing data
  const hasMissingData = (member: StaffMember): boolean => {
    // Check required fields
    if (!member.name || !member.area) return true
    
    // Check compliance fields
    const complianceFields = [
      'staffAppearance', 'completeUniform', 'accessoriesAbsence',
      'workToolsUsage', 'cutCleanNotPolishedNails', 'noMakeupOn',
      'staffBehavior', 'staffHealth'
    ]
    
    for (const field of complianceFields) {
      const value = member[field as keyof StaffMember] as string
      if (!value) return true
      
      // If not comply, check for corrective action and observation
      if (value === 'not_comply') {
        const fieldMapping: Record<string, { ca: keyof StaffMember; obs: keyof StaffMember }> = {
          staffAppearance: { ca: 'staffAppearanceCorrectiveAction', obs: 'staffAppearanceObservation' },
          completeUniform: { ca: 'completeUniformCorrectiveAction', obs: 'completeUniformObservation' },
          accessoriesAbsence: { ca: 'accessoriesAbsenceCorrectiveAction', obs: 'accessoriesAbsenceObservation' },
          workToolsUsage: { ca: 'workToolsUsageCorrectiveAction', obs: 'workToolsUsageObservation' },
          cutCleanNotPolishedNails: { ca: 'cutCleanNotPolishedNailsCorrectiveAction', obs: 'cutCleanNotPolishedNailsObservation' },
          noMakeupOn: { ca: 'noMakeupOnCorrectiveAction', obs: 'noMakeupOnObservation' },
          staffBehavior: { ca: 'staffBehaviorCorrectiveAction', obs: 'staffBehaviorObservation' },
          staffHealth: { ca: 'staffHealthCorrectiveAction', obs: 'staffHealthObservation' }
        }
        
        const mapping = fieldMapping[field]
        if (!member[mapping.ca] || !member[mapping.obs]) {
          return true
        }
      }
    }
    
    return false
  }

  // Add new staff member
  const handleAddStaffMember = () => {
    const newMemberId = Date.now()
    setStaffMembers([
      ...staffMembers,
      {
        id: newMemberId,
        name: '',
        area: '',
        staffAppearance: '',
        completeUniform: '',
        accessoriesAbsence: '',
        workToolsUsage: '',
        cutCleanNotPolishedNails: '',
        noMakeupOn: '',
        staffBehavior: '',
        staffHealth: '',
        staffAppearanceCorrectiveAction: '',
        staffAppearanceObservation: '',
        completeUniformCorrectiveAction: '',
        completeUniformObservation: '',
        accessoriesAbsenceCorrectiveAction: '',
        accessoriesAbsenceObservation: '',
        workToolsUsageCorrectiveAction: '',
        workToolsUsageObservation: '',
        cutCleanNotPolishedNailsCorrectiveAction: '',
        cutCleanNotPolishedNailsObservation: '',
        noMakeupOnCorrectiveAction: '',
        noMakeupOnObservation: '',
        staffBehaviorCorrectiveAction: '',
        staffBehaviorObservation: '',
        staffHealthCorrectiveAction: '',
        staffHealthObservation: ''
      }
    ])
    // Collapse all others and expand the new one
    setExpandedMemberId(newMemberId)
  }

  // Remove staff member
  const handleRemoveStaffMember = (id: number) => {
    if (staffMembers.length > 1) {
      const newMembers = staffMembers.filter(m => m.id !== id)
      setStaffMembers(newMembers)
      
      // If we removed the expanded member, expand the first remaining member
      if (expandedMemberId === id && newMembers.length > 0) {
        setExpandedMemberId(newMembers[0].id)
      }
    }
  }

  // Update staff member field
  const handleStaffMemberChange = (
    id: number,
    field: keyof StaffMember,
    value: string
  ) => {
    setStaffMembers(staffMembers.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: value }
        // Clear corrective action and observation if status changes to comply
        if (field.includes('CorrectiveAction') || field.includes('Observation')) {
          return updated
        }
        // Map compliance fields to their corrective action and observation fields
        const fieldMapping: Record<string, { ca: keyof StaffMember; obs: keyof StaffMember }> = {
          staffAppearance: { ca: 'staffAppearanceCorrectiveAction', obs: 'staffAppearanceObservation' },
          completeUniform: { ca: 'completeUniformCorrectiveAction', obs: 'completeUniformObservation' },
          accessoriesAbsence: { ca: 'accessoriesAbsenceCorrectiveAction', obs: 'accessoriesAbsenceObservation' },
          workToolsUsage: { ca: 'workToolsUsageCorrectiveAction', obs: 'workToolsUsageObservation' },
          cutCleanNotPolishedNails: { ca: 'cutCleanNotPolishedNailsCorrectiveAction', obs: 'cutCleanNotPolishedNailsObservation' },
          noMakeupOn: { ca: 'noMakeupOnCorrectiveAction', obs: 'noMakeupOnObservation' },
          staffBehavior: { ca: 'staffBehaviorCorrectiveAction', obs: 'staffBehaviorObservation' },
          staffHealth: { ca: 'staffHealthCorrectiveAction', obs: 'staffHealthObservation' }
        }
        
        const mapping = fieldMapping[field as string]
        if (mapping && value === 'comply') {
          ;(updated as any)[mapping.ca] = ''
          ;(updated as any)[mapping.obs] = ''
        }
        
        return updated
      }
      return m
    }))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate form
      if (!date || !shift || !monitorName || !monitorSignature) {
        showToast('Please fill in all required fields in Section 1', 'error')
        setIsSubmitting(false)
        return
      }

      // Validate staff members
      const hasInvalidStaff = staffMembers.some(m => 
        !m.name || !m.area ||
        !m.staffAppearance || !m.completeUniform || !m.accessoriesAbsence ||
        !m.workToolsUsage || !m.cutCleanNotPolishedNails || !m.noMakeupOn ||
        !m.staffBehavior || !m.staffHealth
      )

      if (hasInvalidStaff) {
        showToast('Please fill in all required fields for all staff members', 'error')
        setIsSubmitting(false)
        return
      }

      // Validate corrective actions for non-compliant items
      const hasMissingCorrectiveActions = staffMembers.some(m => {
        const nonCompliantFields = [
          { field: 'staffAppearance', ca: m.staffAppearanceCorrectiveAction, obs: m.staffAppearanceObservation },
          { field: 'completeUniform', ca: m.completeUniformCorrectiveAction, obs: m.completeUniformObservation },
          { field: 'accessoriesAbsence', ca: m.accessoriesAbsenceCorrectiveAction, obs: m.accessoriesAbsenceObservation },
          { field: 'workToolsUsage', ca: m.workToolsUsageCorrectiveAction, obs: m.workToolsUsageObservation },
          { field: 'cutCleanNotPolishedNails', ca: m.cutCleanNotPolishedNailsCorrectiveAction, obs: m.cutCleanNotPolishedNailsObservation },
          { field: 'noMakeupOn', ca: m.noMakeupOnCorrectiveAction, obs: m.noMakeupOnObservation },
          { field: 'staffBehavior', ca: m.staffBehaviorCorrectiveAction, obs: m.staffBehaviorObservation },
          { field: 'staffHealth', ca: m.staffHealthCorrectiveAction, obs: m.staffHealthObservation }
        ]

        return nonCompliantFields.some(({ field, ca, obs }) => {
          const value = m[field as keyof StaffMember] as string
          return value === 'not_comply' && (!ca || !obs)
        })
      })

      if (hasMissingCorrectiveActions) {
        showToast('Please provide corrective action and observation for all non-compliant items', 'error')
        setIsSubmitting(false)
        return
      }

      // Prepare form data for PDF
      const formData = {
        section1: {
          date: formatDate(date),
          shift,
          monitorName,
          monitorSignature
        },
        section2: {
          staffMembers: staffMembers.map(m => ({
            name: m.name,
            area: m.area,
            staffAppearance: m.staffAppearance,
            completeUniform: m.completeUniform,
            accessoriesAbsence: m.accessoriesAbsence,
            workToolsUsage: m.workToolsUsage,
            cutCleanNotPolishedNails: m.cutCleanNotPolishedNails,
            noMakeupOn: m.noMakeupOn,
            staffBehavior: m.staffBehavior,
            staffHealth: m.staffHealth,
            staffAppearanceCorrectiveAction: m.staffAppearanceCorrectiveAction,
            staffAppearanceObservation: m.staffAppearanceObservation,
            completeUniformCorrectiveAction: m.completeUniformCorrectiveAction,
            completeUniformObservation: m.completeUniformObservation,
            accessoriesAbsenceCorrectiveAction: m.accessoriesAbsenceCorrectiveAction,
            accessoriesAbsenceObservation: m.accessoriesAbsenceObservation,
            workToolsUsageCorrectiveAction: m.workToolsUsageCorrectiveAction,
            workToolsUsageObservation: m.workToolsUsageObservation,
            cutCleanNotPolishedNailsCorrectiveAction: m.cutCleanNotPolishedNailsCorrectiveAction,
            cutCleanNotPolishedNailsObservation: m.cutCleanNotPolishedNailsObservation,
            noMakeupOnCorrectiveAction: m.noMakeupOnCorrectiveAction,
            noMakeupOnObservation: m.noMakeupOnObservation,
            staffBehaviorCorrectiveAction: m.staffBehaviorCorrectiveAction,
            staffBehaviorObservation: m.staffBehaviorObservation,
            staffHealthCorrectiveAction: m.staffHealthCorrectiveAction,
            staffHealthObservation: m.staffHealthObservation
          }))
        }
      }

      // Generate PDF
      showToast('Generating PDF...', 'info')
      const pdfBlob = await pdf(
        <ChecklistStaffPracticesPDFDocument data={formData} />
      ).toBlob()

      // Create filename with date prefix and incrementing number
      const dateForFilename = formatDateForFilename(date)
      const pdfNumber = await getNextPdfNumber(dateForFilename)
      const filename = `${dateForFilename}-Staff-Good-Practices-Control-${pdfNumber}.pdf`

      // Upload PDF to Supabase Storage
      showToast('Uploading PDF to storage...', 'info')
      const uploadedPdfUrl = await uploadChecklistPDF(pdfBlob, filename)

      // Prepare data for database
      const dbData = {
        date_string: formatDate(date),
        shift,
        monitor_name: monitorName,
        monitor_signature: monitorSignature,
        staff_members: formData.section2.staffMembers,
        pdf_url: uploadedPdfUrl
      }

      // Save to Supabase database
      showToast('Saving to database...', 'info')
      await insertChecklistStaffPractices(dbData)

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

  // Render compliance field with corrective action/observation
  const renderComplianceField = (
    staffMember: StaffMember,
    fieldName: keyof StaffMember,
    label: string,
    correctiveActionField: keyof StaffMember,
    observationField: keyof StaffMember
  ) => {
    const value = staffMember[fieldName] as string
    const needsCorrectiveAction = value === 'not_comply'
    const fieldDescription = fieldDescriptions[fieldName as string]

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="block text-sm font-medium text-gray-700">
            {label} <span className="text-red-500">*</span>
          </label>
          {fieldDescription && (
            <button
              type="button"
              onClick={() => setInfoModal({ field: fieldName as string, title: label })}
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
              title="View field information"
            >
              <Info className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleStaffMemberChange(staffMember.id, fieldName, 'comply')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              value === 'comply'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
            }`}
          >
            Comply
          </button>
          <button
            type="button"
            onClick={() => handleStaffMemberChange(staffMember.id, fieldName, 'not_comply')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              value === 'not_comply'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
            }`}
          >
            Not Comply
          </button>
        </div>
        {needsCorrectiveAction && (
          <div className="mt-2 space-y-2 pl-4 border-l-2 border-red-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Corrective Action <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={staffMember[correctiveActionField] as string}
                onChange={(e) => handleStaffMemberChange(staffMember.id, correctiveActionField, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required={needsCorrectiveAction}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observation <span className="text-red-500">*</span>
              </label>
              <textarea
                value={staffMember[observationField] as string}
                onChange={(e) => handleStaffMemberChange(staffMember.id, observationField, e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required={needsCorrectiveAction}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-4 flex justify-between items-start">
        <Link href="/area/calidad" className="inline-flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver
        </Link>
        <DeleteDraftButton 
          storageKey="checklist-staff-practices-draft"
          checklistName="Staff Good Practices Control"
          onReset={resetForm}
        />
      </div>

      <h1 className="text-3xl font-bold mb-2 text-center">
        Staff Good Practices Control
      </h1>
      <p className="text-center text-sm text-gray-500 mb-2">Control de buenas prácticas del personal</p>
      <p className="text-center text-sm text-gray-500 mb-6">Code: CF/PC-ASC-004-RG003</p>

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

          {/* Section 2: Dynamic Staff Members */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">👥 Section 2 – Staff Members</h2>
              <button
                type="button"
                onClick={handleAddStaffMember}
                className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Staff Member
              </button>
            </div>

            <div className="space-y-4">
              {staffMembers.map((staffMember, index) => {
                const isExpanded = expandedMemberId === staffMember.id
                const hasMissing = hasMissingData(staffMember)
                const displayName = staffMember.name || `Staff Member #${index + 1}`

                return (
                  <div key={staffMember.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Collapsed Header */}
                    <div
                      className={`flex justify-between items-center p-4 cursor-pointer transition-colors ${
                        isExpanded ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => setExpandedMemberId(isExpanded ? null : staffMember.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                        <h3 className="font-medium text-gray-700">
                          Staff Member #{index + 1}
                          {staffMember.name && (
                            <span className="ml-2 text-gray-500 font-normal">- {staffMember.name}</span>
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
                        {staffMembers.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveStaffMember(staffMember.id)
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
                        value={staffMember.name}
                        onChange={(e) => handleStaffMemberChange(staffMember.id, 'name', e.target.value)}
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
                        value={staffMember.area}
                        onChange={(e) => handleStaffMemberChange(staffMember.id, 'area', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      {renderComplianceField(
                        staffMember,
                        'staffAppearance',
                        'Staff Appearance',
                        'staffAppearanceCorrectiveAction',
                        'staffAppearanceObservation'
                      )}
                    </div>

                    <div className="md:col-span-2">
                      {renderComplianceField(
                        staffMember,
                        'completeUniform',
                        'Complete Uniform',
                        'completeUniformCorrectiveAction',
                        'completeUniformObservation'
                      )}
                    </div>

                    <div className="md:col-span-2">
                      {renderComplianceField(
                        staffMember,
                        'accessoriesAbsence',
                        'Accessories Absence',
                        'accessoriesAbsenceCorrectiveAction',
                        'accessoriesAbsenceObservation'
                      )}
                    </div>

                    <div className="md:col-span-2">
                      {renderComplianceField(
                        staffMember,
                        'workToolsUsage',
                        'Work Tools Usage',
                        'workToolsUsageCorrectiveAction',
                        'workToolsUsageObservation'
                      )}
                    </div>

                    <div className="md:col-span-2">
                      {renderComplianceField(
                        staffMember,
                        'cutCleanNotPolishedNails',
                        'Cut, Clean, Not Polished Nails',
                        'cutCleanNotPolishedNailsCorrectiveAction',
                        'cutCleanNotPolishedNailsObservation'
                      )}
                    </div>

                    <div className="md:col-span-2">
                      {renderComplianceField(
                        staffMember,
                        'noMakeupOn',
                        'No Makeup On',
                        'noMakeupOnCorrectiveAction',
                        'noMakeupOnObservation'
                      )}
                    </div>

                    <div className="md:col-span-2">
                      {renderComplianceField(
                        staffMember,
                        'staffBehavior',
                        'Staff Behavior',
                        'staffBehaviorCorrectiveAction',
                        'staffBehaviorObservation'
                      )}
                    </div>

                    <div className="md:col-span-2">
                      {renderComplianceField(
                        staffMember,
                        'staffHealth',
                        'Staff Health',
                        'staffHealthCorrectiveAction',
                        'staffHealthObservation'
                      )}
                    </div>
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

      {/* Field Information Modal */}
      {infoModal && fieldDescriptions[infoModal.field] && (
        <FieldInfoModal
          isOpen={!!infoModal}
          onClose={() => setInfoModal(null)}
          title={infoModal.title}
          description={fieldDescriptions[infoModal.field]}
        />
      )}
    </div>
  )
}

