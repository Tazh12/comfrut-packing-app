'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { ChecklistPDFMonoproductoDocument } from '@/components/ChecklistPDFMonoproducto'
import { useChecklistPersistence } from '@/lib/hooks/useChecklistPersistence'
import { DeleteDraftButton } from '@/components/DeleteDraftButton'
import { uploadChecklistPDF, insertChecklistMonoproducto } from '@/lib/supabase/checklistMonoproducto'
import { formatDateMMMDDYYYY, formatDateForFilename } from '@/lib/date-utils'

export default function MonoproductoChecklistPage() {
  // Campos de formulario
  const headerRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({})
  const { showToast } = useToast()
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [orderNumber, setOrderNumber] = useState('')
  const [date, setDate] = useState('')
  const [lineManager, setLineManager] = useState('')
  const [qualityControl, setQualityControl] = useState('')

  // Listas para selects
  const [brands, setBrands] = useState<string[]>([])
  const [materials, setMaterials] = useState<string[]>([])

  // Valores seleccionados
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [selectedSku, setSelectedSku] = useState('')

  // Pallets dynamic fields and forms
  const [fields, setFields] = useState<{ campo: string; unidad: string }[]>([])
  const [pallets, setPallets] = useState<
    { id: number; collapsed: boolean; values: Record<string, string>; hour: string }[]
  >([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  // Refs para inputs dinámicos de pallets
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Reset form function
  const resetForm = () => {
    setOrderNumber('')
    setDate('')
    setLineManager('')
    setQualityControl('')
    setSelectedBrand('')
    setSelectedMaterial('')
    setSelectedSku('')
    setPallets([])
    setFields([])
    setErrorMessage('')
    setIsSubmitted(false)
    setPdfUrl(null)
  }

  // Persistence hook
  const { clearDraft } = useChecklistPersistence(
    'checklist-monoproducto-draft',
    { 
      orderNumber, 
      date, 
      lineManager, 
      qualityControl, 
      selectedBrand, 
      selectedMaterial, 
      selectedSku,
      pallets: pallets.map(p => ({ id: p.id, collapsed: p.collapsed, values: p.values, hour: p.hour }))
    },
    isSubmitted,
    (data) => {
      if (data.orderNumber) setOrderNumber(data.orderNumber)
      if (data.date) setDate(data.date)
      if (data.lineManager) setLineManager(data.lineManager)
      if (data.qualityControl) setQualityControl(data.qualityControl)
      if (data.selectedBrand) setSelectedBrand(data.selectedBrand)
      if (data.selectedMaterial) setSelectedMaterial(data.selectedMaterial)
      if (data.selectedSku) setSelectedSku(data.selectedSku)
      if (data.pallets && Array.isArray(data.pallets)) {
        // Restore pallets - note: fields will be reloaded based on SKU
        // Ensure hour field exists for each pallet
        setPallets(data.pallets.map((p: any) => ({ ...p, hour: p.hour || '' })))
      }
    }
  )

  // Cargar clientes (brands)
  useEffect(() => {
    supabase
      .from('productos')
      .select('brand')
      .then(({ data, error }) => {
        if (!error && data) {
          setBrands(Array.from(new Set(data.map((p) => p.brand))))
        }
      })
  }, [])

  // Filtrar materiales cuando cambia cliente
  useEffect(() => {
    if (selectedBrand) {
      supabase
        .from('productos')
        .select('material')
        .eq('brand', selectedBrand)
        .then(({ data, error }) => {
          if (!error && data) {
            setMaterials(Array.from(new Set(data.map((p) => p.material))))
          }
        })
    } else {
      setMaterials([])
      setSelectedMaterial('')
    }
  }, [selectedBrand])

  // Asignar SKU automáticamente cuando cambian cliente y producto
  useEffect(() => {
    if (selectedBrand && selectedMaterial) {
      supabase
        .from('productos')
        .select('sku')
        .eq('brand', selectedBrand)
        .eq('material', selectedMaterial)
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            setSelectedSku(data[0].sku)
          } else {
            setSelectedSku('')
          }
        })
    } else {
      setSelectedSku('')
    }
  }, [selectedBrand, selectedMaterial])

  useEffect(() => {
    if (selectedSku) {
      const fetchFields = async () => {
        const skuTrimmed = selectedSku.trim()
        console.log('Consultando agrupación para SKU:', skuTrimmed)
        
        // Try exact match first
        let { data: compData, error: compError } = await supabase
          .from('composicion_productos')
          .select('agrupacion')
          .eq('sku', skuTrimmed)
        
        // If no exact match, try partial match
        if (!compData || compData.length === 0) {
          const { data: compDataPartial, error: compErrorPartial } = await supabase
            .from('composicion_productos')
            .select('agrupacion')
            .ilike('sku', `%${skuTrimmed}%`)
          
          if (!compErrorPartial && compDataPartial && compDataPartial.length > 0) {
            compData = compDataPartial
            compError = compErrorPartial
          }
        }
        
        if (compError) {
          console.error('Error fetching agrupacion', compError)
          showToast('Error al buscar la agrupación del producto', 'error')
          setFields([])
          return
        }
        if (!compData || !Array.isArray(compData) || compData.length === 0) {
          console.error('No agrupacion found for SKU:', skuTrimmed)
          showToast(`No se encontró agrupación para el SKU: ${skuTrimmed}. Verifica que el producto esté configurado correctamente.`, 'error')
          setFields([])
          return
        }
        const agrupacion = compData[0].agrupacion

        const { data: camposData, error: camposError } = await supabase
          .from('campos_por_agrupacion')
          .select('campo, unidad')
          .eq('agrupacion', agrupacion)
        if (camposError || !camposData) {
          console.error('Error fetching campos', camposError)
          showToast('Error al cargar los campos del producto', 'error')
          setFields([])
          return
        }
        setFields(camposData)
      }
      fetchFields()
    } else {
      setFields([])
      setPallets([])
    }
  }, [selectedSku, showToast])

  const addPallet = () => {
    if (!selectedSku || pallets.length >= 50) return
    
    // Check if fields are loaded
    if (!fields || fields.length === 0) {
      showToast('No se pueden agregar pallets. Los campos del producto no están disponibles. Verifica que el SKU tenga una agrupación configurada.', 'error')
      return
    }
    
    // Get current time in HH:MM format
    const now = new Date()
    const currentHour = now.getHours().toString().padStart(2, '0')
    const currentMinute = now.getMinutes().toString().padStart(2, '0')
    const presetHour = `${currentHour}:${currentMinute}`
    
    const newPallet = {
      id: Date.now(),
      collapsed: false,
      values: fields.reduce((acc, f) => ({ ...acc, [f.campo]: '' }), {} as Record<string, string>),
      hour: presetHour,
    }
    setPallets(prev => [...prev, newPallet])
  }


  const handleFieldChange = (id: number, campo: string, value: string) => {
    setPallets(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, values: { ...p.values, [campo]: value } }
          : p
      )
    )
  }

  const handleHourChange = (id: number, hour: string) => {
    setPallets(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, hour }
          : p
      )
    )
  }

  const finalizePallet = (id: number) => {
    setPallets(prev =>
      prev.map(p => (p.id === id ? { ...p, collapsed: true } : p))
    )
  }

  const expandPallet = (id: number) => {
    setPallets(prev =>
      prev.map(p => (p.id === id ? { ...p, collapsed: false } : p))
    )
  }

  const deletePallet = (id: number) => {
    setPallets(prev => prev.filter(p => p.id !== id))
  }

  // Check if pallet is complete
  const isPalletComplete = (pallet: typeof pallets[0]): boolean => {
    if (!pallet.hour?.trim()) return false
    for (const field of fields) {
      if (!pallet.values[field.campo]?.trim()) {
        return false
      }
    }
    return true
  }

  // Get pallet identifier (codigo_barra or codigo_caja)
  const getPalletIdentifier = (pallet: typeof pallets[0]): string => {
    // Check all possible variations of the identifier fields
    const possibleFields = [
      'Código Barra Pallet',
      'codigo_barra',
      'Código Caja',
      'codigo_caja',
      'Código Barra',
      'codigo barra pallet',
      'Código caja'
    ]
    
    for (const field of possibleFields) {
      if (pallet.values[field]?.trim()) {
        return pallet.values[field].trim()
      }
    }
    
    return ''
  }

  // Validate form - following footbath control pattern
  const validateForm = (): boolean => {
    setErrorMessage('')
    Object.values(headerRefs.current).forEach(el => el?.classList.remove('border-red-500'))
    Object.values(inputRefs.current).forEach(el => el?.classList.remove('border-red-500'))

    // Validate header fields
    const headerValues: Record<string, string> = {
      orderNumber,
      date,
      lineManager,
      qualityControl,
      selectedBrand,
      selectedMaterial,
      selectedSku,
    }
    for (const key of Object.keys(headerValues)) {
      const val = headerValues[key].trim()
      if (!val) {
        const el = headerRefs.current[key]
        if (el) {
          el.classList.add('border-red-500')
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.focus()
        }
        const msg = 'Por favor completa todos los campos del encabezado.'
        setErrorMessage(msg)
        showToast(msg, 'error')
        return false
      }
    }

    // Validate pallets exist
    if (pallets.length === 0) {
      const msg = 'Debes agregar al menos un pallet.'
      setErrorMessage(msg)
      showToast(msg, 'error')
      return false
    }

    // Validate all pallet fields
    let firstPalletIndex = -1
    let missingField = ''
    for (let i = 0; i < pallets.length; i++) {
      const p = pallets[i]
      // Check hour
      if (!p.hour?.trim()) {
        firstPalletIndex = i
        missingField = 'hora'
        break
      }
      // Check all fields
      for (const field of fields) {
        if (!p.values[field.campo]?.trim()) {
          firstPalletIndex = i
          missingField = field.campo
          break
        }
      }
      if (firstPalletIndex !== -1) break
    }
    if (firstPalletIndex !== -1) {
      // Expand the pallet if it's collapsed
      if (pallets[firstPalletIndex].collapsed) {
        expandPallet(pallets[firstPalletIndex].id)
      }
      const key = missingField === 'hora' 
        ? `hour-${pallets[firstPalletIndex].id}`
        : `${pallets[firstPalletIndex].id}-${missingField}`
      const inputEl = inputRefs.current[key]
      if (inputEl) {
        inputEl.classList.add('border-red-500')
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        inputEl.focus()
      }
      const msg = 'Falta completar campos en los pallets.'
      setErrorMessage(msg)
      showToast(msg, 'error')
      return false
    }

    return true
  }

  const handleDownloadPDF = async () => {
    const { jsPDF } = await import('jspdf')
    // Crear documento con unidades en punto para mayor precisión
    const doc = new jsPDF({ unit: 'pt', format: 'letter' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 40
    let y = margin
    // 1. Título y código centrados
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text(
      'Quality control of freezing fruit process / Control de calidad del proceso de congelado de frutas',
      pageWidth / 2,
      y,
      { align: 'center' }
    )
    y += 24
    doc.setFontSize(12)
    doc.text('CF/PC-PG-ASC-006-RG001', pageWidth / 2, y, { align: 'center' })
    y += 30
    // 2. Datos generales en dos columnas
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const headerInfo = [
      ['Fecha', date],
      ['Orden de fabricación', orderNumber],
      ['Jefe de línea', lineManager],
      ['Control de calidad', qualityControl],
      ['Cliente', selectedBrand],
      ['Producto', selectedMaterial],
      ['SKU', selectedSku]
    ]
    const colWidth = (pageWidth - margin * 2) / 2
    headerInfo.forEach((item, idx) => {
      const row = Math.floor(idx / 2)
      const col = idx % 2
      const x = margin + col * colWidth
      doc.text(`${item[0]}: ${item[1]}`, x, y + row * 20)
    })
    y += Math.ceil(headerInfo.length / 2) * 20 + 20
    // 3. Tabla de pallets en bloques horizontales
    const perPage = 4
    for (let p = 0; p < pallets.length; p += perPage) {
      if (p > 0) {
        doc.addPage()
        y = margin
      }
      const chunk = pallets.slice(p, p + perPage)
      const blockW = (pageWidth - margin * 2) / chunk.length
      chunk.forEach((pl, i) => {
        const x = margin + i * blockW
        const blockH = 200
        // contorno del bloque
        doc.setLineWidth(0.5)
        doc.rect(x, y, blockW - 10, blockH)
        let by = y + 16
        doc.setFontSize(10)
        doc.text(`Pallet #${p + i + 1}`, x + 5, by)
        by += 14
        // Hour field first
        const hour = pl.hour || ''
        doc.text(`Hora: ${hour}`, x + 5, by)
        by += 12
        // Campos del pallet: código de barra y caja primero
        const ordered = ['codigo_barra', 'codigo_caja', ...fields.map(f => f.campo).filter(c => c !== 'codigo_barra' && c !== 'codigo_caja')]
        ordered.forEach(f => {
          const v = pl.values[f] || ''
          doc.text(`${f}: ${v}`, x + 5, by)
          by += 12
        })
      })
    }
    // 4. Descargar PDF
    doc.save('checklist_monoproducto.pdf')
    clearDraft()
  }

  // Función para generar el PDF como Blob (arraybuffer -> Blob)
  const generateChecklistPDF = async (palletsData: typeof pallets) => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    let y = 10
    doc.setFontSize(12)
    doc.text('Checklist Monoproducto', 10, y)
    y += 10
    palletsData.forEach((pallet, idx) => {
      doc.text(`Pallet #${idx + 1}`, 10, y)
      y += 6
      // Hour field first
      const hour = pallet.hour || ''
      doc.text(`Hora: ${hour}`, 10, y)
      y += 6
      fields.forEach(field => {
        const val = pallet.values[field.campo]
        doc.text(`${field.campo}: ${val}`, 10, y)
        y += 6
      })
      y += 4
    })
    const arrayBuffer = doc.output('arraybuffer')
    return new Blob([arrayBuffer], { type: 'application/pdf' })
  }

  // Función para sanear textos para filenames
  const sanitize = (text: string) => text.replace(/[^a-zA-Z0-9_-]/g, '_')

  // Handle form submission - following footbath control pattern
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare form data for PDF
      const formData = {
        pallets: pallets.map(p => ({
          id: p.id,
          hour: p.hour || '',
          values: p.values
        })),
        metadata: pdfMetadata
      }

      // Generate PDF
      showToast('Generating PDF...', 'info')
      const pdfBlob = await pdf(
        <ChecklistPDFMonoproductoDocument pallets={pallets} metadata={pdfMetadata} />
      ).toBlob()

      // Create filename
      const dateForFilename = formatDateForFilename(date, false)
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const seconds = now.getSeconds().toString().padStart(2, '0')
      const timeStr = `${hours}${minutes}${seconds}`
      const filename = `${dateForFilename}-${timeStr}-Mono-Product-${sanitize(orderNumber)}.pdf`

      // Upload PDF to Supabase Storage
      showToast('Uploading PDF to storage...', 'info')
      const uploadedPdfUrl = await uploadChecklistPDF(pdfBlob, filename)

      // Convert user's date (YYYY-MM-DD) to UTC timestamp at midnight
      // This ensures the date filter works correctly based on the user's selected date
      const dateUtc = date ? new Date(`${date}T00:00:00.000Z`).toISOString() : new Date().toISOString()

      // Prepare data for database - store all pallets in single record as JSONB
      const dbData = {
        date_string: formatDateMMMDDYYYY(date),
        date_utc: dateUtc,
        orden_fabricacion: orderNumber,
        jefe_linea: lineManager,
        control_calidad: qualityControl,
        cliente: selectedBrand,
        producto: selectedMaterial,
        sku: selectedSku,
        pallets: formData.pallets,
        pdf_url: uploadedPdfUrl
      }

      // Save to Supabase database
      showToast('Saving to database...', 'info')
      await insertChecklistMonoproducto(dbData)

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
      alert(`Error submitting checklist: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Construir metadata para PDF monoproducto
  const pdfMetadata = {
    date,
    ordenFabricacion: orderNumber,
    lineManager,
    controlQuality: qualityControl,
    cliente: selectedBrand,
    producto: selectedMaterial,
    sku: selectedSku
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-4 flex justify-between items-start">
        <Link href="/area/calidad" className="inline-flex items-center text-gray-600 hover:text-gray-900">
          <span className="mr-2">←</span>
          Volver
        </Link>
        <DeleteDraftButton 
          storageKey="checklist-monoproducto-draft"
          checklistName="Checklist Monoproducto"
          onReset={resetForm}
        />
      </div>

      <h1 className="text-3xl font-bold mb-2 text-center">
        Quality control of freezing fruit process / Control de calidad del proceso de congelado de frutas
      </h1>
      <p className="text-center text-sm text-gray-500 mb-6">CF/PC-PG-ASC-006-RG001</p>

      {!isSubmitted && (
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basic Info */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">🧩 Section 1 – Basic Info / Información Básica</h2>
          {/* Mensaje de error visible */}
          {errorMessage && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-500 text-sm">{errorMessage}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Orden de fabricación */}
            <div>
              <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Orden de fabricación <span className="text-red-500">*</span>
              </label>
              <input
                id="orderNumber"
                ref={el => { headerRefs.current['orderNumber'] = el }}
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Fecha */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha <span className="text-red-500">*</span>
              </label>
              <input
                id="date"
                ref={el => { headerRefs.current['date'] = el }}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Jefe de línea */}
            <div>
              <label htmlFor="lineManager" className="block text-sm font-medium text-gray-700 mb-1">
                Jefe de línea <span className="text-red-500">*</span>
              </label>
              <input
                id="lineManager"
                ref={el => { headerRefs.current['lineManager'] = el }}
                type="text"
                value={lineManager}
                onChange={(e) => setLineManager(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Control de calidad */}
            <div>
              <label htmlFor="qualityControl" className="block text-sm font-medium text-gray-700 mb-1">
                Control de calidad <span className="text-red-500">*</span>
              </label>
              <input
                id="qualityControl"
                ref={el => { headerRefs.current['qualityControl'] = el }}
                type="text"
                value={qualityControl}
                onChange={(e) => setQualityControl(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Cliente (Brand) */}
            <div>
              <label htmlFor="selectedBrand" className="block text-sm font-medium text-gray-700 mb-1">
                Cliente <span className="text-red-500">*</span>
              </label>
              <select
                id="selectedBrand"
                ref={el => { headerRefs.current['selectedBrand'] = el }}
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Selecciona un cliente</option>
                {brands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Producto (Material) */}
            <div>
              <label htmlFor="selectedMaterial" className="block text-sm font-medium text-gray-700 mb-1">
                Producto <span className="text-red-500">*</span>
              </label>
              <select
                id="selectedMaterial"
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={!selectedBrand}
                required
              >
                <option value="">Selecciona un producto</option>
                {materials.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* SKU */}
            <div>
              <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                id="sku"
                type="text"
                value={selectedSku}
                readOnly
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-md shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Pallets */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">📦 Section 2 – Pallets / Pallets</h2>
            <button
              type="button"
              onClick={addPallet}
              disabled={pallets.length >= 50}
              className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Pallet
            </button>
          </div>

          <div className="space-y-4">
            {pallets.map((pallet, index) => {
              const isComplete = isPalletComplete(pallet)
              const identifier = getPalletIdentifier(pallet)
              const palletTitle = identifier 
                ? `Pallet #${index + 1} - ${identifier}`
                : `Pallet #${index + 1}`
              
              return (
                <div key={pallet.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Collapsed Header */}
                  {pallet.collapsed ? (
                    <div
                      className="flex justify-between items-center p-4 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                      onClick={() => expandPallet(pallet.id)}
                    >
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-700">
                          {palletTitle}
                          {!isComplete && (
                            <span className="ml-2 text-amber-600 text-sm font-normal">⚠ Incompleto</span>
                          )}
                        </h3>
                        {pallet.hour && (
                          <span className="text-sm text-gray-500">Hora: {pallet.hour}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            deletePallet(pallet.id)
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Eliminar pallet"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            expandPallet(pallet.id)
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-white">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium text-gray-700">
                          {palletTitle}
                          {!isComplete && (
                            <span className="ml-2 text-amber-600 text-sm font-normal">⚠ Incompleto</span>
                          )}
                        </h3>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-700">Hora:</label>
                          <input
                            ref={(el) => { inputRefs.current[`hour-${pallet.id}`] = el }}
                            type="time"
                            value={pallet.hour || ''}
                            onChange={(e) => handleHourChange(pallet.id, e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => deletePallet(pallet.id)}
                            className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                            title="Eliminar pallet"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {fields.map((field) => (
                          <div key={field.campo}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {field.campo} <span className="text-red-500">*</span>
                            </label>
                            <div className="flex">
                              <input
                                ref={(el) => { inputRefs.current[`${pallet.id}-${field.campo}`] = el }}
                                type="text"
                                value={pallet.values[field.campo] || ''}
                                onChange={(e) =>
                                  handleFieldChange(pallet.id, field.campo, e.target.value)
                                }
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder={field.unidad}
                                required
                              />
                              {field.unidad && (
                                <span className="ml-2 text-gray-500 self-center">{field.unidad}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 text-right">
                        <button
                          type="button"
                          onClick={() => finalizePallet(pallet.id)}
                          className="text-sm text-blue-500 hover:text-blue-700 hover:underline"
                        >
                          Finalizar pallet
                        </button>
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
    </div>
  )
} 