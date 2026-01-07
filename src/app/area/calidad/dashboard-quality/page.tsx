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
import { fetchChecklistCleanlinessControlPackingData } from '@/lib/supabase/checklistCleanlinessControlPacking'
import { fetchChecklistStaffGlassesAuditoryData } from '@/lib/supabase/checklistStaffGlassesAuditory'
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
  overLimit: number
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

type CleanlinessControlPackingDailyStats = {
  date: string
  totalRecords: number
  totalAreas: number
  totalParts: number
  compliantParts: number
  nonCompliantParts: number
  totalBioluminescenceTests: number
  acceptTests: number
  cautionTests: number
  rejectTests: number
  complianceRate: string
}

type DailyStats = TemperatureDailyStats | MetalDetectorDailyStats | StaffPracticesDailyStats | ForeignMaterialDailyStats | PreOperationalReviewDailyStats | FootbathControlDailyStats | CleanlinessControlPackingDailyStats

// Parameter field names mapping for Staff Good Practices Control
const STAFF_PRACTICES_PARAMETER_FIELDS = [
  'staffAppearance',
  'completeUniform',
  'accessoriesAbsence',
  'workToolsUsage',
  'cutCleanNotPolishedNails',
  'noMakeupOn',
  'staffBehavior',
  'staffHealth'
] as const

const STAFF_PRACTICES_PARAMETER_NAMES: Record<string, string> = {
  staffAppearance: 'Staff Appearance',
  completeUniform: 'Complete Uniform',
  accessoriesAbsence: 'Accessories Absence',
  workToolsUsage: 'Work Tools Usage',
  cutCleanNotPolishedNails: 'Cut Clean Nails',
  noMakeupOn: 'No Makeup',
  staffBehavior: 'Staff Behavior',
  staffHealth: 'Staff Health'
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
  const [chartData, setChartData] = useState<any>([])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [summaryStats, setSummaryStats] = useState<any>({})
  const [availableOrdens, setAvailableOrdens] = useState<string[]>([])
  const [availableBrands, setAvailableBrands] = useState<string[]>([])
  const [availableProducts, setAvailableProducts] = useState<string[]>([])
  const [availableSkus, setAvailableSkus] = useState<string[]>([])
  const [selectedSku, setSelectedSku] = useState('')
  // Filters for Cleanliness Control
  const [filterNoComply, setFilterNoComply] = useState<boolean | null>(null)
  const [filterCaution, setFilterCaution] = useState<boolean | null>(null)
  const [filterReject, setFilterReject] = useState<boolean | null>(null)

  // Set default date range to last 30 days
  useEffect(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)
    
    setEndDate(today.toISOString().split('T')[0])
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
  }, [])

  // Reset filters when checklist changes
  useEffect(() => {
    setFilterNoComply(null)
    setFilterCaution(null)
    setFilterReject(null)
  }, [selectedChecklist])

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
        const TEMP_LIMIT = 50 // °F
        
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
              overLimit: 0,
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
          
          // Track "Over Limit" specifically (temp > 50°F)
          if (point.averageTemp > TEMP_LIMIT) {
            stats.overLimit++
          }
        })

        // Calculate averages
        const dailyStatsArray: DailyStats[] = Array.from(statsMap.values()).map((stats) => ({
          ...stats,
          avgTemp: stats.avgTemp / stats.totalReadings
        }))

        dailyStatsArray.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        setDailyStats(dailyStatsArray)
        
        // Calculate HACCP/Compliance KPIs
        const totalReadings = processedData.length
        const deviations = processedData.filter((d) => d.averageTemp > TEMP_LIMIT)
        const deviationCount = deviations.length
        const compliantCount = processedData.filter((d) => d.averageTemp <= TEMP_LIMIT).length
        const compliancePercentage = totalReadings > 0 
          ? ((compliantCount / totalReadings) * 100).toFixed(1)
          : '0.0'
        
        // Calculate worst excursion (max temp above limit)
        const overLimitTemps = processedData
          .filter((d) => d.averageTemp > TEMP_LIMIT)
          .map((d) => d.averageTemp)
        const worstExcursion = overLimitTemps.length > 0
          ? Math.max(...overLimitTemps).toFixed(1)
          : '0.0'
        const worstExcursionValue = overLimitTemps.length > 0
          ? Math.max(...overLimitTemps) - TEMP_LIMIT
          : 0
        
        // Calculate consecutive deviation streak
        let maxConsecutiveStreak = 0
        let currentStreak = 0
        processedData.forEach((point) => {
          if (point.averageTemp > TEMP_LIMIT) {
            currentStreak++
            maxConsecutiveStreak = Math.max(maxConsecutiveStreak, currentStreak)
          } else {
            currentStreak = 0
          }
        })
        
        setSummaryStats({
          totalRecords: records.length,
          totalReadings: totalReadings,
          avgTemp: processedData.length > 0 
            ? (processedData.reduce((sum, d) => sum + d.averageTemp, 0) / processedData.length).toFixed(1)
            : '0.0',
          withinRange: processedData.filter((d) => d.status === 'Within Range').length,
          // HACCP KPIs
          compliancePercentage: compliancePercentage,
          deviationCount: deviationCount,
          timeOutOfSpec: deviationCount, // Number of readings above limit
          worstExcursion: worstExcursion,
          worstExcursionValue: worstExcursionValue,
          consecutiveStreak: maxConsecutiveStreak
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

        // Process data with full metadata for comprehensive KPIs
        const processedData: any[] = []
        const deviationData: any[] = []
        const allReadingsWithMetadata: any[] = []
        
        // SOP requirement: checks should be every hour +/- 10 minutes
        const REQUIRED_CHECK_INTERVAL_MINUTES = 60
        const ALLOWED_VARIANCE_MINUTES = 10
        
        finalRecords.forEach((record: any) => {
          record.readings?.forEach((reading: any, readingIndex: number) => {
            const hasDeviation = reading.bf === 'ND' || reading.bnf === 'ND' || reading.bss === 'ND' ||
                                 reading.sensitivity === 'No comply' || reading.noiseAlarm === 'No comply' ||
                                 reading.rejectingArm === 'No comply'
            
            // Parse datetime for gap calculations
            // Date format is "MMM-DD-YYYY" (e.g., "NOV-17-2025")
            // Hour format is "HH:mm" (e.g., "08:30")
            let readingDateTime: Date | null = null
            if (reading.hour && record.date_string) {
              try {
                // Convert MMM-DD-YYYY to a parseable format
                const dateParts = record.date_string.split('-')
                if (dateParts.length === 3) {
                  const monthMap: { [key: string]: string } = {
                    'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
                    'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
                    'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
                  }
                  const month = monthMap[dateParts[0].toUpperCase()] || '01'
                  const day = dateParts[1].padStart(2, '0')
                  const year = dateParts[2]
                  const isoDate = `${year}-${month}-${day}T${reading.hour}:00`
                  readingDateTime = new Date(isoDate)
                  // Check if date is valid
                  if (isNaN(readingDateTime.getTime())) {
                    readingDateTime = null
                  }
                }
              } catch (e) {
                readingDateTime = null
              }
            }
            
            const readingData = {
              date: record.date_string,
              hour: reading.hour || '',
              datetime: readingDateTime,
              bf: reading.bf || '',
              bnf: reading.bnf || '',
              bss: reading.bss || '',
              sensitivity: reading.sensitivity || '',
              noiseAlarm: reading.noiseAlarm || '',
              rejectingArm: reading.rejectingArm || '',
              hasDeviation: hasDeviation,
              orden: record.orden,
              brand: record.brand,
              product: record.product,
              processLine: record.process_line || '',
              detectorId: record.metal_detector_id || '',
              startTime: record.metal_detector_start_time || '',
              finishTime: record.metal_detector_finish_time || '',
              observation: reading.observation || '',
              correctiveActions: reading.correctiveActions || '',
              recordId: record.id || '',
              readingIndex: readingIndex
            }
            
            processedData.push(readingData)
            allReadingsWithMetadata.push(readingData)
            
            if (hasDeviation) {
              // Determine which test piece failed
              let testPieceFailed = 'Other'
              if (reading.bf === 'ND') testPieceFailed = 'BF'
              else if (reading.bnf === 'ND') testPieceFailed = 'B.NF'
              else if (reading.bss === 'ND') testPieceFailed = 'B.S.S'
              
              deviationData.push({
                ...readingData,
                type: testPieceFailed !== 'Other' ? testPieceFailed :
                      reading.sensitivity === 'No comply' ? 'Sensitivity' :
                      reading.noiseAlarm === 'No comply' ? 'Noise Alarm' :
                      reading.rejectingArm === 'No comply' ? 'Rejecting Arm' : 'Other',
                testPieceFailed: testPieceFailed
              })
            }
          })
        })
        
        // Sort all readings by datetime for gap calculations
        allReadingsWithMetadata.sort((a, b) => {
          if (!a.datetime || !b.datetime) return 0
          return a.datetime.getTime() - b.datetime.getTime()
        })

        // ============================================
        // 1. CCP PROTECTION KPIs
        // ============================================
        const totalReadings = processedData.length
        const passedReadings = processedData.filter(p => !p.hasDeviation).length
        const readingsPassRate = totalReadings > 0 
          ? ((passedReadings / totalReadings) * 100).toFixed(1)
          : '0.0'
        
        // Calculate longest gap between checks (in minutes)
        let longestGapMinutes = 0
        for (let i = 1; i < allReadingsWithMetadata.length; i++) {
          const prev = allReadingsWithMetadata[i - 1]
          const curr = allReadingsWithMetadata[i]
          if (prev.datetime && curr.datetime) {
            const gapMinutes = (curr.datetime.getTime() - prev.datetime.getTime()) / (1000 * 60)
            longestGapMinutes = Math.max(longestGapMinutes, gapMinutes)
          }
        }
        
        // Check for runs with incomplete verification
        // A run is incomplete if it doesn't have all 3 test pieces (BF, B.NF, B.S.S) passing
        const runsWithIncompleteVerification = finalRecords.filter((record: any) => {
          const readings = record.readings || []
          return readings.some((r: any) => 
            // These fields are modeled as status unions, so empty-string checks are invalid in TS.
            // Treat only missing values (null/undefined) as incomplete.
            r.bf == null || r.bnf == null || r.bss == null
          )
        })
        const runsIncompleteCount = runsWithIncompleteVerification.length
        const runsIncompletePercentage = finalRecords.length > 0
          ? ((runsIncompleteCount / finalRecords.length) * 100).toFixed(1)
          : '0.0'
        
        // ============================================
        // 2. CHALLENGE TEST PERFORMANCE
        // ============================================
        // Pass rate by test piece type
        const bfTests = processedData.filter(p => p.bf === 'D' || p.bf === 'ND')
        const bfPassed = bfTests.filter(p => p.bf === 'D').length
        const bfPassRate = bfTests.length > 0 ? ((bfPassed / bfTests.length) * 100).toFixed(1) : '0.0'
        const bfFailures = bfTests.filter(p => p.bf === 'ND').length
        
        const bnfTests = processedData.filter(p => p.bnf === 'D' || p.bnf === 'ND')
        const bnfPassed = bnfTests.filter(p => p.bnf === 'D').length
        const bnfPassRate = bnfTests.length > 0 ? ((bnfPassed / bnfTests.length) * 100).toFixed(1) : '0.0'
        const bnfFailures = bnfTests.filter(p => p.bnf === 'ND').length
        
        const bssTests = processedData.filter(p => p.bss === 'D' || p.bss === 'ND')
        const bssPassed = bssTests.filter(p => p.bss === 'D').length
        const bssPassRate = bssTests.length > 0 ? ((bssPassed / bssTests.length) * 100).toFixed(1) : '0.0'
        const bssFailures = bssTests.filter(p => p.bss === 'ND').length
        
        // ============================================
        // 3. DEVIATION SEVERITY KPIs
        // ============================================
        // Calculate time at risk per failure
        // Time at risk = time from last good check to failure found
        const deviationLog: any[] = []
        deviationData.forEach((deviation) => {
          // Find the last good check before this deviation
          const deviationIndex = allReadingsWithMetadata.findIndex(r => 
            r.date === deviation.date && r.hour === deviation.hour
          )
          
          let timeAtRiskMinutes = 0
          let lastGoodCheckTime: Date | null = null
          
          if (deviationIndex > 0 && allReadingsWithMetadata[deviationIndex - 1].datetime) {
            lastGoodCheckTime = allReadingsWithMetadata[deviationIndex - 1].datetime
            if (deviation.datetime && lastGoodCheckTime) {
              timeAtRiskMinutes = (deviation.datetime.getTime() - lastGoodCheckTime.getTime()) / (1000 * 60)
            }
          }
          
          deviationLog.push({
            date: deviation.date,
            time: deviation.hour,
            datetime: deviation.datetime,
            line: deviation.processLine,
            detectorId: deviation.detectorId,
            order: deviation.orden,
            testPieceFailed: deviation.testPieceFailed,
            timeAtRisk: timeAtRiskMinutes,
            timeAtRiskFormatted: timeAtRiskMinutes > 0 
              ? `${Math.floor(timeAtRiskMinutes / 60)}h ${Math.floor(timeAtRiskMinutes % 60)}m`
              : 'N/A',
            correctiveAction: deviation.correctiveActions || deviation.observation || '',
            closeTime: '' // Would need to be tracked separately
          })
        })
        
        // Calculate lots/orders impacted
        const impactedOrders = new Set(deviationData.map(d => d.orden).filter(Boolean))
        const lotsImpactedCount = impactedOrders.size
        
        // ============================================
        // 4. EQUIPMENT RELIABILITY KPIs
        // ============================================
        // Rejecting arm test pass rate
        const rejectingArmTests = processedData.filter(p => p.rejectingArm === 'Ok' || p.rejectingArm === 'No comply')
        const rejectingArmPassed = rejectingArmTests.filter(p => p.rejectingArm === 'Ok').length
        const rejectingArmPassRate = rejectingArmTests.length > 0
          ? ((rejectingArmPassed / rejectingArmTests.length) * 100).toFixed(1)
          : '0.0'
        
        // Noise alarm events rate
        const noiseAlarmEvents = processedData.filter(p => p.noiseAlarm === 'No comply').length
        const noiseAlarmRate = totalReadings > 0
          ? ((noiseAlarmEvents / totalReadings) * 100).toFixed(2)
          : '0.00'
        
        // Noise alarm pass rate (percentage of 'Ok' readings)
        const noiseAlarmTests = processedData.filter(p => p.noiseAlarm === 'Ok' || p.noiseAlarm === 'No comply')
        const noiseAlarmPassed = noiseAlarmTests.filter(p => p.noiseAlarm === 'Ok').length
        const noiseAlarmPassRate = noiseAlarmTests.length > 0
          ? ((noiseAlarmPassed / noiseAlarmTests.length) * 100).toFixed(1)
          : '0.0'
        
        // Deviation count and percentage
        const deviationCount = deviationData.length
        const deviationPercentage = totalReadings > 0
          ? ((deviationCount / totalReadings) * 100).toFixed(1)
          : '0.0'
        
        // Sensitivity setting tracking (would need actual numeric values, using pass/fail for now)
        const sensitivityTests = processedData.filter(p => p.sensitivity === 'Ok' || p.sensitivity === 'No comply')
        const sensitivityPassed = sensitivityTests.filter(p => p.sensitivity === 'Ok').length
        const sensitivityPassRate = sensitivityTests.length > 0
          ? ((sensitivityPassed / sensitivityTests.length) * 100).toFixed(1)
          : '0.0'
        
        // Detector-specific failure rate
        const detectorStats = new Map<string, { total: number, failures: number }>()
        processedData.forEach((point) => {
          const detectorId = point.detectorId || 'Unknown'
          if (!detectorStats.has(detectorId)) {
            detectorStats.set(detectorId, { total: 0, failures: 0 })
          }
          const stats = detectorStats.get(detectorId)!
          stats.total++
          if (point.hasDeviation) {
            stats.failures++
          }
        })
        
        const detectorFailureRates = Array.from(detectorStats.entries()).map(([detectorId, stats]) => ({
          detectorId,
          total: stats.total,
          failures: stats.failures,
          failureRate: stats.total > 0 ? ((stats.failures / stats.total) * 100).toFixed(1) : '0.0',
          passRate: stats.total > 0 ? (((stats.total - stats.failures) / stats.total) * 100).toFixed(1) : '0.0'
        })).sort((a, b) => parseFloat(b.failureRate) - parseFloat(a.failureRate))
        
        // ============================================
        // CHART DATA
        // ============================================
        // Challenge Test Performance: Pass/Fail by test piece type (stacked bar)
        const testPieceChartData = [
          {
            testPiece: 'BF',
            passed: bfPassed,
            failed: bfFailures,
            passRate: parseFloat(bfPassRate)
          },
          {
            testPiece: 'B.NF',
            passed: bnfPassed,
            failed: bnfFailures,
            passRate: parseFloat(bnfPassRate)
          },
          {
            testPiece: 'B.S.S',
            passed: bssPassed,
            failed: bssFailures,
            passRate: parseFloat(bssPassRate)
          }
        ]
        
        // Weekly/Monthly trend for test piece failures
        const failureTrendMap = new Map<string, { date: string, bf: number, bnf: number, bss: number }>()
        deviationData.forEach((dev) => {
          const date = dev.date
          if (!failureTrendMap.has(date)) {
            failureTrendMap.set(date, { date, bf: 0, bnf: 0, bss: 0 })
          }
          const trend = failureTrendMap.get(date)!
          if (dev.testPieceFailed === 'BF') trend.bf++
          else if (dev.testPieceFailed === 'B.NF') trend.bnf++
          else if (dev.testPieceFailed === 'B.S.S') trend.bss++
        })
        
        const failureTrendData = Array.from(failureTrendMap.values())
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        
        // Failures by product
        const productFailureMap = new Map<string, { product: string, total: number, failures: number }>()
        processedData.forEach((point) => {
          const product = point.product || 'Unknown'
          if (!productFailureMap.has(product)) {
            productFailureMap.set(product, { product, total: 0, failures: 0 })
          }
          const stats = productFailureMap.get(product)!
          stats.total++
          if (point.hasDeviation) {
            stats.failures++
          }
        })
        
        const productFailureData = Array.from(productFailureMap.values())
          .map(({ product, total, failures }) => ({
            product,
            total,
            failures,
            passRate: total > 0 ? (((total - failures) / total) * 100).toFixed(1) : '0.0',
            failureRate: total > 0 ? ((failures / total) * 100).toFixed(1) : '0.0'
          }))
          .sort((a, b) => b.failures - a.failures)
        
        // Failures over time (daily aggregation)
        const dailyFailureMap = new Map<string, { date: string, total: number, failures: number }>()
        processedData.forEach((point) => {
          const date = point.date || 'Unknown'
          if (!dailyFailureMap.has(date)) {
            dailyFailureMap.set(date, { date, total: 0, failures: 0 })
          }
          const stats = dailyFailureMap.get(date)!
          stats.total++
          if (point.hasDeviation) {
            stats.failures++
          }
        })
        
        const dailyFailureData = Array.from(dailyFailureMap.values())
          .map(({ date, total, failures }) => ({
            date,
            total,
            failures,
            passRate: total > 0 ? (((total - failures) / total) * 100).toFixed(1) : '0.0'
          }))
          .sort((a, b) => {
            // Sort by date - format is "MMM-DD-YYYY" (e.g., "NOV-17-2025")
            try {
              const monthMap: { [key: string]: string } = {
                'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
                'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
                'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
              }
              const datePartsA = a.date.split('-')
              const datePartsB = b.date.split('-')
              if (datePartsA.length === 3 && datePartsB.length === 3) {
                const monthA = monthMap[datePartsA[0].toUpperCase()] || '01'
                const dayA = datePartsA[1].padStart(2, '0')
                const yearA = datePartsA[2]
                const isoDateA = `${yearA}-${monthA}-${dayA}`
                
                const monthB = monthMap[datePartsB[0].toUpperCase()] || '01'
                const dayB = datePartsB[1].padStart(2, '0')
                const yearB = datePartsB[2]
                const isoDateB = `${yearB}-${monthB}-${dayB}`
                
                return new Date(isoDateA).getTime() - new Date(isoDateB).getTime()
              }
              return 0
            } catch {
              return 0
            }
          })
        
        setChartData({
          testPiecePerformance: testPieceChartData,
          failureTrend: failureTrendData,
          detectorFailureRates: detectorFailureRates,
          productFailureData: productFailureData,
          dailyFailureData: dailyFailureData
        })
        
        setDailyStats([]) // Not using daily stats table for Metal Detector anymore
        
        // Set comprehensive summary stats
        setSummaryStats({
          // CCP Protection KPIs
          readingsPassRate: readingsPassRate,
          longestGapMinutes: longestGapMinutes,
          longestGapFormatted: longestGapMinutes > 0
            ? `${Math.floor(longestGapMinutes / 60)}h ${Math.floor(longestGapMinutes % 60)}m`
            : 'N/A',
          runsIncompleteCount: runsIncompleteCount,
          runsIncompletePercentage: runsIncompletePercentage,
          
          // Challenge Test Performance
          bfPassRate: bfPassRate,
          bfFailures: bfFailures,
          bnfPassRate: bnfPassRate,
          bnfFailures: bnfFailures,
          bssPassRate: bssPassRate,
          bssFailures: bssFailures,
          
          // Deviation Severity
          lotsImpactedCount: lotsImpactedCount,
          deviationLog: deviationLog,
          
          // Equipment Reliability
          rejectingArmPassRate: rejectingArmPassRate,
          noiseAlarmEvents: noiseAlarmEvents,
          noiseAlarmRate: noiseAlarmRate,
          noiseAlarmPassRate: noiseAlarmPassRate,
          sensitivityPassRate: sensitivityPassRate,
          detectorFailureRates: detectorFailureRates,
          
          // Deviation metrics
          deviationCount: deviationCount,
          deviationPercentage: deviationPercentage,
          totalReadings: totalReadings,
          
          // Legacy (for compatibility)
          totalRecords: finalRecords.length,
          totalDeviations: deviationData.length
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
        // NOTE: Mix Product checklist is stored in `checklist_producto_mix`
        // Use `date_utc` for filtering and map it to a YYYY-MM-DD `fecha` field for charts/filters.
        let query = supabase.from('checklist_producto_mix').select('*')
        if (startDate) {
          const startUTC = new Date(`${startDate}T00:00:00Z`).toISOString()
          query = query.gte('date_utc', startUTC)
        }
        if (endDate) {
          const endDateObj = new Date(`${endDate}T00:00:00Z`)
          endDateObj.setDate(endDateObj.getDate() + 1)
          query = query.lt('date_utc', endDateObj.toISOString())
        }

        const { data: rawRecords, error } = await query
        if (error) throw error

        const records =
          (rawRecords || []).map((r: any) => {
            // Parse date_string (format: "DEC-31-2025") to YYYY-MM-DD for filtering/charts
            let fecha = ''
            if (r?.date_string) {
              // Parse MMM-DD-YYYY format
              const monthMap: Record<string, string> = {
                'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
                'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
              }
              const parts = r.date_string.split('-')
              if (parts.length === 3) {
                const [month, day, year] = parts
                fecha = `${year}-${monthMap[month.toUpperCase()] || '01'}-${day.padStart(2, '0')}`
              }
            }
            if (!fecha && r?.date_utc) {
              fecha = new Date(r.date_utc).toISOString().split('T')[0]
            }
            return {
              ...r,
              fecha
            }
          }) || []
        
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
        if (selectedSku) {
          finalRecords = finalRecords.filter((r: any) => 
            r.sku?.toLowerCase().includes(selectedSku.toLowerCase())
          )
        }

        // Update available options based on current filters
        setAvailableOrdens(Array.from(new Set(finalRecords.map((r: any) => r.orden_fabricacion).filter(Boolean))).sort())
        setAvailableBrands(Array.from(new Set(finalRecords.map((r: any) => r.cliente).filter(Boolean))).sort())
        setAvailableProducts(Array.from(new Set(finalRecords.map((r: any) => r.producto).filter(Boolean))).sort())
        setAvailableSkus(Array.from(new Set(finalRecords.map((r: any) => r.sku).filter(Boolean))).sort())
        
        setData(finalRecords)
        
        // ============================================
        // MIX PRODUCT METRICS CALCULATION
        // ============================================
        
        let totalPallets = 0
        let compliantMixPallets = 0
        let totalMixDeviation = 0
        let mixDeviationCount = 0
        let tempMeasurements: number[] = []
        let bagWeights: number[] = []
        let defectCounts: Record<string, number> = {}
        let fruitDefectCounts: Record<string, number> = {}
        
        // Charts Data Accumulators
        // Group by date for temperature (global)
        const specsStabilityMap = new Map<string, { 
          date: string, 
          temps: number[], 
          phs: number[], 
          brixs: number[] 
        }>()
        
        // Group by date-product for weight (per product)
        const weightByDateProduct = new Map<string, { date: string, product: string, weights: number[] }>()
        
        // Track processed pallets to avoid duplicates
        const processedPallets = new Set<string>()

        finalRecords.forEach((record: any) => {
          const date = record.fecha
          const product = record.producto || 'Unknown'
          
          if (!specsStabilityMap.has(date)) {
            specsStabilityMap.set(date, { date, temps: [], phs: [], brixs: [] })
          }
          const dailySpecs = specsStabilityMap.get(date)!
          
          const dateProductKey = `${date}-${product}`
          if (!weightByDateProduct.has(dateProductKey)) {
            weightByDateProduct.set(dateProductKey, { date, product, weights: [] })
          }
          const dailyProductSpecs = weightByDateProduct.get(dateProductKey)!

          if (record.pallets && Array.isArray(record.pallets)) {
            record.pallets.forEach((pallet: any) => {
              // Create unique pallet ID to avoid duplicates
              const palletId = `${record.id}-${pallet.id}`
              if (processedPallets.has(palletId)) {
                return // Skip duplicate pallet
              }
              processedPallets.add(palletId)
              
              totalPallets++
              let isPalletMixCompliant = true
              
              // 1. Mix Compliance & Deviation
              if (pallet.fieldsByFruit && pallet.expectedCompositions) {
                // Get bag weight for percentage calc
                let pesoBolsa = 0
                const commonFields = pallet.commonFields || []
                const pesoBolsaField = commonFields.find((f: any) => f.campo.includes('Peso Bolsa'))
                const pesoBolsaValue = pallet.values[pesoBolsaField?.campo] || pallet.values['Peso Bolsa (gr)'] || pallet.values['Peso Bolsa']
                if (pesoBolsaValue) {
                  pesoBolsa = parseFloat(pesoBolsaValue.toString().replace(/[^\d.]/g, ''))
                }

                // Per fruit checks
                Object.keys(pallet.fieldsByFruit).forEach(fruit => {
                  const expectedPctDecimal = pallet.expectedCompositions[fruit]
                  if (expectedPctDecimal !== undefined && pesoBolsa > 0) {
                    const pesoFrutaKey = `Peso Fruta ${fruit}`
                    const pesoFrutaVal = pallet.values[pesoFrutaKey]
                    if (pesoFrutaVal) {
                      const pesoFruta = parseFloat(pesoFrutaVal.toString().replace(/[^\d.]/g, ''))
                      const actualPct = (pesoFruta / pesoBolsa) * 100
                      const expectedPct = expectedPctDecimal * 100
                      const deviation = Math.abs(actualPct - expectedPct)
                      
                      totalMixDeviation += deviation
                      mixDeviationCount++
                      
                      if (deviation > 5) {
                        isPalletMixCompliant = false
                      }
                    }
                  }
                  
                  // 4. Defects
                  const fields = pallet.fieldsByFruit[fruit] || []
                  fields.forEach((f: any) => {
                    const key = `${fruit}-${f.campo}`
                    const val = pallet.values[key]
                    if (val && (f.campo.toLowerCase().includes('defecto') || f.campo.toLowerCase().includes('caracter'))) {
                      const numVal = parseFloat(val.toString().replace(/[^\d.]/g, ''))
                      if (numVal > 0) {
                        defectCounts[f.campo] = (defectCounts[f.campo] || 0) + numVal
                        fruitDefectCounts[fruit] = (fruitDefectCounts[fruit] || 0) + numVal
                      }
                    }
                  })
                })
              }
              
              if (isPalletMixCompliant) compliantMixPallets++

              // 2. Specs (Temp, Weight, pH, Brix)
              // Temp
              const tempField = (pallet.commonFields || []).find((f: any) => f.campo.includes('Temp') || f.campo.includes('Pulpa'))
              const tempVal = pallet.values[tempField?.campo]
              if (tempVal) {
                const t = parseFloat(tempVal.toString().replace(/[^\d.-]/g, '')) // Allow negative
                if (!isNaN(t)) {
                  tempMeasurements.push(t)
                  dailySpecs.temps.push(t)
                }
              }
              
              // Weight - grouped by date-product
              const weightField = (pallet.commonFields || []).find((f: any) => f.campo.includes('Peso Bolsa'))
              const weightVal = pallet.values[weightField?.campo]
              if (weightVal) {
                const w = parseFloat(weightVal.toString().replace(/[^\d.]/g, ''))
                if (!isNaN(w)) {
                  bagWeights.push(w)
                  dailyProductSpecs.weights.push(w) // Add to product-specific weights
                }
              }

              // pH
              const phField = (pallet.commonFields || []).find((f: any) => f.campo.toLowerCase() === 'ph' || f.campo.includes('pH'))
              const phVal = pallet.values[phField?.campo]
              if (phVal) {
                const p = parseFloat(phVal.toString().replace(/[^\d.]/g, ''))
                if (!isNaN(p)) dailySpecs.phs.push(p)
              }

              // Brix
              const brixField = (pallet.commonFields || []).find((f: any) => f.campo.toLowerCase().includes('brix'))
              const brixVal = pallet.values[brixField?.campo]
              if (brixVal) {
                const b = parseFloat(brixVal.toString().replace(/[^\d.]/g, ''))
                if (!isNaN(b)) dailySpecs.brixs.push(b)
              }
            })
          }
        })

        // --- Calculate KPIs ---
        const mixComplianceRate = totalPallets > 0 ? ((compliantMixPallets / totalPallets) * 100).toFixed(1) : '0.0'
        const avgMixDeviation = mixDeviationCount > 0 ? (totalMixDeviation / mixDeviationCount).toFixed(1) : '0.0'
        
        // Temp Stats
        const validTemps = tempMeasurements.filter(t => !isNaN(t))
        const maxTemp = validTemps.length > 0 ? Math.max(...validTemps) : 0
        // Assume limit -18C. Compliance = % <= -18
        const compliantTemps = validTemps.filter(t => t <= -18).length
        const tempComplianceRate = validTemps.length > 0 ? ((compliantTemps / validTemps.length) * 100).toFixed(1) : '0.0'

        // Weight Stats
        const validWeights = bagWeights.filter(w => !isNaN(w))
        const avgWeight = validWeights.length > 0 ? (validWeights.reduce((a, b) => a + b, 0) / validWeights.length).toFixed(1) : '0.0'
        const weightComplianceRate = validWeights.length > 0 ? '100.0' : '0.0' 

        // Top Defect
        const sortedDefects = Object.entries(defectCounts).sort((a, b) => b[1] - a[1])
        const topDefect = sortedDefects.length > 0 ? sortedDefects[0][0] : 'None'
        const topDefectCount = sortedDefects.length > 0 ? sortedDefects[0][1] : 0

        // --- Prepare Chart Data ---
        
        // B) Specs Stability (Line Chart)
        // Get all unique dates
        const allDates = Array.from(new Set([
          ...Array.from(specsStabilityMap.keys()),
          ...Array.from(weightByDateProduct.values()).map(v => v.date)
        ])).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
        
        // Get all unique products
        const allProducts = Array.from(new Set(
          Array.from(weightByDateProduct.values()).map(v => v.product)
        )).sort()
        
        // Build chart data: one entry per date, with weight columns per product
        const specsStabilityData = allDates.map(date => {
          const dailySpecs = specsStabilityMap.get(date) || { temps: [], phs: [], brixs: [] }
          
          // Build weight data per product
          const weightData: Record<string, number | null> = {}
          allProducts.forEach(product => {
            const dateProductKey = `${date}-${product}`
            const productWeights = weightByDateProduct.get(dateProductKey)
            if (productWeights && productWeights.weights.length > 0) {
              weightData[`avgWeight_${product}`] = productWeights.weights.reduce((a, b) => a + b, 0) / productWeights.weights.length
            } else {
              weightData[`avgWeight_${product}`] = null
            }
          })
          
          return {
            date,
            avgTemp: dailySpecs.temps.length ? dailySpecs.temps.reduce((a, b) => a + b, 0) / dailySpecs.temps.length : null,
            minTemp: dailySpecs.temps.length ? Math.min(...dailySpecs.temps) : null,
            maxTemp: dailySpecs.temps.length ? Math.max(...dailySpecs.temps) : null,
            avgPh: dailySpecs.phs.length ? dailySpecs.phs.reduce((a, b) => a + b, 0) / dailySpecs.phs.length : null,
            avgBrix: dailySpecs.brixs.length ? dailySpecs.brixs.reduce((a, b) => a + b, 0) / dailySpecs.brixs.length : null,
            ...weightData,
            // Keep for backward compatibility - use first product's weight if available
            avgWeight: allProducts.length > 0 && weightData[`avgWeight_${allProducts[0]}`] !== null 
              ? weightData[`avgWeight_${allProducts[0]}`] 
              : null
          }
        })
        
        // Store product list for chart rendering
        const productList = allProducts

        // C) Defects Pareto (Bar Chart)
        const defectsParetoData = sortedDefects.slice(0, 5).map(([name, count]) => ({
          name: name.length > 20 ? name.substring(0, 20) + '...' : name,
          count
        }))

        const fruitDefectsParetoData = Object.entries(fruitDefectCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }))

        setChartData(specsStabilityData) // Main chart: Specs Stability
        setSummaryStats({
          totalRecords: finalRecords.length,
          mixComplianceRate,
          avgMixDeviation,
          tempComplianceRate,
          worstTemp: maxTemp.toFixed(1),
          weightComplianceRate,
          avgWeight,
          topDefect,
          topDefectCount,
          defectsParetoData: defectsParetoData || [],
          fruitDefectsParetoData: fruitDefectsParetoData || [],
          productList: productList || [] // Store product list for chart rendering
        })
        
      } else if (selectedChecklist === 'Staff Good Practices Control') {
        const records = await fetchChecklistStaffPracticesData(startDate, endDate)
        setData(records)

        // Use the constants defined at component level
        const parameterFields = STAFF_PRACTICES_PARAMETER_FIELDS
        const parameterNames = STAFF_PRACTICES_PARAMETER_NAMES

        // ============================================
        // COMPREHENSIVE DATA PROCESSING
        // ============================================
        const allStaffMembers: Array<{
          name: string
          area: string
          date: string
          shift: string
          recordId: string
          parameters: Record<string, 'comply' | 'not_comply' | ''>
        }> = []
        
        const areaMap = new Map<string, { total: number, nonCompliant: number }>()
        const areaParameterMap = new Map<string, Map<string, { total: number, nonCompliant: number }>>()
        const shiftMap = new Map<string, { total: number }>()
        const dateShiftMap = new Map<string, Set<string>>()
        const parameterCounts: Record<string, { compliant: number, nonCompliant: number, total: number }> = {}
        const personNCHistory: Map<string, Array<{ date: string, parameter: string }>> = new Map()
        
        // Initialize parameter counts
        parameterFields.forEach(field => {
          parameterCounts[field] = { compliant: 0, nonCompliant: 0, total: 0 }
        })

        records.forEach((record: any) => {
          const date = record.date_string
          const shift = record.shift || 'Unknown'
          const dateShiftKey = `${date}_${shift}`
          
          if (!dateShiftMap.has(date)) {
            dateShiftMap.set(date, new Set())
          }
          dateShiftMap.get(date)!.add(shift)
          
          if (!shiftMap.has(shift)) {
            shiftMap.set(shift, { total: 0 })
          }
          
          record.staff_members?.forEach((member: any) => {
            const area = member.area || 'Unknown'
            const personKey = `${member.name}_${area}`
            
            // Track person for repeat behavior
            if (!personNCHistory.has(personKey)) {
              personNCHistory.set(personKey, [])
            }
            
            shiftMap.get(shift)!.total++
            
            // Initialize area stats
            if (!areaMap.has(area)) {
              areaMap.set(area, { total: 0, nonCompliant: 0 })
            }
            areaMap.get(area)!.total++
            
            // Initialize area-parameter stats
            if (!areaParameterMap.has(area)) {
              areaParameterMap.set(area, new Map())
            }
            const areaParams = areaParameterMap.get(area)!
            parameterFields.forEach(field => {
              if (!areaParams.has(field)) {
                areaParams.set(field, { total: 0, nonCompliant: 0 })
              }
            })
            
            const memberParams: Record<string, 'comply' | 'not_comply' | ''> = {}
            let memberHasNC = false
            
            parameterFields.forEach(field => {
              const value = member[field] || ''
              memberParams[field] = value as 'comply' | 'not_comply' | ''
              
              parameterCounts[field].total++
              const areaParamStats = areaParameterMap.get(area)!.get(field)!
              areaParamStats.total++
              
              if (value === 'comply') {
                parameterCounts[field].compliant++
              } else if (value === 'not_comply') {
                parameterCounts[field].nonCompliant++
                areaParamStats.nonCompliant++
                areaMap.get(area)!.nonCompliant++
                memberHasNC = true
                personNCHistory.get(personKey)!.push({ date, parameter: field })
              }
            })
            
            allStaffMembers.push({
              name: member.name || 'Unknown',
              area,
              date,
              shift,
              recordId: record.id || '',
              parameters: memberParams
            })
          })
        })

        // ============================================
        // 1. COVERAGE & DISCIPLINE KPIs
        // ============================================
        const totalStaff = allStaffMembers.length
        const peopleEvaluatedPerShift = Array.from(shiftMap.entries()).map(([shift, data]) => ({
          shift,
          count: data.total
        }))
        
        const peopleEvaluatedPerArea = Array.from(areaMap.entries()).map(([area, data]) => ({
          area,
          count: data.total
        }))
        
        // Audits completed vs planned (assuming 1 audit per day per shift as baseline)
        const uniqueDates = new Set(records.map((r: any) => r.date_string))
        const auditsCompleted = records.length
        // Estimate planned: 1 per day per shift (3 shifts typically)
        const auditsPlanned = uniqueDates.size * 3 // Assuming 3 shifts
        const auditsCompletionRate = auditsPlanned > 0
          ? ((auditsCompleted / auditsPlanned) * 100).toFixed(1)
          : '0.0'
        
        // Missing data % (empty parameter values)
        let totalParameterChecks = 0
        let missingParameterChecks = 0
        allStaffMembers.forEach(member => {
          parameterFields.forEach(field => {
            totalParameterChecks++
            // parameters[field] is typed as "comply" | "not_comply" (and may be missing/undefined),
            // so treat only missing values as "missing data".
            if (!member.parameters[field]) {
              missingParameterChecks++
            }
          })
        })
        const missingDataPercentage = totalParameterChecks > 0
          ? ((missingParameterChecks / totalParameterChecks) * 100).toFixed(1)
          : '0.0'
        
        // Parameter with most No Comply
        let mostNonCompliantParam = { name: 'N/A', count: 0, percentage: '0.0' }
        parameterFields.forEach(field => {
          const stats = parameterCounts[field]
          const total = stats.total
          const nc = stats.nonCompliant
          if (total > 0 && nc > mostNonCompliantParam.count) {
            const percentage = ((nc / total) * 100).toFixed(1)
            mostNonCompliantParam = {
              name: parameterNames[field],
              count: nc,
              percentage
            }
          }
        })

        // ============================================
        // 2. TRUE COMPLIANCE KPIs
        // ============================================
        const totalAnswers = parameterFields.reduce((sum, field) => sum + parameterCounts[field].total, 0)
        const totalNonCompliantAnswers = parameterFields.reduce((sum, field) => sum + parameterCounts[field].nonCompliant, 0)
        const ncRate = totalAnswers > 0
          ? ((totalNonCompliantAnswers / totalAnswers) * 100).toFixed(1)
          : '0.0'
        
        // % people with at least 1 noncompliance
        const peopleWithNC = new Set<string>()
        allStaffMembers.forEach(member => {
          const hasNC = parameterFields.some(field => member.parameters[field] === 'not_comply')
          if (hasNC) {
            peopleWithNC.add(`${member.name}_${member.area}`)
          }
        })
        const peopleWithNCPercentage = totalStaff > 0
          ? ((peopleWithNC.size / totalStaff) * 100).toFixed(1)
          : '0.0'
        
        // Avg noncompliances per person
        let totalNCs = 0
        allStaffMembers.forEach(member => {
          parameterFields.forEach(field => {
            if (member.parameters[field] === 'not_comply') {
              totalNCs++
            }
          })
        })
        const avgNCPerPerson = totalStaff > 0
          ? (totalNCs / totalStaff).toFixed(2)
          : '0.00'

        // ============================================
        // 3. WHERE PROBLEMS LIVE
        // ============================================
        // NC rate by area
        const ncRateByArea = Array.from(areaMap.entries()).map(([area, data]) => ({
          area,
          total: data.total,
          nonCompliant: data.nonCompliant,
          ncRate: data.total > 0 ? ((data.nonCompliant / data.total) * 100).toFixed(1) : '0.0',
          ncRateValue: data.total > 0 ? (data.nonCompliant / data.total) * 100 : 0
        })).sort((a, b) => b.ncRateValue - a.ncRateValue)
        
        // Area × Parameter heatmap data
        const heatmapData: Array<{ area: string, parameter: string, ncRate: number, count: number }> = []
        areaParameterMap.forEach((paramMap, area) => {
          paramMap.forEach((stats, paramField) => {
            const ncRate = stats.total > 0 ? (stats.nonCompliant / stats.total) * 100 : 0
            heatmapData.push({
              area,
              parameter: parameterNames[paramField],
              ncRate,
              count: stats.nonCompliant
            })
          })
        })
        
        // Top 3 hotspots (area + parameter combo)
        const hotspots = heatmapData
          .sort((a, b) => b.ncRate - a.ncRate)
          .slice(0, 3)
          .map(h => ({
            area: h.area,
            parameter: h.parameter,
            ncRate: h.ncRate.toFixed(1),
            count: h.count
          }))

        // ============================================
        // 4. REPEAT BEHAVIOR
        // ============================================
        // Repeat offender count (people with ≥2 NC in last X days)
        const repeatOffenders = new Set<string>()
        personNCHistory.forEach((ncList, personKey) => {
          if (ncList.length >= 2) {
            repeatOffenders.add(personKey)
          }
        })
        const repeatOffenderCount = repeatOffenders.size
        
        // Top repeat parameters (same person failing same rule)
        const parameterRepeatMap = new Map<string, Map<string, number>>()
        personNCHistory.forEach((ncList, personKey) => {
          const paramCounts = new Map<string, number>()
          ncList.forEach(nc => {
            paramCounts.set(nc.parameter, (paramCounts.get(nc.parameter) || 0) + 1)
          })
          paramCounts.forEach((count, param) => {
            if (count >= 2) {
              if (!parameterRepeatMap.has(param)) {
                parameterRepeatMap.set(param, new Map())
              }
              parameterRepeatMap.get(param)!.set(personKey, count)
            }
          })
        })
        
        const topRepeatParameters = Array.from(parameterRepeatMap.entries())
          .map(([param, personMap]) => ({
            parameter: parameterNames[param] || param,
            repeatCount: personMap.size,
            totalRepeats: Array.from(personMap.values()).reduce((sum, count) => sum + count, 0)
          }))
          .sort((a, b) => b.repeatCount - a.repeatCount)
          .slice(0, 5)
        
        // Recurrence rate = % people who fail again
        const peopleWhoFailedAgain = new Set<string>()
        personNCHistory.forEach((ncList, personKey) => {
          if (ncList.length >= 2) {
            // Check if they failed the same parameter multiple times
            const paramCounts = new Map<string, number>()
            ncList.forEach(nc => {
              paramCounts.set(nc.parameter, (paramCounts.get(nc.parameter) || 0) + 1)
            })
            if (Array.from(paramCounts.values()).some(count => count >= 2)) {
              peopleWhoFailedAgain.add(personKey)
            }
          }
        })
        const recurrenceRate = peopleWithNC.size > 0
          ? ((peopleWhoFailedAgain.size / peopleWithNC.size) * 100).toFixed(1)
          : '0.0'
        
        // Area recurrence (areas with repeated failures week over week)
        // Group by week and area
        const weekAreaMap = new Map<string, Map<string, number>>()
        allStaffMembers.forEach(member => {
          if (member.parameters && Object.values(member.parameters).some(v => v === 'not_comply')) {
            // Simple week calculation (could be improved)
            const weekKey = member.date // Simplified - would need proper week calculation
            if (!weekAreaMap.has(weekKey)) {
              weekAreaMap.set(weekKey, new Map())
            }
            const areaNC = weekAreaMap.get(weekKey)!
            areaNC.set(member.area, (areaNC.get(member.area) || 0) + 1)
          }
        })
        
        // ============================================
        // CHART DATA
        // ============================================
        // Pareto: Noncompliance by parameter
        const paretoData = parameterFields.map(field => ({
          parameter: parameterNames[field],
          nonCompliant: parameterCounts[field].nonCompliant,
          compliant: parameterCounts[field].compliant,
          total: parameterCounts[field].total,
          ncRate: parameterCounts[field].total > 0
            ? ((parameterCounts[field].nonCompliant / parameterCounts[field].total) * 100).toFixed(1)
            : '0.0',
          ncRateValue: parameterCounts[field].total > 0
            ? (parameterCounts[field].nonCompliant / parameterCounts[field].total) * 100
            : 0
        })).sort((a, b) => b.nonCompliant - a.nonCompliant)
        
        setChartData({
          paretoData,
          ncRateByArea,
          heatmapData,
          peopleEvaluatedPerShift,
          peopleEvaluatedPerArea
        })
        
        setDailyStats([]) // Not using daily stats table
        
        // Set comprehensive summary stats
        setSummaryStats({
          // Coverage & Discipline
          totalStaff,
          peopleEvaluatedPerShift,
          peopleEvaluatedPerArea,
          auditsCompleted,
          auditsPlanned,
          auditsCompletionRate,
          missingDataPercentage,
          mostNonCompliantParameter: mostNonCompliantParam,
          
          // True Compliance
          ncRate,
          peopleWithNC: peopleWithNC.size,
          peopleWithNCPercentage,
          avgNCPerPerson,
          
          // Where Problems Live
          ncRateByArea,
          heatmapData,
          hotspots,
          
          // Repeat Behavior
          repeatOffenderCount,
          topRepeatParameters,
          recurrenceRate,
          
          // Legacy (for compatibility)
          totalRecords: records.length,
          totalParameters: totalAnswers,
          compliantParameters: totalAnswers - totalNonCompliantAnswers,
          nonCompliantParameters: totalNonCompliantAnswers,
          complianceRate: totalAnswers > 0
            ? (((totalAnswers - totalNonCompliantAnswers) / totalAnswers) * 100).toFixed(1)
            : '0.0'
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
        const skuMap = new Map<string, number>() // Track findings by SKU (using product field)
        
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
            
            // Count element types and track SKU findings
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
            
            // Track findings by SKU (using product field)
            if (record.product) {
              const currentCount = skuMap.get(record.product) || 0
              skuMap.set(record.product, currentCount + (record.findings?.length || 0))
            }
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

        // Brand findings summary - only brands with findings
        const brandFindingsArray = Array.from(brandMap.entries())
          .filter(([_, data]) => data.withFindings > 0) // Only brands with findings
          .map(([brand, data]) => ({
            brand,
            total: data.total,
            withFindings: data.withFindings,
            findingsRate: data.total > 0 
              ? ((data.withFindings / data.total) * 100).toFixed(1)
              : '0.0'
          }))
          .sort((a, b) => b.withFindings - a.withFindings)

        // SKU findings summary - only SKUs with findings
        const skuFindingsArray = Array.from(skuMap.entries())
          .filter(([_, count]) => count > 0) // Only SKUs with findings
          .map(([sku, count]) => ({
            sku,
            count
          }))
          .sort((a, b) => b.count - a.count)

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
          skuFindings: skuFindingsArray,
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
      } else if (selectedChecklist === 'Cleanliness Control Packing') {
        const records = await fetchChecklistCleanlinessControlPackingData(startDate, endDate)
        setData(records)

        // Process data for comprehensive analysis
        const dateMap = new Map<string, any>()
        const monitorMap = new Map<string, any>()
        const areaMap = new Map<string, any>()
        
        let totalRecords = records.length
        let totalAreas = 0
        let totalParts = 0
        let compliantParts = 0
        let nonCompliantParts = 0
        let totalBioluminescenceTests = 0
        let acceptTests = 0
        let cautionTests = 0
        let rejectTests = 0
        let totalRetests = 0

        records.forEach((record: any) => {
          const date = record.date_string
          const monitor = record.monitor_name || 'Unknown'
          
          // Daily stats
          if (!dateMap.has(date)) {
            dateMap.set(date, {
              date,
              totalRecords: 0,
              totalAreas: 0,
              totalParts: 0,
              compliantParts: 0,
              nonCompliantParts: 0,
              totalBioluminescenceTests: 0,
              acceptTests: 0,
              cautionTests: 0,
              rejectTests: 0
            })
          }
          
          // Monitor stats
          if (!monitorMap.has(monitor)) {
            monitorMap.set(monitor, {
              monitor,
              totalRecords: 0,
              totalAreas: 0,
              totalParts: 0,
              compliantParts: 0,
              nonCompliantParts: 0
            })
          }
          
          // Count areas and parts
          if (record.areas && Array.isArray(record.areas)) {
            record.areas.forEach((area: any) => {
              totalAreas++
              const areaKey = area.areaName || 'Unknown'
              
              if (!areaMap.has(areaKey)) {
                areaMap.set(areaKey, {
                  areaName: areaKey,
                  totalParts: 0,
                  compliantParts: 0,
                  nonCompliantParts: 0
                })
              }
              
              if (area.parts && Array.isArray(area.parts)) {
                area.parts.forEach((part: any) => {
                  totalParts++
                  const areaStat = areaMap.get(areaKey)
                  areaStat.totalParts++
                  
                  const dateStat = dateMap.get(date)
                  dateStat.totalAreas++
                  dateStat.totalParts++
                  
                  const monitorStat = monitorMap.get(monitor)
                  monitorStat.totalAreas++
                  monitorStat.totalParts++
                  
                  if (part.comply === true) {
                    compliantParts++
                    areaStat.compliantParts++
                    dateStat.compliantParts++
                    monitorStat.compliantParts++
                  } else if (part.comply === false) {
                    nonCompliantParts++
                    areaStat.nonCompliantParts++
                    dateStat.nonCompliantParts++
                    monitorStat.nonCompliantParts++
                  }
                })
              }
            })
          }
          
          // Count bioluminescence results
          if (record.bioluminescence_results && Array.isArray(record.bioluminescence_results)) {
            record.bioluminescence_results.forEach((result: any) => {
              if (result.rlu && result.rlu.trim()) {
                totalBioluminescenceTests++
                const dateStat = dateMap.get(date)
                dateStat.totalBioluminescenceTests++
                
                const rluNum = parseFloat(result.rlu)
                if (!isNaN(rluNum)) {
                  if (rluNum < 20) {
                    acceptTests++
                    dateStat.acceptTests++
                  } else if (rluNum >= 20 && rluNum <= 60) {
                    cautionTests++
                    dateStat.cautionTests++
                  } else {
                    rejectTests++
                    dateStat.rejectTests++
                  }
                  
                  // Count retests
                  if (result.retestRlu && result.retestRlu.trim()) {
                    totalRetests++
                  }
                }
              }
            })
          }
          
          // Update daily and monitor stats
          const dateStat = dateMap.get(date)
          dateStat.totalRecords++
          
          const monitorStat = monitorMap.get(monitor)
          monitorStat.totalRecords++
        })

        // Process chart data
        const chartDataArray = Array.from(dateMap.values())
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        
        setChartData(chartDataArray)

        // Daily stats
        const dailyStatsArray = chartDataArray.map(d => ({
          date: d.date,
          totalRecords: d.totalRecords,
          totalAreas: d.totalAreas,
          totalParts: d.totalParts,
          compliantParts: d.compliantParts,
          nonCompliantParts: d.nonCompliantParts,
          totalBioluminescenceTests: d.totalBioluminescenceTests,
          acceptTests: d.acceptTests,
          cautionTests: d.cautionTests,
          rejectTests: d.rejectTests,
          complianceRate: d.totalParts > 0
            ? ((d.compliantParts / d.totalParts) * 100).toFixed(1)
            : '0.0'
        }))

        setDailyStats(dailyStatsArray as CleanlinessControlPackingDailyStats[])

        // Area comparison
        const areaComparison = Array.from(areaMap.values())
          .map(a => ({
            areaName: a.areaName,
            totalParts: a.totalParts,
            compliantParts: a.compliantParts,
            nonCompliantParts: a.nonCompliantParts,
            complianceRate: a.totalParts > 0
              ? ((a.compliantParts / a.totalParts) * 100).toFixed(1)
              : '0.0'
          }))
          .sort((a, b) => b.totalParts - a.totalParts)

        // Monitor comparison
        const monitorComparison = Array.from(monitorMap.values())
          .map(m => ({
            monitor: m.monitor,
            totalRecords: m.totalRecords,
            totalParts: m.totalParts,
            compliantParts: m.compliantParts,
            nonCompliantParts: m.nonCompliantParts,
            complianceRate: m.totalParts > 0
              ? ((m.compliantParts / m.totalParts) * 100).toFixed(1)
              : '0.0'
          }))
          .sort((a, b) => b.totalRecords - a.totalRecords)

        const overallComplianceRate = totalParts > 0
          ? ((compliantParts / totalParts) * 100).toFixed(1)
          : '0.0'
        
        const bioluminescenceAcceptRate = totalBioluminescenceTests > 0
          ? ((acceptTests / totalBioluminescenceTests) * 100).toFixed(1)
          : '0.0'

        setSummaryStats({
          totalRecords,
          totalAreas,
          totalParts,
          compliantParts,
          nonCompliantParts,
          complianceRate: overallComplianceRate,
          totalBioluminescenceTests,
          acceptTests,
          cautionTests,
          rejectTests,
          bioluminescenceAcceptRate,
          totalRetests,
          areaComparison,
          monitorComparison
        })
      } else if (selectedChecklist === 'Process area staff glasses and auditory protector control') {
        const records = await fetchChecklistStaffGlassesAuditoryData(startDate, endDate)
        setData(records)

        // Process data for analysis
        const dateMap = new Map<string, any>()
        const monitorMap = new Map<string, any>()
        
        let totalRecords = records.length
        let totalPersons = 0
        let totalFindings = 0
        let noFindingsCount = 0

        records.forEach((record: any) => {
          const date = record.date_string
          const monitor = record.monitor_name || 'Unknown'
          
          // Daily stats
          if (!dateMap.has(date)) {
            dateMap.set(date, {
              date,
              totalRecords: 0,
              totalPersons: 0,
              totalFindings: 0,
              noFindingsCount: 0
            })
          }
          
          // Monitor stats
          if (!monitorMap.has(monitor)) {
            monitorMap.set(monitor, {
              monitor,
              totalRecords: 0,
              totalPersons: 0,
              totalFindings: 0,
              noFindingsCount: 0
            })
          }
          
          const dateStat = dateMap.get(date)
          const monitorStat = monitorMap.get(monitor)
          
          dateStat.totalRecords++
          monitorStat.totalRecords++
          
          if (record.no_findings) {
            noFindingsCount++
            dateStat.noFindingsCount++
            monitorStat.noFindingsCount++
          } else {
            if (record.persons && Array.isArray(record.persons)) {
              const personsCount = record.persons.length
              totalPersons += personsCount
              totalFindings++
              dateStat.totalPersons += personsCount
              dateStat.totalFindings++
              monitorStat.totalPersons += personsCount
              monitorStat.totalFindings++
            }
          }
        })

        // Process chart data
        const chartDataArray = Array.from(dateMap.values())
          .map(d => ({
            date: d.date,
            totalRecords: d.totalRecords,
            totalPersons: d.totalPersons,
            totalFindings: d.totalFindings,
            noFindingsCount: d.noFindingsCount
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        setChartData(chartDataArray)

        // Process monitor comparison
        const monitorComparison = Array.from(monitorMap.values())
          .map(m => ({
            monitor: m.monitor,
            totalRecords: m.totalRecords,
            totalPersons: m.totalPersons,
            totalFindings: m.totalFindings,
            noFindingsCount: m.noFindingsCount
          }))
          .sort((a, b) => b.totalRecords - a.totalRecords)

        setSummaryStats({
          totalRecords,
          totalPersons,
          totalFindings,
          noFindingsCount,
          monitorComparison
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
    setSelectedSku('')
    setAvailableOrdens([])
    setAvailableBrands([])
    setAvailableProducts([])
    setAvailableSkus([])
  }, [selectedChecklist])

  // Fetch data when dates, checklist, or filters change
  useEffect(() => {
    if (startDate && endDate) {
      loadData()
    }
  }, [startDate, endDate, selectedChecklist, selectedOrden, selectedBrand, selectedProduct, selectedSku, loadData])

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
    setSelectedSku('')
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
                <option value="Cleanliness Control Packing">Cleanliness Control Packing</option>
                <option value="Process area staff glasses and auditory protector control">Process area staff glasses and auditory protector control</option>
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
        ) : (Array.isArray(chartData) && chartData.length === 0) || (!Array.isArray(chartData) && Object.keys(chartData || {}).length === 0) ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-600">No hay datos disponibles para el rango de fechas seleccionado.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {selectedChecklist === 'Metal Detector (PCC #1)' ? (
                <>
                  {/* Equipment Reliability KPIs - Moved to top */}
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Tasa aprobación brazo rechazador</h3>
                    <p className="text-2xl font-bold text-blue-600">{summaryStats.rejectingArmPassRate || '0.0'}%</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Tasa aprobación alarma de ruido</h3>
                    <p className="text-2xl font-bold text-yellow-600">{summaryStats.noiseAlarmPassRate || '0.0'}%</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Tasa de aprobación Sensibilidad</h3>
                    <p className="text-2xl font-bold text-purple-600">{summaryStats.sensitivityPassRate || '0.0'}%</p>
                  </div>
                  
                  {/* CCP Protection KPIs */}
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">% de monitoreos aprobados</h3>
                    <p className="text-2xl font-bold text-green-600">{summaryStats.readingsPassRate || '0.0'}%</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {summaryStats.totalReadings || 0} lecturas totales
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Cantidad de desviaciones</h3>
                    <p className="text-2xl font-bold text-red-600">{summaryStats.deviationCount || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {summaryStats.deviationPercentage || '0.0'}% del total
                    </p>
                  </div>
                </>
              ) : selectedChecklist === 'Process Environmental Temperature Control' ? (
                <>
                  {/* HACCP/Compliance KPIs */}
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Desviaciones</h3>
                    <p className="text-2xl font-bold text-red-600">{summaryStats.deviationCount || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Lecturas sobre 50°F</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Tiempo Fuera de Especificación</h3>
                    <p className="text-2xl font-bold text-orange-600">{summaryStats.timeOutOfSpec || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Lecturas fuera de especificación</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-600">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Peor Excursión</h3>
                    <p className="text-2xl font-bold text-red-700">{summaryStats.worstExcursion || '0.0'}°F</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {summaryStats.worstExcursionValue > 0 
                        ? `+${summaryStats.worstExcursionValue.toFixed(1)}°F sobre límite`
                        : 'Sin excursiones'}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">% Cumplimiento</h3>
                    <p className="text-2xl font-bold text-green-600">{summaryStats.compliancePercentage || '0.0'}%</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {summaryStats.totalReadings || 0} lecturas totales
                    </p>
                  </div>
                </>
              ) : selectedChecklist === 'Staff Good Practices Control' ? (
                <>
                  {/* Coverage & Discipline KPIs */}
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Personal Evaluado</h3>
                    <p className="text-2xl font-bold text-blue-600">{summaryStats.totalStaff || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Total evaluado en período</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Datos Faltantes</h3>
                    <p className="text-2xl font-bold text-orange-600">{summaryStats.missingDataPercentage || '0.0'}%</p>
                    <p className="text-xs text-gray-500 mt-1">Parámetros sin evaluar</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Parámetro con Más NC</h3>
                    <p className="text-lg font-bold text-red-600">
                      {summaryStats.mostNonCompliantParameter?.name || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {summaryStats.mostNonCompliantParameter?.count || 0} casos ({summaryStats.mostNonCompliantParameter?.percentage || '0.0'}%)
                    </p>
                  </div>
                  
                  {/* True Compliance KPIs */}
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-600">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Tasa de No Cumplimiento</h3>
                    <p className="text-2xl font-bold text-red-700">{summaryStats.ncRate || '0.0'}%</p>
                    <p className="text-xs text-gray-500 mt-1">NC / Total respuestas</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-amber-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Personas con ≥1 NC</h3>
                    <p className="text-2xl font-bold text-amber-600">{summaryStats.peopleWithNCPercentage || '0.0'}%</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {summaryStats.peopleWithNC || 0} de {summaryStats.totalStaff || 0} personas
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Promedio NC/Persona</h3>
                    <p className="text-2xl font-bold text-purple-600">{summaryStats.avgNCPerPerson || '0.00'}</p>
                    <p className="text-xs text-gray-500 mt-1">No cumplimientos promedio</p>
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
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
                    <h3 className="text-sm font-medium text-orange-700 mb-1">Hallazgo más común (tipo de elemento)</h3>
                    <p className="text-2xl font-bold text-orange-600">{summaryStats.topElementType?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {summaryStats.topElementType?.count || 0} hallazgo(s)
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
              ) : selectedChecklist === 'Cleanliness Control Packing' ? (
                <>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Registros</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalRecords || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">Checklists completados</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Áreas</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalAreas || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">{summaryStats.totalParts || 0} partes inspeccionadas</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-600">
                    <h3 className="text-sm font-medium text-green-700 mb-1">✅ Tasa de Cumplimiento</h3>
                    <p className="text-2xl font-bold text-green-600">{summaryStats.complianceRate || '0.0'}%</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {summaryStats.compliantParts || 0} cumplen / {summaryStats.nonCompliantParts || 0} no cumplen
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
                    <h3 className="text-sm font-medium text-purple-700 mb-1">🔬 Pruebas de Bioluminescence</h3>
                    <p className="text-2xl font-bold text-purple-600">{summaryStats.totalBioluminescenceTests || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      ACCEPT: {summaryStats.acceptTests || 0} | CAUTION: {summaryStats.cautionTests || 0} | REJECTS: {summaryStats.rejectTests || 0}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
                    <h3 className="text-sm font-medium text-yellow-700 mb-1">🔄 Retests Realizados</h3>
                    <p className="text-2xl font-bold text-yellow-600">{summaryStats.totalRetests || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">Pruebas repetidas</p>
                  </div>
                </>
              ) : selectedChecklist === 'Process area staff glasses and auditory protector control' ? (
                <>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Registros</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalRecords || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">Checklists completados</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Personas</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalPersons || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">Personas inspeccionadas</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
                    <h3 className="text-sm font-medium text-orange-700 mb-1">⚠️ Registros con Hallazgos</h3>
                    <p className="text-2xl font-bold text-orange-600">{summaryStats.totalFindings || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">Con hallazgos de no cumplimiento</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-600">
                    <h3 className="text-sm font-medium text-green-700 mb-1">✅ Sin Hallazgos</h3>
                    <p className="text-2xl font-bold text-green-600">{summaryStats.noFindingsCount || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">Registros sin hallazgos</p>
                  </div>
                </>
              ) : selectedChecklist === 'Checklist Mix Producto' ? (
                <>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Mix Compliance %</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.mixComplianceRate || '0.0'}%</p>
                    <p className="text-xs text-gray-600 mt-1">Pallets con todos los componentes en rango ±5%</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Avg Mix Deviation</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.avgMixDeviation || '0.0'} pp</p>
                    <p className="text-xs text-gray-600 mt-1">Desviación absoluta promedio</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Pulp Temp Compliance</h3>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.tempComplianceRate || '0.0'}%</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Peor Excursión: {summaryStats.worstTemp ? `${summaryStats.worstTemp}°C` : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Top Defect Driver</h3>
                    <p className="text-2xl font-bold text-gray-900 truncate" title={summaryStats.topDefect}>{summaryStats.topDefect || '-'}</p>
                    <p className="text-xs text-gray-600 mt-1">{summaryStats.topDefectCount || 0} ocurrencias</p>
                  </div>
                </>
              ) : selectedChecklist === 'Checklist Monoproducto' ? (
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
                {/* Challenge Test Performance: Pass/Fail by Test Piece Type */}
                {chartData.testPiecePerformance && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Rendimiento de Pruebas de Desafío - Pass/Fail por Tipo de Pieza
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={chartData.testPiecePerformance}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="testPiece"
                          stroke="#6b7280"
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
                        <Bar dataKey="passed" stackId="a" fill="#10b981" name="Aprobado" />
                        <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Fallido" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Failure Trend by Test Piece Type */}
                {chartData.failureTrend && chartData.failureTrend.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Tendencia de Fallos por Tipo de Pieza de Prueba
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={chartData.failureTrend}>
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
                        <Line
                          type="monotone"
                          dataKey="bf"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          name="BF Fallos"
                        />
                        <Line
                          type="monotone"
                          dataKey="bnf"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          name="B.NF Fallos"
                        />
                        <Line
                          type="monotone"
                          dataKey="bss"
                          stroke="#dc2626"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          name="B.S.S Fallos"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Equipment Reliability: Pareto - Failures by Detector ID */}
                {chartData.detectorFailureRates && chartData.detectorFailureRates.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Tasa de Fallos por Detector (Pareto)
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={chartData.detectorFailureRates.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" stroke="#6b7280" />
                        <YAxis
                          dataKey="detectorId"
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
                          formatter={(value: any) => [`${value}%`, 'Tasa de Fallo']}
                        />
                        <Legend />
                        <Bar dataKey="failureRate" fill="#ef4444" name="Tasa de Fallo (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Failures Over Time */}
                {chartData.dailyFailureData && chartData.dailyFailureData.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Fallos por Fecha
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={chartData.dailyFailureData}>
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
                        <Bar dataKey="failures" fill="#ef4444" name="Fallos" />
                        <Bar dataKey="total" fill="#e5e7eb" name="Total Lecturas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Failures by Product */}
                {chartData.productFailureData && chartData.productFailureData.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Fallos por Producto
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={chartData.productFailureData.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" stroke="#6b7280" />
                        <YAxis
                          dataKey="product"
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
                          formatter={(value: any, name: string) => {
                            if (name === 'failures') {
                              return [`${value} fallos`, 'Fallos']
                            }
                            return [value, name]
                          }}
                        />
                        <Legend />
                        <Bar dataKey="failures" fill="#ef4444" name="Fallos" />
                        <Bar dataKey="total" fill="#e5e7eb" name="Total Lecturas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
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
              </>
            )}

            {selectedChecklist === 'Checklist Mix Producto' && (
              <>
                {/* Defects Pareto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Top 5 Defectos (Pareto)</h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={summaryStats.defectsParetoData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" stroke="#6b7280" />
                        <YAxis dataKey="name" type="category" stroke="#6b7280" width={150} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
                        <Legend />
                        <Bar dataKey="count" fill="#ef4444" name="Cantidad" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Top 5 Frutas con Defectos</h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={summaryStats.fruitDefectsParetoData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" stroke="#6b7280" />
                        <YAxis dataKey="name" type="category" stroke="#6b7280" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
                        <Legend />
                        <Bar dataKey="count" fill="#f97316" name="Cantidad" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Specs Stability: Weight Only (Bar Chart) */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Estabilidad de Especificaciones Clave (Peso)</h2>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#10b981" label={{ value: 'Peso (gr)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
                      <Legend />
                      {/* Dynamic weight bars per product */}
                      {(summaryStats.productList || []).map((product: string, index: number) => {
                        const colors = ['#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#022c22']
                        const color = colors[index % colors.length]
                        return (
                          <Bar 
                            key={product}
                            dataKey={`avgWeight_${product}`} 
                            fill={color} 
                            name={`Peso Promedio - ${product}`}
                          />
                        )
                      })}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Specs Stability: Chemical (Brix & pH) */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Estabilidad Química (Brix & pH)</h2>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" stroke="#8b5cf6" label={{ value: 'Brix', angle: -90, position: 'insideLeft' }} />
                      <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" label={{ value: 'pH', angle: 90, position: 'insideRight' }} domain={[0, 14]} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="avgBrix" stroke="#8b5cf6" name="Brix Promedio" dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="avgPh" stroke="#f59e0b" name="pH Promedio" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}


            {selectedChecklist === 'Staff Good Practices Control' && (
              <>
                {/* Pareto: Noncompliance by Parameter */}
                {chartData.paretoData && chartData.paretoData.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      No Cumplimiento por Parámetro (Pareto)
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={chartData.paretoData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" stroke="#6b7280" />
                        <YAxis
                          dataKey="parameter"
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
                          formatter={(value: any, name: string) => {
                            if (name === 'No Cumplimiento') {
                              return [value, 'No Cumplimientos']
                            }
                            return [value, name]
                          }}
                        />
                        <Legend />
                        <Bar dataKey="nonCompliant" fill="#ef4444" name="No Cumplimiento" />
                        <Bar dataKey="compliant" fill="#10b981" name="Cumplimiento" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* NC Rate by Area (Ranked Bar Chart) */}
                {chartData.ncRateByArea && chartData.ncRateByArea.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Tasa de No Cumplimiento por Área (Ranked)
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={chartData.ncRateByArea} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          type="number"
                          stroke="#6b7280"
                          label={{ value: 'Tasa de NC (%)', position: 'insideBottom', offset: -5 }}
                          domain={[0, 100]}
                        />
                        <YAxis
                          dataKey="area"
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
                          formatter={(value: any) => [`${value}%`, 'Tasa de NC']}
                        />
                        <Legend />
                        <Bar dataKey="ncRateValue" fill="#ef4444" name="Tasa de No Cumplimiento (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Area × Parameter Heatmap */}
                {chartData.heatmapData && chartData.heatmapData.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Mapa de Calor: Área × Parámetro
                    </h2>
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-red-600 mb-2">Top 3 Hotspots:</h3>
                      <div className="flex flex-wrap gap-2">
                        {summaryStats.hotspots && summaryStats.hotspots.map((hotspot: any, idx: number) => (
                          <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {hotspot.area} + {hotspot.parameter}: {hotspot.ncRate}% ({hotspot.count} casos)
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Área
                            </th>
                            {STAFF_PRACTICES_PARAMETER_FIELDS.map(field => (
                              <th key={field} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {STAFF_PRACTICES_PARAMETER_NAMES[field].split(' ')[0]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {Array.from(new Set<string>(chartData.heatmapData.map((d: any) => d.area as string))).map((area) => (
                            <tr key={area} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {area}
                              </td>
                              {STAFF_PRACTICES_PARAMETER_FIELDS.map(field => {
                                const heatmapItem = chartData.heatmapData.find((d: any) => 
                                  d.area === area && d.parameter === STAFF_PRACTICES_PARAMETER_NAMES[field]
                                )
                                const ncRate = heatmapItem?.ncRate || 0
                                const intensity = Math.min(ncRate / 100, 1)
                                let bgColor = 'bg-green-100'
                                let textColor = 'text-gray-900'
                                if (intensity > 0.5) {
                                  bgColor = 'bg-red-500'
                                  textColor = 'text-white'
                                } else if (intensity > 0.2) {
                                  bgColor = 'bg-yellow-400'
                                  textColor = 'text-gray-900'
                                } else if (intensity > 0) {
                                  bgColor = 'bg-green-200'
                                  textColor = 'text-gray-900'
                                }
                                return (
                                  <td key={field} className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${bgColor} ${textColor}`}>
                                      {ncRate.toFixed(1)}%
                                    </span>
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedChecklist === 'Foreign Material Findings Record' && (
              <>
                {/* Findings Trend Chart - Highlighting Bad Things */}
                {summaryStats.totalFindings > 0 ? (
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
                ) : (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Tendencia de Hallazgos / Findings Trend
                    </h2>
                    <div className="flex items-center justify-center h-96 text-gray-500 text-lg">
                      Sin hallazgos con filtro seleccionado
                    </div>
                  </div>
                )}

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
                {summaryStats.brandFindings && summaryStats.brandFindings.length > 0 ? (
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
                ) : (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Hallazgos por Marca / Findings by Brand
                    </h2>
                    <div className="flex items-center justify-center h-96 text-gray-500 text-lg">
                      Sin hallazgos con filtro seleccionado
                    </div>
                  </div>
                )}

                {/* SKU Findings Summary */}
                {summaryStats.skuFindings && summaryStats.skuFindings.length > 0 ? (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Hallazgos por SKU / Findings by SKU
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={summaryStats.skuFindings}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="sku"
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
                        <Bar dataKey="count" fill="#ef4444" name="Cantidad de Hallazgos" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Hallazgos por SKU / Findings by SKU
                    </h2>
                    <div className="flex items-center justify-center h-96 text-gray-500 text-lg">
                      Sin hallazgos con filtro seleccionado
                    </div>
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

            {selectedChecklist === 'Metal Detector (PCC #1)' && summaryStats.deviationLog && summaryStats.deviationLog.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Registro de Desviaciones</h2>
                <div className="mb-4 text-sm text-gray-600">
                  <p>Órdenes Impactadas: <span className="font-semibold text-red-600">{summaryStats.lotsImpactedCount || 0}</span></p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha/Hora
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Línea
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Detector ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Orden
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pieza Fallida
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tiempo en Riesgo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acción Correctiva
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hora Cierre
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {summaryStats.deviationLog.map((deviation: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {deviation.date} {deviation.time}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {deviation.line || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {deviation.detectorId || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {deviation.order || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {deviation.testPieceFailed || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {deviation.timeAtRiskFormatted || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                            {deviation.correctiveAction || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {deviation.closeTime || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Repeat Behavior Section */}
            {selectedChecklist === 'Staff Good Practices Control' && summaryStats.repeatOffenderCount !== undefined && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Comportamiento Repetitivo</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Reincidentes</h3>
                    <p className="text-2xl font-bold text-red-600">{summaryStats.repeatOffenderCount || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">Personas con ≥2 NC</p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-500">
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Tasa de Recurrencia</h3>
                    <p className="text-2xl font-bold text-amber-600">{summaryStats.recurrenceRate || '0.0'}%</p>
                    <p className="text-xs text-gray-600 mt-1">% personas que fallan nuevamente</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Parámetros Más Repetidos</h3>
                    <p className="text-lg font-bold text-purple-600">
                      {summaryStats.topRepeatParameters && summaryStats.topRepeatParameters.length > 0
                        ? summaryStats.topRepeatParameters[0]?.parameter || 'N/A'
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {summaryStats.topRepeatParameters && summaryStats.topRepeatParameters.length > 0
                        ? `${summaryStats.topRepeatParameters[0]?.repeatCount || 0} personas`
                        : 'Sin datos'}
                    </p>
                  </div>
                </div>
                
                {summaryStats.topRepeatParameters && summaryStats.topRepeatParameters.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Top Parámetros con Comportamiento Repetitivo</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Parámetro
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Personas Reincidentes
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Repeticiones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {summaryStats.topRepeatParameters.map((param: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {param.parameter}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                {param.repeatCount}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                {param.totalRepeats}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
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

            {selectedChecklist === 'Cleanliness Control Packing' && dailyStats.length > 0 && (
              <div className="space-y-6">
                {/* Compliance Distribution Pie Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Distribución de Cumplimiento / Compliance Distribution
                  </h2>
                  <div className="flex items-center gap-6">
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Cumplen / Comply', value: summaryStats.compliantParts || 0 },
                              { name: 'No Cumplen / Not Comply', value: summaryStats.nonCompliantParts || 0 }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={false}
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
                    <div className="flex-shrink-0">
                      <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50 min-w-[200px]">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
                            <span className="text-sm font-medium text-gray-700">Cumplen / Comply</span>
                          </div>
                          <p className="text-lg font-bold text-gray-900 ml-6">
                            {summaryStats.compliantParts && summaryStats.nonCompliantParts 
                              ? (((summaryStats.compliantParts || 0) / ((summaryStats.compliantParts || 0) + (summaryStats.nonCompliantParts || 0))) * 100).toFixed(1)
                              : '0.0'}%
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                            <span className="text-sm font-medium text-gray-700">No Cumplen / Not Comply</span>
                          </div>
                          <p className="text-lg font-bold text-gray-900 ml-6">
                            {summaryStats.compliantParts && summaryStats.nonCompliantParts 
                              ? (((summaryStats.nonCompliantParts || 0) / ((summaryStats.compliantParts || 0) + (summaryStats.nonCompliantParts || 0))) * 100).toFixed(1)
                              : '0.0'}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bioluminescence Distribution Pie Chart */}
                {summaryStats.totalBioluminescenceTests > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Distribución de Resultados de Bioluminescence / Bioluminescence Results Distribution
                    </h2>
                    <div className="flex items-center gap-6">
                      <div className="flex-1">
                        <ResponsiveContainer width="100%" height={400}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'ACCEPT', value: summaryStats.acceptTests || 0 },
                                { name: 'CAUTION', value: summaryStats.cautionTests || 0 },
                                { name: 'REJECTS', value: summaryStats.rejectTests || 0 }
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={false}
                              outerRadius={120}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              <Cell fill="#10b981" />
                              <Cell fill="#f59e0b" />
                              <Cell fill="#ef4444" />
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50 min-w-[200px]">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
                              <span className="text-sm font-medium text-gray-700">ACCEPT</span>
                            </div>
                            <p className="text-lg font-bold text-gray-900 ml-6">
                              {summaryStats.totalBioluminescenceTests > 0
                                ? (((summaryStats.acceptTests || 0) / (summaryStats.totalBioluminescenceTests || 1)) * 100).toFixed(1)
                                : '0.0'}%
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                              <span className="text-sm font-medium text-gray-700">CAUTION</span>
                            </div>
                            <p className="text-lg font-bold text-gray-900 ml-6">
                              {summaryStats.totalBioluminescenceTests > 0
                                ? (((summaryStats.cautionTests || 0) / (summaryStats.totalBioluminescenceTests || 1)) * 100).toFixed(1)
                                : '0.0'}%
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                              <span className="text-sm font-medium text-gray-700">REJECTS</span>
                            </div>
                            <p className="text-lg font-bold text-gray-900 ml-6">
                              {summaryStats.totalBioluminescenceTests > 0
                                ? (((summaryStats.rejectTests || 0) / (summaryStats.totalBioluminescenceTests || 1)) * 100).toFixed(1)
                                : '0.0'}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Area Comparison Table */}
                {summaryStats.areaComparison && summaryStats.areaComparison.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Cumplimiento por Área / Compliance by Area
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Área / Area
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Partes / Total Parts
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Cumplen / Comply
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              No Cumplen / Not Comply
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tasa / Rate
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {summaryStats.areaComparison.map((area: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {area.areaName}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                {area.totalParts || 0}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {area.compliantParts || 0}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  (area.nonCompliantParts || 0) > 0 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {area.nonCompliantParts || 0}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  parseFloat(area.complianceRate || '0') >= 95 
                                    ? 'bg-green-100 text-green-800' 
                                    : parseFloat(area.complianceRate || '0') >= 80
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {area.complianceRate || '0.0'}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Bioluminescence Results Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Resultados de Bioluminescence por Fecha / Bioluminescence Results by Date
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
                      <Bar dataKey="acceptTests" fill="#10b981" name="ACCEPT" />
                      <Bar dataKey="cautionTests" fill="#f59e0b" name="CAUTION" />
                      <Bar dataKey="rejectTests" fill="#ef4444" name="REJECTS" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Daily Statistics Table */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      Estadísticas Diarias / Daily Statistics
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFilterNoComply(filterNoComply === true ? null : true)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          filterNoComply === true
                            ? 'bg-red-100 text-red-800 border-2 border-red-500'
                            : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                        }`}
                      >
                        No Cumple
                      </button>
                      <button
                        onClick={() => setFilterCaution(filterCaution === true ? null : true)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          filterCaution === true
                            ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-500'
                            : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                        }`}
                      >
                        Caution
                      </button>
                      <button
                        onClick={() => setFilterReject(filterReject === true ? null : true)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          filterReject === true
                            ? 'bg-red-100 text-red-800 border-2 border-red-500'
                            : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                        }`}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
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
                            Áreas / Areas
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Partes / Parts
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cumplen / Comply
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            No Cumplen / Not Comply
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Pruebas RLU / RLU Tests
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tasa Cumplimiento / Compliance Rate
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dailyStats.filter((stat: any) => {
                          // Apply filters
                          if (filterNoComply === true && (stat.nonCompliantParts || 0) === 0) {
                            return false
                          }
                          if (filterCaution === true && (stat.cautionTests || 0) === 0) {
                            return false
                          }
                          if (filterReject === true && (stat.rejectTests || 0) === 0) {
                            return false
                          }
                          return true
                        }).map((stat: any) => (
                          <tr key={stat.date} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {stat.date}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              {stat.totalRecords || 0}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              {stat.totalAreas || 0}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              {stat.totalParts || 0}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {stat.compliantParts || 0}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                (stat.nonCompliantParts || 0) > 0 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {stat.nonCompliantParts || 0}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-gray-700">ACCEPT: {stat.acceptTests || 0}</span>
                                <span className="text-gray-400">|</span>
                                <span className={`${(stat.cautionTests || 0) > 0 ? 'font-semibold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded' : 'text-gray-700'}`}>
                                  CAUTION: {stat.cautionTests || 0}
                                </span>
                                <span className="text-gray-400">|</span>
                                <span className={`${(stat.rejectTests || 0) > 0 ? 'font-semibold bg-red-100 text-red-800 px-2 py-0.5 rounded' : 'text-gray-700'}`}>
                                  REJECTS: {stat.rejectTests || 0}
                                </span>
                              </div>
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

                {/* Status Distribution Table - Focus on "Sobre el límite" */}
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
                          <th className="px-4 py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider">
                            Sobre el Límite
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dailyStats.map((stat) => {
                          if ('withinRange' in stat && 'overLimit' in stat) {
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
                                    {stat.overLimit}
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

