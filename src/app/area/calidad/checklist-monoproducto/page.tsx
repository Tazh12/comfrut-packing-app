'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { Plus, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ChecklistPDFMonoproductoLink } from '@/components/ChecklistPDFMonoproducto'
import { pdf } from '@react-pdf/renderer'
import { ChecklistPDFMonoproductoDocument } from '@/components/ChecklistPDFMonoproducto'
import { useChecklistPersistence } from '@/lib/hooks/useChecklistPersistence'
import { DeleteDraftButton } from '@/components/DeleteDraftButton'

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
    { id: number; collapsed: boolean; values: Record<string, string> }[]
  >([])

  const [finalized, setFinalized] = useState(false)
  const [pdfGenerated, setPdfGenerated] = useState(false)

  const router = useRouter()
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
    setFinalized(false)
    setPdfGenerated(false)
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
      pallets: pallets.map(p => ({ id: p.id, collapsed: p.collapsed, values: p.values }))
    },
    finalized,
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
        setPallets(data.pallets)
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
        console.log('Consultando agrupación para SKU:', selectedSku.trim())
        const { data: compData, error: compError } = await supabase
          .from('composicion_productos')
          .select('agrupacion')
          .ilike('sku', `%${selectedSku.trim()}%`)
        if (compError) {
          console.error('Error fetching agrupacion', compError)
          setFields([])
          return
        }
        if (!compData || !Array.isArray(compData) || compData.length === 0) {
          console.error('No agrupacion found', compData)
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
  }, [selectedSku])

  const addPallet = () => {
    if (!selectedSku || pallets.length >= 50) return
    const newPallet = {
      id: Date.now(),
      collapsed: false,
      values: fields.reduce((acc, f) => ({ ...acc, [f.campo]: '' }), {} as Record<string, string>),
    }
    setPallets(prev => [...prev, newPallet])
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

  const handleFieldChange = (id: number, campo: string, value: string) => {
    setPallets(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, values: { ...p.values, [campo]: value } }
          : p
      )
    )
  }

  const handleFinalizeAll = async () => {
    // Limpiar errores previos en header y pallets
    setErrorMessage('')
    Object.values(headerRefs.current).forEach(el => el?.classList.remove('border-red-500'))
    Object.values(inputRefs.current).forEach(el => el?.classList.remove('border-red-500'))
    // 1. Validar campos del encabezado
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
        return
      }
    }
    // 2. Validar campos de todos los pallets
    let firstPalletIndex = -1
    let missingField = ''
    for (let i = 0; i < pallets.length; i++) {
      const p = pallets[i]
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
      expandPallet(pallets[firstPalletIndex].id)
      const key = `${pallets[firstPalletIndex].id}-${missingField}`
      const inputEl = inputRefs.current[key]
      if (inputEl) {
        inputEl.classList.add('border-red-500')
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        inputEl.focus()
      }
      const msg = 'Falta completar campos en los pallets.'
      setErrorMessage(msg)
      showToast(msg, 'error')
      return
    }
    // 3. Finalización: habilitar generación de PDF
    setFinalized(true)
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
    setPdfGenerated(true)
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

  const handleExit = async () => {
    try {
      // 1. Generar y validar PDF Blob usando nuevo componente
      const blob = await pdf(
        <ChecklistPDFMonoproductoDocument pallets={pallets} metadata={pdfMetadata} />
      ).toBlob()
      if (!(blob instanceof Blob) || blob.size === 0) {
        const msg = 'Error al generar PDF.'
        setErrorMessage(msg)
        showToast(msg, 'error')
        return
      }
      const pdfBlob = blob
      // Validar enlace de descarga
      const testLink = document.createElement('a')
      testLink.href = URL.createObjectURL(pdfBlob)
      testLink.download = 'test.pdf'
      if (!testLink.href) {
        const msg = 'No se pudo crear enlace de descarga.'
        setErrorMessage(msg)
        showToast(msg, 'error')
        return
      }
      // 2. Subir PDF a nuevo bucket 'checklistcalidad'
      // Usar la fecha ingresada por el usuario (date) como base, con fallback a fecha del sistema
      const dateStr = date || new Date().toISOString().split('T')[0]
      const fileName = `${sanitize(dateStr)}-${sanitize(selectedMaterial)}-${sanitize(orderNumber)}.pdf`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('checklistcalidad')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        })
      if (uploadError) {
        console.error('Error uploading PDF:', uploadError?.message || uploadError)
        console.error('uploadError.message:', uploadError.message)
        console.error('uploadError.statusCode:', (uploadError as any).statusCode)
        console.error('uploadError.name:', uploadError.name)
        console.error('uploadError full object:', uploadError)
        alert('No se pudo subir el PDF.')
        return
      }
      const { data: urlData } = supabase.storage.from('checklistcalidad').getPublicUrl(fileName)
      const url_pdf = urlData?.publicUrl ?? ''

      // 4. Verificar autenticación antes de guardar
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('User not authenticated, aborting save:', authError)
        alert('Usuario no autenticado. Por favor inicia sesión.')
        return
      }
      // 5. Insertar cada pallet en Supabase con datos validados
      for (const pallet of pallets) {
        // Excluir collapsed y extraer valores de fields
        const { collapsed, values, id: pallet_id } = pallet
        const dataToInsert = {
          orden_fabricacion: orderNumber,
          fecha: date,
          jefe_linea: lineManager,
          control_calidad: qualityControl,
          cliente: selectedBrand,
          producto: selectedMaterial,
          sku: selectedSku,
          pallet_id,
          ...values,
          url_pdf,
        }
        console.log('Data to insert:', dataToInsert)
        // Filtrar campos no existentes en la tabla
        const { url_pdf: _urlPdf, ...filteredData } = dataToInsert
        console.log('Filtered data for insert:', filteredData)
        const { data: insertData, error: insertError } = await supabase
          .from('checklist_calidad_monoproducto')
          .insert([filteredData])
        if (insertError) {
          console.error('Error saving record:', {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
            error: insertError
          })
          alert(`Error saving record: ${insertError.message}`)
          return
        }
      }

      // 6. Redirigir al dashboard
      router.push('/dashboard')
    } catch (err) {
      console.error('Unexpected error in handleExit:', err)
      alert('Hubo un error inesperado. Revisa consola.')
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Botón Volver al Dashboard y Delete */}
        <div className="flex justify-between items-start mb-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span className="mr-2">←</span>
            <span>Volver</span>
          </Link>
          <DeleteDraftButton 
            storageKey="checklist-monoproducto-draft"
            checklistName="Checklist Monoproducto"
            onReset={resetForm}
          />
        </div>
        {/* Título principal */}
        <h1 className="text-2xl font-semibold text-gray-900 text-center">
          Quality control of freezing fruit process / Control de calidad del proceso de congelado de frutas
        </h1>
        {/* Subtítulo con código de checklist */}
        <p className="text-sm text-gray-600 text-center mb-6">CF/PC-PG-ASC-006-RG001</p>
        {/* Mensaje de error visible */}
        {errorMessage && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-500 text-sm">{errorMessage}</p>
          </div>
        )}
        {/* Orden de fabricación */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Orden de fabricación</label>
          <input
            ref={el => { headerRefs.current['orderNumber'] = el }}
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* Fecha */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha</label>
          <input
            ref={el => { headerRefs.current['date'] = el }}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* Jefe de línea */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Jefe de línea</label>
          <input
            ref={el => { headerRefs.current['lineManager'] = el }}
            type="text"
            value={lineManager}
            onChange={(e) => setLineManager(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* Control de calidad */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Control de calidad</label>
          <input
            ref={el => { headerRefs.current['qualityControl'] = el }}
            type="text"
            value={qualityControl}
            onChange={(e) => setQualityControl(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* Cliente (Brand) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Cliente</label>
          <select
            ref={el => { headerRefs.current['selectedBrand'] = el }}
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Selecciona un cliente</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Producto (Material) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Producto</label>
          <select
            value={selectedMaterial}
            onChange={(e) => setSelectedMaterial(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            disabled={!selectedBrand}
          >
            <option value="">Selecciona un producto</option>
            {materials.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* SKU */}
        <div>
          <label className="block text-sm font-medium text-gray-700">SKU</label>
          <input
            type="text"
            value={selectedSku}
            readOnly
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-md"
          />
        </div>

        {/* Agregar Pallet */}
        <button
          onClick={addPallet}
          disabled={pallets.length >= 50}
          className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar Pallet
        </button>

        {/* Formularios de pallets */}
        {pallets.map((pallet, index) => (
          <div id={`pallet-${index}`} key={pallet.id} className="border p-4 rounded-md mb-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">Pallet #{index + 1}</h2>
              {pallet.collapsed && (
                <button
                  onClick={() => expandPallet(pallet.id)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Pencil className="h-5 w-5" />
                </button>
              )}
            </div>
            {!pallet.collapsed && (
              <>
                <div className="mt-4 grid grid-cols-1 gap-4">
                  {fields.map((field) => (
                    <div key={field.campo}>
                      <label className="block text-sm font-medium text-gray-700">
                        {field.campo}
                      </label>
                      <div className="mt-1 flex">
                        <input
                          ref={(el) => { inputRefs.current[`${pallet.id}-${field.campo}`] = el }}
                          type="text"
                          value={pallet.values[field.campo] || ''}
                          onChange={(e) =>
                            handleFieldChange(pallet.id, field.campo, e.target.value)
                          }
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder={field.unidad}
                        />
                        <span className="ml-2 text-gray-500">{field.unidad}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-right">
                  <button
                    onClick={() => finalizePallet(pallet.id)}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    Finalizar pallet
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Botón Finalizar total */}
        {!finalized && pallets.length > 0 && (
          <div className="mt-6">
            {errorMessage && <p className="text-red-600 mb-2">{errorMessage}</p>}
            <button
              onClick={handleFinalizeAll}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex flex-col items-center"
            >
              <span>Finalize</span>
              <span className="text-xs opacity-90">Finalizar</span>
            </button>
          </div>
        )}
      </div>

      {/* Success Message */}
      {finalized && (
        <div className="mt-8 bg-green-50 border-2 border-green-200 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-green-900">✓ Checklist Submitted Successfully!</h2>
          <p className="text-gray-700 mb-4">Your checklist has been saved and the PDF has been generated.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col items-center">
              <ChecklistPDFMonoproductoLink pallets={pallets} metadata={pdfMetadata} />
            </div>
            <Link
              href="/area/calidad"
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-center flex flex-col items-center justify-center"
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