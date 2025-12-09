'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { getChecklistRecords, ChecklistRecord, initialChecklistItems } from '@/lib/checklist'
import { useToast } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { exportToFile, exportRecord } from '@/lib/utils/exportData'
import { ArrowLeft, History, BarChart3, Package, FileSpreadsheet, FileText, Eye } from 'lucide-react'

// Checklist metadata mapping for icons and descriptions
const checklistMetadata: Record<string, { icon: any; description: string }> = {
  'Checklist packing machine / Checklist envasadora': {
    icon: Package,
    description: 'Checklist de control de la máquina de envasado.'
  }
}

export default function HistorialPage() {
  const { showToast } = useToast()
  const [records, setRecords] = useState<ChecklistRecord[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState<boolean>(false)
  const [showModal, setShowModal] = useState<boolean>(false)
  const [selectedRecord, setSelectedRecord] = useState<ChecklistRecord | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [excelUrl, setExcelUrl] = useState<string | null>(null)
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false)
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false)
  const [showExcelExportMenu, setShowExcelExportMenu] = useState<boolean>(false)
  const [showPdfConfirmModal, setShowPdfConfirmModal] = useState<boolean>(false)
  const [exportingPdfs, setExportingPdfs] = useState<boolean>(false)

  // === Filtros ===
  const checklists = [
    { id: 'packaging', label: 'Checklist packing machine / Checklist envasadora', table: 'checklist_packing' }
  ]
  const [selectedChecklist, setSelectedChecklist] = useState<string>(checklists[0].id)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 2025 + 1 }, (_, i) => 2025 + i)
  const months = [
    { label: 'Enero', value: 1 }, { label: 'Febrero', value: 2 }, { label: 'Marzo', value: 3 },
    { label: 'Abril', value: 4 }, { label: 'Mayo', value: 5 }, { label: 'Junio', value: 6 },
    { label: 'Julio', value: 7 }, { label: 'Agosto', value: 8 }, { label: 'Septiembre', value: 9 },
    { label: 'Octubre', value: 10 }, { label: 'Noviembre', value: 11 }, { label: 'Diciembre', value: 12 }
  ]
  const [year, setYear] = useState<string>('')
  const [month, setMonth] = useState<string>('')
  const [weeks, setWeeks] = useState<{ start: Date; end: Date; label: string }[]>([])
  const [week, setWeek] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [ordenFabricacionFilter, setOrdenFabricacionFilter] = useState<string>('')
  // Productos para marca/material/sku
  const [products, setProducts] = useState<{ brand: string; material: string; sku: string }[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [materials, setMaterials] = useState<string[]>([])
  const [skus, setSkus] = useState<string[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [selectedMaterial, setSelectedMaterial] = useState<string>('')
  const [selectedSku, setSelectedSku] = useState<string>('')

  // Cargar productos para los filtros de marca/material/sku
  useEffect(() => {
    async function loadProducts() {
      const { data, error } = await supabase.from('productos').select('brand, material, sku')
      if (error) {
        console.error('Error cargando productos:', error)
        return
      }
      setProducts(data || [])
      setBrands(Array.from(new Set((data || []).map((p: any) => p.brand))))
    }
    loadProducts()
  }, [])

  // Generar semanas para mes/año seleccionados
  useEffect(() => {
    if (year !== '' && month !== '') {
      const y = parseInt(year)
      const m = parseInt(month)
      const monthStart = new Date(y, m - 1, 1)
      const monthEnd = new Date(y, m, 0)
      const arr: typeof weeks = []
      // encontrar primer lunes <= inicio mes
      const firstDay = monthStart.getDay()
      const diffToMon = (firstDay + 6) % 7
      let wStart = new Date(y, m - 1, 1 - diffToMon)
      let idx = 1
      while (wStart <= monthEnd) {
        const wEnd = new Date(wStart)
        wEnd.setDate(wStart.getDate() + 6)
        const startLabel = format(wStart < monthStart ? monthStart : wStart, 'dd MMM', { locale: es })
        const endLabel = format(wEnd > monthEnd ? monthEnd : wEnd, 'dd MMM', { locale: es })
        arr.push({ start: new Date(wStart), end: new Date(wEnd), label: `Semana ${idx} (${startLabel} - ${endLabel})` })
        wStart.setDate(wStart.getDate() + 7)
        idx++
      }
      setWeeks(arr)
    } else {
      setWeeks([])
    }
    setWeek('')
  }, [year, month])

  // Al seleccionar semana, fijar rango de fechas
  useEffect(() => {
    if (week !== '' && weeks[parseInt(week)]) {
      setDateFrom(format(weeks[parseInt(week)].start, 'yyyy-MM-dd'))
      setDateTo(format(weeks[parseInt(week)].end, 'yyyy-MM-dd'))
    }
  }, [week, weeks])

  // Al cambiar mes/año y no hay semana, rango = mes completo
  useEffect(() => {
    if (year !== '' && month !== '' && week === '') {
      const y = parseInt(year)
      const m = parseInt(month)
      const start = new Date(y, m - 1, 1)
      const end = new Date(y, m, 0)
      setDateFrom(format(start, 'yyyy-MM-dd'))
      setDateTo(format(end, 'yyyy-MM-dd'))
    }
  }, [year, month, week])

  // Filtros marca/material/sku
  useEffect(() => {
    if (selectedBrand) {
      const m = Array.from(new Set(products.filter((p) => p.brand === selectedBrand).map((p) => p.material)))
      setMaterials(m)
      setSelectedMaterial('')
      setSkus([])
    }
  }, [selectedBrand, products])

  useEffect(() => {
    if (selectedMaterial) {
      const s = products.filter((p) => p.brand === selectedBrand && p.material === selectedMaterial).map((p) => p.sku)
      setSkus(s)
      setSelectedSku('')
    }
  }, [selectedMaterial, selectedBrand, products])

  // Función para buscar registros
  const handleSearch = async () => {
    setLoading(true)
    setHasSearched(true)
    setError(null)
    
    try {
      const filters: any = {}
      if (dateFrom) filters.startDate = dateFrom
      if (dateTo) filters.endDate = dateTo
      if (ordenFabricacionFilter) filters.orden_fabricacion = ordenFabricacionFilter
      if (selectedBrand) filters.marca = selectedBrand
      if (selectedMaterial) filters.material = selectedMaterial
      
      const current = checklists.find((c) => c.id === selectedChecklist)
      const tableName = current?.table || checklists[0].table
      const data = await getChecklistRecords(tableName, filters)
      setRecords(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error cargando historial')
      showToast('Error cargando historial', 'error')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  // Función para limpiar todos los filtros
  const handleClearFilters = () => {
    setSelectedChecklist(checklists[0].id)
    setYear('')
    setMonth('')
    setWeek('')
    setDateFrom('')
    setDateTo('')
    setOrdenFabricacionFilter('')
    setSelectedBrand('')
    setSelectedMaterial('')
    setSelectedSku('')
    setRecords([])
    setHasSearched(false)
  }

  // Función para ver detalle de un registro
  const handleViewDetail = (record: ChecklistRecord) => {
    setSelectedRecord(record)
    setShowModal(true)
  }

  // Función para exportar datos de un registro
  const handleExportData = async (format: 'excel' | 'csv') => {
    if (!selectedRecord) return
    
    try {
      // Cabecera
      const headers = [
        'Fecha', 'Orden de Fabricación', 'Marca', 'Material', 'SKU', 'Jefe de línea', 'Operador',
        ...initialChecklistItems.map(item => item.nombre),
        'Comentarios', 'Acción correctiva'
      ]
      // Fila de datos generales
      const row = [
        selectedRecord.fecha,
        selectedRecord.orden_fabricacion,
        selectedRecord.marca,
        selectedRecord.material,
        selectedRecord.sku,
        selectedRecord.jefe_linea,
        selectedRecord.operador_maquina
      ]
      // Agregar estado de cada ítem
      initialChecklistItems.forEach(master => {
        const recItem = (selectedRecord as any).items?.find((i: any) =>
          i.nombre?.trim().toLowerCase() === master.nombre.trim().toLowerCase()
        )
        const st = recItem?.status ?? recItem?.estado
        let status = 'N/A'
        if (st === 'cumple') status = 'Cumple'
        else if (st === 'no_cumple') status = 'No cumple'
        row.push(status)
      })
      // Comentarios y acciones correctivas
      const comments = (selectedRecord as any).items
        ?.filter((i: any) => i.comment)
        .map((i: any) => `${i.nombre}: ${i.comment}`)
        .join('; ') || ''
      const actions = (selectedRecord as any).items
        ?.filter((i: any) => i.correctiveAction)
        .map((i: any) => `${i.nombre}: ${i.correctiveAction}`)
        .join('; ') || ''
      row.push(comments, actions)
      
      const fileName = `${selectedRecord.fecha}_${selectedRecord.orden_fabricacion}_${selectedRecord.material}`
      exportToFile([headers, row], fileName, format, 'Checklist')
      setShowExportMenu(false)
      showToast(`Archivo ${format.toUpperCase()} descargado exitosamente`, 'success')
    } catch (err: any) {
      console.error('Error exportando datos:', err)
      showToast(`Error al exportar ${format.toUpperCase()}`, 'error')
    }
  }

  // Export all filtered results to Excel or CSV
  const handleExportAllResults = async (format: 'excel' | 'csv') => {
    if (records.length === 0) {
      showToast('No hay datos para exportar', 'error')
      return
    }

    try {
      setShowExcelExportMenu(false)
      
      const headers = [
        'Fecha', 'Orden de Fabricación', 'Marca', 'Material', 'SKU', 'Jefe de línea', 'Operador',
        ...initialChecklistItems.map(item => item.nombre),
        'Comentarios', 'Acción correctiva'
      ]
      
      const allRows: any[][] = [headers]
      
      records.forEach(record => {
        const row = [
          record.fecha,
          record.orden_fabricacion,
          record.marca,
          record.material,
          record.sku,
          record.jefe_linea,
          record.operador_maquina
        ]
        
        initialChecklistItems.forEach(master => {
          const recItem = (record as any).items?.find((i: any) =>
            i.nombre?.trim().toLowerCase() === master.nombre.trim().toLowerCase()
          )
          const st = recItem?.status ?? recItem?.estado
          let status = 'N/A'
          if (st === 'cumple') status = 'Cumple'
          else if (st === 'no_cumple') status = 'No cumple'
          row.push(status)
        })
        
        const comments = (record as any).items
          ?.filter((i: any) => i.comment)
          .map((i: any) => `${i.nombre}: ${i.comment}`)
          .join('; ') || ''
        const actions = (record as any).items
          ?.filter((i: any) => i.correctiveAction)
          .map((i: any) => `${i.nombre}: ${i.correctiveAction}`)
          .join('; ') || ''
        row.push(comments, actions)
        
        allRows.push(row)
      })

      const dateStr = new Date().toISOString().split('T')[0]
      const fileName = `historial_produccion_${dateStr}`
      exportToFile(allRows, fileName, format, 'Producción')
      showToast(`${records.length} registro(s) exportado(s) exitosamente`, 'success')
    } catch (err: any) {
      console.error('Error exportando datos:', err)
      showToast(`Error al exportar ${format.toUpperCase()}`, 'error')
    }
  }

  // Export all PDFs in a zip file
  const handleExportAllPdfs = async () => {
    if (records.length === 0) {
      showToast('No hay registros para exportar', 'error')
      return
    }

    setShowPdfConfirmModal(false)
    setExportingPdfs(true)

    try {
      const zip = new JSZip()
      let pdfCount = 0
      const errors: string[] = []
      const addedFiles = new Set<string>()

      for (const record of records) {
        try {
          if (record.pdf_url) {
            const response = await fetch(record.pdf_url)
            if (response.ok) {
              const blob = await response.blob()
              const dateStr = record.fecha || ''
              const orden = record.orden_fabricacion || ''
              const material = record.material || ''
              let pdfFileName = `${dateStr}_${orden}_${material}.pdf`
              
              let counter = 1
              while (addedFiles.has(pdfFileName)) {
                const nameParts = pdfFileName.split('.')
                const ext = nameParts.pop()
                const baseName = nameParts.join('.')
                pdfFileName = `${baseName}_${counter}.${ext}`
                counter++
              }
              
              zip.file(pdfFileName, blob)
              addedFiles.add(pdfFileName)
              pdfCount++
            } else {
              errors.push(`Error al descargar PDF: ${record.orden_fabricacion || 'desconocido'}`)
            }
          } else {
            errors.push(`No PDF disponible para: ${record.orden_fabricacion || 'desconocido'}`)
          }
        } catch (err) {
          console.error('Error fetching PDF for record:', err)
          errors.push(`Error procesando registro: ${record.orden_fabricacion || 'desconocido'}`)
        }
      }

      if (pdfCount === 0) {
        showToast('No se encontraron archivos PDF para exportar', 'error')
        setExportingPdfs(false)
        return
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      const dateStr = new Date().toISOString().split('T')[0]
      link.download = `${dateStr}_produccion.zip`
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

  // Fetch PDF URL when a record is selected
  useEffect(() => {
    if (!showModal || !selectedRecord) return

    setLoadingFiles(true)
    setPdfUrl(null)
    setExcelUrl(null)

    ;(async () => {
      try {
        if (selectedRecord.pdf_url) {
          setPdfUrl(selectedRecord.pdf_url)
        }
      } catch (error: any) {
        console.error('Error al buscar archivos:', error)
      } finally {
        setLoadingFiles(false)
      }
    })()
  }, [showModal, selectedRecord])

  const selectedChecklistMeta = checklistMetadata[checklists.find(c => c.id === selectedChecklist)?.label || '']
  const ChecklistIcon = selectedChecklistMeta?.icon

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--page-bg)' }}>
      <div className="max-w-[1150px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/area/produccion"
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
                Área de Producción
              </h1>
              <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
                Historial de registros y exportación de datos.
              </p>
            </div>
            
            {/* Header buttons */}
            <div className="flex gap-2">
              <Link
                href="/area/produccion/historial"
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
                Dashboard de Producción
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
              Historial de Producción
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
              Filtra y exporta los registros de los checklists completados.
            </p>
          </div>

          {/* Checklist Pill (when selected) */}
          {selectedChecklistMeta && ChecklistIcon && (
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
                  {checklists.find(c => c.id === selectedChecklist)?.label}
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
                  value={selectedChecklist}
                  onChange={(e) => {
                    setSelectedChecklist(e.target.value)
                    setRecords([])
                    setHasSearched(false)
                  }}
                  className="w-full border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-2 text-sm"
                  style={{
                    borderColor: 'var(--card-border)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--title-text)'
                  }}
                >
                  {checklists.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
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
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setWeek('') }}
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
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setWeek('') }}
                  className="w-full border rounded-md shadow-sm p-2 text-sm"
                  style={{
                    borderColor: 'var(--card-border)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--title-text)'
                  }}
                />
              </div>

              {/* Orden de fabricación */}
              <div>
                <label htmlFor="orden" className="block text-sm font-medium mb-1" style={{ color: 'var(--title-text)' }}>
                  Orden de fabricación
                </label>
                <input
                  type="text"
                  id="orden"
                  value={ordenFabricacionFilter}
                  onChange={(e) => setOrdenFabricacionFilter(e.target.value)}
                  placeholder="Orden de fabricación"
                  className="w-full border rounded-md shadow-sm p-2 text-sm"
                  style={{
                    borderColor: 'var(--card-border)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--title-text)'
                  }}
                />
              </div>

              {/* Marca */}
              <div>
                <label htmlFor="marca" className="block text-sm font-medium mb-1" style={{ color: 'var(--title-text)' }}>
                  Marca
                </label>
                <select
                  id="marca"
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full border rounded-md shadow-sm p-2 text-sm"
                  style={{
                    borderColor: 'var(--card-border)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--title-text)'
                  }}
                >
                  <option value="">Todas</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* Material */}
              <div>
                <label htmlFor="material" className="block text-sm font-medium mb-1" style={{ color: 'var(--title-text)' }}>
                  Material
                </label>
                <select
                  id="material"
                  value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value)}
                  className="w-full border rounded-md shadow-sm p-2 text-sm"
                  style={{
                    borderColor: 'var(--card-border)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--title-text)'
                  }}
                  disabled={!selectedBrand}
                >
                  <option value="">Todos</option>
                  {materials.map(mat => <option key={mat} value={mat}>{mat}</option>)}
                </select>
              </div>
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

          {/* Empty State - No search yet */}
          {!loading && !hasSearched && (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
                Selecciona un checklist y un rango de fechas para ver el historial.
              </p>
            </div>
          )}

          {/* Empty State - Search done but no data */}
          {!loading && hasSearched && records.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
                No hay registros para estos filtros.
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: '#ef4444' }}>
                {error}
              </p>
            </div>
          )}

          {/* Results Section */}
          {!loading && records.length > 0 && (
            <>
              {/* Results Header */}
              <div className="flex items-center justify-between mt-6 mb-2">
                <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
                  {records.length} registro{records.length !== 1 ? 's' : ''} · {checklists.find(c => c.id === selectedChecklist)?.label || 'Ningún checklist seleccionado'}
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
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Orden de fabricación</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Marca</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>Material</th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium" style={{ color: 'var(--title-text)' }}>SKU</th>
                      <th className="px-4 py-2.5 text-right text-sm font-medium" style={{ color: 'var(--title-text)' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                    {records.map((record, index) => (
                      <tr key={record.id} className="hover:bg-opacity-50" style={{ backgroundColor: index % 2 === 0 ? 'transparent' : 'var(--page-bg)' }}>
                        <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>
                          {record.fecha}
                        </td>
                        <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>
                          {record.orden_fabricacion}
                        </td>
                        <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>
                          {record.marca}
                        </td>
                        <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>
                          {record.material}
                        </td>
                        <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--title-text)' }}>
                          {record.sku}
                        </td>
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
                Se exportarán {records.length} registro(s) en un archivo ZIP.
                <br />
                El archivo se nombrará con la fecha de descarga.
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
            <div 
              className="bg-white p-6 rounded-lg max-w-4xl w-full mx-4"
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--card-border)'
              }}
            >
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--title-text)' }}>Visor de documentos</h2>
              {loadingFiles ? (
                <p style={{ color: 'var(--muted-text)' }}>Cargando archivos...</p>
              ) : (
                <>
                  {pdfUrl ? (
                    <iframe src={pdfUrl} className="w-full h-96 mb-4" />
                  ) : (
                    <p className="text-center mb-4" style={{ color: 'var(--muted-text)' }}>Archivo PDF no disponible</p>
                  )}
                  <div className="flex flex-wrap gap-4 mb-4">
                    {pdfUrl && (
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
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
                        Descargar PDF
                      </a>
                    )}
                    {selectedRecord && (
                      <div className="relative export-menu-container">
                        <button
                          onClick={() => setShowExportMenu(!showExportMenu)}
                          className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors flex items-center gap-2"
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
                className="mt-4 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
                style={{
                  backgroundColor: 'var(--card-border)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                }}
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
