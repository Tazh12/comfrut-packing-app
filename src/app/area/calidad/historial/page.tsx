'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { ArrowLeft, History, BarChart3, PackageCheck, FlaskConical, Thermometer, Users, AlertTriangle, ClipboardCheck, Package, Eye, Droplet, Scale, Sparkles, Search, FileSpreadsheet, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { fetchChecklistEnvTempData } from '@/lib/supabase/checklistEnvTemp'
import { fetchChecklistStaffPracticesData } from '@/lib/supabase/checklistStaffPractices'
import { fetchChecklistForeignMaterialData } from '@/lib/supabase/checklistForeignMaterial'
import { fetchChecklistPreOperationalReviewData } from '@/lib/supabase/checklistPreOperationalReview'
import { fetchChecklistMaterialsControlData } from '@/lib/supabase/checklistMaterialsControl'
import { fetchChecklistFootbathControlData } from '@/lib/supabase/checklistFootbathControl'
import { fetchChecklistWeighingSealingData } from '@/lib/supabase/checklistWeighingSealing'
import { fetchChecklistCleanlinessControlPackingData } from '@/lib/supabase/checklistCleanlinessControlPacking'
import { fetchChecklistMetalDetectorData } from '@/lib/supabase/checklistMetalDetector'
import { fetchChecklistStaffGlassesAuditoryData } from '@/lib/supabase/checklistStaffGlassesAuditory'
import { exportToFile, exportRecord } from '@/lib/utils/exportData'

// Checklist metadata mapping for icons and descriptions
const checklistMetadata: Record<string, { icon: any; description: string }> = {
  'Checklist Monoproducto': {
    icon: PackageCheck,
    description: 'Gestión de checklist para monoproducto.'
  },
  'Checklist Mix Producto': {
    icon: FlaskConical,
    description: 'Gestión de checklist para mezcla de productos.'
  },
  'Process Environmental Temperature Control': {
    icon: Thermometer,
    description: 'Checklist de monitoreo de temperatura ambiental.'
  },
  'Metal Detector (PCC #1)': {
    icon: Search,
    description: 'Checklist de control crítico de detector de metales.'
  },
  'Staff Good Practices Control': {
    icon: Users,
    description: 'Control de buenas prácticas del personal.'
  },
  'Foreign Material Findings Record': {
    icon: AlertTriangle,
    description: 'Record de hallazgos de materia extraña.'
  },
  'Pre-Operational Review Processing Areas': {
    icon: ClipboardCheck,
    description: 'Áreas de procesamiento de revisión preoperacional.'
  },
  'Internal control of materials used in production areas': {
    icon: Package,
    description: 'Control interno de materiales usados en áreas productivas.'
  },
  'Footbath Control': {
    icon: Droplet,
    description: 'Control de pediluvios y concentración de sanitizante.'
  },
  'Check weighing and sealing of packaged products': {
    icon: Scale,
    description: 'Chequeo de pesaje y sellado de los productos envasados.'
  },
  'Cleanliness Control Packing': {
    icon: Sparkles,
    description: 'Control de limpieza de empaque.'
  },
  'Process area staff glasses and auditory protector control': {
    icon: Eye,
    description: 'Control de lentes y/o protector auditivo del personal que ingresa a áreas de proceso.'
  }
}

// Helper to determine which fields are relevant for a checklist
const getRelevantFields = (checklistName: string) => {
  const fields = {
    orden: false,
    sku: false,
    producto: false,
    marca: false
  }

  if (checklistName === 'Checklist Monoproducto' || checklistName === 'Checklist Mix Producto') {
    fields.orden = true
    fields.sku = true
    fields.producto = true
    fields.marca = true
  } else if (checklistName === 'Foreign Material Findings Record' || 
             checklistName === 'Pre-Operational Review Processing Areas' ||
             checklistName === 'Check weighing and sealing of packaged products' ||
             checklistName === 'Metal Detector (PCC #1)') {
    fields.orden = true
    fields.producto = true
    fields.marca = true
  } else if (checklistName === 'Internal control of materials used in production areas') {
    fields.orden = true
    fields.producto = true
    fields.marca = true
  } else {
    // For others like Metal Detector, Staff Practices, Footbath, etc., only orden might be relevant
    fields.orden = true
  }

  return fields
}

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
  const [showExcelExportMenu, setShowExcelExportMenu] = useState<boolean>(false)
  const [showPdfConfirmModal, setShowPdfConfirmModal] = useState<boolean>(false)
  const [exportingPdfs, setExportingPdfs] = useState<boolean>(false)

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
        
      } else if (selected === 'Checklist Mix Producto') {
        let query = supabase.from('checklist_producto_mix').select('*')
        
        // Filter by date_utc (timestamp) or date_string
        if (fromDate) {
          const startUTC = new Date(`${fromDate}T00:00:00Z`).toISOString()
          if (!toDate) {
            // Single date: check if date_utc starts on that day
            const endUTC = new Date(`${fromDate}T23:59:59Z`).toISOString()
            query = query.gte('date_utc', startUTC).lte('date_utc', endUTC)
          } else {
            const endDateObj = new Date(`${toDate}T00:00:00Z`)
            endDateObj.setDate(endDateObj.getDate() + 1)
            const endUTC = endDateObj.toISOString()
            query = query.gte('date_utc', startUTC).lt('date_utc', endUTC)
          }
        } else if (toDate) {
          const endDateObj = new Date(`${toDate}T00:00:00Z`)
          endDateObj.setDate(endDateObj.getDate() + 1)
          const endUTC = endDateObj.toISOString()
          query = query.lt('date_utc', endUTC)
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
      } else if (selected === 'Footbath Control') {
        // Use the special fetch function for footbath control
        try {
          const records = await fetchChecklistFootbathControlData(fromDate || undefined, toDate || undefined)
          // Filter by shift, monitor name, or filter names
          let filtered = records || []
          if (orden) {
            filtered = filtered.filter((r: any) => 
              r.date_string?.includes(orden) || 
              r.monitor_name?.toLowerCase().includes(orden.toLowerCase()) ||
              r.shift?.toLowerCase().includes(orden.toLowerCase()) ||
              r.measurements?.some((m: any) => m.filter?.toLowerCase().includes(orden.toLowerCase()))
            )
          }
          data = filtered
        } catch (err) {
          // If fetch fails, treat as no data
          data = []
        }
      } else if (selected === 'Check weighing and sealing of packaged products') {
        // Use the special fetch function for weighing sealing
        try {
          const records = await fetchChecklistWeighingSealingData(fromDate || undefined, toDate || undefined)
          // Filter by shift, monitor name, brand, product, or bag codes
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
            filtered = filtered.filter((r: any) => 
              r.date_string?.includes(orden) || 
              r.monitor_name?.toLowerCase().includes(orden.toLowerCase()) ||
              r.shift?.toLowerCase().includes(orden.toLowerCase()) ||
              r.process_room?.toLowerCase().includes(orden.toLowerCase()) ||
              r.bag_entries?.some((e: any) => e.bagCode?.toLowerCase().includes(orden.toLowerCase()))
            )
          }
          data = filtered
        } catch (err) {
          // If fetch fails, treat as no data
          data = []
        }
      } else if (selected === 'Cleanliness Control Packing') {
        // Use the special fetch function for cleanliness control packing
        try {
          const records = await fetchChecklistCleanlinessControlPackingData(fromDate || undefined, toDate || undefined)
          // Filter by monitor name or part names
          let filtered = records || []
          if (orden) {
            filtered = filtered.filter((r: any) => 
              r.date_string?.includes(orden) || 
              r.monitor_name?.toLowerCase().includes(orden.toLowerCase()) ||
              r.areas?.some((area: any) => 
                area.areaName?.toLowerCase().includes(orden.toLowerCase()) ||
                area.parts?.some((part: any) => part.partName?.toLowerCase().includes(orden.toLowerCase()))
              ) ||
              r.bioluminescence_results?.some((result: any) => result.partName?.toLowerCase().includes(orden.toLowerCase()))
            )
          }
          data = filtered
        } catch (err) {
          // If fetch fails, treat as no data
          data = []
        }
      } else if (selected === 'Metal Detector (PCC #1)') {
        // Use the special fetch function for metal detector
        try {
          const records = await fetchChecklistMetalDetectorData(fromDate || undefined, toDate || undefined)
          // Filter by orden, brand, product, or monitor name
          let filtered = records || []
          if (orden) {
            filtered = filtered.filter((r: any) => 
              r.orden?.toLowerCase().includes(orden.toLowerCase()) ||
              r.date_string?.includes(orden) ||
              r.monitor_name?.toLowerCase().includes(orden.toLowerCase())
            )
          }
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
          data = filtered
        } catch (err) {
          // If fetch fails, treat as no data
          data = []
        }
      } else if (selected === 'Process area staff glasses and auditory protector control') {
        // Use the special fetch function for staff glasses auditory
        try {
          const records = await fetchChecklistStaffGlassesAuditoryData(fromDate || undefined, toDate || undefined)
          // Filter by monitor name or person names
          let filtered = records || []
          if (orden) {
            filtered = filtered.filter((r: any) => 
              r.date_string?.includes(orden) || 
              r.monitor_name?.toLowerCase().includes(orden.toLowerCase()) ||
              r.persons?.some((p: any) => p.name?.toLowerCase().includes(orden.toLowerCase()))
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
          : 'checklist_producto_mix'
        
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('orden_fabricacion', orden)
        
        if (error || !data || data.length === 0) {
          showToast('No se encontraron datos para exportar', 'error')
          return
        }
        
        // Expand pallets into separate rows - one row per pallet
        const allRows: any[][] = []
        const allFieldNames = new Set<string>()
        
        // First pass: collect all possible field names from all pallets
        data.forEach((record: any) => {
          if (Array.isArray(record.pallets)) {
            record.pallets.forEach((pallet: any) => {
              if (pallet.values && typeof pallet.values === 'object') {
                Object.keys(pallet.values).forEach(key => allFieldNames.add(key))
              }
            })
          }
        })
        
        // Build headers: metadata columns + pallet hour + all pallet fields
        const headers = [
          'id',
          'fecha',
          'date_string',
          'orden_fabricacion',
          'jefe_linea',
          'control_calidad',
          'cliente',
          'producto',
          'sku',
          'pallet_id',
          'hora',
          ...Array.from(allFieldNames).sort()
        ]
        allRows.push(headers)
        
        // Second pass: create one row per pallet
        data.forEach((record: any) => {
          const pallets = Array.isArray(record.pallets) ? record.pallets : []
          
          if (pallets.length === 0) {
            // No pallets - add one row with metadata only
            const row = [
              record.id || '',
              record.fecha || record.date_string || '',
              record.date_string || '',
              record.orden_fabricacion || '',
              record.jefe_linea || '',
              record.control_calidad || '',
              record.cliente || '',
              record.producto || '',
              record.sku || '',
              '', // pallet_id
              '', // hora
              ...Array.from(allFieldNames).map(() => '') // Empty values for all pallet fields
            ]
            allRows.push(row)
          } else {
            // One row per pallet
            pallets.forEach((pallet: any) => {
              const palletId = pallet.id || ''
              const palletHour = pallet.hour || ''
              const palletValues = pallet.values || {}
              
              // Build row: metadata + pallet hour + pallet values
              const row = [
                record.id || '',
                record.fecha || record.date_string || '',
                record.date_string || '',
                record.orden_fabricacion || '',
                record.jefe_linea || '',
                record.control_calidad || '',
                record.cliente || '',
                record.producto || '',
                record.sku || '',
                palletId,
                palletHour,
                ...Array.from(allFieldNames).map(fieldName => palletValues[fieldName] || '')
              ]
              allRows.push(row)
            })
          }
        })
        
        const fileName = selected === 'Checklist Monoproducto' 
          ? `checklist_monoproducto_${orden}`
          : `checklist_mix_${orden}`
        
        exportToFile(allRows, fileName, format, 'Checklist')
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
      } else if (selected === 'Footbath Control') {
        // Export Footbath Control data
        const record = selectedRecord
        
        // Define headers
        const headers = [
          'Date',
          'Shift',
          'Monitor Name',
          'Hour',
          'Filter',
          'PPM Value',
          'Corrective Action'
        ]
        
        // Create rows - one per measurement
        const rows: any[][] = [headers]
        
        if (record.measurements && record.measurements.length > 0) {
          record.measurements.forEach((measurement: any) => {
            const row = [
              record.date_string || '',
              record.shift || '',
              record.monitor_name || '',
              measurement.hour || '',
              measurement.filter || '',
              measurement.measurePpmValue || '',
              measurement.correctiveAction || ''
            ]
            rows.push(row)
          })
        } else {
          // If no measurements, still add one row with basic info
          rows.push([
            record.date_string || '',
            record.shift || '',
            record.monitor_name || '',
            '', '', '', ''
          ])
        }
        
        const fileName = `footbath_control_${record.date_string || 'data'}`
        exportToFile(rows, fileName, format, 'Footbath Control')
        showToast(`Archivo ${format.toUpperCase()} descargado exitosamente`, 'success')
      } else if (selected === 'Check weighing and sealing of packaged products') {
        // Export Weighing Sealing data
        const record = selectedRecord
        
        // Define headers
        const headers = [
          'Date',
          'Shift',
          'Process Room',
          'Brand',
          'Product',
          'Monitor Name',
          'Bag Entry #',
          'Time',
          'Bag Code',
          'Weight 1', 'Weight 2', 'Weight 3', 'Weight 4', 'Weight 5',
          'Weight 6', 'Weight 7', 'Weight 8', 'Weight 9', 'Weight 10',
          'Sealed 1', 'Sealed 2', 'Sealed 3', 'Sealed 4', 'Sealed 5',
          'Sealed 6', 'Sealed 7', 'Sealed 8', 'Sealed 9', 'Sealed 10',
          'Other Codification',
          'Declaration of Origin',
          'Comments / Observaciones'
        ]
        
        // Create rows - one per bag entry
        const rows: any[][] = [headers]
        
        if (record.bag_entries && record.bag_entries.length > 0) {
          record.bag_entries.forEach((entry: any, index: number) => {
            const row = [
              record.date_string || '',
              record.shift || '',
              record.process_room || '',
              record.brand || '',
              record.product || '',
              record.monitor_name || '',
              index + 1,
              entry.time || '',
              entry.bagCode || '',
              ...(entry.weights || Array(10).fill('')),
              ...(entry.sealed || Array(10).fill('')),
              entry.otherCodification || '',
              entry.declarationOfOrigin || '',
              // Add comments only to the first row (to avoid duplication)
              index === 0 ? (record.comments || '') : ''
            ]
            rows.push(row)
          })
        } else {
          // If no bag entries, still add one row with basic info
          rows.push([
            record.date_string || '',
            record.shift || '',
            record.process_room || '',
            record.brand || '',
            record.product || '',
            record.monitor_name || '',
            '', '', '', ...Array(20).fill(''), '', '',
            record.comments || '' // comments
          ])
        }
        
        const fileName = `weighing_sealing_${record.date_string || 'data'}`
        exportToFile(rows, fileName, format, 'Weighing Sealing')
        showToast(`Archivo ${format.toUpperCase()} descargado exitosamente`, 'success')
      } else if (selected === 'Cleanliness Control Packing') {
        // Export Cleanliness Control Packing data
        const record = selectedRecord
        
        // Define headers
        const headers = [
          'Date',
          'Monitor Name',
          'Area Name',
          'Part Name',
          'Comply',
          'Observation',
          'Corrective Action',
          'Corrective Action Status',
          'Bioluminescence Part',
          'RLU',
          'Retest RLU'
        ]
        
        // Create rows - one per part across all areas
        const rows: any[][] = [headers]
        
        if (record.areas && record.areas.length > 0) {
          record.areas.forEach((area: any) => {
            area.parts.forEach((part: any) => {
              const row = [
                record.date_string || '',
                record.monitor_name || '',
                area.areaName || '',
                part.partName || '',
                part.comply === true ? 'Comply' : part.comply === false ? 'Not Comply' : '',
                part.observation || '',
                part.correctiveAction || '',
                part.correctiveActionComply === true ? 'Comply' : part.correctiveActionComply === false ? 'Not Comply' : '',
                '', // Bioluminescence part will be added separately
                '', // RLU
                '' // Retest RLU
              ]
              rows.push(row)
            })
          })
        }
        
        // Add bioluminescence results
        if (record.bioluminescence_results && record.bioluminescence_results.length > 0) {
          record.bioluminescence_results.forEach((result: any) => {
            const row = [
              record.date_string || '',
              record.monitor_name || '',
              '', // Area Name
              '', // Part Name
              '', // Comply
              '', // Observation
              '', // Corrective Action
              '', // Corrective Action Status
              result.partName || '',
              result.rlu || '',
              result.retestRlu || ''
            ]
            rows.push(row)
          })
        }
        
        // If no data, still add one row with basic info
        if (rows.length === 1) {
          rows.push([
            record.date_string || '',
            record.monitor_name || '',
            '', '', '', '', '', '', '', '', ''
          ])
        }
        
        const fileName = `cleanliness_control_packing_${record.date_string || 'data'}`
        exportToFile(rows, fileName, format, 'Cleanliness Control Packing')
        showToast(`Archivo ${format.toUpperCase()} descargado exitosamente`, 'success')
      } else if (selected === 'Metal Detector (PCC #1)') {
        // Export Metal Detector data
        const record = selectedRecord
        
        // Define headers
        const headers = [
          'Date',
          'Orden',
          'Brand',
          'Product',
          'Monitor Name',
          'Reading #',
          'Hour',
          'BF',
          'B.NF',
          'B.S.S',
          'Sensitivity',
          'Noise Alarm',
          'Rejecting Arm',
          'Beacon Light',
          'Observation',
          'Corrective Actions'
        ]
        
        // Create rows - one per reading
        const rows: any[][] = [headers]
        
        if (record.readings && record.readings.length > 0) {
          record.readings.forEach((reading: any, index: number) => {
            const row = [
              record.date_string || '',
              record.orden || '',
              record.brand || '',
              record.product || '',
              record.monitor_name || '',
              index + 1,
              reading.hour || '',
              Array.isArray(reading.bf) ? reading.bf.join(', ') : (reading.bf || ''),
              Array.isArray(reading.bnf) ? reading.bnf.join(', ') : (reading.bnf || ''),
              Array.isArray(reading.bss) ? reading.bss.join(', ') : (reading.bss || ''),
              reading.sensitivity || '',
              reading.noiseAlarm || '',
              reading.rejectingArm || '',
              reading.beaconLight || '',
              reading.observation || '',
              reading.correctiveActions || ''
            ]
            rows.push(row)
          })
        } else {
          // If no readings, still add one row with basic info
          rows.push([
            record.date_string || '',
            record.orden || '',
            record.brand || '',
            record.product || '',
            record.monitor_name || '',
            '', '', '', '', '', '', '', '', '', '', ''
          ])
        }
        
        const fileName = `metal_detector_${record.date_string || 'data'}_${record.orden || ''}`
        exportToFile(rows, fileName, format, 'Metal Detector')
        showToast(`Archivo ${format.toUpperCase()} descargado exitosamente`, 'success')
      } else if (selected === 'Process area staff glasses and auditory protector control') {
        // Export Staff Glasses Auditory data
        const record = selectedRecord
        
        // Define headers
        const headers = [
          'Date',
          'Monitor Name',
          'No Findings',
          'Person Name',
          'Area',
          'Glass Type',
          'Condition In',
          'Observation In',
          'Condition Out',
          'Observation Out'
        ]
        
        // Create rows - one per person
        const rows: any[][] = [headers]
        
        if (record.no_findings) {
          // If no findings, just add one row with basic info
          rows.push([
            record.date_string || '',
            record.monitor_name || '',
            'Yes',
            '', '', '', '', '', '', ''
          ])
        } else if (record.persons && record.persons.length > 0) {
          record.persons.forEach((person: any) => {
            const row = [
              record.date_string || '',
              record.monitor_name || '',
              'No',
              person.name || '',
              person.area || '',
              person.glassType || '',
              person.conditionIn || '',
              person.observationIn || '',
              person.conditionOut || '',
              person.observationOut || ''
            ]
            rows.push(row)
          })
        } else {
          // If no persons data, still add one row with basic info
          rows.push([
            record.date_string || '',
            record.monitor_name || '',
            'No',
            '', '', '', '', '', '', ''
          ])
        }
        
        const fileName = `staff_glasses_auditory_${record.date_string || 'data'}`
        exportToFile(rows, fileName, format, 'Staff Glasses Auditory')
        showToast(`Archivo ${format.toUpperCase()} descargado exitosamente`, 'success')
      }
      
      setShowExportMenu(false)
    } catch (err: any) {
      console.error('Error exportando datos:', err)
      showToast(`Error al exportar ${format.toUpperCase()}`, 'error')
    }
  }

  // Export all filtered results to Excel or CSV
  // Uses the same formatting logic as handleExportData but for all records
  const handleExportAllResults = async (format: 'excel' | 'csv') => {
    if (results.length === 0) {
      showToast('No hay datos para exportar', 'error')
      return
    }

    try {
      setShowExcelExportMenu(false)
      
      // Flatten all results into a single array of rows
      const allRows: any[][] = []
      let readingCounter = 1 // Global counter for reading numbers across all records
      
      // Pre-process: Collect all field names for Monoproducto/Mix Producto before processing
      let monoproductoFieldNames: string[] = []
      if (selected === 'Checklist Monoproducto' || selected === 'Checklist Mix Producto') {
        const allFieldNames = new Set<string>()
        results.forEach((r: any) => {
          if (Array.isArray(r.pallets)) {
            r.pallets.forEach((pallet: any) => {
              if (pallet.values && typeof pallet.values === 'object') {
                Object.keys(pallet.values).forEach(key => allFieldNames.add(key))
              }
            })
          }
        })
        monoproductoFieldNames = Array.from(allFieldNames).sort()
        
        // Build headers: metadata columns + pallet hour + all pallet fields
        const headers = [
          'id',
          'fecha',
          'date_string',
          'orden_fabricacion',
          'jefe_linea',
          'control_calidad',
          'cliente',
          'producto',
          'sku',
          'pallet_id',
          'hora',
          ...monoproductoFieldNames
        ]
        allRows.push(headers)
      }
      
      // Process each result based on checklist type - using same logic as handleExportData
      for (const record of results) {
        if (selected === 'Checklist Monoproducto' || selected === 'Checklist Mix Producto') {
          // Expand pallets into separate rows - one row per pallet
          const pallets = Array.isArray(record.pallets) ? record.pallets : []
          
          // Create one row per pallet
          if (pallets.length === 0) {
            // No pallets - add one row with metadata only
            const row = [
              record.id || '',
              record.fecha || record.date_string || '',
              record.date_string || '',
              record.orden_fabricacion || '',
              record.jefe_linea || '',
              record.control_calidad || '',
              record.cliente || '',
              record.producto || '',
              record.sku || '',
              '', // pallet_id
              '', // hora
              ...monoproductoFieldNames.map(() => '') // Empty values for all pallet fields
            ]
            allRows.push(row)
          } else {
            // One row per pallet
            pallets.forEach((pallet: any) => {
              const palletId = pallet.id || ''
              const palletHour = pallet.hour || ''
              const palletValues = pallet.values || {}
              
              // Build row: metadata + pallet hour + pallet values
              const row = [
                record.id || '',
                record.fecha || record.date_string || '',
                record.date_string || '',
                record.orden_fabricacion || '',
                record.jefe_linea || '',
                record.control_calidad || '',
                record.cliente || '',
                record.producto || '',
                record.sku || '',
                palletId,
                palletHour,
                ...monoproductoFieldNames.map(fieldName => palletValues[fieldName] || '')
              ]
              allRows.push(row)
            })
          }
        } else if (selected === 'Process Environmental Temperature Control') {
          // Export Temp Checklist data - one row per reading
          if (allRows.length === 0) {
            const headers = [
              'Date', 'Shift', 'Monitor Name', 'Checker Name', 'Verification Date',
              'Reading Time', 'Digital Temp', 'Wall Temp', 'Average Temp', 'Status', 'Observation'
            ]
            allRows.push(headers)
          }
          
          if (record.readings && record.readings.length > 0) {
            record.readings.forEach((reading: any) => {
              const row = [
                record.date_string || record.fecha || '',
                record.shift || '',
                record.monitor_name || '',
                record.checker_name || '',
                record.verification_date || '',
                reading.time || '',
                reading.digitalThermometer || '',
                reading.wallThermometer || '',
                reading.averageTemp || '',
                reading.status || '',
                reading.observation || ''
              ]
              allRows.push(row)
            })
          } else {
            // No readings, still add one row with basic info
            allRows.push([
              record.date_string || record.fecha || '',
              record.shift || '',
              record.monitor_name || '',
              record.checker_name || '',
              record.verification_date || '',
              '', '', '', '', '', ''
            ])
          }
        } else if (selected === 'Staff Good Practices Control') {
          // Export Staff Practices - one row per staff member
          if (allRows.length === 0) {
            const headers = [
              'Date', 'Shift', 'Monitor Name', 'Name', 'Area',
              'Staff Appearance', 'Complete Uniform', 'Accessories Absence',
              'Work Tools Usage', 'Cut Clean Nails', 'No Makeup',
              'Staff Behavior', 'Staff Health'
            ]
            allRows.push(headers)
          }
          
          if (record.staff_members && record.staff_members.length > 0) {
            record.staff_members.forEach((member: any) => {
              allRows.push([
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
              ])
            })
          } else {
            allRows.push([
              record.date_string || record.fecha || '',
              record.shift || '',
              record.monitor_name || '',
              '', '', '', '', '', '', '', '', ''
            ])
          }
        } else if (selected === 'Metal Detector (PCC #1)') {
          // Export Metal Detector - one row per reading (same format as single record export)
          if (allRows.length === 0) {
            const headers = [
              'Date',
              'Orden',
              'Brand',
              'Product',
              'Monitor Name',
              'Reading #',
              'Hour',
              'BF',
              'B.NF',
              'B.S.S',
              'Sensitivity',
              'Noise Alarm',
              'Rejecting Arm',
              'Observation',
              'Corrective Actions'
            ]
            allRows.push(headers)
          }
          
          if (record.readings && record.readings.length > 0) {
            record.readings.forEach((reading: any) => {
              const row = [
                record.date_string || '',
                record.orden || '',
                record.brand || '',
                record.product || '',
                record.monitor_name || '',
                readingCounter++, // Sequential reading number across all records
                reading.hour || '',
                Array.isArray(reading.bf) ? reading.bf.join(', ') : (reading.bf || ''),
                Array.isArray(reading.bnf) ? reading.bnf.join(', ') : (reading.bnf || ''),
                Array.isArray(reading.bss) ? reading.bss.join(', ') : (reading.bss || ''),
                reading.sensitivity || '',
                reading.noiseAlarm || '',
                reading.rejectingArm || '',
                reading.observation || '',
                reading.correctiveActions || ''
              ]
              allRows.push(row)
            })
          } else {
            // If no readings, still add one row with basic info
            allRows.push([
              record.date_string || '',
              record.orden || '',
              record.brand || '',
              record.product || '',
              record.monitor_name || '',
              readingCounter++,
              '', '', '', '', '', '', '', ''
            ])
          }
        } else if (selected === 'Foreign Material Findings Record') {
          // Export Foreign Material Findings Record
          if (allRows.length === 0) {
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
            allRows.push(headers)
          }
          
          if (record.no_findings) {
            // No findings - add one row
            allRows.push([
              record.date_string || '',
              record.brand || '',
              record.product || '',
              record.shift || '',
              record.monitor_name || '',
              'N/A',
              '', '', '', '', '', '', '', ''
            ])
          } else if (record.findings && record.findings.length > 0) {
            record.findings.forEach((finding: any, index: number) => {
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
              allRows.push(row)
            })
          }
        } else if (selected === 'Pre-Operational Review Processing Areas') {
          // Export Pre-Operational Review
          if (allRows.length === 0) {
            const headers = [
              'Date',
              'Hour',
              'Brand',
              'Product',
              'Monitor Name',
              'Item Name',
              'Comply',
              'Observation',
              'Corrective Action',
              'Corrective Action Status',
              'Corrective Action Observation'
            ]
            allRows.push(headers)
          }
          
          if (record.items && record.items.length > 0) {
            record.items.forEach((item: any) => {
              const row = [
                record.date_string || '',
                record.hour_string || '',
                record.brand || '',
                record.product || '',
                record.monitor_name || '',
                item.name || '',
                item.comply === true ? 'Comply' : item.comply === false ? 'Not Comply' : 'N/A',
                item.observation || '',
                item.correctiveAction || '',
                item.correctiveActionComply === true ? 'Comply' : item.correctiveActionComply === false ? 'Not Comply' : 'N/A',
                item.correctiveActionObservation || ''
              ]
              allRows.push(row)
            })
          } else {
            allRows.push([
              record.date_string || '',
              record.hour_string || '',
              record.brand || '',
              record.product || '',
              record.monitor_name || '',
              '', '', '', '', '', ''
            ])
          }
        } else if (selected === 'Internal control of materials used in production areas') {
          // Export Materials Control
          if (allRows.length === 0) {
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
            allRows.push(headers)
          }
          
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
              allRows.push(row)
            })
          } else {
            allRows.push([
              record.date_string || '',
              record.productive_area || '',
              record.line_manager_name || '',
              record.monitor_name || '',
              '', '', '', '', '', '', '', ''
            ])
          }
        } else if (selected === 'Footbath Control') {
          // Export Footbath Control
          if (allRows.length === 0) {
            const headers = [
              'Date',
              'Shift',
              'Monitor Name',
              'Hour',
              'Filter',
              'PPM Value',
              'Corrective Action'
            ]
            allRows.push(headers)
          }
          
          if (record.measurements && record.measurements.length > 0) {
            record.measurements.forEach((measurement: any) => {
              const row = [
                record.date_string || '',
                record.shift || '',
                record.monitor_name || '',
                measurement.hour || '',
                measurement.filter || '',
                measurement.measurePpmValue || '',
                measurement.correctiveAction || ''
              ]
              allRows.push(row)
            })
          } else {
            allRows.push([
              record.date_string || '',
              record.shift || '',
              record.monitor_name || '',
              '', '', '', ''
            ])
          }
        } else if (selected === 'Check weighing and sealing of packaged products') {
          // Export Weighing Sealing
          if (allRows.length === 0) {
            const headers = [
              'Date',
              'Shift',
              'Process Room',
              'Brand',
              'Product',
              'Monitor Name',
              'Bag Entry #',
              'Time',
              'Bag Code',
              'Weight 1', 'Weight 2', 'Weight 3', 'Weight 4', 'Weight 5',
              'Weight 6', 'Weight 7', 'Weight 8', 'Weight 9', 'Weight 10',
              'Sealed 1', 'Sealed 2', 'Sealed 3', 'Sealed 4', 'Sealed 5',
              'Sealed 6', 'Sealed 7', 'Sealed 8', 'Sealed 9', 'Sealed 10',
              'Other Codification',
              'Declaration of Origin',
              'Comments / Observaciones'
            ]
            allRows.push(headers)
          }
          
          if (record.bag_entries && record.bag_entries.length > 0) {
            record.bag_entries.forEach((entry: any, index: number) => {
              const row = [
                record.date_string || '',
                record.shift || '',
                record.process_room || '',
                record.brand || '',
                record.product || '',
                record.monitor_name || '',
                index + 1,
                entry.time || '',
                entry.bagCode || '',
                ...(entry.weights || Array(10).fill('')),
                ...(entry.sealed || Array(10).fill('')),
                entry.otherCodification || '',
                entry.declarationOfOrigin || '',
                index === 0 ? (record.comments || '') : '' // comments only on first row
              ]
              allRows.push(row)
            })
          } else {
            allRows.push([
              record.date_string || '',
              record.shift || '',
              record.process_room || '',
              record.brand || '',
              record.product || '',
              record.monitor_name || '',
              '', '', '', ...Array(20).fill(''), '', '',
              record.comments || ''
            ])
          }
        } else if (selected === 'Cleanliness Control Packing') {
          // Export Cleanliness Control Packing
          if (allRows.length === 0) {
            const headers = [
              'Date',
              'Monitor Name',
              'Area Name',
              'Part Name',
              'Comply',
              'Observation',
              'Corrective Action',
              'Corrective Action Status',
              'Bioluminescence Part',
              'RLU',
              'Retest RLU'
            ]
            allRows.push(headers)
          }
          
          if (record.areas && record.areas.length > 0) {
            record.areas.forEach((area: any) => {
              area.parts.forEach((part: any) => {
                const row = [
                  record.date_string || '',
                  record.monitor_name || '',
                  area.areaName || '',
                  part.partName || '',
                  part.comply === true ? 'Comply' : part.comply === false ? 'Not Comply' : '',
                  part.observation || '',
                  part.correctiveAction || '',
                  part.correctiveActionComply === true ? 'Comply' : part.correctiveActionComply === false ? 'Not Comply' : '',
                  '', // Bioluminescence part
                  '', // RLU
                  '' // Retest RLU
                ]
                allRows.push(row)
              })
            })
          }
          
          // Add bioluminescence results
          if (record.bioluminescence_results && record.bioluminescence_results.length > 0) {
            record.bioluminescence_results.forEach((result: any) => {
              const row = [
                record.date_string || '',
                record.monitor_name || '',
                '', '', '', '', '', '', '',
                result.partName || '',
                result.rlu || '',
                result.retestRlu || ''
              ]
              allRows.push(row)
            })
          }
          
          if (allRows.length === 1) {
            // No data, add empty row
            allRows.push([
              record.date_string || '',
              record.monitor_name || '',
              '', '', '', '', '', '', '', '', ''
            ])
          }
        } else if (selected === 'Process area staff glasses and auditory protector control') {
          // Export Staff Glasses Auditory
          if (allRows.length === 0) {
            const headers = [
              'Date',
              'Monitor Name',
              'No Findings',
              'Person Name',
              'Area',
              'Glass Type',
              'Condition In',
              'Observation In',
              'Condition Out',
              'Observation Out'
            ]
            allRows.push(headers)
          }
          
          if (record.no_findings) {
            allRows.push([
              record.date_string || '',
              record.monitor_name || '',
              'Yes',
              '', '', '', '', '', '', ''
            ])
          } else if (record.persons && record.persons.length > 0) {
            record.persons.forEach((person: any) => {
              const row = [
                record.date_string || '',
                record.monitor_name || '',
                'No',
                person.name || '',
                person.area || '',
                person.glassType || '',
                person.conditionIn || '',
                person.observationIn || '',
                person.conditionOut || '',
                person.observationOut || ''
              ]
              allRows.push(row)
            })
          } else {
            allRows.push([
              record.date_string || '',
              record.monitor_name || '',
              'No',
              '', '', '', '', '', '', ''
            ])
          }
        } else {
          // Fallback for any other checklist types - export basic fields
          if (allRows.length === 0) {
            const headers = Object.keys(results[0] || {}).filter(key => 
              typeof results[0][key] !== 'object' || results[0][key] === null
            )
            allRows.push(headers)
          }
          
          const row = Object.keys(record)
            .filter(key => typeof record[key] !== 'object' || record[key] === null)
            .map(key => {
              const value = record[key]
              if (value === null || value === undefined) return ''
              if (typeof value === 'object') return JSON.stringify(value)
              return value
            })
          allRows.push(row)
        }
      }

      if (allRows.length === 0) {
        showToast('No hay datos para exportar', 'error')
        return
      }

      const checklistName = selected.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
      const dateStr = new Date().toISOString().split('T')[0]
      const fileName = `historial_${checklistName}_${dateStr}`

      exportToFile(allRows, fileName, format, selected)
      showToast(`${results.length} registro(s) exportado(s) exitosamente`, 'success')
    } catch (err: any) {
      console.error('Error exportando datos:', err)
      showToast(`Error al exportar ${format.toUpperCase()}`, 'error')
    }
  }

  // Export all PDFs in a zip file
  const handleExportAllPdfs = async () => {
    if (results.length === 0) {
      showToast('No hay registros para exportar', 'error')
      return
    }

    setShowPdfConfirmModal(false)
    setExportingPdfs(true)

    try {
      const zip = new JSZip()
      let pdfCount = 0
      const errors: string[] = []
      const addedFiles = new Set<string>() // Track files we've added to avoid duplicates

      // First, get file list from storage if needed
      let storageFileList: any[] = []
      if (selected === 'Checklist Monoproducto' || selected === 'Checklist Mix Producto') {
        const { data: fileList } = await supabase.storage
          .from('checklistcalidad')
          .list('', { limit: 1000 })
        storageFileList = fileList || []
      }

      // Fetch PDF URLs for all results
      for (const record of results) {
        let pdfUrl: string | null = null
        let pdfFileName: string = ''

        try {
          // Check if record has pdf_url directly (for newer checklists)
          if (record.pdf_url) {
            pdfUrl = record.pdf_url
            // Extract filename from URL
            try {
              if (pdfUrl) {
                const urlObj = new URL(pdfUrl)
                const pathParts = urlObj.pathname.split('/')
                pdfFileName = pathParts[pathParts.length - 1] || ''
              }
              
              // If filename is empty or doesn't end with .pdf, generate one
              if (!pdfFileName || !pdfFileName.endsWith('.pdf')) {
                const dateStr = record.date_string || record.fecha || ''
                const orden = record.orden || record.orden_fabricacion || ''
                pdfFileName = `${selected.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}_${orden || 'record'}.pdf`
              }
            } catch {
              // If URL parsing fails, generate filename
              const dateStr = record.date_string || record.fecha || ''
              const orden = record.orden || record.orden_fabricacion || ''
              pdfFileName = `${selected.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}_${orden || 'record'}.pdf`
            }
          } else {
            // For checklists that store PDFs in storage
            if (selected === 'Checklist Monoproducto' || selected === 'Checklist Mix Producto') {
              const orden = record.orden_fabricacion || record.orden
              if (orden && storageFileList.length > 0) {
                const pdfFile = storageFileList.find((file) =>
                  file.name.endsWith(`-${orden}.pdf`)
                )
                if (pdfFile) {
                  const { data: { publicUrl } } = supabase.storage
                    .from('checklistcalidad')
                    .getPublicUrl(pdfFile.name)
                  pdfUrl = publicUrl
                  pdfFileName = pdfFile.name // Use the exact name from Supabase
                }
              }
            } else {
              // For other checklists, try to construct filename from record data
              const dateStr = record.date_string || record.fecha || ''
              const orden = record.orden || record.orden_fabricacion || ''
              const shift = record.shift || ''
              
              // Try to find in storage with a pattern
              if (storageFileList.length > 0) {
                const possibleFile = storageFileList.find((file) => {
                  const name = file.name.toLowerCase()
                  return name.includes(orden?.toLowerCase() || '') ||
                         name.includes(dateStr?.toLowerCase() || '') ||
                         name.includes(shift?.toLowerCase() || '')
                })
                if (possibleFile && possibleFile.name.endsWith('.pdf')) {
                  const { data: { publicUrl } } = supabase.storage
                    .from('checklistcalidad')
                    .getPublicUrl(possibleFile.name)
                  pdfUrl = publicUrl
                  pdfFileName = possibleFile.name
                }
              }
              
              // If still no file, generate a name but skip (no PDF available)
              if (!pdfUrl) {
                errors.push(`No PDF encontrado para registro del ${dateStr || 'fecha desconocida'}`)
                continue
              }
            }
          }

          if (pdfUrl) {
            // Fetch the PDF
            const response = await fetch(pdfUrl)
            if (response.ok) {
              const blob = await response.blob()
              
              // Ensure filename is unique in zip (add index if duplicate)
              let finalFileName = pdfFileName
              let counter = 1
              
              while (addedFiles.has(finalFileName)) {
                const nameParts = pdfFileName.split('.')
                const ext = nameParts.pop()
                const baseName = nameParts.join('.')
                finalFileName = `${baseName}_${counter}.${ext}`
                counter++
              }
              
              zip.file(finalFileName, blob)
              addedFiles.add(finalFileName)
              pdfCount++
            } else {
              errors.push(`Error al descargar PDF: ${pdfFileName || 'archivo desconocido'}`)
            }
          }
        } catch (err) {
          console.error('Error fetching PDF for record:', err)
          errors.push(`Error procesando registro: ${record.id || record.orden_fabricacion || 'desconocido'}`)
          // Continue with other PDFs
        }
      }

      if (pdfCount === 0) {
        showToast('No se encontraron archivos PDF para exportar', 'error')
        setExportingPdfs(false)
        return
      }

      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      
      // Create download link
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      
      // Create filename: date + checklist name
      const dateStr = new Date().toISOString().split('T')[0]
      const checklistName = selected.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
      link.download = `${dateStr}_${checklistName}.zip`
      
      link.click()
      URL.revokeObjectURL(url)
      
      if (errors.length > 0) {
        showToast(`${pdfCount} PDF(s) exportado(s), ${errors.length} error(es)`, 'info')
      } else {
        showToast(`${pdfCount} archivo(s) PDF exportado(s) exitosamente`, 'success')
      }
    } catch (err: any) {
      console.error('Error exportando PDFs:', err)
      showToast('Error al exportar PDFs', 'error')
    } finally {
      setExportingPdfs(false)
    }
  }

  // Close export menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.export-menu-container') && !target.closest('.excel-export-menu-container')) {
        setShowExportMenu(false)
        setShowExcelExportMenu(false)
      }
    }

    if (showExportMenu || showExcelExportMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportMenu, showExcelExportMenu])

  // Fetch PDF and Excel URLs when a record is selected
  useEffect(() => {
    if (!showModal || !selectedRecord) return

    setLoadingFiles(true)
    setPdfUrl(null)
    setExcelUrl(null)

    ;(async () => {
      try {
        // Determine storage bucket based on checklist type
        let storageBucket = 'checklistcalidad'
        if (selected === 'Checklist Mix Producto') {
          storageBucket = 'checklist-producto-mix'
        }

        // For checklists that store pdf_url directly in the record, use it if available
        const checklistsWithPdfUrl = [
          'Process Environmental Temperature Control',
          'Staff Good Practices Control',
          'Pre-Operational Review Processing Areas',
          'Internal control of materials used in production areas',
          'Footbath Control',
          'Check weighing and sealing of packaged products',
          'Cleanliness Control Packing',
          'Metal Detector (PCC #1)',
          'Process area staff glasses and auditory protector control',
          'Foreign Material Findings Record',
          'Checklist Mix Producto',
          'Checklist Monoproducto'
        ]

        if (checklistsWithPdfUrl.includes(selected) && selectedRecord.pdf_url) {
          // Use pdf_url directly from record
          setPdfUrl(selectedRecord.pdf_url)
          setLoadingFiles(false)
          return
        }

        // If pdf_url is not available, search in storage bucket
        const orden = selectedRecord.orden_fabricacion || selectedRecord.orden

        if (!orden) {
          setLoadingFiles(false)
          return
        }

        // Search for PDF files in the appropriate storage bucket
        const { data: fileList, error: listError } = await supabase.storage
          .from(storageBucket)
          .list('', { limit: 1000 })

        if (listError) {
          console.error('Error listing files from storage:', listError)
          setLoadingFiles(false)
          return
        }

        if (!fileList || fileList.length === 0) {
          setLoadingFiles(false)
          return
        }

        // Search for PDF files
        const pdfFile = fileList.find((file) =>
          file.name.endsWith(`-${orden}.pdf`) || file.name.includes(orden)
        )
        if (pdfFile) {
          const { data: { publicUrl } } = supabase.storage
            .from(storageBucket)
            .getPublicUrl(pdfFile.name)
          setPdfUrl(publicUrl)
        }

        // Search for Excel files
        const excelFile = fileList.find((file) =>
          file.name.toLowerCase().includes(orden.toLowerCase()) &&
          file.name.endsWith('.xlsx')
        )
        if (excelFile) {
          const { data: { publicUrl } } = supabase.storage
            .from(storageBucket)
            .getPublicUrl(excelFile.name)
          setExcelUrl(publicUrl)
        }
      } catch (error: any) {
        console.error('Error al buscar archivos:', error)
      } finally {
        setLoadingFiles(false)
      }
    })()
  }, [showModal, selectedRecord, selected])

  const relevantFields = selected ? getRelevantFields(selected) : { orden: false, sku: false, producto: false, marca: false }
  const selectedChecklistMeta = selected ? checklistMetadata[selected] : null
  const ChecklistIcon = selectedChecklistMeta?.icon

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--page-bg)' }}>
      <div className="max-w-[1150px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/area/calidad"
            className="inline-flex items-center transition-colors mb-4"
            style={{ color: 'var(--link-color)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--link-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--link-color)' }}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>Volver</span>
          </Link>
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--title-text)' }}>
                Área de Calidad
              </h1>
              <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
                Historial de registros y exportación de datos.
              </p>
            </div>
            
            {/* Header buttons */}
            <div className="flex gap-2">
              <Link
                href="/area/calidad/historial"
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--icon-primary)',
                  color: '#FFFFFF'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                }}
              >
                <History className="h-4 w-4 mr-2" />
                Historial
              </Link>
              <div
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  color: 'var(--title-text)',
                  cursor: 'not-allowed',
                  opacity: 0.6
                }}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard de Calidad
              </div>
            </div>
          </div>
        </div>

        {/* Historial Card */}
        <div 
          className="rounded-lg p-6"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: '0 8px 18px var(--card-shadow)'
          }}
        >
          {/* Card Title */}
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--title-text)' }}>
              Historial de Calidad
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
              Filtra y exporta los registros de los checklists completados.
            </p>
          </div>

          {/* Checklist Pill (when selected) */}
          {selected && selectedChecklistMeta && ChecklistIcon && (
            <div 
              className="mb-6 p-3 rounded-lg flex items-start gap-3"
              style={{
                backgroundColor: 'var(--page-bg)',
                border: '1px solid var(--card-border)'
              }}
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--icon-circle-normal)' }}
              >
                <ChecklistIcon 
                  className="h-5 w-5" 
                  style={{ color: 'var(--icon-primary)' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold mb-0.5" style={{ color: 'var(--title-text)' }}>
                  {selected}
                </h3>
                <p className="text-xs" style={{ color: 'var(--muted-text)' }}>
                  {selectedChecklistMeta.description}
                </p>
              </div>
            </div>
          )}

          {/* Filters Section */}
          <div className="mb-6">
            <label className="block text-xs font-medium mb-3" style={{ color: 'var(--muted-text)' }}>
              Filtros
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Elegir checklist */}
              <div>
                <label htmlFor="checklist" className="block text-sm font-medium mb-1" style={{ color: 'var(--title-text)' }}>
                  Elegir checklist
                </label>
                <select
                  id="checklist"
                  value={selected}
                  onChange={(e) => {
                    setSelected(e.target.value)
                    // Reset additional fields when checklist changes
                    setOrden('')
                    setSku('')
                    setProducto('')
                    setMarca('')
                    setResults([])
                    setHasSearched(false)
                  }}
                  className="w-full border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-2 text-sm"
                  style={{
                    borderColor: 'var(--card-border)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--title-text)'
                  }}
                >
                  <option value="">Seleccione un checklist</option>
                  <option value="Checklist Monoproducto">Checklist Monoproducto</option>
                  <option value="Checklist Mix Producto">Checklist Mix Producto</option>
                  <option value="Process Environmental Temperature Control">Process Environmental Temperature Control</option>
                  <option value="Metal Detector (PCC #1)">Metal Detector (PCC #1)</option>
                  <option value="Staff Good Practices Control">Staff Good Practices Control</option>
                  <option value="Foreign Material Findings Record">Foreign Material Findings Record</option>
                  <option value="Pre-Operational Review Processing Areas">Pre-Operational Review Processing Areas</option>
                  <option value="Internal control of materials used in production areas">Internal control of materials used in production areas</option>
                  <option value="Footbath Control">Footbath Control</option>
                  <option value="Check weighing and sealing of packaged products">Check weighing and sealing of packaged products</option>
                  <option value="Cleanliness Control Packing">Cleanliness Control Packing</option>
                  <option value="Process area staff glasses and auditory protector control">Process area staff glasses and auditory protector control</option>
                </select>
              </div>

              {/* Fecha desde */}
              <div>
                <label htmlFor="fromDate" className="block text-sm font-medium mb-1" style={{ color: 'var(--title-text)' }}>
                  Fecha desde
                </label>
                <input
                  type="date"
                  id="fromDate"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full border rounded-md shadow-sm p-2 text-sm"
                  style={{
                    borderColor: 'var(--card-border)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--title-text)'
                  }}
                />
              </div>

              {/* Fecha hasta */}
              <div>
                <label htmlFor="toDate" className="block text-sm font-medium mb-1" style={{ color: 'var(--title-text)' }}>
                  Fecha hasta
                </label>
                <input
                  type="date"
                  id="toDate"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full border rounded-md shadow-sm p-2 text-sm"
                  style={{
                    borderColor: 'var(--card-border)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--title-text)'
                  }}
                />
              </div>

              {/* Conditional fields - only show if checklist is selected and field is relevant */}
              {selected && relevantFields.orden && (
                <div>
                  <label htmlFor="orden" className="block text-sm font-medium mb-1" style={{ color: 'var(--title-text)' }}>
                    Orden de fabricación
                  </label>
                  <input
                    type="text"
                    id="orden"
                    value={orden}
                    onChange={(e) => setOrden(e.target.value)}
                    placeholder="Orden de fabricación"
                    className="w-full border rounded-md shadow-sm p-2 text-sm"
                    style={{
                      borderColor: 'var(--card-border)',
                      backgroundColor: 'var(--card-bg)',
                      color: 'var(--title-text)'
                    }}
                  />
                </div>
              )}

              {selected && relevantFields.sku && (
                <div>
                  <label htmlFor="sku" className="block text-sm font-medium mb-1" style={{ color: 'var(--title-text)' }}>
                    SKU
                  </label>
                  <input
                    type="text"
                    id="sku"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="SKU"
                    className="w-full border rounded-md shadow-sm p-2 text-sm"
                    style={{
                      borderColor: 'var(--card-border)',
                      backgroundColor: 'var(--card-bg)',
                      color: 'var(--title-text)'
                    }}
                  />
                </div>
              )}

              {selected && relevantFields.producto && (
                <div>
                  <label htmlFor="producto" className="block text-sm font-medium mb-1" style={{ color: 'var(--title-text)' }}>
                    {selected === 'Internal control of materials used in production areas' ? 'Jefe de Línea' : 'Producto'}
                  </label>
                  <input
                    type="text"
                    id="producto"
                    value={producto}
                    onChange={(e) => setProducto(e.target.value)}
                    placeholder={selected === 'Internal control of materials used in production areas' ? 'Jefe de Línea' : 'Producto'}
                    className="w-full border rounded-md shadow-sm p-2 text-sm"
                    style={{
                      borderColor: 'var(--card-border)',
                      backgroundColor: 'var(--card-bg)',
                      color: 'var(--title-text)'
                    }}
                  />
                </div>
              )}

              {selected && relevantFields.marca && (
                <div>
                  <label htmlFor="marca" className="block text-sm font-medium mb-1" style={{ color: 'var(--title-text)' }}>
                    {selected === 'Internal control of materials used in production areas' ? 'Área Productiva' : 'Marca/Cliente'}
                  </label>
                  <input
                    type="text"
                    id="marca"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    placeholder={selected === 'Internal control of materials used in production areas' ? 'Área Productiva' : 'Marca/Cliente'}
                    className="w-full border rounded-md shadow-sm p-2 text-sm"
                    style={{
                      borderColor: 'var(--card-border)',
                      backgroundColor: 'var(--card-bg)',
                      color: 'var(--title-text)'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Buscar button - aligned right */}
            <div className="flex justify-end mt-4">
              <button
                onClick={handleSearch}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--icon-primary)',
                  color: '#FFFFFF'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                }}
              >
                Buscar
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-12">
              <svg
                className="animate-spin h-8 w-8"
                style={{ color: 'var(--icon-primary)' }}
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

          {/* Empty State - No checklist selected */}
          {!loading && !hasSearched && !selected && (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
                Selecciona un checklist y un rango de fechas para ver el historial.
              </p>
            </div>
          )}

          {/* Empty State - Checklist selected but no data */}
          {!loading && hasSearched && results.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
                No hay registros para estos filtros.
              </p>
            </div>
          )}

          {/* Results Section */}
          {!loading && results.length > 0 && (
            <>
              {/* Results Header */}
              <div className="flex items-center justify-between mt-6 mb-2">
                <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
                  {results.length} registro{results.length !== 1 ? 's' : ''} · {selected || 'Ningún checklist seleccionado'}
                </p>
                <div className="flex gap-2">
                  {/* Excel Export Button with Dropdown */}
                  <div className="relative excel-export-menu-container">
                    <button
                      onClick={() => setShowExcelExportMenu(!showExcelExportMenu)}
                      className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        color: 'var(--title-text)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--card-hover-bg, rgba(0,0,0,0.05))'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--card-bg)'
                      }}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                      Exportar Excel
                      <span className="ml-1.5 text-xs">▼</span>
                    </button>
                    {showExcelExportMenu && (
                      <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 min-w-[150px]">
                        <button
                          onClick={() => handleExportAllResults('excel')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
                        >
                          📊 Excel (.xlsx)
                        </button>
                        <button
                          onClick={() => handleExportAllResults('csv')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 border-t border-gray-200"
                        >
                          📄 CSV (.csv)
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* PDF Export Button */}
                  <button
                    onClick={() => {
                      // Count how many records have PDFs
                      const recordsWithPdfs = results.filter(r => r.pdf_url || r.orden_fabricacion || r.orden)
                      setShowPdfConfirmModal(true)
                    }}
                    disabled={exportingPdfs}
                    className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      color: 'var(--title-text)'
                    }}
                    onMouseEnter={(e) => {
                      if (!exportingPdfs) {
                        e.currentTarget.style.backgroundColor = 'var(--card-hover-bg, rgba(0,0,0,0.05))'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--card-bg)'
                    }}
                  >
                    <FileText className="h-4 w-4 mr-1.5" />
                    {exportingPdfs ? 'Exportando...' : 'Exportar PDF'}
                  </button>
                </div>
              </div>

              {/* Results Table */}
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full divide-y" style={{ borderColor: 'var(--card-border)' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--page-bg)' }}>
                <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Fecha</th>
                {selected !== 'Process Environmental Temperature Control' && selected !== 'Staff Good Practices Control' && selected !== 'Foreign Material Findings Record' && selected !== 'Pre-Operational Review Processing Areas' && selected !== 'Internal control of materials used in production areas' && selected !== 'Footbath Control' && selected !== 'Check weighing and sealing of packaged products' && selected !== 'Cleanliness Control Packing' && selected !== 'Metal Detector (PCC #1)' && selected !== 'Process area staff glasses and auditory protector control' && (
                  <>
                    <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Orden de fabricación</th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>SKU</th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Producto</th>
                  </>
                )}
                {selected === 'Process Environmental Temperature Control' && (
                  <>
                    <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Turno</th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Monitor</th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Lecturas</th>
                  </>
                )}
                {selected === 'Staff Good Practices Control' && (
                  <>
                    <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Turno</th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Monitor</th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Personal</th>
                  </>
                )}
                  {selected === 'Foreign Material Findings Record' && (
                    <>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Marca</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Producto</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Turno</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Hallazgos</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Monitor</th>
                    </>
                  )}
                  {selected === 'Pre-Operational Review Processing Areas' && (
                    <>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Hora</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Marca</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Producto</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Cumplimiento</th>
                    </>
                  )}
                  {selected === 'Internal control of materials used in production areas' && (
                    <>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Área Productiva</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Jefe de Línea</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Monitor</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Personal</th>
                    </>
                  )}
                  {selected === 'Footbath Control' && (
                    <>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Turno</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Monitor</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Mediciones</th>
                    </>
                  )}
                  {selected === 'Check weighing and sealing of packaged products' && (
                    <>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Turno</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Monitor</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Entradas</th>
                    </>
                  )}
                  {selected === 'Cleanliness Control Packing' && (
                    <>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Monitor</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Áreas</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Bioluminescence</th>
                    </>
                  )}
                  {selected === 'Metal Detector (PCC #1)' && (
                    <>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Marca</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Producto</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Orden</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Monitor</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Lecturas</th>
                    </>
                  )}
                  {selected === 'Process area staff glasses and auditory protector control' && (
                    <>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Monitor</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Hallazgos</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Personas</th>
                    </>
                  )}
                {(selected === 'Checklist Monoproducto' || selected === 'Checklist Mix Producto') && (
                  <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Marca/Cliente</th>
                )}
                <th className="px-4 py-2.5 text-right text-sm font-medium" style={{ color: 'var(--title-text)' }}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
              {results.map((record: any, index: number) => (
                <tr key={record.id ?? record.orden_fabricacion ?? index} className="hover:bg-opacity-50" style={{ backgroundColor: index % 2 === 0 ? 'transparent' : 'var(--page-bg)' }}>
                  <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>
                    {record.fecha || record.date_string || '-'}
                  </td>
                  {selected !== 'Process Environmental Temperature Control' && selected !== 'Staff Good Practices Control' && selected !== 'Foreign Material Findings Record' && selected !== 'Pre-Operational Review Processing Areas' && selected !== 'Internal control of materials used in production areas' && selected !== 'Footbath Control' && selected !== 'Check weighing and sealing of packaged products' && selected !== 'Cleanliness Control Packing' && selected !== 'Metal Detector (PCC #1)' && selected !== 'Process area staff glasses and auditory protector control' && (
                    <>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>
                        {record.orden_fabricacion || record.orden || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.sku || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.producto || '-'}</td>
                    </>
                  )}
                  {selected === 'Process Environmental Temperature Control' && (
                    <>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.shift || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.monitor_name || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>
                        {record.readings?.length || 0} lectura(s)
                      </td>
                    </>
                  )}
                  {selected === 'Staff Good Practices Control' && (
                    <>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.shift || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.monitor_name || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>
                        {record.staff_members?.length || 0} miembro(s)
                      </td>
                    </>
                  )}
                  {selected === 'Foreign Material Findings Record' && (
                    <>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.brand || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.product || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.shift || '-'}</td>
                      <td className="px-4 py-2.5 text-sm">
                        {record.no_findings ? (
                          <span className="font-semibold" style={{ color: '#10b981' }}>Sin Hallazgos</span>
                        ) : (
                          <span className="font-semibold" style={{ color: '#ef4444' }}>
                            {record.findings?.length || 0} hallazgo(s)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.monitor_name || '-'}</td>
                    </>
                  )}
                  {selected === 'Pre-Operational Review Processing Areas' && (
                    <>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.hour_string || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.brand || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.product || '-'}</td>
                      <td className="px-4 py-2.5 text-sm">
                        {record.items && record.items.length > 0 ? (
                          (() => {
                            const totalItems = record.items.length
                            const compliantItems = record.items.filter((item: any) => item.comply === true).length
                            const nonCompliantItems = record.items.filter((item: any) => item.comply === false).length
                            const complianceRate = totalItems > 0 ? ((compliantItems / totalItems) * 100).toFixed(1) : '0'
                            return (
                              <span className="font-semibold" style={{
                                color: complianceRate === '100' ? '#10b981' : 
                                parseFloat(complianceRate) >= 80 ? '#eab308' : 
                                '#ef4444'
                              }}>
                                {complianceRate}% ({compliantItems}/{totalItems})
                              </span>
                            )
                          })()
                        ) : (
                          <span style={{ color: 'var(--muted-text)' }}>-</span>
                        )}
                      </td>
                    </>
                  )}
                  {selected === 'Internal control of materials used in production areas' && (
                    <>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.productive_area || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.line_manager_name || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.monitor_name || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>
                        {record.personnel_materials?.length || 0} persona(s)
                      </td>
                    </>
                  )}
                  {selected === 'Footbath Control' && (
                    <>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.shift || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.monitor_name || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>
                        {record.measurements?.length || 0} medición(es)
                      </td>
                    </>
                  )}
                  {selected === 'Check weighing and sealing of packaged products' && (
                    <>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.shift || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.monitor_name || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>
                        {record.bag_entries?.length || 0} entrada(s)
                      </td>
                    </>
                  )}
                  {selected === 'Cleanliness Control Packing' && (
                    <>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.monitor_name || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>
                        {record.areas?.length || 0} área(s)
                      </td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>
                        {record.bioluminescence_results?.length || 0} resultado(s)
                      </td>
                    </>
                  )}
                  {selected === 'Metal Detector (PCC #1)' && (
                    <>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.brand || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.product || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.orden || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.monitor_name || '-'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>
                        {record.readings?.length || 0} lectura(s)
                      </td>
                    </>
                  )}
                  {selected === 'Process area staff glasses and auditory protector control' && (
                    <>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>{record.monitor_name || '-'}</td>
                      <td className="px-4 py-2.5 text-sm">
                        {record.no_findings ? (
                          <span className="font-semibold" style={{ color: '#10b981' }}>Sin Hallazgos</span>
                        ) : (
                          <span className="font-semibold" style={{ color: '#f97316' }}>Con Hallazgos</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>
                        {record.persons?.length || 0} persona(s)
                      </td>
                    </>
                  )}
                  {(selected === 'Checklist Monoproducto' || selected === 'Checklist Mix Producto') && (
                    <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>
                      {record.marca || record.cliente || '-'}
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-right text-sm">
                    <button
                      onClick={() => handleViewDetail(record)}
                      className="font-medium transition-colors"
                      style={{ color: 'var(--icon-primary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.8'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1'
                      }}
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
            </>
          )}
        </div>

        {/* PDF Export Confirmation Modal */}
        {showPdfConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div 
              className="bg-white p-6 rounded-lg max-w-md w-full mx-4"
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--card-border)'
              }}
            >
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--title-text)' }}>
                Confirmar exportación de PDFs
              </h2>
              <p className="mb-6 text-sm" style={{ color: 'var(--muted-text)' }}>
                Se exportarán {results.length} registro(s) en un archivo ZIP.
                <br />
                El archivo se nombrará con la fecha de descarga y el nombre del checklist.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowPdfConfirmModal(false)}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    color: 'var(--title-text)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--card-hover-bg, rgba(0,0,0,0.05))'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--card-bg)'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExportAllPdfs}
                  className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
                  style={{
                    backgroundColor: 'var(--icon-primary)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1'
                  }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Document Viewer Modal */}
        {showModal && selectedRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-4xl w-full">
              <h2 className="text-xl font-bold mb-4">Visor de documentos</h2>
              {loadingFiles ? (
                <p>Cargando archivos...</p>
              ) : (
                <>
                  {pdfUrl ? (
                    <iframe src={pdfUrl || undefined} className="w-full h-96 mb-4" />
                  ) : (
                    <p className="text-center mb-4">Archivo PDF no disponible</p>
                  )}
                  <div className="flex flex-wrap gap-4 mb-4">
                    {pdfUrl && (
                      <a
                        href={pdfUrl || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Descargar PDF
                      </a>
                    )}
                    {excelUrl && (
                      <a
                        href={excelUrl || undefined}
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
    </div>
  )
} 