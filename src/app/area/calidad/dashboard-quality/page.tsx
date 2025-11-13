'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { fetchChecklistEnvTempData } from '@/lib/supabase/checklistEnvTemp'
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
  ReferenceLine
} from 'recharts'

interface ChecklistRecord {
  id: string
  date_string: string
  shift: string
  monitor_name: string
  readings: Array<{
    time: string
    digitalThermometer: number
    wallThermometer: number
    averageTemp: number
    status: string
    observation: string | null
  }>
  created_at?: string
}

interface ChartDataPoint {
  date: string
  time: string
  averageTemp: number
  digitalTemp: number
  wallTemp: number
  status: string
  shift: string
}

interface DailyStats {
  date: string
  avgTemp: number
  minTemp: number
  maxTemp: number
  withinRange: number
  outOfRange: number
  totalReadings: number
}

export default function DashboardQualityPage() {
  const { showToast } = useToast()
  const [selectedChecklist, setSelectedChecklist] = useState('Process Environmental Temperature Control')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ChecklistRecord[]>([])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])

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
      const records = await fetchChecklistEnvTempData(startDate, endDate)
      setData(records)

      // Process data for charts
      const processedData: ChartDataPoint[] = []
      records.forEach((record: ChecklistRecord) => {
        record.readings?.forEach((reading) => {
          processedData.push({
            date: record.date_string,
            time: `${record.date_string} ${reading.time}`,
            averageTemp: reading.averageTemp,
            digitalTemp: reading.digitalThermometer,
            wallTemp: reading.wallThermometer,
            status: reading.status,
            shift: record.shift
          })
        })
      })

      // Sort by date and time
      processedData.sort((a, b) => {
        const dateA = new Date(a.time).getTime()
        const dateB = new Date(b.time).getTime()
        return dateA - dateB
      })

      setChartData(processedData)

      // Calculate daily statistics
      const statsMap = new Map<string, DailyStats>()
      
      processedData.forEach((point) => {
        const date = point.date
        if (!statsMap.has(date)) {
          statsMap.set(date, {
            date,
            avgTemp: 0,
            minTemp: Infinity,
            maxTemp: -Infinity,
            withinRange: 0,
            outOfRange: 0,
            totalReadings: 0
          })
        }
        
        const stats = statsMap.get(date)!
        stats.totalReadings++
        stats.avgTemp += point.averageTemp
        stats.minTemp = Math.min(stats.minTemp, point.averageTemp)
        stats.maxTemp = Math.max(stats.maxTemp, point.averageTemp)
        
        if (point.status === 'Within Range') {
          stats.withinRange++
        } else {
          stats.outOfRange++
        }
      })

      // Calculate averages
      const dailyStatsArray = Array.from(statsMap.values()).map((stats) => ({
        ...stats,
        avgTemp: stats.avgTemp / stats.totalReadings
      }))

      dailyStatsArray.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      setDailyStats(dailyStatsArray)
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Error al cargar los datos', 'error')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  // Fetch data when dates or checklist changes
  useEffect(() => {
    if (startDate && endDate && selectedChecklist === 'Process Environmental Temperature Control') {
      loadData()
    }
  }, [startDate, endDate, selectedChecklist, loadData])

  const handleFilter = () => {
    if (!startDate || !endDate) {
      showToast('Por favor selecciona un rango de fechas', 'error')
      return
    }
    loadData()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/area/calidad"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard Quality</h1>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <option value="Process Environmental Temperature Control">
                  Process Environmental Temperature Control
                </option>
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
            
            <div className="flex items-end">
              <button
                onClick={handleFilter}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Cargando...' : 'Filtrar'}
              </button>
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
                <p className="text-2xl font-bold text-gray-900">{data.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Lecturas</h3>
                <p className="text-2xl font-bold text-gray-900">{chartData.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Temperatura Promedio</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {chartData.length > 0
                    ? (chartData.reduce((sum, d) => sum + d.averageTemp, 0) / chartData.length).toFixed(1)
                    : '0.0'}°F
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Dentro del Rango</h3>
                <p className="text-2xl font-bold text-green-600">
                  {chartData.filter((d) => d.status === 'Within Range').length}
                </p>
              </div>
            </div>

            {/* Temperature Trend Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Tendencia de Temperatura</h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="time"
                    stroke="#6b7280"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval="preserveStartEnd"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    label={{ value: 'Temperatura (°F)', angle: -90, position: 'insideLeft' }}
                    domain={[35, 55]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px'
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}°F`, 'Temperatura Promedio']}
                  />
                  <Legend />
                  <ReferenceLine y={42} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Límite Inferior (42°F)', position: 'topRight' }} />
                  <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Límite Superior (50°F)', position: 'topRight' }} />
                  <Line
                    type="monotone"
                    dataKey="averageTemp"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Temperatura Promedio"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Daily Statistics and Status Distribution Tables - Side by Side */}
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
                          Mín (°F)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Prom (°F)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Máx (°F)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lecturas
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
                            {stat.minTemp.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">
                            {stat.avgTemp.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {stat.maxTemp.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {stat.totalReadings}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status Distribution Table */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Distribución de Estados</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dentro del Rango
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fuera del Rango
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dailyStats.map((stat) => (
                        <tr key={stat.date} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {stat.date}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {stat.withinRange}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {stat.outOfRange}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">
                            {stat.totalReadings}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Temperature Comparison Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Comparación de Termómetros</h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData.slice(0, 50)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="time"
                    stroke="#6b7280"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval="preserveStartEnd"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    label={{ value: 'Temperatura (°F)', angle: -90, position: 'insideLeft' }}
                    domain={[35, 55]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px'
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}°F`, '']}
                  />
                  <Legend />
                  <ReferenceLine y={42} stroke="#ef4444" strokeDasharray="5 5" />
                  <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="5 5" />
                  <Line
                    type="monotone"
                    dataKey="digitalTemp"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Termómetro Digital"
                  />
                  <Line
                    type="monotone"
                    dataKey="wallTemp"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Termómetro de Pared"
                  />
                  <Line
                    type="monotone"
                    dataKey="averageTemp"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Promedio"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

