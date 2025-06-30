'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { getChecklistRecords, ChecklistRecord, initialChecklistItems } from '@/lib/checklist'
import { useToast } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import * as XLSX from 'xlsx'

export default function HistorialPage() {
  const { showToast } = useToast()
  const [records, setRecords] = useState<ChecklistRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      setProducts(data)
      setBrands(Array.from(new Set(data.map((p: any) => p.brand))))
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

  // Obtener registros al cambiar filtros o checklist seleccionado
  useEffect(() => {
    async function fetchFiltered() {
      setLoading(true)
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
      } catch (err) {
        console.error(err)
        showToast('Error cargando historial', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchFiltered()
  }, [dateFrom, dateTo, ordenFabricacionFilter, selectedBrand, selectedMaterial, selectedChecklist])

  // Helper para estado global del checklist
  const getOverallStatus = (items: ChecklistRecord['items']): string => {
    if (items.every((i) => i.estado === 'cumple')) return 'Cumple'
    if (items.some((i) => i.estado === 'no_cumple')) return 'No cumple'
    return ''
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
  }

  // Función para descargar Excel de un registro (horizontal)
  const handleDownloadExcel = (record: ChecklistRecord) => {
    // Cabecera
    const headers = [
      'Fecha', 'Orden de Fabricación', 'Marca', 'Material', 'SKU', 'Jefe de línea', 'Operador',
      ...initialChecklistItems.map(item => item.nombre),
      'Comentarios', 'Acción correctiva'
    ]
    // Fila de datos generales
    const row = [
      record.fecha,
      record.orden_fabricacion,
      record.marca,
      record.material,
      record.sku,
      record.jefe_linea,
      record.operador_maquina
    ]
    // Agregar estado de cada ítem correctamente (Cumple / No cumple / N/A) comparando por nombre
    initialChecklistItems.forEach(master => {
      const recItem = (record as any).items.find((i: any) =>
        i.nombre.trim().toLowerCase() === master.nombre.trim().toLowerCase()
      )
      // Priorizar .status si existe, sino .estado
      const st = recItem?.status ?? recItem?.estado
      let status = 'N/A'
      if (st === 'cumple') status = 'Cumple'
      else if (st === 'no_cumple') status = 'No cumple'
      // si st es otro valor o undefined, queda 'N/A'
      row.push(status)
    })
    // Comentarios y acciones correctivas
    const comments = (record as any).items
      .filter((i: any) => i.comment)
      .map((i: any) => `${i.nombre}: ${i.comment}`)
      .join('; ')
    const actions = (record as any).items
      .filter((i: any) => i.correctiveAction)
      .map((i: any) => `${i.nombre}: ${i.correctiveAction}`)
      .join('; ')
    row.push(comments, actions)
    // Construir hoja y libro
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, row])
    XLSX.utils.book_append_sheet(wb, ws, 'Checklist')
    const fileName = `${record.fecha}_${record.orden_fabricacion}_${record.material}.xlsx`;
    ;(XLSX as any).writeFile(wb, fileName);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Link href="/area/produccion" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <span className="mr-2">←</span>
          <span>Volver a Producción</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Historial de Producción</h1>

        {/* UI de filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6 mb-4">
          <div>
            <label>Checklist</label>
            <select className="mt-1 block w-full" value={selectedChecklist} onChange={e => setSelectedChecklist(e.target.value)}>
              {checklists.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label>Año</label>
            <select className="mt-1 block w-full" value={year} onChange={e => setYear(e.target.value)}>
              <option value="">Todos</option>
              {years.map(y => <option key={y} value={`${y}`}>{y}</option>)}
            </select>
          </div>
          <div>
            <label>Mes</label>
            <select className="mt-1 block w-full" value={month} onChange={e => setMonth(e.target.value)}>
              <option value="">Todos</option>
              {months.map(m => <option key={m.value} value={`${m.value}`}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label>Semana</label>
            <select className="mt-1 block w-full" value={week} onChange={e => setWeek(e.target.value)}>
              <option value="">Todas</option>
              {weeks.map((w, i) => <option key={i} value={`${i}`}>{w.label}</option>)}
            </select>
          </div>
          <div>
            <label>Fecha desde</label>
            <input type="date" className="mt-1 block w-full" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setWeek('') }} />
          </div>
          <div>
            <label>Fecha hasta</label>
            <input type="date" className="mt-1 block w-full" value={dateTo} onChange={e => { setDateTo(e.target.value); setWeek('') }} />
          </div>
          <div>
            <label>Orden de fabricación</label>
            <input type="text" className="mt-1 block w-full" value={ordenFabricacionFilter} onChange={e => setOrdenFabricacionFilter(e.target.value)} />
          </div>
          <div>
            <label>Marca</label>
            <select className="mt-1 block w-full" value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}>
              <option value="">Todas</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label>Material</label>
            <select className="mt-1 block w-full" value={selectedMaterial} onChange={e => setSelectedMaterial(e.target.value)}>
              <option value="">Todos</option>
              {materials.map(mat => <option key={mat} value={mat}>{mat}</option>)}
            </select>
          </div>
          <div>
            <label>SKU</label>
            <select className="mt-1 block w-full" value={selectedSku} onChange={e => setSelectedSku(e.target.value)}>
              <option value="">Todos</option>
              {skus.map(sk => <option key={sk} value={sk}>{sk}</option>)}
            </select>
          </div>
        </div>

        {/* Botón para limpiar filtros */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
          >
            🗑️ Limpiar filtros
          </button>
        </div>

        {loading && <p className="mt-4">Cargando historial...</p>}
        {error && <p className="mt-4 text-red-500">{error}</p>}
        {!loading && !error && records.length === 0 && (
          <p className="mt-4">No hay registros disponibles.</p>
        )}
        {!loading && !error && records.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden de Fabricación</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PDF</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.fecha}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.orden_fabricacion}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.marca}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.material}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-4">
                        <a href={record.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          Ver PDF
                        </a>
                        <button onClick={() => handleDownloadExcel(record)} className="text-green-600 hover:underline">
                          📥 Descargar Excel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
} 