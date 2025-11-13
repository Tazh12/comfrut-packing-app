'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { ArrowLeft } from 'lucide-react'
import * as XLSX from 'xlsx'

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

  const handleSearch = async () => {
    if (!selected) {
      showToast('Seleccione un checklist', 'error')
      return
    }
    setLoading(true)
    setHasSearched(true)
    let query: any = null
    if (selected === 'Checklist Monoproducto') {
      query = supabase.from('checklist_calidad_monoproducto').select('*')
    } else if (selected === 'Ensayos Microbiológicos Lab PT') {
      query = supabase.from('resultados_microbiologicos_labpt').select('*')
    }

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
    if (selected === 'Checklist Monoproducto' && marca) {
      query = query.ilike('marca', `%${marca}%`)
    }

    const { data, error } = await query
    if (error) {
      showToast('Error al buscar registros', 'error')
      setLoading(false)
      return
    }
    setResults(data || [])
    setLoading(false)
  }

  const handleViewDetail = (record: any) => {
    setSelectedRecord(record)
    setShowModal(true)
  }

  // Función para generar y descargar Excel desde datos de Supabase
  const handleExportExcelData = async () => {
    if (!selectedRecord) return
    const orden = selectedRecord.orden_fabricacion
    try {
      const { data, error } = await supabase
        .from('checklist_calidad_monoproducto')
        .select('*')
        .eq('orden_fabricacion', orden)
      console.log('Exportar datos:', data)
      if (error || !data || data.length === 0) {
        showToast('No se encontraron datos para exportar', 'error')
        return
      }
      const record = data[0]
      // Generación de Excel en formato horizontal
      const headers = Object.keys(record)
      const values = Object.values(record).map((v: any) => v ?? '')
      const ws = XLSX.utils.aoa_to_sheet([headers, values])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Checklist')
      ;(XLSX as any).writeFile(wb, `checklist_monoproducto_${orden}.xlsx`)
    } catch (err: any) {
      console.error('Error exportando Excel:', err)
      showToast('Error al exportar Excel', 'error')
    }
  }

  // Fetch PDF and Excel URLs when a record is selected
  useEffect(() => {
    if (!showModal || !selectedRecord || selected !== 'Checklist Monoproducto') return

    setLoadingFiles(true)
    setPdfUrl(null)
    setExcelUrl(null)

    ;(async () => {
      try {
        const { data: fileList, error: listError } = await supabase.storage
          .from('checklistcalidad')
          .list('', { limit: 1000 })

        if (listError) throw listError
        if (!fileList || fileList.length === 0) return

        const orden = selectedRecord.orden_fabricacion

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
  }, [showModal, selectedRecord])

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
            <option value="Ensayos Microbiológicos Lab PT">Ensayos Microbiológicos Lab PT</option>
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
        {selected === 'Checklist Monoproducto' && (
          <div>
            <label htmlFor="marca" className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
            <input
              type="text"
              id="marca"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              placeholder="Marca"
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
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Orden de fabricación</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">SKU</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Producto</th>
                {selected === 'Checklist Monoproducto' && (
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Marca</th>
                )}
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {results.map((record: any) => (
                <tr key={record.id ?? record.orden_fabricacion}>
                  <td className="px-4 py-2 text-sm text-gray-800">{record.fecha}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{record.orden_fabricacion}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{record.sku}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{record.producto}</td>
                  {selected === 'Checklist Monoproducto' && (
                    <td className="px-4 py-2 text-sm text-gray-800">{record.marca}</td>
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
                <div className="flex space-x-4 mb-4">
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
                  {excelUrl ? (
                    <a
                      href={excelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Descargar Excel
                    </a>
                  ) : (
                    <p className="text-center">Archivo Excel no disponible</p>
                  )}
                  {selected === 'Checklist Monoproducto' && selectedRecord && (
                    <button
                      onClick={handleExportExcelData}
                      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      Descargar Excel
                    </button>
                  )}
                </div>
              </>
            )}
            <button
              onClick={() => setShowModal(false)}
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