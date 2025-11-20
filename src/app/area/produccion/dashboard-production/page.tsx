'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface PackagingRecord {
  id: string
  fecha: string
  marca: string
  material: string
  sku: string
  orden_fabricacion: string
  jefe_linea: string
  operador_maquina: string
  items: any[]
  pdf_url: string
}

interface ChartDataPoint {
  date: string
  totalRecords: number
  totalOrders: number
  totalBrands: number
  totalProducts: number
}

type DailyStats = {
  date: string
  totalRecords: number
  totalOrders: number
  uniqueBrands: number
  uniqueProducts: number
  complianceRate: number
}

export default function DashboardProductionPage() {
  const { showToast } = useToast()
  const [selectedChecklist, setSelectedChecklist] = useState('Checklist de Packaging')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedOrden, setSelectedOrden] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<PackagingRecord[]>([])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [summaryStats, setSummaryStats] = useState<any>({})
  const [availableOrdens, setAvailableOrdens] = useState<string[]>([])
  const [availableBrands, setAvailableBrands] = useState<string[]>([])
  const [availableProducts, setAvailableProducts] = useState<string[]>([])

  // Set default date range to last 30 days
  useEffect(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)
    
    setEndDate(today.toISOString().split('T')[0])
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
  }, [])

  // Load data function
  const loadData = useCallback(async () => {
    if (!startDate || !endDate) {
      return
    }
    
    try {
      setLoading(true)
      
      // Fetch packaging checklist data
      let query = supabase
        .from('checklist_packing')
        .select('*')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .order('fecha', { ascending: false })

      const { data: records, error } = await query
      
      if (error) {
        throw error
      }

      if (!records || records.length === 0) {
        setData([])
        setChartData([])
        setDailyStats([])
        setSummaryStats({})
        setAvailableOrdens([])
        setAvailableBrands([])
        setAvailableProducts([])
        return
      }

      // Extract available options
      let availableOrdens = Array.from(new Set(records.map((r: any) => r.orden_fabricacion).filter(Boolean))).sort()
      let availableBrands = Array.from(new Set(records.map((r: any) => r.marca).filter(Boolean))).sort()
      let availableProducts = Array.from(new Set(records.map((r: any) => r.material).filter(Boolean))).sort()

      // Apply cascading filter logic
      if (selectedOrden) {
        const ordenRecords = records.filter((r: any) => 
          r.orden_fabricacion?.toLowerCase().includes(selectedOrden.toLowerCase())
        )
        availableBrands = Array.from(new Set(ordenRecords.map((r: any) => r.marca).filter(Boolean))).sort()
        availableProducts = Array.from(new Set(ordenRecords.map((r: any) => r.material).filter(Boolean))).sort()
        
        if (selectedBrand && !availableBrands.includes(selectedBrand)) {
          setSelectedBrand('')
        }
        if (selectedProduct && !availableProducts.includes(selectedProduct)) {
          setSelectedProduct('')
        }
      }

      if (selectedBrand) {
        const brandRecords = records.filter((r: any) => 
          r.marca?.toLowerCase() === selectedBrand.toLowerCase()
        )
        availableOrdens = Array.from(new Set(brandRecords.map((r: any) => r.orden_fabricacion).filter(Boolean))).sort()
        availableProducts = Array.from(new Set(brandRecords.map((r: any) => r.material).filter(Boolean))).sort()
        
        if (selectedOrden && !availableOrdens.some(o => o.toLowerCase().includes(selectedOrden.toLowerCase()))) {
          setSelectedOrden('')
        }
        if (selectedProduct && !availableProducts.includes(selectedProduct)) {
          setSelectedProduct('')
        }
      }

      if (selectedProduct) {
        const productRecords = records.filter((r: any) => 
          r.material?.toLowerCase() === selectedProduct.toLowerCase()
        )
        availableOrdens = Array.from(new Set(productRecords.map((r: any) => r.orden_fabricacion).filter(Boolean))).sort()
        availableBrands = Array.from(new Set(productRecords.map((r: any) => r.marca).filter(Boolean))).sort()
        
        if (selectedOrden && !availableOrdens.some(o => o.toLowerCase().includes(selectedOrden.toLowerCase()))) {
          setSelectedOrden('')
        }
        if (selectedBrand && !availableBrands.includes(selectedBrand)) {
          setSelectedBrand('')
        }
      }

      setAvailableOrdens(availableOrdens)
      setAvailableBrands(availableBrands)
      setAvailableProducts(availableProducts)

      // Apply all filters to get final data
      let finalRecords = records as PackagingRecord[]
      if (selectedOrden) {
        finalRecords = finalRecords.filter((r) => 
          r.orden_fabricacion?.toLowerCase().includes(selectedOrden.toLowerCase())
        )
      }
      if (selectedBrand) {
        finalRecords = finalRecords.filter((r) => 
          r.marca?.toLowerCase() === selectedBrand.toLowerCase()
        )
      }
      if (selectedProduct) {
        finalRecords = finalRecords.filter((r) => 
          r.material?.toLowerCase() === selectedProduct.toLowerCase()
        )
      }

      setData(finalRecords)

      // Process data for charts - group by date
      const dateMap = new Map<string, {
        date: string
        records: number
        orders: Set<string>
        brands: Set<string>
        products: Set<string>
        compliantItems: number
        totalItems: number
      }>()

      finalRecords.forEach((record) => {
        const date = record.fecha
        if (!dateMap.has(date)) {
          dateMap.set(date, {
            date,
            records: 0,
            orders: new Set(),
            brands: new Set(),
            products: new Set(),
            compliantItems: 0,
            totalItems: 0
          })
        }
        
        const dayData = dateMap.get(date)!
        dayData.records++
        dayData.orders.add(record.orden_fabricacion)
        dayData.brands.add(record.marca)
        dayData.products.add(record.material)

        // Calculate compliance from items
        if (record.items && Array.isArray(record.items)) {
          record.items.forEach((item: any) => {
            dayData.totalItems++
            if (item.status === 'cumple' || item.estado === 'cumple') {
              dayData.compliantItems++
            }
          })
        }
      })

      const chartDataArray: ChartDataPoint[] = Array.from(dateMap.values()).map((stats) => ({
        date: stats.date,
        totalRecords: stats.records,
        totalOrders: stats.orders.size,
        totalBrands: stats.brands.size,
        totalProducts: stats.products.size
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      setChartData(chartDataArray)

      // Calculate daily stats
      const dailyStatsArray: DailyStats[] = Array.from(dateMap.values()).map((stats) => ({
        date: stats.date,
        totalRecords: stats.records,
        totalOrders: stats.orders.size,
        uniqueBrands: stats.brands.size,
        uniqueProducts: stats.products.size,
        complianceRate: stats.totalItems > 0 
          ? (stats.compliantItems / stats.totalItems) * 100
          : 0
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      setDailyStats(dailyStatsArray)

      // Calculate summary stats
      const totalRecords = finalRecords.length
      const totalOrders = new Set(finalRecords.map(r => r.orden_fabricacion)).size
      const totalBrands = new Set(finalRecords.map(r => r.marca)).size
      const totalProducts = new Set(finalRecords.map(r => r.material)).size
      
      // Calculate overall compliance
      let totalCompliantItems = 0
      let totalItems = 0
      finalRecords.forEach((record) => {
        if (record.items && Array.isArray(record.items)) {
          record.items.forEach((item: any) => {
            totalItems++
            if (item.status === 'cumple' || item.estado === 'cumple') {
              totalCompliantItems++
            }
          })
        }
      })
      
      const overallComplianceRate = totalItems > 0 
        ? ((totalCompliantItems / totalItems) * 100).toFixed(1)
        : '0.0'

      setSummaryStats({
        totalRecords,
        totalOrders,
        totalBrands,
        totalProducts,
        complianceRate: overallComplianceRate,
        totalItems,
        compliantItems: totalCompliantItems
      })
      
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Error al cargar los datos', 'error')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, selectedOrden, selectedBrand, selectedProduct, showToast])

  // Reset filters when checklist changes
  useEffect(() => {
    setSelectedOrden('')
    setSelectedBrand('')
    setSelectedProduct('')
    setAvailableOrdens([])
    setAvailableBrands([])
    setAvailableProducts([])
  }, [selectedChecklist])

  // Fetch data when dates, checklist, or filters change
  useEffect(() => {
    if (startDate && endDate) {
      loadData()
    }
  }, [startDate, endDate, selectedChecklist, selectedOrden, selectedBrand, selectedProduct, loadData])

  const handleFilter = () => {
    if (!startDate || !endDate) {
      showToast('Por favor selecciona un rango de fechas', 'error')
      return
    }
    loadData()
  }

  const handleClearFilters = () => {
    setSelectedOrden('')
    setSelectedBrand('')
    setSelectedProduct('')
    // Reset dates to default (last 30 days)
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)
    setEndDate(today.toISOString().split('T')[0])
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/area/produccion"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard Producción</h1>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label htmlFor="checklist" className="block text-sm font-medium text-gray-700 mb-1">
                Checklist
              </label>
              <select
                id="checklist"
                value={selectedChecklist}
                onChange={(e) => setSelectedChecklist(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
              >
                <option value="Checklist de Packaging">Checklist de Packaging</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha desde
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
              />
            </div>
            
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha hasta
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
              />
            </div>
            
            <div className="flex items-end gap-2">
              <button
                onClick={handleFilter}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Cargando...' : 'Filtrar'}
              </button>
              <button
                onClick={handleClearFilters}
                disabled={loading}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Limpiar
              </button>
            </div>
          </div>
          
          {/* Additional Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
            <div>
              <label htmlFor="orden" className="block text-sm font-medium text-gray-700 mb-1">
                Orden
              </label>
              <select
                id="orden"
                value={selectedOrden}
                onChange={(e) => setSelectedOrden(e.target.value)}
                disabled={availableOrdens.length === 0}
                className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Todas las órdenes</option>
                {availableOrdens.map((orden) => (
                  <option key={orden} value={orden}>
                    {orden}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                Marca/Brand
              </label>
              <select
                id="brand"
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                disabled={availableBrands.length === 0}
                className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Todas las marcas</option>
                {availableBrands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="product" className="block text-sm font-medium text-gray-700 mb-1">
                Producto
              </label>
              <select
                id="product"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                disabled={availableProducts.length === 0}
                className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Todos los productos</option>
                {availableProducts.map((product) => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-600">No hay datos disponibles para el rango de fechas seleccionado.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Registros</h3>
                <p className="text-2xl font-bold text-gray-900">{summaryStats.totalRecords || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Órdenes</h3>
                <p className="text-2xl font-bold text-gray-900">{summaryStats.totalOrders || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Tasa de Cumplimiento</h3>
                <p className="text-2xl font-bold text-green-600">{summaryStats.complianceRate || '0.0'}%</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Marcas Únicas</h3>
                <p className="text-2xl font-bold text-gray-900">{summaryStats.totalBrands || 0}</p>
              </div>
            </div>

            {/* Charts Section */}
            {/* Registros por Fecha Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Registros por Fecha</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="totalRecords" fill="#3b82f6" name="Registros" />
                  <Bar dataKey="totalOrders" fill="#10b981" name="Órdenes Únicas" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Marcas y Productos por Fecha */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Marcas y Productos por Fecha</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="totalBrands" fill="#8b5cf6" name="Marcas Únicas" />
                  <Bar dataKey="totalProducts" fill="#f59e0b" name="Productos Únicos" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tasa de Cumplimiento por Día */}
            {dailyStats.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Tasa de Cumplimiento por Día</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      stroke="#6b7280"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      stroke="#6b7280"
                      label={{ value: 'Tasa de Cumplimiento (%)', angle: -90, position: 'insideLeft' }}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px'
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Tasa de Cumplimiento']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="complianceRate"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Tasa de Cumplimiento (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Daily Statistics Tables */}
            {dailyStats.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Statistics Table */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Estadísticas Diarias</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Registros
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Órdenes
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tasa (%)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dailyStats.map((stat) => (
                          <tr key={stat.date} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {stat.date}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              {stat.totalRecords}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              {stat.totalOrders}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">
                              {stat.complianceRate.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Brands and Products Table */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Marcas y Productos por Día</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Marcas Únicas
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Productos Únicos
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dailyStats.map((stat) => (
                          <tr key={stat.date} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {stat.date}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              {stat.uniqueBrands}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              {stat.uniqueProducts}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

