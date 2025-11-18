'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { ArrowLeft } from 'lucide-react'
import * as XLSX from 'xlsx'
import { fetchChecklistEnvTempData } from '@/lib/supabase/checklistEnvTemp'
import { fetchChecklistMetalDetectorData } from '@/lib/supabase/checklistMetalDetector'
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
        if (error) throw error
        data = result || []
        
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
        if (error) throw error
        data = result || []
        
      } else if (selected === 'Process Environmental Temperature Control') {
        // Use the special fetch function for envtemp
        const records = await fetchChecklistEnvTempData(fromDate || undefined, toDate || undefined)
        // Filter by orden if provided (check in date_string or other fields)
        let filtered = records
        if (orden) {
          filtered = records.filter((r: any) => 
            r.date_string?.includes(orden) || 
            r.monitor_name?.toLowerCase().includes(orden.toLowerCase())
          )
        }
        data = filtered
        
      } else if (selected === 'Metal Detector (PCC #1)') {
        // Use the special fetch function for metal detector
        const records = await fetchChecklistMetalDetectorData(fromDate || undefined, toDate || undefined)
        // Filter by orden if provided
        let filtered = records
        if (orden) {
          filtered = records.filter((r: any) => 
            r.orden?.toLowerCase().includes(orden.toLowerCase()) ||
            r.metal_detector_id?.toLowerCase().includes(orden.toLowerCase()) ||
            r.process_line?.toLowerCase().includes(orden.toLowerCase())
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
      }
      
      setResults(data)
    } catch (error: any) {
      console.error('Error searching:', error)
      showToast('Error al buscar registros', 'error')
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
        
      } else if (selected === 'Metal Detector (PCC #1)') {
        // Export Metal Detector Checklist data
        const record = selectedRecord
        const flatRecord: any = {
          'Date': record.date_string || '',
          'Process Line': record.process_line || '',
          'Metal Detector ID': record.metal_detector_id || '',
          'Start Time': record.metal_detector_start_time || '',
          'Finish Time': record.metal_detector_finish_time || '',
          'Orden': record.orden || '',
          'Brand': record.brand || '',
          'Product': record.product || '',
          'Monitor Name': record.monitor_name || '',
          'Total Readings': record.readings?.length || 0,
        }
        
        // Add readings as separate columns
        if (record.readings && record.readings.length > 0) {
          record.readings.forEach((reading: any, index: number) => {
            flatRecord[`Reading ${index + 1} - Hour`] = reading.hour || ''
            flatRecord[`Reading ${index + 1} - BF`] = reading.bf || ''
            flatRecord[`Reading ${index + 1} - B.NF`] = reading.bnf || ''
            flatRecord[`Reading ${index + 1} - B.S.S`] = reading.bss || ''
            flatRecord[`Reading ${index + 1} - Sensitivity`] = reading.sensitivity || ''
            flatRecord[`Reading ${index + 1} - Noise Alarm`] = reading.noiseAlarm || ''
            flatRecord[`Reading ${index + 1} - Rejecting Arm`] = reading.rejectingArm || ''
            flatRecord[`Reading ${index + 1} - Observation`] = reading.observation || ''
            flatRecord[`Reading ${index + 1} - Corrective Actions`] = reading.correctiveActions || ''
          })
        }
        
        const fileName = `metal_detector_${record.date_string || 'data'}_${record.orden || ''}`
        exportRecord(flatRecord, fileName, format)
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
        if (selected === 'Process Environmental Temperature Control' || selected === 'Metal Detector (PCC #1)') {
          // For Temp and Metal Detector checklists, use pdf_url directly from record
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
          file.name.toLowerCase().includes(orden.toLowerCase()) &&
          file.name.endsWith('.xlsx')
        )
        if (excelFile) {
          const { data: { publicUrl } } = supabase.storage
            .from('checklistcalidad')
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
            <option value="Process Environmental Temperature Control">Process Environmental Temperature Control</option>
            <option value="Metal Detector (PCC #1)">Metal Detector (PCC #1)</option>
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
          <label htmlFor="producto" className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
          <input
            type="text"
            id="producto"
            value={producto}
            onChange={(e) => setProducto(e.target.value)}
            placeholder="Producto"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        {(selected === 'Checklist Monoproducto' || selected === 'Checklist Mix Producto' || selected === 'Metal Detector (PCC #1)') && (
          <div>
            <label htmlFor="marca" className="block text-sm font-medium text-gray-700 mb-1">Marca/Cliente</label>
            <input
              type="text"
              id="marca"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              placeholder="Marca/Cliente"
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
                {selected !== 'Process Environmental Temperature Control' && selected !== 'Metal Detector (PCC #1)' && (
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
                {selected === 'Metal Detector (PCC #1)' && (
                  <>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Orden</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Process Line</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Brand</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Monitor</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Lecturas</th>
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
                  {selected !== 'Process Environmental Temperature Control' && selected !== 'Metal Detector (PCC #1)' && (
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
                  {selected === 'Metal Detector (PCC #1)' && (
                    <>
                      <td className="px-4 py-2 text-sm text-gray-800">{record.orden || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">{record.process_line || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">{record.brand || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">{record.monitor_name || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {record.readings?.length || 0} lectura(s)
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