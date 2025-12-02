'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { ArrowLeft } from 'lucide-react'
import * as XLSX from 'xlsx'
import { fetchChecklistEnvTempData } from '@/lib/supabase/checklistEnvTemp'
import { fetchChecklistStaffPracticesData } from '@/lib/supabase/checklistStaffPractices'
import { fetchChecklistForeignMaterialData } from '@/lib/supabase/checklistForeignMaterial'
import { fetchChecklistPreOperationalReviewData } from '@/lib/supabase/checklistPreOperationalReview'
import { fetchChecklistMaterialsControlData } from '@/lib/supabase/checklistMaterialsControl'
import { exportToFile, exportRecord } from '@/lib/utils/exportData'

export default function HistorialPage() {
  const { showToast } = useToast()
  const [selected, setSelected] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [orden, setOrden] = useState<string>('')
  const [sku, setSku] = useState<string>('')
  const [producto, setProducto] = useState<string>('')
  const [marca, setMarca] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [results, setResults] = useState<any[]>([])
  const [hasSearched, setHasSearched] = useState<boolean>(false)
  const [showModal, setShowModal] = useState<boolean>(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [excelUrl, setExcelUrl] = useState<string | null>(null)
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false)
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false)

  const handleSearch = async () => {
    if (!selected) {
      showToast('Seleccione un checklist', 'error')
      return
    }
    setLoading(true)
    setHasSearched(true)
    
    try {
      let data: any[] = []
      
      if (selected === 'Checklist Monoproducto') {
        let query = supabase.from('checklist_calidad_monoproducto').select('*')
        
        if (fromDate) {
          if (!toDate) {
            query = query.eq('fecha', fromDate)
          } else {
            query = query.gte('fecha', fromDate).lte('fecha', toDate)
          }
        } else if (toDate) {
          query = query.lte('fecha', toDate)
        }
        
        if (orden) {
          query = query.ilike('orden_fabricacion', `%${orden}%`)
        }
        if (sku) {
          query = query.ilike('sku', `%${sku}%`)
        }
        if (producto) {
          query = query.ilike('producto', `%${producto}%`)
        }
        if (marca) {
          query = query.ilike('cliente', `%${marca}%`)
        }
        
        const { data: result, error } = await query
        if (error) {
          // If it's a "relation does not exist" error, treat as no data
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            data = []
          } else {
            throw error
          }
        } else {
          data = result || []
        }
        
      } else if (selected === 'Ensayos Microbiológicos Lab PT') {
        let query = supabase.from('resultados_microbiologicos_labpt').select('*')
        
        if (fromDate) {
          if (!toDate) {
            query = query.eq('fecha', fromDate)
          } else {
            query = query.gte('fecha', fromDate).lte('fecha', toDate)
          }
        } else if (toDate) {
          query = query.lte('fecha', toDate)
        }
        
        if (orden) {
          query = query.ilike('orden', `%${orden}%`)
        }
        if (sku) {
          query = query.ilike('sku', `%${sku}%`)
        }
        if (producto) {
          query = query.ilike('producto', `%${producto}%`)
        }
        
        const { data: result, error } = await query
        if (error) {
          // If it's a "relation does not exist" error, treat as no data
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            data = []
          } else {
            throw error
          }
        } else {
          data = result || []
        }
        
      } else if (selected === 'Checklist Mix Producto') {
        let query = supabase.from('checklist_calidad_mix').select('*')
        
        if (fromDate) {
          if (!toDate) {
            query = query.eq('fecha', fromDate)
          } else {
            query = query.gte('fecha', fromDate).lte('fecha', toDate)
          }
        } else if (toDate) {
          query = query.lte('fecha', toDate)
        }
        
        if (orden) {
          query = query.ilike('orden_fabricacion', `%${orden}%`)
        }
        if (sku) {
          query = query.ilike('sku', `%${sku}%`)
        }
        if (producto) {
          query = query.ilike('producto', `%${producto}%`)
        }
        
        const { data: result, error } = await query
        if (error) {
          // If it's a "relation does not exist" error, treat as no data
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            data = []
          } else {
            throw error
          }
        } else {
          data = result || []
        }
        
      } else if (selected === 'Process Environmental Temperature Control') {
        // Use the special fetch function for envtemp
        try {
          const records = await fetchChecklistEnvTempData(fromDate || undefined, toDate || undefined)
          // Filter by orden if provided (check in date_string or other fields)
          let filtered = records || []
          if (orden) {
            filtered = filtered.filter((r: any) => 
              r.date_string?.includes(orden) || 
              r.monitor_name?.toLowerCase().includes(orden.toLowerCase())
            )
          }
          data = filtered
        } catch (err) {
          // If fetch fails, treat as no data
          data = []
        }
      } else if (selected === 'Staff Good Practices Control') {
        // Use the special fetch function for staff practices
        try {
          const records = await fetchChecklistStaffPracticesData(fromDate || undefined, toDate || undefined)
          // Filter by orden if provided (check in date_string, monitor_name, or staff member names)
          let filtered = records || []
          if (orden) {
            filtered = filtered.filter((r: any) => 
              r.date_string?.includes(orden) || 
              r.monitor_name?.toLowerCase().includes(orden.toLowerCase()) ||
              r.staff_members?.some((m: any) => m.name?.toLowerCase().includes(orden.toLowerCase()))
            )
          }
          data = filtered
        } catch (err) {
          // If fetch fails, treat as no data
          data = []
        }
      } else if (selected === 'Foreign Material Findings Record') {
        // Use the special fetch function for foreign material
        try {
          const records = await fetchChecklistForeignMaterialData(fromDate || undefined, toDate || undefined)
          // Filter by brand, product, or product code
          let filtered = records || []
          if (marca) {
            filtered = filtered.filter((r: any) => 
              r.brand?.toLowerCase().includes(marca.toLowerCase())
            )
          }
          if (producto) {
            filtered = filtered.filter((r: any) => 
              r.product?.toLowerCase().includes(producto.toLowerCase())
            )
          }
          if (orden) {
            // Search in product codes from findings
            filtered = filtered.filter((r: any) => 
              r.date_string?.includes(orden) || 
              r.monitor_name?.toLowerCase().includes(orden.toLowerCase()) ||
              r.findings?.some((f: any) => f.productCode?.toLowerCase().includes(orden.toLowerCase()))
            )
          }
          data = filtered
        } catch (err) {
          // If fetch fails, treat as no data
          data = []
        }
      } else if (selected === 'Pre-Operational Review Processing Areas') {
        // Use the special fetch function for pre-operational review
        try {
          const records = await fetchChecklistPreOperationalReviewData(fromDate || undefined, toDate || undefined)
          // Filter by brand, product, or date
          let filtered = records || []
          if (marca) {
            filtered = filtered.filter((r: any) => 
              r.brand?.toLowerCase().includes(marca.toLowerCase())
            )
          }
          if (producto) {
            filtered = filtered.filter((r: any) => 
              r.product?.toLowerCase().includes(producto.toLowerCase())
            )
          }
          if (orden) {
            // Search in date_string or brand/product
            filtered = filtered.filter((r: any) => 
              r.date_string?.includes(orden) || 
              r.brand?.toLowerCase().includes(orden.toLowerCase()) ||
              r.product?.toLowerCase().includes(orden.toLowerCase())
            )
          }
          data = filtered
        } catch (err) {
          // If fetch fails, treat as no data
          data = []
        }
      } else if (selected === 'Internal control of materials used in production areas') {
        // Use the special fetch function for materials control
        try {
          const records = await fetchChecklistMaterialsControlData(fromDate || undefined, toDate || undefined)
          // Filter by productive area, line manager, monitor name, or personnel names
          let filtered = records || []
          if (marca) {
            filtered = filtered.filter((r: any) => 
              r.productive_area?.toLowerCase().includes(marca.toLowerCase())
            )
          }
          if (producto) {
            filtered = filtered.filter((r: any) => 
              r.line_manager_name?.toLowerCase().includes(producto.toLowerCase())
            )
          }
          if (orden) {
            // Search in date_string, productive_area, line_manager_name, monitor_name, or personnel names
            filtered = filtered.filter((r: any) => 
              r.date_string?.includes(orden) || 
              r.productive_area?.toLowerCase().includes(orden.toLowerCase()) ||
              r.line_manager_name?.toLowerCase().includes(orden.toLowerCase()) ||
              r.monitor_name?.toLowerCase().includes(orden.toLowerCase()) ||
              r.personnel_materials?.some((p: any) => p.personName?.toLowerCase().includes(orden.toLowerCase()))
            )
          }
          data = filtered
        } catch (err) {
          // If fetch fails, treat as no data
          data = []
        }
      }
      
      setResults(data)
    } catch (error: any) {
      console.error('Error searching:', error)
      // Only show error toast for actual errors, not for empty results
      // Empty results are handled by the UI showing "No se encontraron registros"
      if (error.code !== '42P01' && !error.message?.includes('does not exist')) {
        showToast('Error al buscar registros. Por favor, intente nuevamente.', 'error')
      }
      // Set empty results so the UI shows the "no data" message instead of an error
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = (record: any) => {
    setSelectedRecord(record)
    setShowModal(true)
  }

  // Función para generar y descargar datos desde Supabase
  const handleExportData = async (format: 'excel' | 'csv') => {
    if (!selectedRecord) return
    
    try {
      if (selected === 'Process Environmental Temperature Control') {
        // Export Temp Checklist data
        const record = selectedRecord
        // Flatten the readings array for better CSV/Excel viewing
        const flatRecord: any = {
          'Date': record.date_string || record.fecha || '',
          'Shift': record.shift || '',
          'Monitor Name': record.monitor_name || '',
          'Checker Name': record.checker_name || '',
          'Verification Date': record.verification_date || '',
          'Total Readings': record.readings?.length || 0,
        }
        
        // Add readings as separate columns or rows
        if (record.readings && record.readings.length > 0) {
          record.readings.forEach((reading: any, index: number) => {
            flatRecord[`Reading ${index + 1} - Time`] = reading.time || ''
            flatRecord[`Reading ${index + 1} - Digital Temp`] = reading.digitalThermometer || ''
            flatRecord[`Reading ${index + 1} - Wall Temp`] = reading.wallThermometer || ''
            flatRecord[`Reading ${index + 1} - Average Temp`] = reading.averageTemp || ''
            flatRecord[`Reading ${index + 1} - Status`] = reading.status || ''
            flatRecord[`Reading ${index + 1} - Observation`] = reading.observation || ''
          })
        }
        
        const fileName = `temp_checklist_${record.date_string || 'data'}_${record.shift || ''}`
        exportRecord(flatRecord, fileName, format)
        showToast(`Archivo ${format.toUpperCase()} descargado exitosamente`, 'success')
        
      } else if (selected === 'Staff Good Practices Control') {
        // Export Staff Practices Checklist data
        const record = selectedRecord
        
        // Define headers
        const headers = [
          'Date',
          'Shift',
          'Monitor Name',
          'Name',
          'Area',
          'Staff Appearance',
          'Complete Uniform',
          'Accessories Absence',
          'Work Tools Usage',
          'Cut Clean Nails',
          'No Makeup',
          'Staff Behavior',
          'Staff Health'
        ]
        
        // Create rows - one per staff member
        const rows: any[][] = [headers] // First row is headers
        
        if (record.staff_members && record.staff_members.length > 0) {
          record.staff_members.forEach((member: any) => {
            const row = [
              record.date_string || record.fecha || '',
              record.shift || '',
              record.monitor_name || '',
              member.name || '',
              member.area || '',
              member.staffAppearance || '',
              member.completeUniform || '',
              member.accessoriesAbsence || '',
              member.workToolsUsage || '',
              member.cutCleanNotPolishedNails || '',
              member.noMakeupOn || '',
              member.staffBehavior || '',
              member.staffHealth || ''
            ]
            rows.push(row)
          })
        } else {
          // If no staff members, still add one row with basic info
          rows.push([
            record.date_string || record.fecha || '',
            record.shift || '',
            record.monitor_name || '',
            '', '', '', '', '', '', '', '', '', ''
          ])
        }
        
        const fileName = `staff_practices_${record.date_string || 'data'}_${record.shift || ''}`
        exportToFile(rows, fileName, format, 'Staff Practices')
        showToast(`Archivo ${format.toUpperCase()} descargado exitosamente`, 'success')
        
      } else if (selected === 'Checklist Monoproducto' || selected === 'Checklist Mix Producto') {
        const orden = selectedRecord.orden_fabricacion
        const tableName = selected === 'Checklist Monoproducto' 
          ? 'checklist_calidad_monoproducto' 
          : 'checklist_calidad_mix'
        
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('orden_fabricacion', orden)
        
        if (error || !data || data.length === 0) {
          showToast('No se encontraron datos para exportar', 'error')
          return
        }
        
        const fileName = selected === 'Checklist Monoproducto' 
          ? `checklist_monoproducto_${orden}`
          : `checklist_mix_${orden}`
        
        exportToFile(data, fileName, format, 'Checklist')
        showToast(`Archivo ${format.toUpperCase()} descargado exitosamente`, 'success')
        
      } else if (selected === 'Ensayos Microbiológicos Lab PT') {
        // Export Lab PT data
        const record = selectedRecord
        const fileName = `labpt_${record.orden || record.orden_fabricacion || 'data'}_${record.fecha || ''}`
        exportRecord(record, fileName, format)
        showToast(`Archivo ${format.toUpperCase()} descargado exitosamente`, 'success')
      } else if (selected === 'Foreign Material Findings Record') {
        // Export Foreign Material Findings Record data
        const record = selectedRecord
        
        // Create base record with Section 1 data
        const flatRecord: any = {
          'Date / Fecha': record.date_string || '',
          'Brand / Marca': record.brand || '',
          'Product / Producto': record.product || '',
          'Shift / Turno': record.shift || '',
          'Monitor Name / Nombre del Monitor': record.monitor_name || '',
          'No Findings / Sin Hallazgos': record.no_findings ? 'Yes / Sí' : 'No / No',
          'Total Findings': record.no_findings ? 0 : (record.findings?.length || 0)
        }
        
        // If there are findings, create rows - one per finding
        if (!record.no_findings && record.findings && record.findings.length > 0) {
          // Create headers for findings
          const headers = [
            'Date / Fecha',
            'Brand / Marca',
            'Product / Producto',
            'Shift / Turno',
            'Monitor Name / Nombre del Monitor',
            'Finding #',
            'Hour From / Hora Desde',
            'Hour To / Hora Hasta',
            'Finding Description / Descripción del Hallazgo',
            'Pallet Number Ingredient / Número de Pallet de Ingrediente',
            'Product Code / Código del Producto',
            'Element Type / Tipo de Elemento',
            'Other Element Type / Otro Tipo de Elemento',
            'Total Amount / Cantidad Total'
          ]
          
          // Create rows - one per finding
          const rows: any[][] = [headers]
          
          record.findings.forEach((finding: any, index: number) => {
            // Map element types to readable labels
            const elementTypeLabels: Record<string, string> = {
              hair: 'Hair / Pelos',
              insects: 'Insects / Insectos',
              vegetal_matter: 'Vegetal matter / Material vegetal',
              paper: 'Paper / Papel',
              hard_plastic: 'Hard Plastic / Plástico duro',
              pit: 'Pit / Cuesco',
              metal_piece: 'Metal piece / Pieza de metal',
              product_mixed: 'Product mixed / Mezcla producto',
              wood: 'Wood / Madera',
              dirt: 'Dirt / Tierra',
              stone: 'Stone / Piedra',
              cardboard: 'Cardboard / Cartón',
              tape: 'Tape / Fibra de cinta',
              textile_fibres: 'Textile fibres / Fibra textil',
              spiders: 'Spiders / Arañas',
              feathers: 'Feathers / Plumas',
              worms_larvae: 'Worms-larvae / Gusanos-larvas',
              slug_snail: 'Babosas-caracol / Slug-snail',
              soft_plastic: 'Soft plastic / Plástico blando',
              other: 'Other / Otro'
            }
            
            const elementTypeLabel = finding.elementType === 'other' 
              ? finding.otherElementType || 'Other / Otro'
              : elementTypeLabels[finding.elementType] || finding.elementType
            
            const row = [
              record.date_string || '',
              record.brand || '',
              record.product || '',
              record.shift || '',
              record.monitor_name || '',
              index + 1,
              finding.hourFrom || '',
              finding.hourTo || '',
              finding.findingDescription || '',
              finding.palletNumberIngredient || '',
              finding.productCode || '',
              elementTypeLabel,
              finding.elementType === 'other' ? (finding.otherElementType || '') : '',
              finding.totalAmount || ''
            ]
            rows.push(row)
          })
          
          const fileName = `foreign_material_findings_${record.date_string || 'data'}_${record.shift?.replace(/\s+/g, '_') || ''}`
          exportToFile(rows, fileName, format, 'Foreign Material Findings')
        } else {
          // No findings - export as single record
          const fileName = `foreign_material_no_findings_${record.date_string || 'data'}_${record.shift?.replace(/\s+/g, '_') || ''}`
          exportRecord(flatRecord, fileName, format)
        }
        
        showToast(`Archivo ${format.toUpperCase()} descargado exitosamente`, 'success')
      } else if (selected === 'Pre-Operational Review Processing Areas') {
        // Export Pre-Operational Review data
        const record = selectedRecord
        const flatRecord: any = {
          'Date': record.date_string || '',
          'Hour': record.hour_string || '',
          'Brand': record.brand || '',
          'Product': record.product || '',
          'Monitor Name': record.monitor_name || '',
          'Total Items': record.items?.length || 0,
        }
        
        // Add items as separate columns using actual item names as headers
        if (record.items && record.items.length > 0) {
          record.items.forEach((item: any) => {
            const itemName = item.name || ''
            // Use the full item name as the base for column headers
            flatRecord[`${itemName} - Comply`] = item.comply === true ? 'Comply' : item.comply === false ? 'Not Comply' : 'N/A'
            flatRecord[`${itemName} - Observation`] = item.observation || ''
            flatRecord[`${itemName} - Corrective Action`] = item.correctiveAction || ''
            flatRecord[`${itemName} - Corrective Action Status`] = item.correctiveActionComply === true ? 'Comply' : item.correctiveActionComply === false ? 'Not Comply' : 'N/A'
            flatRecord[`${itemName} - Corrective Action Observation`] = item.correctiveActionObservation || ''
          })
        }
        
        const fileName = `pre_operational_review_${record.date_string || 'data'}_${record.hour_string?.replace(':', '') || ''}`
        exportRecord(flatRecord, fileName, format)
        showToast(`Archivo ${format.toUpperCase()} descargado exitosamente`, 'success')
      } else if (selected === 'Internal control of materials used in production areas') {
        // Export Materials Control data
        const record = selectedRecord
        
        // Define headers
        const headers = [
          'Date',
          'Productive Area',
          'Line Manager Name',
          'Monitor Name',
          'Person Name',
          'Material',
          'Quantity Handed Out',
          'Material Status Handed Out',
          'Observation Handed Out',
          'Return Motive',
          'Quantity Received',
          'Material Status Received',
          'Observation Received'
        ]
        
        // Create rows - one per personnel material
        const rows: any[][] = [headers]
        
        if (record.personnel_materials && record.personnel_materials.length > 0) {
          record.personnel_materials.forEach((personnel: any) => {
            const row = [
              record.date_string || '',
              record.productive_area || '',
              record.line_manager_name || '',
              record.monitor_name || '',
              personnel.personName || '',
              personnel.material || '',
              personnel.quantity || 0,
              personnel.materialStatus || '',
              personnel.observation || '',
              personnel.returnMotive || '',
              personnel.quantityReceived || 0,
              personnel.materialStatusReceived || '',
              personnel.observationReceived || ''
            ]
            rows.push(row)
          })
        } else {
          // If no personnel materials, still add one row with basic info
          rows.push([
            record.date_string || '',
            record.productive_area || '',
            record.line_manager_name || '',
            record.monitor_name || '',
            '', '', '', '', '', '', '', ''
          ])
        }
        
        const fileName = `materials_control_${record.date_string || 'data'}`
        exportToFile(rows, fileName, format, 'Materials Control')
        showToast(`Archivo ${format.toUpperCase()} descargado exitosamente`, 'success')
      }
      
      setShowExportMenu(false)
    } catch (err: any) {
      console.error('Error exportando datos:', err)
      showToast(`Error al exportar ${format.toUpperCase()}`, 'error')
    }
  }

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.export-menu-container')) {
        setShowExportMenu(false)
      }
    }

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportMenu])

  // Fetch PDF and Excel URLs when a record is selected
  useEffect(() => {
    if (!showModal || !selectedRecord) return

    setLoadingFiles(true)
    setPdfUrl(null)
    setExcelUrl(null)

    ;(async () => {
      try {
        if (selected === 'Process Environmental Temperature Control' || selected === 'Staff Good Practices Control' || selected === 'Pre-Operational Review Processing Areas' || selected === 'Internal control of materials used in production areas' || selected === 'Ensayos Microbiológicos Lab PT') {
          // For Temp, Staff Practices, Pre-Operational Review, Materials Control, and Lab PT checklists, use pdf_url directly from record
          if (selectedRecord.pdf_url) {
            setPdfUrl(selectedRecord.pdf_url)
          }
          setLoadingFiles(false)
          return
        }

        const { data: fileList, error: listError } = await supabase.storage
          .from('checklistcalidad')
          .list('', { limit: 1000 })

        if (listError) throw listError
        if (!fileList || fileList.length === 0) {
          setLoadingFiles(false)
          return
        }

        const orden = selectedRecord.orden_fabricacion || selectedRecord.orden

        // For Foreign Material and Pre-Operational Review, use pdf_url directly if available
        if ((selected === 'Foreign Material Findings Record' || selected === 'Pre-Operational Review Processing Areas') && selectedRecord.pdf_url) {
          setPdfUrl(selectedRecord.pdf_url)
          setLoadingFiles(false)
          return
        }

        // For other checklists, search for PDF files
        if (orden) {
          const pdfFile = fileList.find((file) =>
            file.name.endsWith(`-${orden}.pdf`)
          )
          if (pdfFile) {
            const { data: { publicUrl } } = supabase.storage
              .from('checklistcalidad')
              .getPublicUrl(pdfFile.name)
            setPdfUrl(publicUrl)
          }

          const excelFile = fileList.find((file) =>
            orden && file.name.toLowerCase().includes(orden.toLowerCase()) &&
            file.name.endsWith('.xlsx')
          )
          if (excelFile) {
            const { data: { publicUrl } } = supabase.storage
              .from('checklistcalidad')
              .getPublicUrl(excelFile.name)
            setExcelUrl(publicUrl)
          }
        }
      } catch (error: any) {
        console.error('Error al buscar archivos:', error)
      } finally {
        setLoadingFiles(false)
      }
    })()
  }, [showModal, selectedRecord, selected])

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-4">
        <Link href="/area/calidad" className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver
        </Link>
      </div>
      <h1 className="text-3xl font-bold mb-6">Historial de Calidad</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label htmlFor="checklist" className="block text-sm font-medium text-gray-700 mb-1">Elegir checklist</label>
          <select
            id="checklist"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
          >
            <option value="">Seleccione un checklist</option>
            <option value="Checklist Monoproducto">Checklist Monoproducto</option>
            <option value="Checklist Mix Producto">Checklist Mix Producto</option>
            <option value="Ensayos Microbiológicos Lab PT">Ensayos Microbiológicos Lab PT</option>
            <option value="Process Environmental Temperature Control">Process Environmental Temperature Control</option>
            <option value="Staff Good Practices Control">Staff Good Practices Control</option>
            <option value="Foreign Material Findings Record">Foreign Material Findings Record</option>
            <option value="Pre-Operational Review Processing Areas">Pre-Operational Review Processing Areas</option>
            <option value="Internal control of materials used in production areas">Internal control of materials used in production areas</option>
          </select>
        </div>
        <div>
          <label htmlFor="fromDate" className="block text-sm font-medium text-gray-700 mb-1">Fecha desde</label>
          <input
            type="date"
            id="fromDate"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        <div>
          <label htmlFor="toDate" className="block text-sm font-medium text-gray-700 mb-1">Fecha hasta</label>
          <input
            type="date"
            id="toDate"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        <div>
          <label htmlFor="orden" className="block text-sm font-medium text-gray-700 mb-1">Orden de fabricación</label>
          <input
            type="text"
            id="orden"
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            placeholder="Orden de fabricación"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
          <input
            type="text"
            id="sku"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="SKU"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        <div>
            <label htmlFor="producto" className="block text-sm font-medium text-gray-700 mb-1">
              {selected === 'Internal control of materials used in production areas' ? 'Jefe de Línea' : 'Producto'}
            </label>
            <input
              type="text"
              id="producto"
              value={producto}
              onChange={(e) => setProducto(e.target.value)}
              placeholder={selected === 'Internal control of materials used in production areas' ? 'Jefe de Línea' : 'Producto'}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
        </div>
        {(selected === 'Checklist Monoproducto' || selected === 'Checklist Mix Producto' || selected === 'Pre-Operational Review Processing Areas' || selected === 'Internal control of materials used in production areas') && (
          <div>
            <label htmlFor="marca" className="block text-sm font-medium text-gray-700 mb-1">
              {selected === 'Internal control of materials used in production areas' ? 'Área Productiva' : 'Marca/Cliente'}
            </label>
            <input
              type="text"
              id="marca"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              placeholder={selected === 'Internal control of materials used in production areas' ? 'Área Productiva' : 'Marca/Cliente'}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
        )}
      </div>

      <div className="mb-6">
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Buscar
        </button>
      </div>

      {loading && (
        <div className="flex justify-center my-6">
          <svg
            className="animate-spin h-8 w-8 text-gray-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
        </div>
      )}

      {!loading && hasSearched && results.length === 0 && (
        <p className="text-center text-gray-600">No se encontraron registros con estos filtros.</p>
      )}

      {!loading && results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Fecha</th>
                {selected !== 'Process Environmental Temperature Control' && selected !== 'Staff Good Practices Control' && selected !== 'Foreign Material Findings Record' && selected !== 'Pre-Operational Review Processing Areas' && selected !== 'Internal control of materials used in production areas' && (
                  <>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Orden de fabricación</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">SKU</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Producto</th>
                  </>
                )}
                {selected === 'Process Environmental Temperature Control' && (
                  <>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Turno</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Monitor</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Lecturas</th>
                  </>
                )}
                {selected === 'Staff Good Practices Control' && (
                  <>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Turno</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Monitor</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Personal</th>
                  </>
                )}
                  {selected === 'Foreign Material Findings Record' && (
                    <>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Marca</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Producto</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Turno</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Hallazgos</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Monitor</th>
                    </>
                  )}
                  {selected === 'Pre-Operational Review Processing Areas' && (
                    <>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Hora</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Marca</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Producto</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Cumplimiento</th>
                    </>
                  )}
                  {selected === 'Internal control of materials used in production areas' && (
                    <>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Área Productiva</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Jefe de Línea</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Monitor</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Personal</th>
                    </>
                  )}
                {(selected === 'Checklist Monoproducto' || selected === 'Checklist Mix Producto') && (
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Marca/Cliente</th>
                )}
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {results.map((record: any, index: number) => (
                <tr key={record.id ?? record.orden_fabricacion ?? index}>
                  <td className="px-4 py-2 text-sm text-gray-800">
                    {record.fecha || record.date_string || '-'}
                  </td>
                  {selected !== 'Process Environmental Temperature Control' && selected !== 'Staff Good Practices Control' && selected !== 'Foreign Material Findings Record' && selected !== 'Pre-Operational Review Processing Areas' && selected !== 'Internal control of materials used in production areas' && (
                    <>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {record.orden_fabricacion || record.orden || '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800">{record.sku || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">{record.producto || '-'}</td>
                    </>
                  )}
                  {selected === 'Process Environmental Temperature Control' && (
                    <>
                      <td className="px-4 py-2 text-sm text-gray-800">{record.shift || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">{record.monitor_name || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {record.readings?.length || 0} lectura(s)
                      </td>
                    </>
                  )}
                  {selected === 'Staff Good Practices Control' && (
                    <>
                      <td className="px-4 py-2 text-sm text-gray-800">{record.shift || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">{record.monitor_name || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {record.staff_members?.length || 0} miembro(s)
                      </td>
                    </>
                  )}
                  {selected === 'Foreign Material Findings Record' && (
                    <>
                      <td className="px-4 py-2 text-sm text-gray-800">{record.brand || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">{record.product || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">{record.shift || '-'}</td>
                      <td className="px-4 py-2 text-sm">
                        {record.no_findings ? (
                          <span className="text-green-600 font-semibold">Sin Hallazgos</span>
                        ) : (
                          <span className="text-red-600 font-semibold">
                            {record.findings?.length || 0} hallazgo(s)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800">{record.monitor_name || '-'}</td>
                    </>
                  )}
                  {selected === 'Pre-Operational Review Processing Areas' && (
                    <>
                      <td className="px-4 py-2 text-sm text-gray-800">{record.hour_string || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">{record.brand || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">{record.product || '-'}</td>
                      <td className="px-4 py-2 text-sm">
                        {record.items && record.items.length > 0 ? (
                          (() => {
                            const totalItems = record.items.length
                            const compliantItems = record.items.filter((item: any) => item.comply === true).length
                            const nonCompliantItems = record.items.filter((item: any) => item.comply === false).length
                            const complianceRate = totalItems > 0 ? ((compliantItems / totalItems) * 100).toFixed(1) : '0'
                            return (
                              <span className={`font-semibold ${
                                complianceRate === '100' ? 'text-green-600' : 
                                parseFloat(complianceRate) >= 80 ? 'text-yellow-600' : 
                                'text-red-600'
                              }`}>
                                {complianceRate}% ({compliantItems}/{totalItems})
                              </span>
                            )
                          })()
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </>
                  )}
                  {selected === 'Internal control of materials used in production areas' && (
                    <>
                      <td className="px-4 py-2 text-sm text-gray-800">{record.productive_area || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">{record.line_manager_name || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">{record.monitor_name || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {record.personnel_materials?.length || 0} persona(s)
                      </td>
                    </>
                  )}
                  {(selected === 'Checklist Monoproducto' || selected === 'Checklist Mix Producto') && (
                    <td className="px-4 py-2 text-sm text-gray-800">
                      {record.marca || record.cliente || '-'}
                    </td>
                  )}
                  <td className="px-4 py-2 text-right text-sm">
                    <button
                      onClick={() => handleViewDetail(record)}
                      className="text-blue-600 hover:underline"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-4xl w-full">
            <h2 className="text-xl font-bold mb-4">Visor de documentos</h2>
            {loadingFiles ? (
              <p>Cargando archivos...</p>
            ) : (
              <>
                {pdfUrl ? (
                  <iframe src={pdfUrl} className="w-full h-96 mb-4" />
                ) : (
                  <p className="text-center mb-4">Archivo PDF no disponible</p>
                )}
                <div className="flex flex-wrap gap-4 mb-4">
                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Descargar PDF
                    </a>
                  )}
                  {excelUrl && (
                    <a
                      href={excelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Descargar Excel (Archivo)
                    </a>
                  )}
                  {selectedRecord && (
                    <div className="relative export-menu-container">
                      <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-2"
                      >
                        Descargar Datos
                        <span className="text-xs">▼</span>
                      </button>
                      {showExportMenu && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 min-w-[150px]">
                          <button
                            onClick={() => handleExportData('excel')}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
                          >
                            📊 Excel (.xlsx)
                          </button>
                          <button
                            onClick={() => handleExportData('csv')}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 border-t border-gray-200"
                          >
                            📄 CSV (.csv)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
            <button
              onClick={() => {
                setShowModal(false)
                setShowExportMenu(false)
              }}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 