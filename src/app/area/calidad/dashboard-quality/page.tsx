'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { fetchChecklistEnvTempData } from '@/lib/supabase/checklistEnvTemp'
import { fetchChecklistMetalDetectorData } from '@/lib/supabase/checklistMetalDetector'
import { fetchChecklistStaffPracticesData } from '@/lib/supabase/checklistStaffPractices'
import { fetchChecklistForeignMaterialData } from '@/lib/supabase/checklistForeignMaterial'
import { fetchChecklistPreOperationalReviewData } from '@/lib/supabase/checklistPreOperationalReview'
import { fetchChecklistMaterialsControlData } from '@/lib/supabase/checklistMaterialsControl'
import { fetchChecklistFootbathControlData } from '@/lib/supabase/checklistFootbathControl'
import { fetchChecklistWeighingSealingData } from '@/lib/supabase/checklistWeighingSealing'
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

type TemperatureDailyStats = {
  date: string
  avgTemp: number
  minTemp: number
  maxTemp: number
  withinRange: number
  outOfRange: number
  totalReadings: number
}

type MetalDetectorDailyStats = {
  date: string
  totalReadings: number
  deviations: number
  compliant: number
  brands: number
  products: number
  complianceRate: string
}

type StaffPracticesDailyStats = {
  date: string
  totalRecords: number
  totalStaff: number
  compliant: number
  nonCompliant: number
  totalParameters: number
  complianceRate: string
}

type ForeignMaterialDailyStats = {
  date: string
  totalRecords: number
  withFindings: number
  noFindings: number
  totalFindings: number
  findingsRate: string
}

type PreOperationalReviewDailyStats = {
  date: string
  totalRecords: number
  totalItems: number
  compliantItems: number
  nonCompliantItems: number
  recordsWithNonCompliance: number
  complianceRate: string
}

type FootbathControlDailyStats = {
  date: string
  totalRecords: number
  totalMeasurements: number
  compliantMeasurements: number
  nonCompliantMeasurements: number
  avgPpmValue: number
  complianceRate: string
}

type DailyStats = TemperatureDailyStats | MetalDetectorDailyStats | StaffPracticesDailyStats | ForeignMaterialDailyStats | PreOperationalReviewDailyStats | FootbathControlDailyStats

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
        const statsMap = new Map<string, TemperatureDailyStats>()
        
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
        const dailyStatsArray: DailyStats[] = Array.from(statsMap.values()).map((stats) => ({
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
        const dateMap = new Map<string, {
          date: string
          totalReadings: number
          deviations: number
          compliant: number
          brands: Set<string>
          products: Set<string>
        }>()
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

        const dailyStatsArray: DailyStats[] = Array.from(dateMap.values()).map((stats) => ({
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
        
      } else if (selectedChecklist === 'Staff Good Practices Control') {
        const records = await fetchChecklistStaffPracticesData(startDate, endDate)
        setData(records)

        // Parameter field names mapping
        const parameterFields = [
          'staffAppearance',
          'completeUniform',
          'accessoriesAbsence',
          'workToolsUsage',
          'cutCleanNotPolishedNails',
          'noMakeupOn',
          'staffBehavior',
          'staffHealth'
        ] as const

        const parameterNames: Record<string, string> = {
          staffAppearance: 'Staff Appearance',
          completeUniform: 'Complete Uniform',
          accessoriesAbsence: 'Accessories Absence',
          workToolsUsage: 'Work Tools Usage',
          cutCleanNotPolishedNails: 'Cut Clean Nails',
          noMakeupOn: 'No Makeup',
          staffBehavior: 'Staff Behavior',
          staffHealth: 'Staff Health'
        }

        // Process data for charts - group by date, count parameters
        const dateMap = new Map<string, any>()
        records.forEach((record: any) => {
          const date = record.date_string
          if (!dateMap.has(date)) {
            dateMap.set(date, { 
              date, 
              count: 0, 
              totalStaff: 0,
              totalParameters: 0,
              compliantParameters: 0,
              nonCompliantParameters: 0
            })
          }
          const dayData = dateMap.get(date)!
          dayData.count++
          dayData.totalStaff += record.staff_members?.length || 0
          
          // Count parameters (not staff members)
          record.staff_members?.forEach((member: any) => {
            parameterFields.forEach(field => {
              dayData.totalParameters++
              if (member[field] === 'comply') {
                dayData.compliantParameters++
              } else if (member[field] === 'not_comply') {
                dayData.nonCompliantParameters++
              }
            })
          })
        })

        const chartDataArray = Array.from(dateMap.values()).map(d => ({
          date: d.date,
          registros: d.count,
          totalStaff: d.totalStaff,
          compliant: d.compliantParameters,
          nonCompliant: d.nonCompliantParameters
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        setChartData(chartDataArray)
        
        // Calculate daily stats
        const dailyStatsArray: DailyStats[] = chartDataArray.map(d => {
          const totalParams = d.compliant + d.nonCompliant
          return {
            date: d.date,
            totalRecords: d.registros,
            totalStaff: d.totalStaff,
            compliant: d.compliant,
            nonCompliant: d.nonCompliant,
            totalParameters: totalParams,
            complianceRate: totalParams > 0 ? ((d.compliant / totalParams) * 100).toFixed(1) : '0.0'
          } as StaffPracticesDailyStats
        })
        
        setDailyStats(dailyStatsArray)
        
        // Calculate overall summary stats
        let totalStaff = 0
        let totalParameters = 0
        let compliantParameters = 0
        const parameterCounts: Record<string, { compliant: number, nonCompliant: number }> = {}

        // Initialize parameter counts
        parameterFields.forEach(field => {
          parameterCounts[field] = { compliant: 0, nonCompliant: 0 }
        })

        records.forEach((record: any) => {
          totalStaff += record.staff_members?.length || 0
          record.staff_members?.forEach((member: any) => {
            parameterFields.forEach(field => {
              totalParameters++
              if (member[field] === 'comply') {
                compliantParameters++
                parameterCounts[field].compliant++
              } else if (member[field] === 'not_comply') {
                parameterCounts[field].nonCompliant++
              }
            })
          })
        })

        const nonCompliantParameters = totalParameters - compliantParameters
        const complianceRate = totalParameters > 0 
          ? ((compliantParameters / totalParameters) * 100).toFixed(1) 
          : '0.0'

        // Find most non-compliant parameter
        let mostNonCompliantParam = { name: 'N/A', count: 0, percentage: '0.0' }
        parameterFields.forEach(field => {
          const count = parameterCounts[field].nonCompliant
          const total = parameterCounts[field].compliant + count
          if (total > 0 && count > mostNonCompliantParam.count) {
            const percentage = ((count / total) * 100).toFixed(1)
            mostNonCompliantParam = {
              name: parameterNames[field],
              count,
              percentage
            }
          }
        })
        
        setSummaryStats({
          totalRecords: records.length,
          totalStaff,
          totalParameters,
          compliantParameters,
          nonCompliantParameters,
          complianceRate,
          mostNonCompliantParameter: mostNonCompliantParam
        })
      } else if (selectedChecklist === 'Foreign Material Findings Record') {
        const records = await fetchChecklistForeignMaterialData(startDate, endDate)
        setData(records)

        // Filter records based on selected filters
        let filteredRecords = records
        if (selectedBrand) {
          filteredRecords = filteredRecords.filter((r: any) => 
            r.brand?.toLowerCase() === selectedBrand.toLowerCase()
          )
        }
        if (selectedProduct) {
          filteredRecords = filteredRecords.filter((r: any) => 
            r.product?.toLowerCase().includes(selectedProduct.toLowerCase())
          )
        }

        // Extract available options for filters
        const availableBrands = Array.from(new Set(records.map((r: any) => r.brand).filter(Boolean))).sort()
        const availableProducts = Array.from(new Set(records.map((r: any) => r.product).filter(Boolean))).sort()
        setAvailableBrands(availableBrands)
        setAvailableProducts(availableProducts)

        // Process data for charts - group by date
        const dateMap = new Map<string, any>()
        const elementTypeMap = new Map<string, number>()
        const productCodeMap = new Map<string, number>()
        const brandMap = new Map<string, { total: number, withFindings: number }>()
        
        let totalFindings = 0
        let totalRecords = filteredRecords.length
        let recordsWithFindings = 0
        let recordsNoFindings = 0

        filteredRecords.forEach((record: any) => {
          const date = record.date_string
          
          // Daily stats
          if (!dateMap.has(date)) {
            dateMap.set(date, {
              date,
              totalRecords: 0,
              withFindings: 0,
              noFindings: 0,
              totalFindings: 0
            })
          }
          const dayData = dateMap.get(date)!
          dayData.totalRecords++
          
          if (record.no_findings) {
            recordsNoFindings++
            dayData.noFindings++
          } else {
            recordsWithFindings++
            dayData.withFindings++
            const findingsCount = record.findings?.length || 0
            totalFindings += findingsCount
            dayData.totalFindings += findingsCount
            
            // Count element types
            record.findings?.forEach((finding: any) => {
              const elementType = finding.elementType === 'other' 
                ? finding.otherElementType || 'Other'
                : finding.elementType
              elementTypeMap.set(elementType, (elementTypeMap.get(elementType) || 0) + 1)
              
              // Track product codes for traceability
              if (finding.productCode) {
                productCodeMap.set(finding.productCode, (productCodeMap.get(finding.productCode) || 0) + 1)
              }
            })
          }
          
          // Brand stats
          if (record.brand) {
            if (!brandMap.has(record.brand)) {
              brandMap.set(record.brand, { total: 0, withFindings: 0 })
            }
            const brandData = brandMap.get(record.brand)!
            brandData.total++
            if (!record.no_findings && record.findings?.length > 0) {
              brandData.withFindings++
            }
          }
        })

        const chartDataArray = Array.from(dateMap.values())
          .map(d => ({
            date: d.date,
            totalRecords: d.totalRecords,
            withFindings: d.withFindings,
            noFindings: d.noFindings,
            totalFindings: d.totalFindings
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        setChartData(chartDataArray)

        // Daily stats
        const dailyStatsArray: DailyStats[] = chartDataArray.map(d => ({
          date: d.date,
          totalRecords: d.totalRecords,
          withFindings: d.withFindings,
          noFindings: d.noFindings,
          totalFindings: d.totalFindings,
          findingsRate: d.totalRecords > 0 
            ? ((d.withFindings / d.totalRecords) * 100).toFixed(1)
            : '0.0'
        } as ForeignMaterialDailyStats))

        setDailyStats(dailyStatsArray)

        // Element type distribution (top 10)
        const elementTypeArray = Array.from(elementTypeMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        // Product codes with findings (for traceability)
        const productCodeArray = Array.from(productCodeMap.entries())
          .map(([code, count]) => ({ code, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        // Brand findings summary
        const brandFindingsArray = Array.from(brandMap.entries())
          .map(([brand, data]) => ({
            brand,
            total: data.total,
            withFindings: data.withFindings,
            findingsRate: data.total > 0 
              ? ((data.withFindings / data.total) * 100).toFixed(1)
              : '0.0'
          }))
          .sort((a, b) => b.withFindings - a.withFindings)

        setSummaryStats({
          totalRecords,
          recordsWithFindings,
          recordsNoFindings,
          totalFindings,
          findingsRate: totalRecords > 0 
            ? ((recordsWithFindings / totalRecords) * 100).toFixed(1)
            : '0.0',
          elementTypes: elementTypeArray,
          productCodes: productCodeArray,
          brandFindings: brandFindingsArray,
          topElementType: elementTypeArray[0] || { name: 'N/A', count: 0 },
          topProductCode: productCodeArray[0] || { code: 'N/A', count: 0 }
        })
      } else if (selectedChecklist === 'Pre-Operational Review Processing Areas') {
        const records = await fetchChecklistPreOperationalReviewData(startDate, endDate)
        setData(records)

        // Filter records based on selected filters
        let filteredRecords = records
        if (selectedBrand) {
          filteredRecords = filteredRecords.filter((r: any) => 
            r.brand?.toLowerCase() === selectedBrand.toLowerCase()
          )
        }
        if (selectedProduct) {
          filteredRecords = filteredRecords.filter((r: any) => 
            r.product?.toLowerCase().includes(selectedProduct.toLowerCase())
          )
        }

        // Extract available options for filters
        const availableBrands = Array.from(new Set(records.map((r: any) => r.brand).filter(Boolean))).sort()
        const availableProducts = Array.from(new Set(records.map((r: any) => r.product).filter(Boolean))).sort()
        setAvailableBrands(availableBrands)
        setAvailableProducts(availableProducts)

        // Process data for charts - group by date
        const dateMap = new Map<string, any>()
        const itemComplianceMap = new Map<string, { comply: number, notComply: number, total: number }>()
        const brandComplianceMap = new Map<string, { total: number, compliant: number, nonCompliant: number }>()
        
        let totalRecords = filteredRecords.length
        let totalItemsChecked = 0
        let totalCompliantItems = 0
        let totalNonCompliantItems = 0
        let recordsWithNonCompliance = 0

        filteredRecords.forEach((record: any) => {
          const date = record.date_string
          
          // Daily stats
          if (!dateMap.has(date)) {
            dateMap.set(date, {
              date,
              totalRecords: 0,
              totalItems: 0,
              compliantItems: 0,
              nonCompliantItems: 0,
              recordsWithNonCompliance: 0
            })
          }
          const dayData = dateMap.get(date)!
          dayData.totalRecords++
          
          if (record.items && record.items.length > 0) {
            let hasNonCompliance = false
            record.items.forEach((item: any) => {
              totalItemsChecked++
              dayData.totalItems++
              
              // Track item-level compliance
              const itemName = item.name || item.id
              if (!itemComplianceMap.has(itemName)) {
                itemComplianceMap.set(itemName, { comply: 0, notComply: 0, total: 0 })
              }
              const itemData = itemComplianceMap.get(itemName)!
              itemData.total++
              
              if (item.comply === true) {
                totalCompliantItems++
                dayData.compliantItems++
                itemData.comply++
              } else if (item.comply === false) {
                totalNonCompliantItems++
                dayData.nonCompliantItems++
                itemData.notComply++
                hasNonCompliance = true
              }
            })
            
            if (hasNonCompliance) {
              recordsWithNonCompliance++
              dayData.recordsWithNonCompliance++
            }
          }
          
          // Brand stats
          if (record.brand) {
            if (!brandComplianceMap.has(record.brand)) {
              brandComplianceMap.set(record.brand, { total: 0, compliant: 0, nonCompliant: 0 })
            }
            const brandData = brandComplianceMap.get(record.brand)!
            brandData.total++
            
            // Calculate compliance for this record
            if (record.items && record.items.length > 0) {
              const compliantCount = record.items.filter((item: any) => item.comply === true).length
              const nonCompliantCount = record.items.filter((item: any) => item.comply === false).length
              
              if (nonCompliantCount === 0 && compliantCount > 0) {
                brandData.compliant++
              } else if (nonCompliantCount > 0) {
                brandData.nonCompliant++
              }
            }
          }
        })

        const chartDataArray = Array.from(dateMap.values())
          .map(d => ({
            date: d.date,
            totalRecords: d.totalRecords,
            totalItems: d.totalItems,
            compliantItems: d.compliantItems,
            nonCompliantItems: d.nonCompliantItems,
            recordsWithNonCompliance: d.recordsWithNonCompliance,
            complianceRate: d.totalItems > 0 
              ? ((d.compliantItems / d.totalItems) * 100).toFixed(1)
              : '0.0'
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        setChartData(chartDataArray)

        // Daily stats
        const dailyStatsArray: DailyStats[] = chartDataArray.map(d => ({
          date: d.date,
          totalRecords: d.totalRecords,
          totalItems: d.totalItems,
          compliantItems: d.compliantItems,
          nonCompliantItems: d.nonCompliantItems,
          recordsWithNonCompliance: d.recordsWithNonCompliance,
          complianceRate: d.complianceRate
        } as PreOperationalReviewDailyStats))

        setDailyStats(dailyStatsArray)

        // Item compliance distribution (top 10 most non-compliant)
        const itemComplianceArray = Array.from(itemComplianceMap.entries())
          .map(([name, data]) => ({
            name: name.length > 50 ? name.substring(0, 50) + '...' : name,
            fullName: name,
            comply: data.comply,
            notComply: data.notComply,
            total: data.total,
            complianceRate: data.total > 0 
              ? ((data.comply / data.total) * 100).toFixed(1)
              : '0.0'
          }))
          .sort((a, b) => b.notComply - a.notComply)
          .slice(0, 10)

        // Brand compliance summary
        const brandComplianceArray = Array.from(brandComplianceMap.entries())
          .map(([brand, data]) => ({
            brand,
            total: data.total,
            compliant: data.compliant,
            nonCompliant: data.nonCompliant,
            complianceRate: data.total > 0 
              ? ((data.compliant / data.total) * 100).toFixed(1)
              : '0.0'
          }))
          .sort((a, b) => b.nonCompliant - a.nonCompliant)

        const overallComplianceRate = totalItemsChecked > 0 
          ? ((totalCompliantItems / totalItemsChecked) * 100).toFixed(1)
          : '0.0'

        setSummaryStats({
          totalRecords,
          totalItemsChecked,
          totalCompliantItems,
          totalNonCompliantItems,
          recordsWithNonCompliance,
          complianceRate: overallComplianceRate,
          itemCompliance: itemComplianceArray,
          brandCompliance: brandComplianceArray,
          topNonCompliantItem: itemComplianceArray[0] || { name: 'N/A', notComply: 0 },
          topNonCompliantBrand: brandComplianceArray[0] || { brand: 'N/A', nonCompliant: 0 }
        })
      } else if (selectedChecklist === 'Internal control of materials used in production areas') {
        const records = await fetchChecklistMaterialsControlData(startDate, endDate)
        setData(records)

        // Filter records based on selected filters
        let filteredRecords = records
        if (selectedBrand) {
          filteredRecords = filteredRecords.filter((r: any) => 
            r.productive_area?.toLowerCase().includes(selectedBrand.toLowerCase())
          )
        }
        if (selectedProduct) {
          filteredRecords = filteredRecords.filter((r: any) => 
            r.line_manager_name?.toLowerCase().includes(selectedProduct.toLowerCase())
          )
        }

        // Extract available options for filters
        const availableBrands = Array.from(new Set(records.map((r: any) => r.productive_area).filter(Boolean))).sort()
        const availableProducts = Array.from(new Set(records.map((r: any) => r.line_manager_name).filter(Boolean))).sort()
        setAvailableBrands(availableBrands)
        setAvailableProducts(availableProducts)

        // Process data for charts - group by date
        const dateMap = new Map<string, any>()
        const materialComplianceMap = new Map<string, { good: number, bad: number, total: number }>()
        const areaComplianceMap = new Map<string, { total: number, good: number, bad: number }>()
        
        let totalRecords = filteredRecords.length
        let totalPersonnel = 0
        let totalMaterialsHandedOut = 0
        let totalMaterialsReturned = 0
        let materialsWithMismatch = 0

        filteredRecords.forEach((record: any) => {
          const date = record.date_string
          
          // Daily stats
          if (!dateMap.has(date)) {
            dateMap.set(date, {
              date,
              totalRecords: 0,
              totalPersonnel: 0,
              totalMaterials: 0,
              goodStatus: 0,
              badStatus: 0,
              quantityMismatches: 0
            })
          }
          const dayData = dateMap.get(date)!
          dayData.totalRecords++
          
          if (record.personnel_materials && record.personnel_materials.length > 0) {
            record.personnel_materials.forEach((personnel: any) => {
              totalPersonnel++
              dayData.totalPersonnel++
              totalMaterialsHandedOut += personnel.quantity || 0
              totalMaterialsReturned += personnel.quantityReceived || 0
              dayData.totalMaterials += (personnel.quantity || 0)
              
              // Check for quantity mismatches
              if (personnel.quantityReceived !== personnel.quantity) {
                materialsWithMismatch++
                dayData.quantityMismatches++
              }
              
              // Track material status
              if (personnel.materialStatusReceived === 'Good/Bueno') {
                dayData.goodStatus++
              } else if (personnel.materialStatusReceived === 'Bad/Malo') {
                dayData.badStatus++
              }
              
              // Track material compliance
              const material = personnel.material || 'Unknown'
              if (!materialComplianceMap.has(material)) {
                materialComplianceMap.set(material, { good: 0, bad: 0, total: 0 })
              }
              const materialData = materialComplianceMap.get(material)!
              materialData.total++
              if (personnel.materialStatusReceived === 'Good/Bueno') {
                materialData.good++
              } else if (personnel.materialStatusReceived === 'Bad/Malo') {
                materialData.bad++
              }
            })
          }
          
          // Area stats
          if (record.productive_area) {
            if (!areaComplianceMap.has(record.productive_area)) {
              areaComplianceMap.set(record.productive_area, { total: 0, good: 0, bad: 0 })
            }
            const areaData = areaComplianceMap.get(record.productive_area)!
            areaData.total++
            
            // Calculate compliance for this record
            if (record.personnel_materials && record.personnel_materials.length > 0) {
              const goodCount = record.personnel_materials.filter((p: any) => p.materialStatusReceived === 'Good/Bueno').length
              const badCount = record.personnel_materials.filter((p: any) => p.materialStatusReceived === 'Bad/Malo').length
              
              if (badCount === 0 && goodCount > 0) {
                areaData.good++
              } else if (badCount > 0) {
                areaData.bad++
              }
            }
          }
        })

        const chartDataArray = Array.from(dateMap.values())
          .map(d => ({
            date: d.date,
            totalRecords: d.totalRecords,
            totalPersonnel: d.totalPersonnel,
            totalMaterials: d.totalMaterials,
            goodStatus: d.goodStatus,
            badStatus: d.badStatus,
            quantityMismatches: d.quantityMismatches,
            complianceRate: (d.totalPersonnel > 0 && d.goodStatus + d.badStatus > 0)
              ? ((d.goodStatus / (d.goodStatus + d.badStatus)) * 100).toFixed(1)
              : '0.0'
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        setChartData(chartDataArray)

        // Daily stats
        const dailyStatsArray: DailyStats[] = chartDataArray.map(d => ({
          date: d.date,
          totalRecords: d.totalRecords,
          totalPersonnel: d.totalPersonnel,
          totalMaterials: d.totalMaterials,
          goodStatus: d.goodStatus,
          badStatus: d.badStatus,
          quantityMismatches: d.quantityMismatches,
          complianceRate: d.complianceRate
        } as any))

        setDailyStats(dailyStatsArray)

        // Material compliance distribution
        const materialComplianceArray = Array.from(materialComplianceMap.entries())
          .map(([material, data]) => ({
            name: material.length > 30 ? material.substring(0, 30) + '...' : material,
            fullName: material,
            good: data.good,
            bad: data.bad,
            total: data.total,
            complianceRate: data.total > 0 
              ? ((data.good / data.total) * 100).toFixed(1)
              : '0.0'
          }))
          .sort((a, b) => b.bad - a.bad)
          .slice(0, 10)

        // Area compliance summary
        const areaComplianceArray = Array.from(areaComplianceMap.entries())
          .map(([area, data]) => ({
            area,
            total: data.total,
            good: data.good,
            bad: data.bad,
            complianceRate: data.total > 0 
              ? ((data.good / data.total) * 100).toFixed(1)
              : '0.0'
          }))
          .sort((a, b) => b.bad - a.bad)

        const overallComplianceRate = totalPersonnel > 0 
          ? ((totalPersonnel - materialsWithMismatch) / totalPersonnel * 100).toFixed(1)
          : '0.0'

        setSummaryStats({
          totalRecords,
          totalPersonnel,
          totalMaterialsHandedOut,
          totalMaterialsReturned,
          materialsWithMismatch,
          complianceRate: overallComplianceRate,
          materialCompliance: materialComplianceArray,
          areaCompliance: areaComplianceArray,
          topMaterial: materialComplianceArray[0] || { name: 'N/A', bad: 0 },
          topArea: areaComplianceArray[0] || { area: 'N/A', bad: 0 }
        })
      } else if (selectedChecklist === 'Footbath Control') {
        const records = await fetchChecklistFootbathControlData(startDate, endDate)
        setData(records)

        // Process data for charts - group by date
        const dateMap = new Map<string, any>()
        
        let totalRecords = records.length
        let totalMeasurements = 0
        let compliantMeasurements = 0
        let nonCompliantMeasurements = 0
        let totalPpmValue = 0

        records.forEach((record: any) => {
          const date = record.date_string
          
          // Daily stats
          if (!dateMap.has(date)) {
            dateMap.set(date, {
              date,
              totalRecords: 0,
              totalMeasurements: 0,
              compliantMeasurements: 0,
              nonCompliantMeasurements: 0,
              totalPpmValue: 0
            })
          }
          const dayData = dateMap.get(date)!
          dayData.totalRecords++
          
          if (record.measurements && record.measurements.length > 0) {
            record.measurements.forEach((measurement: any) => {
              totalMeasurements++
              dayData.totalMeasurements++
              
              const ppmValue = parseFloat(measurement.measurePpmValue) || 0
              totalPpmValue += ppmValue
              dayData.totalPpmValue += ppmValue
              
              // Check compliance (PPM >= 200)
              if (ppmValue >= 200) {
                compliantMeasurements++
                dayData.compliantMeasurements++
              } else {
                nonCompliantMeasurements++
                dayData.nonCompliantMeasurements++
              }
            })
          }
        })

        const chartDataArray = Array.from(dateMap.values())
          .map(d => ({
            date: d.date,
            totalRecords: d.totalRecords,
            totalMeasurements: d.totalMeasurements,
            compliantMeasurements: d.compliantMeasurements,
            nonCompliantMeasurements: d.nonCompliantMeasurements,
            avgPpmValue: d.totalMeasurements > 0 
              ? (d.totalPpmValue / d.totalMeasurements).toFixed(1)
              : '0.0',
            complianceRate: d.totalMeasurements > 0
              ? ((d.compliantMeasurements / d.totalMeasurements) * 100).toFixed(1)
              : '0.0'
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        setChartData(chartDataArray)

        // Daily stats
        const dailyStatsArray: DailyStats[] = chartDataArray.map(d => ({
          date: d.date,
          totalRecords: d.totalRecords,
          totalMeasurements: d.totalMeasurements,
          compliantMeasurements: d.compliantMeasurements,
          nonCompliantMeasurements: d.nonCompliantMeasurements,
          avgPpmValue: parseFloat(d.avgPpmValue),
          complianceRate: d.complianceRate
        } as FootbathControlDailyStats))

        setDailyStats(dailyStatsArray)

        const avgPpmValue = totalMeasurements > 0 
          ? (totalPpmValue / totalMeasurements).toFixed(1)
          : '0.0'
        const overallComplianceRate = totalMeasurements > 0
          ? ((compliantMeasurements / totalMeasurements) * 100).toFixed(1)
          : '0.0'

        setSummaryStats({
          totalRecords,
          totalMeasurements,
          compliantMeasurements,
          nonCompliantMeasurements,
          avgPpmValue,
          complianceRate: overallComplianceRate
        })
      } else if (selectedChecklist === 'Check weighing and sealing of packaged products') {
        const records = await fetchChecklistWeighingSealingData(startDate, endDate)
        setData(records)

        // Process data for comprehensive analysis
        const dateMap = new Map<string, any>()
        const shiftMap = new Map<string, any>()
        const brandMap = new Map<string, any>()
        const productMap = new Map<string, any>()
        const processRoomMap = new Map<string, any>()
        const monitorMap = new Map<string, any>()
        
        let totalRecords = records.length
        let totalBagEntries = 0
        let totalSealedChecks = 0
        let compliantSealed = 0
        let nonCompliantSealed = 0
        let compliantOrigin = 0
        let nonCompliantOrigin = 0
        let totalWeight = 0
        let weightCount = 0
        const allWeights: number[] = []

        records.forEach((record: any) => {
          const date = record.date_string
          const shift = record.shift || 'Unknown'
          const brand = record.brand || 'Unknown'
          const product = record.product || 'Unknown'
          const processRoom = record.process_room || 'Unknown'
          const monitor = record.monitor_name || 'Unknown'
          
          // Daily stats
          if (!dateMap.has(date)) {
            dateMap.set(date, {
              date,
              totalRecords: 0,
              totalBagEntries: 0,
              totalSealedChecks: 0,
              compliantSealed: 0,
              nonCompliantSealed: 0,
              compliantOrigin: 0,
              nonCompliantOrigin: 0,
              totalWeight: 0,
              weightCount: 0
            })
          }
          
          // Shift stats
          if (!shiftMap.has(shift)) {
            shiftMap.set(shift, {
              shift,
              totalRecords: 0,
              totalBagEntries: 0,
              compliantSealed: 0,
              nonCompliantSealed: 0,
              compliantOrigin: 0,
              nonCompliantOrigin: 0
            })
          }
          
          // Brand stats
          if (!brandMap.has(brand)) {
            brandMap.set(brand, {
              brand,
              totalRecords: 0,
              totalBagEntries: 0,
              compliantSealed: 0,
              nonCompliantSealed: 0,
              compliantOrigin: 0,
              nonCompliantOrigin: 0
            })
          }
          
          // Product stats
          if (!productMap.has(product)) {
            productMap.set(product, {
              product,
              brand: record.brand || '',
              totalRecords: 0,
              totalBagEntries: 0,
              compliantSealed: 0,
              nonCompliantSealed: 0,
              compliantOrigin: 0,
              nonCompliantOrigin: 0
            })
          }
          
          // Process room stats
          if (!processRoomMap.has(processRoom)) {
            processRoomMap.set(processRoom, {
              processRoom,
              totalRecords: 0,
              totalBagEntries: 0,
              compliantSealed: 0,
              nonCompliantSealed: 0,
              compliantOrigin: 0,
              nonCompliantOrigin: 0
            })
          }
          
          // Monitor stats
          if (!monitorMap.has(monitor)) {
            monitorMap.set(monitor, {
              monitor,
              totalRecords: 0,
              totalBagEntries: 0
            })
          }
          
          const dayData = dateMap.get(date)!
          const shiftData = shiftMap.get(shift)!
          const brandData = brandMap.get(brand)!
          const productData = productMap.get(product)!
          const processRoomData = processRoomMap.get(processRoom)!
          const monitorData = monitorMap.get(monitor)!
          
          dayData.totalRecords++
          shiftData.totalRecords++
          brandData.totalRecords++
          productData.totalRecords++
          processRoomData.totalRecords++
          monitorData.totalRecords++
          
          if (record.bag_entries && record.bag_entries.length > 0) {
            record.bag_entries.forEach((entry: any) => {
              totalBagEntries++
              dayData.totalBagEntries++
              shiftData.totalBagEntries++
              brandData.totalBagEntries++
              productData.totalBagEntries++
              processRoomData.totalBagEntries++
              monitorData.totalBagEntries++
              
              // Process weights
              entry.weights?.forEach((weightStr: string) => {
                if (weightStr && weightStr.trim()) {
                  const weight = parseFloat(weightStr)
                  if (!isNaN(weight)) {
                    allWeights.push(weight)
                    totalWeight += weight
                    weightCount++
                    dayData.totalWeight += weight
                    dayData.weightCount++
                  }
                }
              })
              
              // Count sealed status (10 checks per entry)
              entry.sealed?.forEach((status: string) => {
                totalSealedChecks++
                dayData.totalSealedChecks++
                if (status === 'Comply') {
                  compliantSealed++
                  dayData.compliantSealed++
                  shiftData.compliantSealed++
                  brandData.compliantSealed++
                  productData.compliantSealed++
                  processRoomData.compliantSealed++
                } else if (status === 'not comply') {
                  nonCompliantSealed++
                  dayData.nonCompliantSealed++
                  shiftData.nonCompliantSealed++
                  brandData.nonCompliantSealed++
                  productData.nonCompliantSealed++
                  processRoomData.nonCompliantSealed++
                }
              })
              
              // Count declaration of origin
              if (entry.declarationOfOrigin === 'Comply') {
                compliantOrigin++
                dayData.compliantOrigin++
                shiftData.compliantOrigin++
                brandData.compliantOrigin++
                productData.compliantOrigin++
                processRoomData.compliantOrigin++
              } else if (entry.declarationOfOrigin === 'not comply') {
                nonCompliantOrigin++
                dayData.nonCompliantOrigin++
                shiftData.nonCompliantOrigin++
                brandData.nonCompliantOrigin++
                productData.nonCompliantOrigin++
                processRoomData.nonCompliantOrigin++
              }
            })
          }
        })

        // Calculate weight statistics
        const avgWeight = weightCount > 0 ? (totalWeight / weightCount).toFixed(2) : '0.00'
        const minWeight = allWeights.length > 0 ? Math.min(...allWeights).toFixed(2) : '0.00'
        const maxWeight = allWeights.length > 0 ? Math.max(...allWeights).toFixed(2) : '0.00'
        const sortedWeights = [...allWeights].sort((a, b) => a - b)
        const medianWeight = sortedWeights.length > 0
          ? (sortedWeights.length % 2 === 0
              ? (sortedWeights[sortedWeights.length / 2 - 1] + sortedWeights[sortedWeights.length / 2]) / 2
              : sortedWeights[Math.floor(sortedWeights.length / 2)]).toFixed(2)
          : '0.00'

        // Process chart data
        const chartDataArray = Array.from(dateMap.values())
          .map(d => ({
            date: d.date,
            totalRecords: d.totalRecords,
            totalBagEntries: d.totalBagEntries,
            totalSealedChecks: d.totalSealedChecks,
            compliantSealed: d.compliantSealed,
            nonCompliantSealed: d.nonCompliantSealed,
            compliantOrigin: d.compliantOrigin,
            nonCompliantOrigin: d.nonCompliantOrigin,
            avgWeight: d.weightCount > 0 ? (d.totalWeight / d.weightCount).toFixed(2) : '0.00',
            sealedComplianceRate: (d.compliantSealed + d.nonCompliantSealed) > 0
              ? ((d.compliantSealed / (d.compliantSealed + d.nonCompliantSealed)) * 100).toFixed(1)
              : '0.0',
            originComplianceRate: (d.compliantOrigin + d.nonCompliantOrigin) > 0
              ? ((d.compliantOrigin / (d.compliantOrigin + d.nonCompliantOrigin)) * 100).toFixed(1)
              : '0.0'
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        setChartData(chartDataArray)

        // Process shift comparison data
        const shiftComparison = Array.from(shiftMap.values())
          .map(s => ({
            shift: s.shift,
            totalRecords: s.totalRecords,
            totalBagEntries: s.totalBagEntries,
            compliantSealed: s.compliantSealed,
            nonCompliantSealed: s.nonCompliantSealed,
            compliantOrigin: s.compliantOrigin,
            nonCompliantOrigin: s.nonCompliantOrigin,
            sealedComplianceRate: (s.compliantSealed + s.nonCompliantSealed) > 0
              ? ((s.compliantSealed / (s.compliantSealed + s.nonCompliantSealed)) * 100).toFixed(1)
              : '0.0',
            originComplianceRate: (s.compliantOrigin + s.nonCompliantOrigin) > 0
              ? ((s.compliantOrigin / (s.compliantOrigin + s.nonCompliantOrigin)) * 100).toFixed(1)
              : '0.0'
          }))
          .sort((a, b) => {
            const order = ['Morning', 'Afternoon', 'Night']
            return (order.indexOf(a.shift) - order.indexOf(b.shift)) || a.shift.localeCompare(b.shift)
          })

        // Process brand comparison data
        const brandComparison = Array.from(brandMap.values())
          .map(b => ({
            brand: b.brand,
            totalRecords: b.totalRecords,
            totalBagEntries: b.totalBagEntries,
            compliantSealed: b.compliantSealed,
            nonCompliantSealed: b.nonCompliantSealed,
            compliantOrigin: b.compliantOrigin,
            nonCompliantOrigin: b.nonCompliantOrigin,
            sealedComplianceRate: (b.compliantSealed + b.nonCompliantSealed) > 0
              ? ((b.compliantSealed / (b.compliantSealed + b.nonCompliantSealed)) * 100).toFixed(1)
              : '0.0',
            originComplianceRate: (b.compliantOrigin + b.nonCompliantOrigin) > 0
              ? ((b.compliantOrigin / (b.compliantOrigin + b.nonCompliantOrigin)) * 100).toFixed(1)
              : '0.0'
          }))
          .sort((a, b) => b.totalBagEntries - a.totalBagEntries)
          .slice(0, 10) // Top 10 brands

        // Process product comparison data
        const productComparison = Array.from(productMap.values())
          .map(p => ({
            product: p.product,
            brand: p.brand,
            totalRecords: p.totalRecords,
            totalBagEntries: p.totalBagEntries,
            compliantSealed: p.compliantSealed,
            nonCompliantSealed: p.nonCompliantSealed,
            compliantOrigin: p.compliantOrigin,
            nonCompliantOrigin: p.nonCompliantOrigin,
            sealedComplianceRate: (p.compliantSealed + p.nonCompliantSealed) > 0
              ? ((p.compliantSealed / (p.compliantSealed + p.nonCompliantSealed)) * 100).toFixed(1)
              : '0.0',
            originComplianceRate: (p.compliantOrigin + p.nonCompliantOrigin) > 0
              ? ((p.compliantOrigin / (p.compliantOrigin + p.nonCompliantOrigin)) * 100).toFixed(1)
              : '0.0'
          }))
          .sort((a, b) => b.totalBagEntries - a.totalBagEntries)
          .slice(0, 10) // Top 10 products

        // Process process room comparison data
        const processRoomComparison = Array.from(processRoomMap.values())
          .map(pr => ({
            processRoom: pr.processRoom,
            totalRecords: pr.totalRecords,
            totalBagEntries: pr.totalBagEntries,
            compliantSealed: pr.compliantSealed,
            nonCompliantSealed: pr.nonCompliantSealed,
            compliantOrigin: pr.compliantOrigin,
            nonCompliantOrigin: pr.nonCompliantOrigin,
            sealedComplianceRate: (pr.compliantSealed + pr.nonCompliantSealed) > 0
              ? ((pr.compliantSealed / (pr.compliantSealed + pr.nonCompliantSealed)) * 100).toFixed(1)
              : '0.0',
            originComplianceRate: (pr.compliantOrigin + pr.nonCompliantOrigin) > 0
              ? ((pr.compliantOrigin / (pr.compliantOrigin + pr.nonCompliantOrigin)) * 100).toFixed(1)
              : '0.0'
          }))
          .sort((a, b) => b.totalBagEntries - a.totalBagEntries)

        // Daily stats
        const dailyStatsArray: any[] = chartDataArray.map(d => ({
          date: d.date,
          totalRecords: d.totalRecords,
          totalBagEntries: d.totalBagEntries,
          compliantSealed: d.compliantSealed,
          nonCompliantSealed: d.nonCompliantSealed,
          compliantOrigin: d.compliantOrigin,
          nonCompliantOrigin: d.nonCompliantOrigin,
          sealedComplianceRate: d.sealedComplianceRate,
          originComplianceRate: d.originComplianceRate,
          avgWeight: d.avgWeight
        }))

        setDailyStats(dailyStatsArray as DailyStats[])

        const overallSealedComplianceRate = (compliantSealed + nonCompliantSealed) > 0
          ? ((compliantSealed / (compliantSealed + nonCompliantSealed)) * 100).toFixed(1)
          : '0.0'
        const overallOriginComplianceRate = (compliantOrigin + nonCompliantOrigin) > 0
          ? ((compliantOrigin / (compliantOrigin + nonCompliantOrigin)) * 100).toFixed(1)
          : '0.0'

        setSummaryStats({
          totalRecords,
          totalBagEntries,
          totalSealedChecks,
          compliantSealed,
          nonCompliantSealed,
          compliantOrigin,
          nonCompliantOrigin,
          sealedComplianceRate: overallSealedComplianceRate,
          originComplianceRate: overallOriginComplianceRate,
          avgWeight,
          minWeight,
          maxWeight,
          medianWeight,
          totalWeights: weightCount,
          shiftComparison,
          brandComparison,
          productComparison,
          processRoomComparison
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
                <option value="Staff Good Practices Control">Staff Good Practices Control</option>
                <option value="Foreign Material Findings Record">Foreign Material Findings Record</option>
                <option value="Pre-Operational Review Processing Areas">Pre-Operational Review Processing Areas</option>
                <option value="Internal control of materials used in production areas">Internal control of materials used in production areas</option>
                <option value="Footbath Control">Footbath Control</option>
                <option value="Check weighing and sealing of packaged products">Check weighing and sealing of packaged products</option>
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
                {selectedChecklist === 'Internal control of materials used in production areas' ? 'Área Productiva' : 'Marca/Brand'}
              </label>
              <select
                id="brand"
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                disabled={
                  selectedChecklist === 'Process Environmental Temperature Control' ||
                  (selectedChecklist === 'Metal Detector (PCC #1)' && availableBrands.length === 0) ||
                  (selectedChecklist === 'Checklist Monoproducto' && availableBrands.length === 0) ||
                  (selectedChecklist === 'Checklist Mix Producto' && availableBrands.length === 0) ||
                  (selectedChecklist === 'Foreign Material Findings Record' && availableBrands.length === 0) ||
                  (selectedChecklist === 'Pre-Operational Review Processing Areas' && availableBrands.length === 0) ||
                  (selectedChecklist === 'Internal control of materials used in production areas' && availableBrands.length === 0)
                }
                className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {selectedChecklist === 'Internal control of materials used in production areas' ? 'Todas las áreas' : 'Todas las marcas'}
                </option>
                {availableBrands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="product" className="block text-sm font-medium text-gray-700 mb-1">
                {selectedChecklist === 'Internal control of materials used in production areas' ? 'Jefe de Línea' : 'Producto'}
              </label>
              <select
                id="product"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                disabled={
                  selectedChecklist === 'Process Environmental Temperature Control' ||
                  (selectedChecklist === 'Metal Detector (PCC #1)' && availableProducts.length === 0) ||
                  (selectedChecklist === 'Checklist Monoproducto' && availableProducts.length === 0) ||
                  (selectedChecklist === 'Checklist Mix Producto' && availableProducts.length === 0) ||
                  (selectedChecklist === 'Foreign Material Findings Record' && availableProducts.length === 0) ||
                  (selectedChecklist === 'Pre-Operational Review Processing Areas' && availableProducts.length === 0) ||
                  (selectedChecklist === 'Internal control of materials used in production areas' && availableProducts.length === 0)
                }
                className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {selectedChecklist === 'Internal control of materials used in production areas' ? 'Todos los jefes' : 'Todos los productos'}
                </option>
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
              ) : selectedChecklist === 'Staff Good Practices Control' ? (
                <>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Registros</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalRecords || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Personal</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalStaff || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Tasa de Cumplimiento</h3>
                    <p className="text-2xl font-bold text-blue-600">{summaryStats.complianceRate || '0.0'}%</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Parámetro con Más No Cumplimiento</h3>
                    <p className="text-lg font-bold text-red-600">
                      {summaryStats.mostNonCompliantParameter?.name || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {summaryStats.mostNonCompliantParameter?.count || 0} casos ({summaryStats.mostNonCompliantParameter?.percentage || '0.0'}%)
                    </p>
                  </div>
                </>
              ) : selectedChecklist === 'Foreign Material Findings Record' ? (
                <>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Registros</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalRecords || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-600">
                    <h3 className="text-sm font-medium text-red-700 mb-1">⚠️ Registros con Hallazgos</h3>
                    <p className="text-2xl font-bold text-red-600">{summaryStats.recordsWithFindings || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {summaryStats.findingsRate || '0.0'}% del total
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Registros Sin Hallazgos</h3>
                    <p className="text-2xl font-bold text-green-600">{summaryStats.recordsNoFindings || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-700">
                    <h3 className="text-sm font-medium text-red-800 mb-1">🔍 Total de Hallazgos</h3>
                    <p className="text-2xl font-bold text-red-700">{summaryStats.totalFindings || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {summaryStats.topElementType?.name || 'N/A'} más común
                    </p>
                  </div>
                </>
              ) : selectedChecklist === 'Pre-Operational Review Processing Areas' ? (
                <>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Registros</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalRecords || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Elementos Verificados</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalItemsChecked || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-600">
                    <h3 className="text-sm font-medium text-green-700 mb-1">✅ Elementos que Cumplen</h3>
                    <p className="text-2xl font-bold text-green-600">{summaryStats.totalCompliantItems || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {summaryStats.complianceRate || '0.0'}% del total
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                    <h3 className="text-sm font-medium text-red-700 mb-1">⚠️ Elementos que No Cumplen</h3>
                    <p className="text-2xl font-bold text-red-600">{summaryStats.totalNonCompliantItems || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {summaryStats.recordsWithNonCompliance || 0} registro(s) con no cumplimiento
                    </p>
                  </div>
                </>
              ) : selectedChecklist === 'Internal control of materials used in production areas' ? (
                <>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Registros</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalRecords || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Personal</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalPersonnel || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-600">
                    <h3 className="text-sm font-medium text-green-700 mb-1">✅ Materiales Entregados</h3>
                    <p className="text-2xl font-bold text-green-600">{summaryStats.totalMaterialsHandedOut || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {summaryStats.totalMaterialsReturned || 0} devueltos
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                    <h3 className="text-sm font-medium text-red-700 mb-1">⚠️ Desajustes de Cantidad</h3>
                    <p className="text-2xl font-bold text-red-600">{summaryStats.materialsWithMismatch || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {summaryStats.complianceRate || '0.0'}% tasa de cumplimiento
                    </p>
                  </div>
                </>
              ) : selectedChecklist === 'Footbath Control' ? (
                <>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Registros</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalRecords || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Mediciones</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalMeasurements || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-600">
                    <h3 className="text-sm font-medium text-green-700 mb-1">✅ Mediciones Cumplen (PPM ≥ 200)</h3>
                    <p className="text-2xl font-bold text-green-600">{summaryStats.compliantMeasurements || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {summaryStats.complianceRate || '0.0'}% del total
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                    <h3 className="text-sm font-medium text-red-700 mb-1">⚠️ Mediciones No Cumplen (PPM &lt; 200)</h3>
                    <p className="text-2xl font-bold text-red-600">{summaryStats.nonCompliantMeasurements || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-600">
                    <h3 className="text-sm font-medium text-blue-700 mb-1">PPM Promedio</h3>
                    <p className="text-2xl font-bold text-blue-600">{summaryStats.avgPpmValue || '0.0'}</p>
                  </div>
                </>
              ) : selectedChecklist === 'Check weighing and sealing of packaged products' ? (
                <>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Registros</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalRecords || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">Checklists completados</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Entradas de Bolsas</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalBagEntries || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">{summaryStats.totalSealedChecks || 0} verificaciones de sellado</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-600">
                    <h3 className="text-sm font-medium text-green-700 mb-1">✅ Sellado - Tasa de Cumplimiento</h3>
                    <p className="text-2xl font-bold text-green-600">{summaryStats.sealedComplianceRate || '0.0'}%</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {summaryStats.compliantSealed || 0} cumplen / {summaryStats.nonCompliantSealed || 0} no cumplen
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-emerald-600">
                    <h3 className="text-sm font-medium text-emerald-700 mb-1">✅ Origen - Tasa de Cumplimiento</h3>
                    <p className="text-2xl font-bold text-emerald-600">{summaryStats.originComplianceRate || '0.0'}%</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {summaryStats.compliantOrigin || 0} cumplen / {summaryStats.nonCompliantOrigin || 0} no cumplen
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
                    <h3 className="text-sm font-medium text-purple-700 mb-1">⚖️ Peso Promedio</h3>
                    <p className="text-2xl font-bold text-purple-600">{summaryStats.avgWeight || '0.00'}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Min: {summaryStats.minWeight || '0.00'} | Max: {summaryStats.maxWeight || '0.00'}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-amber-500">
                    <h3 className="text-sm font-medium text-amber-700 mb-1">📊 Peso Mediano</h3>
                    <p className="text-2xl font-bold text-amber-600">{summaryStats.medianWeight || '0.00'}</p>
                    <p className="text-xs text-gray-600 mt-1">{summaryStats.totalWeights || 0} mediciones totales</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                    <h3 className="text-sm font-medium text-red-700 mb-1">⚠️ No Cumplimiento Sellado</h3>
                    <p className="text-2xl font-bold text-red-600">{summaryStats.nonCompliantSealed || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {((summaryStats.nonCompliantSealed || 0) / (summaryStats.totalSealedChecks || 1) * 100).toFixed(1)}% del total
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
                    <h3 className="text-sm font-medium text-orange-700 mb-1">⚠️ No Cumplimiento Origen</h3>
                    <p className="text-2xl font-bold text-orange-600">{summaryStats.nonCompliantOrigin || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {((summaryStats.nonCompliantOrigin || 0) / (summaryStats.totalBagEntries || 1) * 100).toFixed(1)}% de entradas
                    </p>
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

            {selectedChecklist === 'Staff Good Practices Control' && (
              <>
                {/* Staff Compliance Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Cumplimiento por Fecha</h2>
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
                      <Bar dataKey="compliant" fill="#10b981" name="Cumplimiento" />
                      <Bar dataKey="nonCompliant" fill="#ef4444" name="No Cumplimiento" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Staff Members per Day Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Personal Evaluado por Fecha</h2>
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
                      <Bar dataKey="totalStaff" fill="#3b82f6" name="Total Personal" />
                      <Bar dataKey="registros" fill="#8b5cf6" name="Registros" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {selectedChecklist === 'Foreign Material Findings Record' && (
              <>
                {/* Findings Trend Chart - Highlighting Bad Things */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Tendencia de Hallazgos / Findings Trend
                    <span className="text-sm font-normal text-red-600 ml-2">⚠️ Hallazgos son críticos</span>
                  </h2>
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
                      <Bar dataKey="withFindings" fill="#ef4444" name="Con Hallazgos (Crítico)" />
                      <Bar dataKey="noFindings" fill="#10b981" name="Sin Hallazgos" />
                      <Bar dataKey="totalFindings" fill="#dc2626" name="Total Hallazgos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Element Type Distribution */}
                {summaryStats.elementTypes && summaryStats.elementTypes.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Distribución de Tipos de Elementos / Element Type Distribution
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={summaryStats.elementTypes} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" stroke="#6b7280" />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          stroke="#6b7280"
                          width={150}
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
                        <Bar dataKey="count" fill="#ef4444" name="Cantidad de Hallazgos" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Product Codes for Traceability */}
                {summaryStats.productCodes && summaryStats.productCodes.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow border-2 border-blue-300">
                    <h2 className="text-xl font-bold text-blue-900 mb-2">
                      🔍 Códigos de Producto con Hallazgos / Product Codes with Findings
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">
                      Trazabilidad de ingredientes - Ingredient Traceability
                    </p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-blue-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">
                              Código de Producto
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">
                              Cantidad de Hallazgos
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">
                              Estado
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {summaryStats.productCodes.map((item: any, index: number) => (
                            <tr key={index} className="hover:bg-red-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-mono font-semibold text-gray-900">
                                {item.code}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                                  {item.count} hallazgo(s)
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-200 text-red-900">
                                  ⚠️ Crítico
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Brand Findings Summary */}
                {summaryStats.brandFindings && summaryStats.brandFindings.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Hallazgos por Marca / Findings by Brand
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={summaryStats.brandFindings}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="brand"
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
                        <Bar dataKey="withFindings" fill="#ef4444" name="Con Hallazgos" />
                        <Bar dataKey="total" fill="#93c5fd" name="Total Registros" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}

            {selectedChecklist === 'Pre-Operational Review Processing Areas' && (
              <>
                {/* Compliance Rate Over Time Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Tasa de Cumplimiento por Fecha</h2>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
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
                        formatter={(value: number) => [`${value}%`, 'Tasa de Cumplimiento']}
                      />
                      <Legend />
                      <ReferenceLine y={100} stroke="#10b981" strokeDasharray="5 5" label={{ value: 'Objetivo (100%)', position: 'right' }} />
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

                {/* Compliance vs Non-Compliance Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Cumplimiento vs No Cumplimiento por Fecha</h2>
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
                      <Bar dataKey="compliantItems" fill="#10b981" name="Elementos que Cumplen" />
                      <Bar dataKey="nonCompliantItems" fill="#ef4444" name="Elementos que No Cumplen" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Records with Non-Compliance Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Registros con No Cumplimiento por Fecha</h2>
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
                      <Bar dataKey="totalRecords" fill="#93c5fd" name="Total Registros" />
                      <Bar dataKey="recordsWithNonCompliance" fill="#ef4444" name="Registros con No Cumplimiento" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Top Non-Compliant Items */}
                {summaryStats.itemCompliance && summaryStats.itemCompliance.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow border-2 border-red-300">
                    <h2 className="text-xl font-bold text-red-900 mb-2">
                      ⚠️ Elementos con Mayor No Cumplimiento / Top Non-Compliant Items
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">
                      Elementos que requieren mayor atención - Items requiring most attention
                    </p>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={summaryStats.itemCompliance} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" stroke="#6b7280" />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          stroke="#6b7280"
                          width={200}
                          tick={{ fontSize: 10 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px'
                          }}
                          formatter={(value: number, name: string) => {
                            if (name === 'comply') return [`${value}`, 'Cumplen']
                            if (name === 'notComply') return [`${value}`, 'No Cumplen']
                            return [`${value}`, name]
                          }}
                        />
                        <Legend />
                        <Bar dataKey="comply" fill="#10b981" name="Cumplen" />
                        <Bar dataKey="notComply" fill="#ef4444" name="No Cumplen" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Brand Compliance Summary */}
                {summaryStats.brandCompliance && summaryStats.brandCompliance.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Cumplimiento por Marca / Compliance by Brand
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={summaryStats.brandCompliance}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="brand"
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
                        <Bar dataKey="compliant" fill="#10b981" name="Registros que Cumplen" />
                        <Bar dataKey="nonCompliant" fill="#ef4444" name="Registros con No Cumplimiento" />
                        <Bar dataKey="total" fill="#93c5fd" name="Total Registros" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Daily Statistics Table */}
                {dailyStats.length > 0 && (
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
                              Total Registros
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Elementos
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Elementos que Cumplen
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Elementos que No Cumplen
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tasa de Cumplimiento
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {dailyStats.map((stat: any) => (
                            <tr key={stat.date} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {stat.date}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                {stat.totalRecords || 0}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                {stat.totalItems || 0}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {stat.compliantItems || 0}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  {stat.nonCompliantItems || 0}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">
                                {stat.complianceRate || '0.0'}%
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

            {selectedChecklist === 'Internal control of materials used in production areas' && (
              <>
                {/* Material Status Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Estado de Materiales por Fecha</h2>
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
                      <Bar dataKey="goodStatus" fill="#10b981" name="Bueno / Good" />
                      <Bar dataKey="badStatus" fill="#ef4444" name="Malo / Bad" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Quantity Mismatches Chart */}
                <div className="bg-white p-6 rounded-lg shadow border-2 border-red-300">
                  <h2 className="text-xl font-bold text-red-900 mb-4">
                    ⚠️ Desajustes de Cantidad por Fecha / Quantity Mismatches by Date
                  </h2>
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
                      <Bar dataKey="totalPersonnel" fill="#93c5fd" name="Total Personal" />
                      <Bar dataKey="quantityMismatches" fill="#ef4444" name="Desajustes de Cantidad" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Material Compliance Distribution */}
                {summaryStats.materialCompliance && summaryStats.materialCompliance.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Cumplimiento por Tipo de Material / Compliance by Material Type
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={summaryStats.materialCompliance} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" stroke="#6b7280" />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          stroke="#6b7280"
                          width={150}
                          tick={{ fontSize: 10 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px'
                          }}
                        />
                        <Legend />
                        <Bar dataKey="good" fill="#10b981" name="Bueno / Good" />
                        <Bar dataKey="bad" fill="#ef4444" name="Malo / Bad" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Area Compliance Summary */}
                {summaryStats.areaCompliance && summaryStats.areaCompliance.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Cumplimiento por Área Productiva / Compliance by Productive Area
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={summaryStats.areaCompliance}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="area"
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
                        <Bar dataKey="good" fill="#10b981" name="Bueno / Good" />
                        <Bar dataKey="bad" fill="#ef4444" name="Malo / Bad" />
                        <Bar dataKey="total" fill="#93c5fd" name="Total Registros" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Daily Statistics Table */}
                {dailyStats.length > 0 && (
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
                              Total Registros
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Personal
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Materiales
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Bueno
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Malo
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Desajustes
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tasa de Cumplimiento
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {dailyStats.map((stat: any) => (
                            <tr key={stat.date} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {stat.date}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                {stat.totalRecords || 0}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                {stat.totalPersonnel || 0}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                {stat.totalMaterials || 0}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {stat.goodStatus || 0}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  {stat.badStatus || 0}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                  {stat.quantityMismatches || 0}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  parseFloat(stat.complianceRate || '0') >= 95 
                                    ? 'bg-green-100 text-green-800' 
                                    : parseFloat(stat.complianceRate || '0') >= 80
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {stat.complianceRate || '0.0'}%
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

            {selectedChecklist === 'Check weighing and sealing of packaged products' && (
              <>
                {/* Compliance Trends Over Time */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Tendencias de Cumplimiento / Compliance Trends Over Time
                  </h2>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
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
                        formatter={(value: number) => [`${value}%`, '']}
                      />
                      <Legend />
                      <ReferenceLine y={95} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Objetivo (95%)', position: 'right' }} />
                      <Line
                        type="monotone"
                        dataKey="sealedComplianceRate"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Sellado / Sealed"
                      />
                      <Line
                        type="monotone"
                        dataKey="originComplianceRate"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Origen / Origin"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Compliance Comparison - Sealed vs Origin */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Comparación de Cumplimiento: Sellado vs Origen / Compliance Comparison: Sealed vs Origin
                  </h2>
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
                        formatter={(value: number) => [`${value}%`, '']}
                      />
                      <Legend />
                      <Bar dataKey="sealedComplianceRate" fill="#10b981" name="Sellado / Sealed" />
                      <Bar dataKey="originComplianceRate" fill="#3b82f6" name="Origen / Origin" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Shift Performance Comparison */}
                {summaryStats.shiftComparison && summaryStats.shiftComparison.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Rendimiento por Turno / Performance by Shift
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={summaryStats.shiftComparison}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="shift"
                          stroke="#6b7280"
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
                          formatter={(value: number) => [`${value}%`, '']}
                        />
                        <Legend />
                        <Bar dataKey="sealedComplianceRate" fill="#10b981" name="Sellado / Sealed" />
                        <Bar dataKey="originComplianceRate" fill="#3b82f6" name="Origen / Origin" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Brand Performance */}
                {summaryStats.brandComparison && summaryStats.brandComparison.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Rendimiento por Marca (Top 10) / Performance by Brand (Top 10)
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={summaryStats.brandComparison}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="brand"
                          stroke="#6b7280"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          tick={{ fontSize: 10 }}
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
                          formatter={(value: number) => [`${value}%`, '']}
                        />
                        <Legend />
                        <Bar dataKey="sealedComplianceRate" fill="#10b981" name="Sellado / Sealed" />
                        <Bar dataKey="originComplianceRate" fill="#3b82f6" name="Origen / Origin" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Product Performance */}
                {summaryStats.productComparison && summaryStats.productComparison.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Rendimiento por Producto (Top 10) / Performance by Product (Top 10)
                    </h2>
                    <ResponsiveContainer width="100%" height={500}>
                      <BarChart data={summaryStats.productComparison} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          type="number"
                          stroke="#6b7280"
                          label={{ value: 'Tasa de Cumplimiento (%)', position: 'insideBottom', offset: -5 }}
                          domain={[0, 100]}
                        />
                        <YAxis
                          dataKey="product"
                          type="category"
                          stroke="#6b7280"
                          width={200}
                          tick={{ fontSize: 9 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px'
                          }}
                          formatter={(value: number) => [`${value}%`, '']}
                        />
                        <Legend />
                        <Bar dataKey="sealedComplianceRate" fill="#10b981" name="Sellado / Sealed" />
                        <Bar dataKey="originComplianceRate" fill="#3b82f6" name="Origen / Origin" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Process Room Performance */}
                {summaryStats.processRoomComparison && summaryStats.processRoomComparison.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Rendimiento por Sala de Proceso / Performance by Process Room
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={summaryStats.processRoomComparison}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="processRoom"
                          stroke="#6b7280"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          tick={{ fontSize: 11 }}
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
                          formatter={(value: number) => [`${value}%`, '']}
                        />
                        <Legend />
                        <Bar dataKey="sealedComplianceRate" fill="#10b981" name="Sellado / Sealed" />
                        <Bar dataKey="originComplianceRate" fill="#3b82f6" name="Origen / Origin" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Weight Statistics Over Time */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Estadísticas de Peso por Fecha / Weight Statistics Over Time
                  </h2>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
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
                        label={{ value: 'Peso Promedio', angle: -90, position: 'insideLeft' }}
                      />
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
                        dataKey="avgWeight"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Peso Promedio / Average Weight"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Compliance Breakdown Pie Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Distribución de Cumplimiento - Sellado / Sealed Compliance Distribution
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Cumplen / Comply', value: summaryStats.compliantSealed || 0 },
                            { name: 'No Cumplen / Not Comply', value: summaryStats.nonCompliantSealed || 0 }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Distribución de Cumplimiento - Origen / Origin Compliance Distribution
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Cumplen / Comply', value: summaryStats.compliantOrigin || 0 },
                            { name: 'No Cumplen / Not Comply', value: summaryStats.nonCompliantOrigin || 0 }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#3b82f6" />
                          <Cell fill="#f59e0b" />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
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
                          if ('deviations' in stat) {
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

            {selectedChecklist === 'Staff Good Practices Control' && dailyStats.length > 0 && (
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
                            Total Personal
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Parámetros Cumplidos
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Parámetros No Cumplidos
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tasa (%)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dailyStats.map((stat) => {
                          if ('totalStaff' in stat) {
                            return (
                              <tr key={stat.date} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {stat.date}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                  {stat.totalRecords}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                  {stat.totalStaff}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {stat.compliant}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    {stat.nonCompliant}
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

                {/* Compliance Rate Pie Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Distribución de Cumplimiento</h2>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Cumplimiento', value: summaryStats.compliantParameters || 0 },
                          { name: 'No Cumplimiento', value: summaryStats.nonCompliantParameters || 0 }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {selectedChecklist === 'Check weighing and sealing of packaged products' && dailyStats.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Estadísticas Diarias / Daily Statistics
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha / Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Registros / Records
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Entradas / Entries
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sellado Cumple / Sealed Comply
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sellado No Cumple / Sealed Not Comply
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Origen Cumple / Origin Comply
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Origen No Cumple / Origin Not Comply
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tasa Sellado / Sealed Rate
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tasa Origen / Origin Rate
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Peso Promedio / Avg Weight
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dailyStats.map((stat: any) => (
                        <tr key={stat.date} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {stat.date}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {stat.totalRecords || 0}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {stat.totalBagEntries || 0}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {stat.compliantSealed || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {stat.nonCompliantSealed || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {stat.compliantOrigin || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              {stat.nonCompliantOrigin || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              parseFloat(stat.sealedComplianceRate || '0') >= 95 
                                ? 'bg-green-100 text-green-800' 
                                : parseFloat(stat.sealedComplianceRate || '0') >= 80
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {stat.sealedComplianceRate || '0.0'}%
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              parseFloat(stat.originComplianceRate || '0') >= 95 
                                ? 'bg-green-100 text-green-800' 
                                : parseFloat(stat.originComplianceRate || '0') >= 80
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {stat.originComplianceRate || '0.0'}%
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">
                            {stat.avgWeight || '0.00'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

