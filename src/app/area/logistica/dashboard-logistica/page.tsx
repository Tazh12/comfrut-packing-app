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

interface DispatchRecord {
  id: string
  date: string
  po_number: string
  client: string
  container_number: string
  driver: string
  origin: string
  destination: string
  inspector_name: string
  inspection_temps: string
  inspection_result: 'Approve' | 'Reject'
  dispatch_plan: Array<{
    id: string
    name: string
    expected_pallets?: number
    cases_per_pallet?: number
  }>
  loading_map: Array<{
    slot_id: number
    pallet_id: string
    product_id: string
    cases: number
    checks: {
      case_condition: boolean
      pallet_condition: boolean
      wrap_condition: boolean
      coding_box: boolean
      label: boolean
      additional_label: boolean
    }
  }>
  container_inspection: Record<string, { status: 'G' | 'NG', comment: string }>
  seal_number: string
  created_at: string
}

type DispatchDailyStats = {
  date: string
  totalDispatches: number
  approved: number
  rejected: number
  totalPallets: number
  totalCases: number
  avgTemp: number
  tempCompliant: number
  tempWarning: number
  tempNonCompliant: number
  approvalRate: string
}

const COLORS = {
  approved: '#10b981',
  rejected: '#ef4444',
  compliant: '#10b981',
  warning: '#f59e0b',
  nonCompliant: '#ef4444'
}

export default function DashboardLogisticaPage() {
  const { showToast } = useToast()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedInspector, setSelectedInspector] = useState('')
  const [selectedPoNumber, setSelectedPoNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<DispatchRecord[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [dailyStats, setDailyStats] = useState<DispatchDailyStats[]>([])
  const [summaryStats, setSummaryStats] = useState<any>({})
  const [availableClients, setAvailableClients] = useState<string[]>([])
  const [availableInspectors, setAvailableInspectors] = useState<string[]>([])
  const [availablePoNumbers, setAvailablePoNumbers] = useState<string[]>([])

  // Set default date range to last 30 days
  useEffect(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)
    
    setEndDate(today.toISOString().split('T')[0])
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
  }, [])

  // Parse temperature and determine compliance
  const parseTemperature = (tempStr: string | null): { value: number | null, status: 'compliant' | 'warning' | 'nonCompliant' | null } => {
    if (!tempStr) return { value: null, status: null }
    const match = tempStr.match(/-?\d+\.?\d*/)
    if (!match) return { value: null, status: null }
    const value = parseFloat(match[0])
    if (value <= -18) return { value, status: 'compliant' }
    if (value > -18 && value <= -10) return { value, status: 'warning' }
    if (value > -10) return { value, status: 'nonCompliant' }
    return { value, status: null }
  }

  // Load data function
  const loadData = useCallback(async () => {
    if (!startDate || !endDate) {
      return
    }
    
    try {
      setLoading(true)
      
      let query = supabase
        .from('checklist_frozen_product_dispatch')
        .select('*')
        .gte('date', `${startDate}T00:00:00Z`)
        .lte('date', `${endDate}T23:59:59Z`)
        .order('date', { ascending: false })

      // Apply filters
      if (selectedClient) {
        query = query.ilike('client', `%${selectedClient}%`)
      }
      if (selectedInspector) {
        query = query.ilike('inspector_name', `%${selectedInspector}%`)
      }
      if (selectedPoNumber) {
        query = query.ilike('po_number', `%${selectedPoNumber}%`)
      }

      const { data: records, error } = await query

      if (error) {
        console.error('Error loading data:', error)
        showToast('Error al cargar datos', 'error')
        setData([])
        return
      }

      const dispatchRecords = (records || []) as DispatchRecord[]
      setData(dispatchRecords)

      // Extract available filter options
      const clients = Array.from(new Set(dispatchRecords.map(r => r.client).filter(Boolean))).sort()
      const inspectors = Array.from(new Set(dispatchRecords.map(r => r.inspector_name).filter(Boolean))).sort()
      const poNumbers = Array.from(new Set(dispatchRecords.map(r => r.po_number).filter(Boolean))).sort()
      
      setAvailableClients(clients)
      setAvailableInspectors(inspectors)
      setAvailablePoNumbers(poNumbers)

      // Process data for charts
      const statsMap = new Map<string, DispatchDailyStats>()

      dispatchRecords.forEach((record) => {
        const date = new Date(record.date).toISOString().split('T')[0]
        
        if (!statsMap.has(date)) {
          statsMap.set(date, {
            date,
            totalDispatches: 0,
            approved: 0,
            rejected: 0,
            totalPallets: 0,
            totalCases: 0,
            avgTemp: 0,
            tempCompliant: 0,
            tempWarning: 0,
            tempNonCompliant: 0,
            approvalRate: '0.0'
          })
        }

        const stats = statsMap.get(date)!
        stats.totalDispatches++
        
        if (record.inspection_result === 'Approve') {
          stats.approved++
        } else if (record.inspection_result === 'Reject') {
          stats.rejected++
        }

        // Count pallets and cases
        if (Array.isArray(record.loading_map)) {
          stats.totalPallets += record.loading_map.length
          stats.totalCases += record.loading_map.reduce((sum, pallet) => sum + (pallet.cases || 0), 0)
        }

        // Temperature analysis
        const tempInfo = parseTemperature(record.inspection_temps)
        if (tempInfo.value !== null) {
          stats.avgTemp += tempInfo.value
          if (tempInfo.status === 'compliant') stats.tempCompliant++
          else if (tempInfo.status === 'warning') stats.tempWarning++
          else if (tempInfo.status === 'nonCompliant') stats.tempNonCompliant++
        }
      })

      // Calculate averages and rates
      const dailyStatsArray: DispatchDailyStats[] = Array.from(statsMap.values()).map((stats) => {
        const tempCount = stats.tempCompliant + stats.tempWarning + stats.tempNonCompliant
        return {
          ...stats,
          avgTemp: tempCount > 0 ? stats.avgTemp / tempCount : 0,
          approvalRate: stats.totalDispatches > 0 
            ? ((stats.approved / stats.totalDispatches) * 100).toFixed(1)
            : '0.0'
        }
      })

      dailyStatsArray.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      setDailyStats(dailyStatsArray)
      setChartData(dailyStatsArray)

      // Calculate summary statistics
      const totalDispatches = dispatchRecords.length
      const totalApproved = dispatchRecords.filter(r => r.inspection_result === 'Approve').length
      const totalRejected = dispatchRecords.filter(r => r.inspection_result === 'Reject').length
      const totalPallets = dispatchRecords.reduce((sum, r) => 
        sum + (Array.isArray(r.loading_map) ? r.loading_map.length : 0), 0)
      const totalCases = dispatchRecords.reduce((sum, r) => 
        sum + (Array.isArray(r.loading_map) ? r.loading_map.reduce((s, p) => s + (p.cases || 0), 0) : 0), 0)

      // Temperature stats
      const tempRecords = dispatchRecords.filter(r => r.inspection_temps)
      const tempValues: number[] = []
      let tempCompliant = 0
      let tempWarning = 0
      let tempNonCompliant = 0

      tempRecords.forEach(r => {
        const tempInfo = parseTemperature(r.inspection_temps)
        if (tempInfo.value !== null) {
          tempValues.push(tempInfo.value)
          if (tempInfo.status === 'compliant') tempCompliant++
          else if (tempInfo.status === 'warning') tempWarning++
          else if (tempInfo.status === 'nonCompliant') tempNonCompliant++
        }
      })

      const avgTemp = tempValues.length > 0 
        ? (tempValues.reduce((sum, v) => sum + v, 0) / tempValues.length).toFixed(1)
        : '0.0'

      // Top clients
      const clientMap = new Map<string, { count: number, pallets: number, cases: number }>()
      dispatchRecords.forEach(r => {
        if (r.client) {
          if (!clientMap.has(r.client)) {
            clientMap.set(r.client, { count: 0, pallets: 0, cases: 0 })
          }
          const clientStats = clientMap.get(r.client)!
          clientStats.count++
          if (Array.isArray(r.loading_map)) {
            clientStats.pallets += r.loading_map.length
            clientStats.cases += r.loading_map.reduce((sum, p) => sum + (p.cases || 0), 0)
          }
        }
      })
      const topClients = Array.from(clientMap.entries())
        .map(([client, stats]) => ({ client, ...stats }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Top products
      const productMap = new Map<string, { pallets: number, cases: number }>()
      dispatchRecords.forEach(r => {
        if (Array.isArray(r.loading_map)) {
          r.loading_map.forEach(pallet => {
            if (pallet.product_id && Array.isArray(r.dispatch_plan)) {
              const product = r.dispatch_plan.find(prod => prod.id === pallet.product_id)
              if (product) {
                const productName = product.name || 'Unknown'
                if (!productMap.has(productName)) {
                  productMap.set(productName, { pallets: 0, cases: 0 })
                }
                const productStats = productMap.get(productName)!
                productStats.pallets++
                productStats.cases += pallet.cases || 0
              }
            }
          })
        }
      })
      const topProducts = Array.from(productMap.entries())
        .map(([product, stats]) => ({ product, ...stats }))
        .sort((a, b) => b.pallets - a.pallets)
        .slice(0, 10)

      // Inspection point analysis
      const inspectionPointMap = new Map<string, { total: number, compliant: number, nonCompliant: number }>()
      const inspectionPointLabels: Record<string, string> = {
        left_side: 'Left Side / Lado Izquierdo',
        doors: 'Inside & Outside Doors / Puertas',
        floor: 'Floor (Inside) / Piso Interior',
        undercarriage: 'Outside & Undercarriage / Chasis y Exterior',
        front_wall: 'Front Wall / Pared Frontal',
        right_side: 'Right Side / Lado Derecho',
        ceiling_roof: 'Ceiling & Roof / Techo'
      }

      dispatchRecords.forEach(r => {
        if (r.container_inspection && typeof r.container_inspection === 'object') {
          Object.entries(r.container_inspection).forEach(([key, value]) => {
            if (value && typeof value === 'object' && 'status' in value) {
              if (!inspectionPointMap.has(key)) {
                inspectionPointMap.set(key, { total: 0, compliant: 0, nonCompliant: 0 })
              }
              const pointStats = inspectionPointMap.get(key)!
              pointStats.total++
              if (value.status === 'G') {
                pointStats.compliant++
              } else if (value.status === 'NG') {
                pointStats.nonCompliant++
              }
            }
          })
        }
      })

      const inspectionPointStats = Array.from(inspectionPointMap.entries())
        .map(([key, stats]) => ({
          point: inspectionPointLabels[key] || key,
          ...stats,
          complianceRate: stats.total > 0 
            ? ((stats.compliant / stats.total) * 100).toFixed(1)
            : '0.0'
        }))
        .sort((a, b) => parseFloat(b.complianceRate) - parseFloat(a.complianceRate))


      setSummaryStats({
        totalDispatches,
        totalApproved,
        totalRejected,
        totalPallets,
        totalCases,
        approvalRate: totalDispatches > 0 
          ? ((totalApproved / totalDispatches) * 100).toFixed(1)
          : '0.0',
        rejectionRate: totalDispatches > 0 
          ? ((totalRejected / totalDispatches) * 100).toFixed(1)
          : '0.0',
        avgTemp,
        tempCompliant,
        tempWarning,
        tempNonCompliant,
        tempComplianceRate: tempRecords.length > 0
          ? ((tempCompliant / tempRecords.length) * 100).toFixed(1)
          : '0.0',
        topClients,
        topProducts,
        inspectionPointStats
      })

    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Error al cargar datos', 'error')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, selectedClient, selectedInspector, selectedPoNumber, showToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const formatDate = (dateStr: string): string => {
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/area/logistica"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard Logística</h1>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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

            <div>
              <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <input
                type="text"
                id="client"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                placeholder="Filtrar por cliente..."
                list="clients-list"
                className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
              />
              <datalist id="clients-list">
                {availableClients.map(client => (
                  <option key={client} value={client} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="inspector" className="block text-sm font-medium text-gray-700 mb-1">
                Inspector
              </label>
              <input
                type="text"
                id="inspector"
                value={selectedInspector}
                onChange={(e) => setSelectedInspector(e.target.value)}
                placeholder="Filtrar por inspector..."
                list="inspectors-list"
                className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
              />
              <datalist id="inspectors-list">
                {availableInspectors.map(inspector => (
                  <option key={inspector} value={inspector} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="poNumber" className="block text-sm font-medium text-gray-700 mb-1">
                PO Number
              </label>
              <input
                type="text"
                id="poNumber"
                value={selectedPoNumber}
                onChange={(e) => setSelectedPoNumber(e.target.value)}
                placeholder="Filtrar por PO..."
                list="po-list"
                className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
              />
              <datalist id="po-list">
                {availablePoNumbers.map(po => (
                  <option key={po} value={po} />
                ))}
              </datalist>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedClient('')
                  setSelectedInspector('')
                  setSelectedPoNumber('')
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Despachos</h3>
                <p className="text-3xl font-bold text-gray-900">{summaryStats.totalDispatches || 0}</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Tasa de Aprobación</h3>
                <p className="text-3xl font-bold text-green-600">{summaryStats.approvalRate || '0.0'}%</p>
                <p className="text-xs text-gray-500 mt-1">
                  {summaryStats.totalApproved || 0} aprobados / {summaryStats.totalRejected || 0} rechazados
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Pallets</h3>
                <p className="text-3xl font-bold text-blue-600">{summaryStats.totalPallets || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {summaryStats.totalCases || 0} cajas totales
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Temp. Promedio</h3>
                <p className="text-3xl font-bold text-purple-600">{summaryStats.avgTemp || '0.0'}°C</p>
                <p className="text-xs text-gray-500 mt-1">
                  {summaryStats.tempCompliant || 0} cumplen / {summaryStats.tempWarning || 0} advertencia / {summaryStats.tempNonCompliant || 0} no cumplen
                </p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Dispatch Volume Over Time */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Volumen de Despachos por Fecha
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      stroke="#6b7280"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 11 }}
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
                    <Line
                      type="monotone"
                      dataKey="totalDispatches"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Despachos"
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalPallets"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Pallets"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Approval/Rejection Distribution */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Distribución Aprobación/Rechazo
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Aprobados', value: summaryStats.totalApproved || 0 },
                        { name: 'Rechazados', value: summaryStats.totalRejected || 0 }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill={COLORS.approved} />
                      <Cell fill={COLORS.rejected} />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Temperature Compliance */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Cumplimiento de Temperatura por Fecha
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      stroke="#6b7280"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 11 }}
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
                    <Bar dataKey="tempCompliant" fill={COLORS.compliant} name="Cumple" />
                    <Bar dataKey="tempWarning" fill={COLORS.warning} name="Advertencia" />
                    <Bar dataKey="tempNonCompliant" fill={COLORS.nonCompliant} name="No Cumple" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top Clients */}
              {summaryStats.topClients && summaryStats.topClients.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Top 10 Clientes por Despachos
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={summaryStats.topClients} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" stroke="#6b7280" />
                      <YAxis
                        dataKey="client"
                        type="category"
                        stroke="#6b7280"
                        width={120}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="count" fill="#3b82f6" name="Despachos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Daily Statistics */}
              {dailyStats.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Estadísticas Diarias
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Despachos
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Aprobados
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Pallets
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tasa
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dailyStats.map((stat) => (
                          <tr key={stat.date} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatDate(stat.date)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              {stat.totalDispatches}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {stat.approved}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              {stat.totalPallets}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                parseFloat(stat.approvalRate) >= 95 
                                  ? 'bg-green-100 text-green-800' 
                                  : parseFloat(stat.approvalRate) >= 80
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {stat.approvalRate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Top Products */}
              {summaryStats.topProducts && summaryStats.topProducts.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Top 10 Productos por Pallets
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Producto
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Pallets
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cajas
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {summaryStats.topProducts.map((item: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {item.product}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              {item.pallets}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              {item.cases}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Inspection Point Analysis */}
            {summaryStats.inspectionPointStats && summaryStats.inspectionPointStats.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Análisis de Puntos de Inspección
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Punto de Inspección
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cumple (G)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          No Cumple (NG)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tasa de Cumplimiento
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {summaryStats.inspectionPointStats.map((item: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {item.point}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {item.total}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {item.compliant}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {item.nonCompliant}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              parseFloat(item.complianceRate) >= 95 
                                ? 'bg-green-100 text-green-800' 
                                : parseFloat(item.complianceRate) >= 80
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {item.complianceRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  )
}

