'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { ArrowLeft, History, BarChart3, Truck, Search, FileSpreadsheet, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { exportToFile, exportRecord } from '@/lib/utils/exportData'

// Checklist metadata
const checklistMetadata: Record<string, { icon: any; description: string }> = {
  'Inspection of Frozen Product in Dispatch': {
    icon: Truck,
    description: 'Inspección de producto congelado en despacho. Código: CF.PC-ASC-012-RG004'
  }
}

export default function HistorialPage() {
  const { showToast } = useToast()
  const [selected, setSelected] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [poNumber, setPoNumber] = useState<string>('')
  const [client, setClient] = useState<string>('')
  const [containerNumber, setContainerNumber] = useState<string>('')
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
      
      if (selected === 'Inspection of Frozen Product in Dispatch') {
        let query = supabase.from('checklist_frozen_product_dispatch').select('*')
        
        if (fromDate) {
          if (!toDate) {
            query = query.gte('date', `${fromDate}T00:00:00Z`).lte('date', `${fromDate}T23:59:59Z`)
          } else {
            query = query.gte('date', `${fromDate}T00:00:00Z`).lte('date', `${toDate}T23:59:59Z`)
          }
        } else if (toDate) {
          query = query.lte('date', `${toDate}T23:59:59Z`)
        }
        
        if (poNumber) {
          query = query.ilike('po_number', `%${poNumber}%`)
        }
        if (client) {
          query = query.ilike('client', `%${client}%`)
        }
        if (containerNumber) {
          query = query.ilike('container_number', `%${containerNumber}%`)
        }
        
        const { data: result, error } = await query
        if (error) {
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            data = []
          } else {
            throw error
          }
        } else {
          data = result || []
        }
      }
      
      setResults(data)
    } catch (error: any) {
      console.error('Error searching:', error)
      if (error.code !== '42P01' && !error.message?.includes('does not exist')) {
        showToast('Error al buscar registros. Por favor, intente nuevamente.', 'error')
      }
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = (record: any) => {
    setSelectedRecord(record)
    setShowModal(true)
  }

  // Format date for display
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  // Helper function to get product name from dispatch plan
  const getProductName = (productId: string, dispatchPlan: any[]): string => {
    if (!productId || !Array.isArray(dispatchPlan)) return ''
    const product = dispatchPlan.find((p: any) => p.id === productId)
    return product?.name || ''
  }

  // Export functions
  const handleExportData = async (format: 'excel' | 'csv') => {
    if (!selectedRecord) return
    
    try {
      const record = selectedRecord
      const loadingMap = Array.isArray(record.loading_map) ? record.loading_map : []
      
      // Base record information (header data)
      const baseRecord: any = {
        'ID': record.id || '',
        'Fecha': formatDate(record.date),
        'PO Number': record.po_number || '',
        'Cliente': record.client || '',
        'Contenedor': record.container_number || '',
        'Conductor': record.driver || '',
        'Origen': record.origin || '',
        'Destino': record.destination || '',
        'TTR': record.ttr || '',
        'Inspector': record.inspector_name || '',
        'Temperatura Inspección': record.inspection_temps || '',
        'Resultado Inspección': record.inspection_result || '',
        'Número de Sello': record.seal_number || '',
        'Estado': record.closeout_status || ''
      }

      // If there are pallets, create one row per pallet
      if (loadingMap.length > 0) {
        const exportData = loadingMap.map((pallet: any) => {
          const palletRow = {
            ...baseRecord,
            'Slot ID': pallet.slot_id || '',
            'Pallet ID': pallet.pallet_id || '',
            'Producto': getProductName(pallet.product_id, record.dispatch_plan || []),
            'Cajas': pallet.cases || '',
            'Condición Cajas': pallet.checks?.case_condition ? 'CUMPLE' : 'NO CUMPLE',
            'Condición Pallet': pallet.checks?.pallet_condition ? 'CUMPLE' : 'NO CUMPLE',
            'Condición Wrap': pallet.checks?.wrap_condition ? 'CUMPLE' : 'NO CUMPLE',
            'Codificación': pallet.checks?.coding_box ? 'CUMPLE' : 'NO CUMPLE',
            'Label': pallet.checks?.label ? 'CUMPLE' : 'NO CUMPLE',
            'Label Adicional': pallet.checks?.additional_label ? 'CUMPLE' : 'NO CUMPLE'
          }
          return palletRow
        })

        await exportToFile(exportData, `checklist-dispatch-${record.id}`, format)
      } else {
        // If no pallets, export just the base record
        await exportRecord(baseRecord, `checklist-dispatch-${record.id}`, format)
      }
      
      showToast(`Datos exportados como ${format.toUpperCase()}`, 'success')
    } catch (error) {
      console.error('Error exporting:', error)
      showToast('Error al exportar datos', 'error')
    }
  }

  const handleExportAll = async (format: 'excel' | 'csv') => {
    if (results.length === 0) {
      showToast('No hay datos para exportar', 'error')
      return
    }

    try {
      const exportData: any[] = []
      
      // Process each record and expand pallets into separate rows
      results.forEach(record => {
        const loadingMap = Array.isArray(record.loading_map) ? record.loading_map : []
        
        // Base record information (header data)
        const baseRecord: any = {
          'ID': record.id || '',
          'Fecha': formatDate(record.date),
          'PO Number': record.po_number || '',
          'Cliente': record.client || '',
          'Contenedor': record.container_number || '',
          'Conductor': record.driver || '',
          'Origen': record.origin || '',
          'Destino': record.destination || '',
          'TTR': record.ttr || '',
          'Inspector': record.inspector_name || '',
          'Temperatura Inspección': record.inspection_temps || '',
          'Resultado Inspección': record.inspection_result || '',
          'Número de Sello': record.seal_number || '',
          'Estado': record.closeout_status || ''
        }

        // If there are pallets, create one row per pallet
        if (loadingMap.length > 0) {
          loadingMap.forEach((pallet: any) => {
            const palletRow = {
              ...baseRecord,
              'Slot ID': pallet.slot_id || '',
              'Pallet ID': pallet.pallet_id || '',
              'Producto': getProductName(pallet.product_id, record.dispatch_plan || []),
              'Cajas': pallet.cases || '',
              'Condición Cajas': pallet.checks?.case_condition ? 'CUMPLE' : 'NO CUMPLE',
              'Condición Pallet': pallet.checks?.pallet_condition ? 'CUMPLE' : 'NO CUMPLE',
              'Condición Wrap': pallet.checks?.wrap_condition ? 'CUMPLE' : 'NO CUMPLE',
              'Codificación': pallet.checks?.coding_box ? 'CUMPLE' : 'NO CUMPLE',
              'Label': pallet.checks?.label ? 'CUMPLE' : 'NO CUMPLE',
              'Label Adicional': pallet.checks?.additional_label ? 'CUMPLE' : 'NO CUMPLE'
            }
            exportData.push(palletRow)
          })
        } else {
          // If no pallets, add just the base record
          exportData.push(baseRecord)
        }
      })

      await exportToFile(exportData, `checklist-dispatch-all-${new Date().toISOString().split('T')[0]}`, format)
      showToast(`Todos los registros exportados como ${format.toUpperCase()}`, 'success')
    } catch (error) {
      console.error('Error exporting all:', error)
      showToast('Error al exportar datos', 'error')
    }
  }

  const handleExportPDFs = async () => {
    if (results.length === 0) {
      showToast('No hay registros para exportar', 'error')
      return
    }

    setExportingPdfs(true)
    try {
      const zip = new JSZip()
      let downloaded = 0
      const total = results.filter(r => r.pdf_url).length

      if (total === 0) {
        showToast('No hay PDFs disponibles para exportar', 'error')
        setExportingPdfs(false)
        return
      }

      for (const record of results) {
        if (record.pdf_url) {
          try {
            const response = await fetch(record.pdf_url)
            if (response.ok) {
              const blob = await response.blob()
              const filename = `dispatch-${record.po_number || record.id}-${formatDate(record.date)}.pdf`.replace(/\//g, '-')
              zip.file(filename, blob)
              downloaded++
            }
          } catch (err) {
            console.error(`Error downloading PDF for record ${record.id}:`, err)
          }
        }
      }

      if (downloaded > 0) {
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        const url = URL.createObjectURL(zipBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `checklist-dispatch-pdfs-${new Date().toISOString().split('T')[0]}.zip`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        showToast(`${downloaded} PDF(s) exportados exitosamente`, 'success')
      } else {
        showToast('No se pudieron descargar los PDFs', 'error')
      }
    } catch (error) {
      console.error('Error exporting PDFs:', error)
      showToast('Error al exportar PDFs', 'error')
    } finally {
      setExportingPdfs(false)
      setShowPdfConfirmModal(false)
    }
  }

  // Load PDF URL when modal opens
  useEffect(() => {
    if (showModal && selectedRecord) {
      setLoadingFiles(true)
      if (selectedRecord.pdf_url) {
        setPdfUrl(selectedRecord.pdf_url)
      } else {
        setPdfUrl(null)
      }
      setLoadingFiles(false)
    }
  }, [showModal, selectedRecord])

  const relevantFields = { poNumber: true, client: true, containerNumber: true }
  const selectedChecklistMeta = selected ? checklistMetadata[selected] : null
  const ChecklistIcon = selectedChecklistMeta?.icon

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--page-bg)' }}>
      <div className="max-w-[1150px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/area/logistica"
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
                Área de Logística
              </h1>
              <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
                Historial de registros y exportación de datos.
              </p>
            </div>
            
            {/* Header buttons */}
            <div className="flex gap-2">
              <Link
                href="/area/logistica/historial"
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
                Dashboard de Logística
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
              Historial de Logística
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
                    setPoNumber('')
                    setClient('')
                    setContainerNumber('')
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
                  <option value="Inspection of Frozen Product in Dispatch">Inspection of Frozen Product in Dispatch</option>
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
            </div>

            {/* Additional filters */}
            {selected && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {relevantFields.poNumber && (
                  <div>
                    <label htmlFor="poNumber" className="block text-sm font-medium mb-1" style={{ color: 'var(--title-text)' }}>
                      PO Number / Orden de Compra
                    </label>
                    <input
                      type="text"
                      id="poNumber"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder="Buscar por PO..."
                      className="w-full border rounded-md shadow-sm p-2 text-sm"
                      style={{
                        borderColor: 'var(--card-border)',
                        backgroundColor: 'var(--card-bg)',
                        color: 'var(--title-text)'
                      }}
                    />
                  </div>
                )}

                {relevantFields.client && (
                  <div>
                    <label htmlFor="client" className="block text-sm font-medium mb-1" style={{ color: 'var(--title-text)' }}>
                      Cliente
                    </label>
                    <input
                      type="text"
                      id="client"
                      value={client}
                      onChange={(e) => setClient(e.target.value)}
                      placeholder="Buscar por cliente..."
                      className="w-full border rounded-md shadow-sm p-2 text-sm"
                      style={{
                        borderColor: 'var(--card-border)',
                        backgroundColor: 'var(--card-bg)',
                        color: 'var(--title-text)'
                      }}
                    />
                  </div>
                )}

                {relevantFields.containerNumber && (
                  <div>
                    <label htmlFor="containerNumber" className="block text-sm font-medium mb-1" style={{ color: 'var(--title-text)' }}>
                      Número de Contenedor
                    </label>
                    <input
                      type="text"
                      id="containerNumber"
                      value={containerNumber}
                      onChange={(e) => setContainerNumber(e.target.value)}
                      placeholder="Buscar por contenedor..."
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
            )}

            {/* Search Button */}
            <div className="mt-4">
              <button
                onClick={handleSearch}
                disabled={loading || !selected}
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--icon-primary)',
                  color: '#FFFFFF'
                }}
                onMouseEnter={(e) => {
                  if (!loading && selected) {
                    e.currentTarget.style.opacity = '0.9'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                }}
              >
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>

          {/* Results Section */}
          {hasSearched && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--title-text)' }}>
                  Resultados ({results.length})
                </h3>
                {results.length > 0 && (
                  <div className="flex gap-2">
                    <div className="relative">
                      <button
                        onClick={() => setShowExcelExportMenu(!showExcelExportMenu)}
                        className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          color: 'var(--title-text)'
                        }}
                      >
                        <FileSpreadsheet className="h-3 w-3 mr-1" />
                        Excel
                      </button>
                      {showExcelExportMenu && (
                        <div 
                          className="absolute right-0 mt-1 py-1 rounded-md shadow-lg z-10"
                          style={{
                            backgroundColor: 'var(--card-bg)',
                            border: '1px solid var(--card-border)',
                            minWidth: '120px'
                          }}
                        >
                          <button
                            onClick={() => {
                              handleExportAll('excel')
                              setShowExcelExportMenu(false)
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100"
                            style={{ color: 'var(--title-text)' }}
                          >
                            Exportar todos
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowPdfConfirmModal(true)}
                      disabled={exportingPdfs}
                      className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                      style={{
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        color: 'var(--title-text)'
                      }}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      {exportingPdfs ? 'Exportando...' : 'PDFs'}
                    </button>
                  </div>
                )}
              </div>

              {results.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--muted-text)' }}>
                  No se encontraron registros con los filtros seleccionados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr style={{ backgroundColor: 'var(--page-bg)' }}>
                        <th className="border p-2 text-left text-xs font-semibold" style={{ borderColor: 'var(--card-border)', color: 'var(--title-text)' }}>
                          Fecha
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold" style={{ borderColor: 'var(--card-border)', color: 'var(--title-text)' }}>
                          PO Number
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold" style={{ borderColor: 'var(--card-border)', color: 'var(--title-text)' }}>
                          Cliente
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold" style={{ borderColor: 'var(--card-border)', color: 'var(--title-text)' }}>
                          Contenedor
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold" style={{ borderColor: 'var(--card-border)', color: 'var(--title-text)' }}>
                          Inspector
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold" style={{ borderColor: 'var(--card-border)', color: 'var(--title-text)' }}>
                          Resultado
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold" style={{ borderColor: 'var(--card-border)', color: 'var(--title-text)' }}>
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((record) => (
                        <tr 
                          key={record.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          style={{ backgroundColor: 'var(--card-bg)' }}
                          onClick={() => handleViewDetail(record)}
                        >
                          <td className="border p-2 text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--title-text)' }}>
                            {formatDate(record.date)}
                          </td>
                          <td className="border p-2 text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--title-text)' }}>
                            {record.po_number || '-'}
                          </td>
                          <td className="border p-2 text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--title-text)' }}>
                            {record.client || '-'}
                          </td>
                          <td className="border p-2 text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--title-text)' }}>
                            {record.container_number || '-'}
                          </td>
                          <td className="border p-2 text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--title-text)' }}>
                            {record.inspector_name || '-'}
                          </td>
                          <td className="border p-2 text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--title-text)' }}>
                            <span 
                              className="px-2 py-1 rounded text-xs font-medium"
                              style={{
                                backgroundColor: record.inspection_result === 'Approve' ? '#D1FAE5' : '#FEE2E2',
                                color: record.inspection_result === 'Approve' ? '#065F46' : '#991B1B'
                              }}
                            >
                              {record.inspection_result === 'Approve' ? 'Aprobado' : record.inspection_result === 'Reject' ? 'Rechazado' : '-'}
                            </span>
                          </td>
                          <td className="border p-2 text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--title-text)' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewDetail(record)
                              }}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                            >
                              Ver detalles
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedRecord && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold" style={{ color: 'var(--title-text)' }}>
                  Detalles del Registro
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Basic Info */}
                <div>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--title-text)' }}>
                    Información General
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium" style={{ color: 'var(--muted-text)' }}>Fecha:</span>{' '}
                      <span style={{ color: 'var(--title-text)' }}>{formatDate(selectedRecord.date)}</span>
                    </div>
                    <div>
                      <span className="font-medium" style={{ color: 'var(--muted-text)' }}>PO Number:</span>{' '}
                      <span style={{ color: 'var(--title-text)' }}>{selectedRecord.po_number || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium" style={{ color: 'var(--muted-text)' }}>Cliente:</span>{' '}
                      <span style={{ color: 'var(--title-text)' }}>{selectedRecord.client || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium" style={{ color: 'var(--muted-text)' }}>Contenedor:</span>{' '}
                      <span style={{ color: 'var(--title-text)' }}>{selectedRecord.container_number || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium" style={{ color: 'var(--muted-text)' }}>Conductor:</span>{' '}
                      <span style={{ color: 'var(--title-text)' }}>{selectedRecord.driver || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium" style={{ color: 'var(--muted-text)' }}>Inspector:</span>{' '}
                      <span style={{ color: 'var(--title-text)' }}>{selectedRecord.inspector_name || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium" style={{ color: 'var(--muted-text)' }}>Origen:</span>{' '}
                      <span style={{ color: 'var(--title-text)' }}>{selectedRecord.origin || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium" style={{ color: 'var(--muted-text)' }}>Destino:</span>{' '}
                      <span style={{ color: 'var(--title-text)' }}>{selectedRecord.destination || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium" style={{ color: 'var(--muted-text)' }}>TTR:</span>{' '}
                      <span style={{ color: 'var(--title-text)' }}>{selectedRecord.ttr || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium" style={{ color: 'var(--muted-text)' }}>Temperatura:</span>{' '}
                      <span style={{ color: 'var(--title-text)' }}>{selectedRecord.inspection_temps || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium" style={{ color: 'var(--muted-text)' }}>Resultado Inspección:</span>{' '}
                      <span 
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: selectedRecord.inspection_result === 'Approve' ? '#D1FAE5' : '#FEE2E2',
                          color: selectedRecord.inspection_result === 'Approve' ? '#065F46' : '#991B1B'
                        }}
                      >
                        {selectedRecord.inspection_result === 'Approve' ? 'Aprobado' : selectedRecord.inspection_result === 'Reject' ? 'Rechazado' : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium" style={{ color: 'var(--muted-text)' }}>Número de Sello:</span>{' '}
                      <span style={{ color: 'var(--title-text)' }}>{selectedRecord.seal_number || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Dispatch Plan */}
                {Array.isArray(selectedRecord.dispatch_plan) && selectedRecord.dispatch_plan.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--title-text)' }}>
                      Plan de Despacho
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr style={{ backgroundColor: 'var(--page-bg)' }}>
                            <th className="border p-2 text-left text-xs font-semibold" style={{ borderColor: 'var(--card-border)', color: 'var(--title-text)' }}>
                              Producto
                            </th>
                            <th className="border p-2 text-center text-xs font-semibold" style={{ borderColor: 'var(--card-border)', color: 'var(--title-text)' }}>
                              Pallets Esperados
                            </th>
                            <th className="border p-2 text-center text-xs font-semibold" style={{ borderColor: 'var(--card-border)', color: 'var(--title-text)' }}>
                              Cajas por Pallet
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRecord.dispatch_plan.map((product: any, idx: number) => (
                            <tr key={idx} style={{ backgroundColor: 'var(--card-bg)' }}>
                              <td className="border p-2 text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--title-text)' }}>
                                {product.name || '-'}
                              </td>
                              <td className="border p-2 text-xs text-center" style={{ borderColor: 'var(--card-border)', color: 'var(--title-text)' }}>
                                {product.expected_pallets || '-'}
                              </td>
                              <td className="border p-2 text-xs text-center" style={{ borderColor: 'var(--card-border)', color: 'var(--title-text)' }}>
                                {product.cases_per_pallet || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Loading Map Summary */}
                {Array.isArray(selectedRecord.loading_map) && selectedRecord.loading_map.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--title-text)' }}>
                      Resumen de Carga
                    </h3>
                    <div className="text-sm" style={{ color: 'var(--title-text)' }}>
                      Total de Pallets: {selectedRecord.loading_map.length}
                    </div>
                  </div>
                )}

                {/* PDF Link */}
                {pdfUrl && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--title-text)' }}>
                      PDF
                    </h3>
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Ver PDF
                    </a>
                  </div>
                )}

                {/* Export Buttons */}
                <div className="flex gap-2 pt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: 'var(--icon-primary)',
                        color: '#FFFFFF'
                      }}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Exportar
                    </button>
                    {showExportMenu && (
                      <div 
                        className="absolute left-0 mt-1 py-1 rounded-md shadow-lg z-10"
                        style={{
                          backgroundColor: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          minWidth: '150px'
                        }}
                      >
                        <button
                          onClick={() => {
                            handleExportData('excel')
                            setShowExportMenu(false)
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100"
                          style={{ color: 'var(--title-text)' }}
                        >
                          Exportar como Excel
                        </button>
                        <button
                          onClick={() => {
                            handleExportData('csv')
                            setShowExportMenu(false)
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100"
                          style={{ color: 'var(--title-text)' }}
                        >
                          Exportar como CSV
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Export Confirmation Modal */}
      {showPdfConfirmModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowPdfConfirmModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--title-text)' }}>
              Exportar PDFs
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--muted-text)' }}>
              Se exportarán todos los PDFs disponibles ({results.filter(r => r.pdf_url).length} archivos) en un archivo ZIP.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowPdfConfirmModal(false)}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  color: 'var(--title-text)'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleExportPDFs}
                disabled={exportingPdfs}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--icon-primary)',
                  color: '#FFFFFF'
                }}
              >
                {exportingPdfs ? 'Exportando...' : 'Exportar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

