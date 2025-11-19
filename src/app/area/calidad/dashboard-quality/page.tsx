'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { fetchChecklistEnvTempData } from '@/lib/supabase/checklistEnvTemp'
import { fetchChecklistMetalDetectorData } from '@/lib/supabase/checklistMetalDetector'
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
  ReferenceLine,
  PieChart,
  Pie,
  Cell
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

type DailyStats = 
  | {
      date: string
      avgTemp: number
      minTemp: number
      maxTemp: number
      withinRange: number
      outOfRange: number
      totalReadings: number
    }
  | {
      date: string
      totalReadings: number
      deviations: number
      compliant: number
      brands: number
      products: number
      complianceRate: string
    }

export default function DashboardQualityPage() {
  const { showToast } = useToast()
  const [selectedChecklist, setSelectedChecklist] = useState('Process Environmental Temperature Control')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedOrden, setSelectedOrden] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
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
      
      if (selectedChecklist === 'Process Environmental Temperature Control') {
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
        
        setSummaryStats({
          totalRecords: records.length,
          totalReadings: processedData.length,
          avgTemp: processedData.length > 0 
            ? (processedData.reduce((sum, d) => sum + d.averageTemp, 0) / processedData.length).toFixed(1)
            : '0.0',
          withinRange: processedData.filter((d) => d.status === 'Within Range').length
        })
        
      } else if (selectedChecklist === 'Metal Detector (PCC #1)') {
        let records = await fetchChecklistMetalDetectorData(startDate, endDate)
        
        // Cascading filter logic: Extract available options based on current selections
        let filteredForOptions = records
        
        // If orden is selected, filter by orden first
        if (selectedOrden) {
          filteredForOptions = filteredForOptions.filter((r: any) => 
            r.orden?.toLowerCase().includes(selectedOrden.toLowerCase())
          )
        }
        
        // If brand is selected, filter by brand
        if (selectedBrand) {
          filteredForOptions = filteredForOptions.filter((r: any) => 
            r.brand?.toLowerCase() === selectedBrand.toLowerCase()
          )
        }
        
        // If product is selected, filter by product
        if (selectedProduct) {
          filteredForOptions = filteredForOptions.filter((r: any) => 
            r.product?.toLowerCase() === selectedProduct.toLowerCase()
          )
        }
        
        // Extract available options based on cascading filters
        let availableOrdens = Array.from(new Set(records.map((r: any) => r.orden).filter(Boolean))).sort()
        let availableBrands = Array.from(new Set(records.map((r: any) => r.brand).filter(Boolean))).sort()
        let availableProducts = Array.from(new Set(records.map((r: any) => r.product).filter(Boolean))).sort()
        
        // Apply cascading: if orden selected, limit brands and products to that orden
        if (selectedOrden) {
          const ordenRecords = records.filter((r: any) => 
            r.orden?.toLowerCase().includes(selectedOrden.toLowerCase())
          )
          availableBrands = Array.from(new Set(ordenRecords.map((r: any) => r.brand).filter(Boolean))).sort()
          availableProducts = Array.from(new Set(ordenRecords.map((r: any) => r.product).filter(Boolean))).sort()
          
          // Clear brand/product if not available for selected orden
          if (selectedBrand && !availableBrands.includes(selectedBrand)) {
            setSelectedBrand('')
          }
          if (selectedProduct && !availableProducts.includes(selectedProduct)) {
            setSelectedProduct('')
          }
        }
        
        // Apply cascading: if brand selected, limit ordens and products to that brand
        if (selectedBrand) {
          const brandRecords = records.filter((r: any) => 
            r.brand?.toLowerCase() === selectedBrand.toLowerCase()
          )
          availableOrdens = Array.from(new Set(brandRecords.map((r: any) => r.orden).filter(Boolean))).sort()
          availableProducts = Array.from(new Set(brandRecords.map((r: any) => r.product).filter(Boolean))).sort()
          
          // Clear orden/product if not available for selected brand
          if (selectedOrden && !availableOrdens.some(o => o.toLowerCase().includes(selectedOrden.toLowerCase()))) {
            setSelectedOrden('')
          }
          if (selectedProduct && !availableProducts.includes(selectedProduct)) {
            setSelectedProduct('')
          }
        }
        
        // Apply cascading: if product selected, limit ordens and brands to that product
        if (selectedProduct) {
          const productRecords = records.filter((r: any) => 
            r.product?.toLowerCase() === selectedProduct.toLowerCase()
          )
          availableOrdens = Array.from(new Set(productRecords.map((r: any) => r.orden).filter(Boolean))).sort()
          availableBrands = Array.from(new Set(productRecords.map((r: any) => r.brand).filter(Boolean))).sort()
          
          // Clear orden/brand if not available for selected product
          if (selectedOrden && !availableOrdens.some(o => o.toLowerCase().includes(selectedOrden.toLowerCase()))) {
            setSelectedOrden('')
          }
          if (selectedBrand && !availableBrands.includes(selectedBrand)) {
            setSelectedBrand('')
          }
        }
        
        // If both orden and brand selected, further filter products
        if (selectedOrden && selectedBrand) {
          const ordenBrandRecords = records.filter((r: any) => 
            r.orden?.toLowerCase().includes(selectedOrden.toLowerCase()) &&
            r.brand?.toLowerCase() === selectedBrand.toLowerCase()
          )
          availableProducts = Array.from(new Set(ordenBrandRecords.map((r: any) => r.product).filter(Boolean))).sort()
          if (selectedProduct && !availableProducts.includes(selectedProduct)) {
            setSelectedProduct('')
          }
        }
        
        // If both brand and product selected, further filter ordens
        if (selectedBrand && selectedProduct) {
          const brandProductRecords = records.filter((r: any) => 
            r.brand?.toLowerCase() === selectedBrand.toLowerCase() &&
            r.product?.toLowerCase() === selectedProduct.toLowerCase()
          )
          availableOrdens = Array.from(new Set(brandProductRecords.map((r: any) => r.orden).filter(Boolean))).sort()
          if (selectedOrden && !availableOrdens.some(o => o.toLowerCase().includes(selectedOrden.toLowerCase()))) {
            setSelectedOrden('')
          }
        }
        
        // If both orden and product selected, further filter brands
        if (selectedOrden && selectedProduct) {
          const ordenProductRecords = records.filter((r: any) => 
            r.orden?.toLowerCase().includes(selectedOrden.toLowerCase()) &&
            r.product?.toLowerCase() === selectedProduct.toLowerCase()
          )
          availableBrands = Array.from(new Set(ordenProductRecords.map((r: any) => r.brand).filter(Boolean))).sort()
          if (selectedBrand && !availableBrands.includes(selectedBrand)) {
            setSelectedBrand('')
          }
        }
        
        setAvailableOrdens(availableOrdens)
        setAvailableBrands(availableBrands)
        setAvailableProducts(availableProducts)
        
        // Apply all filters to get final data
        let finalRecords = records
        if (selectedOrden) {
          finalRecords = finalRecords.filter((r: any) => 
            r.orden?.toLowerCase().includes(selectedOrden.toLowerCase())
          )
        }
        if (selectedBrand) {
          finalRecords = finalRecords.filter((r: any) => 
            r.brand?.toLowerCase() === selectedBrand.toLowerCase()
          )
        }
        if (selectedProduct) {
          finalRecords = finalRecords.filter((r: any) => 
            r.product?.toLowerCase() === selectedProduct.toLowerCase()
          )
        }
        
        setData(finalRecords)

        // Process data for charts
        const processedData: any[] = []
        const deviationData: any[] = []
        
        finalRecords.forEach((record: any) => {
          record.readings?.forEach((reading: any) => {
            const hasDeviation = reading.bf === 'ND' || reading.bnf === 'ND' || reading.bss === 'ND' ||
                                 reading.sensitivity === 'No comply' || reading.noiseAlarm === 'No comply' ||
                                 reading.rejectingArm === 'No comply'
            
            processedData.push({
              date: record.date_string,
              hour: reading.hour || '',
              bf: reading.bf || '',
              bnf: reading.bnf || '',
              bss: reading.bss || '',
              sensitivity: reading.sensitivity || '',
              noiseAlarm: reading.noiseAlarm || '',
              rejectingArm: reading.rejectingArm || '',
              hasDeviation: hasDeviation,
              orden: record.orden,
              brand: record.brand,
              product: record.product
            })
            
            if (hasDeviation) {
              deviationData.push({
                date: record.date_string,
                hour: reading.hour || '',
                type: reading.bf === 'ND' ? 'BF' : 
                      reading.bnf === 'ND' ? 'B.NF' :
                      reading.bss === 'ND' ? 'B.S.S' :
                      reading.sensitivity === 'No comply' ? 'Sensitivity' :
                      reading.noiseAlarm === 'No comply' ? 'Noise Alarm' :
                      reading.rejectingArm === 'No comply' ? 'Rejecting Arm' : 'Other',
                observation: reading.observation || '',
                correctiveActions: reading.correctiveActions || ''
              })
            }
          })
        })

        // Check if we should group by hour (single day or single orden)
        const uniqueDates = new Set(processedData.map(p => p.date))
        const shouldGroupByHour = uniqueDates.size === 1 || (selectedOrden && uniqueDates.size <= 1)
        
        let chartDataArray: any[] = []
        
        if (shouldGroupByHour && processedData.length > 0) {
          // Group by hour
          const hourMap = new Map<string, any>()
          processedData.forEach((point) => {
            const hour = point.hour || 'Unknown'
            if (!hourMap.has(hour)) {
              hourMap.set(hour, {
                hour,
                totalReadings: 0,
                deviations: 0,
                compliant: 0
              })
            }
            const hourData = hourMap.get(hour)!
            hourData.totalReadings++
            if (point.hasDeviation) {
              hourData.deviations++
            } else {
              hourData.compliant++
            }
          })
          
          chartDataArray = Array.from(hourMap.values()).map((stats) => ({
            hour: stats.hour,
            totalReadings: stats.totalReadings,
            deviations: stats.deviations,
            compliant: stats.compliant,
            complianceRate: stats.totalReadings > 0 
              ? ((stats.compliant / stats.totalReadings) * 100).toFixed(1)
              : '0.0'
          })).sort((a, b) => {
            // Sort by hour (time)
            const timeA = a.hour || '00:00'
            const timeB = b.hour || '00:00'
            return timeA.localeCompare(timeB)
          })
        } else {
          // Group by date for daily stats
          const dateMap = new Map<string, any>()
          processedData.forEach((point) => {
            const date = point.date
            if (!dateMap.has(date)) {
              dateMap.set(date, {
                date,
                totalReadings: 0,
                deviations: 0,
                compliant: 0,
                brands: new Set(),
                products: new Set()
              })
            }
            const dayData = dateMap.get(date)!
            dayData.totalReadings++
            if (point.hasDeviation) {
              dayData.deviations++
            } else {
              dayData.compliant++
            }
            if (point.brand) dayData.brands.add(point.brand)
            if (point.product) dayData.products.add(point.product)
          })

          chartDataArray = Array.from(dateMap.values()).map((stats) => ({
            date: stats.date,
            totalReadings: stats.totalReadings,
            deviations: stats.deviations,
            compliant: stats.compliant,
            brands: stats.brands.size,
            products: stats.products.size,
            complianceRate: stats.totalReadings > 0 
              ? ((stats.compliant / stats.totalReadings) * 100).toFixed(1)
              : '0.0'
          })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        }

        setChartData(chartDataArray)
        
        // Always calculate daily stats for the table
        const dateMap = new Map<string, any>()
        processedData.forEach((point) => {
          const date = point.date
          if (!dateMap.has(date)) {
            dateMap.set(date, {
              date,
              totalReadings: 0,
              deviations: 0,
              compliant: 0,
              brands: new Set(),
              products: new Set()
            })
          }
          const dayData = dateMap.get(date)!
          dayData.totalReadings++
          if (point.hasDeviation) {
            dayData.deviations++
          } else {
            dayData.compliant++
          }
          if (point.brand) dayData.brands.add(point.brand)
          if (point.product) dayData.products.add(point.product)
        })

        const dailyStatsArray = Array.from(dateMap.values()).map((stats) => ({
          date: stats.date,
          totalReadings: stats.totalReadings,
          deviations: stats.deviations,
          compliant: stats.compliant,
          brands: stats.brands.size,
          products: stats.products.size,
          complianceRate: stats.totalReadings > 0 
            ? ((stats.compliant / stats.totalReadings) * 100).toFixed(1)
            : '0.0'
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        setDailyStats(dailyStatsArray)
        
        // Calculate summary stats
        const totalReadings = processedData.length
        const totalDeviations = deviationData.length
        const complianceRate = totalReadings > 0 
          ? ((totalReadings - totalDeviations) / totalReadings * 100).toFixed(1)
          : '0.0'
        
        setSummaryStats({
          totalRecords: finalRecords.length,
          totalReadings: totalReadings,
          totalDeviations: totalDeviations,
          complianceRate: complianceRate,
          uniqueBrands: new Set(processedData.map(p => p.brand).filter(Boolean)).size,
          uniqueProducts: new Set(processedData.map(p => p.product).filter(Boolean)).size,
          groupByHour: shouldGroupByHour
        })
        
      } else if (selectedChecklist === 'Checklist Monoproducto') {
        let query = supabase.from('checklist_calidad_monoproducto').select('*')
        if (startDate) query = query.gte('fecha', startDate)
        if (endDate) query = query.lte('fecha', endDate)
        
        const { data: records, error } = await query
        if (error) throw error
        
        // Cascading filter logic for Monoproducto
        let availableOrdens = Array.from(new Set(records?.map((r: any) => r.orden_fabricacion).filter(Boolean))).sort()
        let availableBrands = Array.from(new Set(records?.map((r: any) => r.cliente).filter(Boolean))).sort()
        let availableProducts = Array.from(new Set(records?.map((r: any) => r.producto).filter(Boolean))).sort()
        
        // Apply cascading: if orden selected, limit brands and products
        if (selectedOrden) {
          const ordenRecords = records?.filter((r: any) => 
            r.orden_fabricacion?.toLowerCase().includes(selectedOrden.toLowerCase())
          ) || []
          availableBrands = Array.from(new Set(ordenRecords.map((r: any) => r.cliente).filter(Boolean))).sort()
          availableProducts = Array.from(new Set(ordenRecords.map((r: any) => r.producto).filter(Boolean))).sort()
          if (selectedBrand && !availableBrands.includes(selectedBrand)) {
            setSelectedBrand('')
          }
          if (selectedProduct && !availableProducts.includes(selectedProduct)) {
            setSelectedProduct('')
          }
        }
        
        // Apply cascading: if brand selected, limit ordens and products
        if (selectedBrand) {
          const brandRecords = records?.filter((r: any) => 
            r.cliente?.toLowerCase() === selectedBrand.toLowerCase()
          ) || []
          availableOrdens = Array.from(new Set(brandRecords.map((r: any) => r.orden_fabricacion).filter(Boolean))).sort()
          availableProducts = Array.from(new Set(brandRecords.map((r: any) => r.producto).filter(Boolean))).sort()
          if (selectedOrden && !availableOrdens.some(o => o.toLowerCase().includes(selectedOrden.toLowerCase()))) {
            setSelectedOrden('')
          }
          if (selectedProduct && !availableProducts.includes(selectedProduct)) {
            setSelectedProduct('')
          }
        }
        
        // Apply cascading: if product selected, limit ordens and brands
        if (selectedProduct) {
          const productRecords = records?.filter((r: any) => 
            r.producto?.toLowerCase().includes(selectedProduct.toLowerCase())
          ) || []
          availableOrdens = Array.from(new Set(productRecords.map((r: any) => r.orden_fabricacion).filter(Boolean))).sort()
          availableBrands = Array.from(new Set(productRecords.map((r: any) => r.cliente).filter(Boolean))).sort()
          if (selectedOrden && !availableOrdens.some(o => o.toLowerCase().includes(selectedOrden.toLowerCase()))) {
            setSelectedOrden('')
          }
          if (selectedBrand && !availableBrands.includes(selectedBrand)) {
            setSelectedBrand('')
          }
        }
        
        // Apply all filters to get final data
        let finalRecords = records || []
        if (selectedOrden) {
          finalRecords = finalRecords.filter((r: any) => 
            r.orden_fabricacion?.toLowerCase().includes(selectedOrden.toLowerCase())
          )
        }
        if (selectedBrand) {
          finalRecords = finalRecords.filter((r: any) => 
            r.cliente?.toLowerCase() === selectedBrand.toLowerCase()
          )
        }
        if (selectedProduct) {
          finalRecords = finalRecords.filter((r: any) => 
            r.producto?.toLowerCase().includes(selectedProduct.toLowerCase())
          )
        }
        
        setData(finalRecords)
        setAvailableOrdens(availableOrdens)
        setAvailableBrands(availableBrands)
        setAvailableProducts(availableProducts)
        
        // Process data for charts - group by date
        const dateMap = new Map<string, any>()
        finalRecords?.forEach((record: any) => {
          const date = record.fecha
          if (!dateMap.has(date)) {
            dateMap.set(date, { date, count: 0, orders: new Set() })
          }
          const dayData = dateMap.get(date)!
          dayData.count++
          dayData.orders.add(record.orden_fabricacion)
        })
        
        const chartDataArray = Array.from(dateMap.values()).map(d => ({
          date: d.date,
          registros: d.count,
          ordenes: d.orders.size
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        
        setChartData(chartDataArray)
        setSummaryStats({
          totalRecords: finalRecords?.length || 0,
          totalOrders: new Set(finalRecords?.map((r: any) => r.orden_fabricacion)).size,
          dateRange: chartDataArray.length > 0 ? `${chartDataArray[0].date} - ${chartDataArray[chartDataArray.length - 1].date}` : '-'
        })
        
      } else if (selectedChecklist === 'Checklist Mix Producto') {
        let query = supabase.from('checklist_calidad_mix').select('*')
        if (startDate) query = query.gte('fecha', startDate)
        if (endDate) query = query.lte('fecha', endDate)
        
        const { data: records, error } = await query
        if (error) throw error
        
        // Cascading filter logic for Mix Producto
        let availableOrdens = Array.from(new Set(records?.map((r: any) => r.orden_fabricacion).filter(Boolean))).sort()
        let availableBrands = Array.from(new Set(records?.map((r: any) => r.cliente).filter(Boolean))).sort()
        let availableProducts = Array.from(new Set(records?.map((r: any) => r.producto).filter(Boolean))).sort()
        
        // Apply cascading: if orden selected, limit brands and products
        if (selectedOrden) {
          const ordenRecords = records?.filter((r: any) => 
            r.orden_fabricacion?.toLowerCase().includes(selectedOrden.toLowerCase())
          ) || []
          availableBrands = Array.from(new Set(ordenRecords.map((r: any) => r.cliente).filter(Boolean))).sort()
          availableProducts = Array.from(new Set(ordenRecords.map((r: any) => r.producto).filter(Boolean))).sort()
          if (selectedBrand && !availableBrands.includes(selectedBrand)) {
            setSelectedBrand('')
          }
          if (selectedProduct && !availableProducts.includes(selectedProduct)) {
            setSelectedProduct('')
          }
        }
        
        // Apply cascading: if brand selected, limit ordens and products
        if (selectedBrand) {
          const brandRecords = records?.filter((r: any) => 
            r.cliente?.toLowerCase() === selectedBrand.toLowerCase()
          ) || []
          availableOrdens = Array.from(new Set(brandRecords.map((r: any) => r.orden_fabricacion).filter(Boolean))).sort()
          availableProducts = Array.from(new Set(brandRecords.map((r: any) => r.producto).filter(Boolean))).sort()
          if (selectedOrden && !availableOrdens.some(o => o.toLowerCase().includes(selectedOrden.toLowerCase()))) {
            setSelectedOrden('')
          }
          if (selectedProduct && !availableProducts.includes(selectedProduct)) {
            setSelectedProduct('')
          }
        }
        
        // Apply cascading: if product selected, limit ordens and brands
        if (selectedProduct) {
          const productRecords = records?.filter((r: any) => 
            r.producto?.toLowerCase().includes(selectedProduct.toLowerCase())
          ) || []
          availableOrdens = Array.from(new Set(productRecords.map((r: any) => r.orden_fabricacion).filter(Boolean))).sort()
          availableBrands = Array.from(new Set(productRecords.map((r: any) => r.cliente).filter(Boolean))).sort()
          if (selectedOrden && !availableOrdens.some(o => o.toLowerCase().includes(selectedOrden.toLowerCase()))) {
            setSelectedOrden('')
          }
          if (selectedBrand && !availableBrands.includes(selectedBrand)) {
            setSelectedBrand('')
          }
        }
        
        // Apply all filters to get final data
        let finalRecords = records || []
        if (selectedOrden) {
          finalRecords = finalRecords.filter((r: any) => 
            r.orden_fabricacion?.toLowerCase().includes(selectedOrden.toLowerCase())
          )
        }
        if (selectedBrand) {
          finalRecords = finalRecords.filter((r: any) => 
            r.cliente?.toLowerCase() === selectedBrand.toLowerCase()
          )
        }
        if (selectedProduct) {
          finalRecords = finalRecords.filter((r: any) => 
            r.producto?.toLowerCase().includes(selectedProduct.toLowerCase())
          )
        }
        
        setData(finalRecords)
        setAvailableOrdens(availableOrdens)
        setAvailableBrands(availableBrands)
        setAvailableProducts(availableProducts)
        
        // Process data for charts - group by date
        const dateMap = new Map<string, any>()
        finalRecords?.forEach((record: any) => {
          const date = record.fecha
          if (!dateMap.has(date)) {
            dateMap.set(date, { date, count: 0, orders: new Set() })
          }
          const dayData = dateMap.get(date)!
          dayData.count++
          dayData.orders.add(record.orden_fabricacion)
        })
        
        const chartDataArray = Array.from(dateMap.values()).map(d => ({
          date: d.date,
          registros: d.count,
          ordenes: d.orders.size
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        
        setChartData(chartDataArray)
        setSummaryStats({
          totalRecords: finalRecords?.length || 0,
          totalOrders: new Set(finalRecords?.map((r: any) => r.orden_fabricacion)).size,
          dateRange: chartDataArray.length > 0 ? `${chartDataArray[0].date} - ${chartDataArray[chartDataArray.length - 1].date}` : '-'
        })
        
      }
      
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Error al cargar los datos', 'error')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, selectedChecklist, selectedOrden, selectedBrand, selectedProduct, showToast])

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
                <option value="Process Environmental Temperature Control">
                  Process Environmental Temperature Control
                </option>
                <option value="Metal Detector (PCC #1)">Metal Detector (PCC #1)</option>
                <option value="Checklist Monoproducto">Checklist Monoproducto</option>
                <option value="Checklist Mix Producto">Checklist Mix Producto</option>
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
                disabled={
                  selectedChecklist === 'Process Environmental Temperature Control' ||
                  (selectedChecklist === 'Metal Detector (PCC #1)' && availableOrdens.length === 0) ||
                  (selectedChecklist === 'Checklist Monoproducto' && availableOrdens.length === 0) ||
                  (selectedChecklist === 'Checklist Mix Producto' && availableOrdens.length === 0)
                }
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
                disabled={
                  selectedChecklist === 'Process Environmental Temperature Control' ||
                  (selectedChecklist === 'Metal Detector (PCC #1)' && availableBrands.length === 0) ||
                  (selectedChecklist === 'Checklist Monoproducto' && availableBrands.length === 0) ||
                  (selectedChecklist === 'Checklist Mix Producto' && availableBrands.length === 0)
                }
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
                disabled={
                  selectedChecklist === 'Process Environmental Temperature Control' ||
                  (selectedChecklist === 'Metal Detector (PCC #1)' && availableProducts.length === 0) ||
                  (selectedChecklist === 'Checklist Monoproducto' && availableProducts.length === 0) ||
                  (selectedChecklist === 'Checklist Mix Producto' && availableProducts.length === 0)
                }
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
              {selectedChecklist === 'Metal Detector (PCC #1)' ? (
                <>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Registros</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalRecords || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Lecturas</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalReadings || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Tasa de Cumplimiento</h3>
                    <p className="text-2xl font-bold text-green-600">{summaryStats.complianceRate || '0.0'}%</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Desviaciones</h3>
                    <p className="text-2xl font-bold text-red-600">{summaryStats.totalDeviations || 0}</p>
                  </div>
                </>
              ) : selectedChecklist === 'Process Environmental Temperature Control' ? (
                <>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Registros</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalRecords || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Lecturas</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalReadings || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Temperatura Promedio</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.avgTemp || '0.0'}°F</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Dentro del Rango</h3>
                    <p className="text-2xl font-bold text-green-600">{summaryStats.withinRange || 0}</p>
                  </div>
                </>
              ) : selectedChecklist === 'Checklist Monoproducto' || selectedChecklist === 'Checklist Mix Producto' ? (
                <>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Registros</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalRecords || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Órdenes</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalOrders || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Rango de Fechas</h3>
                    <p className="text-sm font-bold text-gray-900">{summaryStats.dateRange || '-'}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Días con Registros</h3>
                    <p className="text-2xl font-bold text-gray-900">{chartData.length}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Registros</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalRecords || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Productos Únicos</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.productos || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Días con Registros</h3>
                    <p className="text-2xl font-bold text-gray-900">{chartData.length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Rango de Fechas</h3>
                    <p className="text-sm font-bold text-gray-900">{startDate} - {endDate}</p>
                  </div>
                </>
              )}
            </div>

            {/* Charts Section - Different charts based on checklist type */}
            {selectedChecklist === 'Metal Detector (PCC #1)' && (
              <>
                {/* Compliance Rate Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    {summaryStats.groupByHour ? 'Tasa de Cumplimiento por Hora' : 'Tasa de Cumplimiento por Día'}
                  </h2>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey={summaryStats.groupByHour ? "hour" : "date"}
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
                        formatter={(value: number) => [`${value}%`, 'Tasa de Cumplimiento']}
                      />
                      <Legend />
                      <ReferenceLine y={95} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Objetivo (95%)', position: 'right' }} />
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

                {/* Readings vs Deviations Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    {summaryStats.groupByHour ? 'Lecturas vs Desviaciones por Hora' : 'Lecturas vs Desviaciones por Día'}
                  </h2>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey={summaryStats.groupByHour ? "hour" : "date"}
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
                      <Bar dataKey="totalReadings" fill="#3b82f6" name="Total Lecturas" />
                      <Bar dataKey="compliant" fill="#10b981" name="Cumplimiento" />
                      <Bar dataKey="deviations" fill="#ef4444" name="Desviaciones" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {selectedChecklist === 'Process Environmental Temperature Control' && (
              <>
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
                      <ReferenceLine y={42} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Límite Inferior (42°F)', position: 'right' }} />
                      <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Límite Superior (50°F)', position: 'right' }} />
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
              </>
            )}

            {(selectedChecklist === 'Checklist Monoproducto' || selectedChecklist === 'Checklist Mix Producto') && (
              <>
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
                      <Bar dataKey="registros" fill="#3b82f6" name="Registros" />
                      <Bar dataKey="ordenes" fill="#10b981" name="Órdenes Únicas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {/* Daily Statistics Tables */}
            {selectedChecklist === 'Metal Detector (PCC #1)' && dailyStats.length > 0 && (
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
                            Total Lecturas
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cumplimiento
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Desviaciones
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tasa (%)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dailyStats.map((stat) => {
                          if ('compliant' in stat) {
                            return (
                              <tr key={stat.date} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {stat.date}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                  {stat.totalReadings}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {stat.compliant}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    {stat.deviations}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">
                                  {stat.complianceRate}%
                                </td>
                              </tr>
                            )
                          }
                          return null
                        })}
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
                        {dailyStats.map((stat) => {
                          if ('brands' in stat) {
                            return (
                              <tr key={stat.date} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {stat.date}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                  {stat.brands || 0}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                  {stat.products || 0}
                                </td>
                              </tr>
                            )
                          }
                          return null
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {selectedChecklist === 'Process Environmental Temperature Control' && dailyStats.length > 0 && (
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
                        {dailyStats.map((stat) => {
                          if ('avgTemp' in stat) {
                            return (
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
                            )
                          }
                          return null
                        })}
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
                        {dailyStats.map((stat) => {
                          if ('withinRange' in stat) {
                            return (
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
                            )
                          }
                          return null
                        })}
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

