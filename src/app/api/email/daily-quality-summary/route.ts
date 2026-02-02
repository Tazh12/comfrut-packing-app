import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { formatDateMMMDDYYYY } from '@/lib/date-utils'

// Initialize Supabase client with service role for server-side queries
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Quality checklists only (exclude logistics like frozen_product_dispatch)
const QUALITY_CHECKLISTS = [
  'checklist_pre_operational_review',
  'checklist_cleanliness_control_packing',
  'checklist_footbath_control',
  'checklist_staff_practices',
  'checklist_staff_glasses_auditory',
  'checklist_staff_glasses_auditory_setup',
  'checklist_materials_control',
  'checklist_metal_detector',
  'checklist_producto_mix',
  'checklist_weighing_sealing',
  'checklist_foreign_material',
  'checklist_envtemp',
  'checklist_calidad_monoproducto',
  'checklist_raw_material_quality',
]

// Map checklists to their date field names
const CHECKLIST_DATE_FIELDS: Record<string, string> = {
  'checklist_calidad_monoproducto': 'fecha', // Uses fecha instead of date_string
  // All others use 'date_string'
}

// Map checklists to their stages
const CHECKLIST_STAGES: Record<string, 'preoperational' | 'operational' | 'inbound-outbound'> = {
  'checklist_pre_operational_review': 'preoperational',
  'checklist_cleanliness_control_packing': 'preoperational',
  'checklist_footbath_control': 'preoperational',
  'checklist_staff_practices': 'preoperational',
  'checklist_staff_glasses_auditory': 'preoperational',
  'checklist_staff_glasses_auditory_setup': 'preoperational',
  'checklist_materials_control': 'preoperational',
  'checklist_metal_detector': 'operational',
  'checklist_producto_mix': 'operational',
  'checklist_weighing_sealing': 'operational',
  'checklist_foreign_material': 'operational',
  'checklist_envtemp': 'operational',
  'checklist_calidad_monoproducto': 'operational',
  'checklist_raw_material_quality': 'inbound-outbound',
}

// Dashboard and Historial URL mapping - maps table names to display names and filter names
const CHECKLIST_MAP: Record<string, { displayName: string; dashboardName: string; historialName: string }> = {
  'checklist_pre_operational_review': {
    displayName: 'Pre-Operational Review',
    dashboardName: 'Pre-Operational Review Processing Areas',
    historialName: 'Pre-Operational Review Processing Areas',
  },
  'checklist_cleanliness_control_packing': {
    displayName: 'Cleanliness Control Packing',
    dashboardName: 'Cleanliness Control Packing',
    historialName: 'Cleanliness Control Packing',
  },
  'checklist_footbath_control': {
    displayName: 'Footbath Control',
    dashboardName: 'Footbath Control',
    historialName: 'Footbath Control',
  },
  'checklist_staff_practices': {
    displayName: 'Staff Practices',
    dashboardName: 'Staff Good Practices Control',
    historialName: 'Staff Good Practices Control',
  },
  'checklist_staff_glasses_auditory': {
    displayName: 'Staff Glasses Auditory',
    dashboardName: 'Process area staff glasses and auditory protector control',
    historialName: 'Process area staff glasses and auditory protector control',
  },
  'checklist_staff_glasses_auditory_setup': {
    displayName: 'Staff Glasses Auditory Setup',
    dashboardName: 'Process area staff glasses and auditory protector control',
    historialName: 'Process area staff glasses and auditory protector control',
  },
  'checklist_materials_control': {
    displayName: 'Materials Control',
    dashboardName: 'Internal control of materials used in production areas',
    historialName: 'Internal control of materials used in production areas',
  },
  'checklist_metal_detector': {
    displayName: 'Metal Detector',
    dashboardName: 'Metal Detector (PCC #1)',
    historialName: 'Metal Detector (PCC #1)',
  },
  'checklist_producto_mix': {
    displayName: 'Producto Mix',
    dashboardName: 'Checklist Mix Producto',
    historialName: 'Checklist Mix Producto',
  },
  'checklist_weighing_sealing': {
    displayName: 'Weighing and Sealing',
    dashboardName: 'Check weighing and sealing of packaged products',
    historialName: 'Check weighing and sealing of packaged products',
  },
  'checklist_foreign_material': {
    displayName: 'Foreign Material',
    dashboardName: 'Foreign Material Findings Record',
    historialName: 'Foreign Material Findings Record',
  },
  'checklist_envtemp': {
    displayName: 'Environmental Temperature',
    dashboardName: 'Process Environmental Temperature Control',
    historialName: 'Process Environmental Temperature Control',
  },
  'checklist_calidad_monoproducto': {
    displayName: 'Monoproducto',
    dashboardName: 'Checklist Monoproducto',
    historialName: 'Checklist Monoproducto',
  },
  'checklist_raw_material_quality': {
    displayName: 'Raw Material Quality',
    dashboardName: 'Raw Material Quality',
    historialName: 'Raw Material Quality',
  },
}

// Helper function to parse date_string (MMM-DD-YYYY format)
function parseDateString(dateStr: string): Date | null {
  if (!dateStr) return null
  const MONTH_MAP: { [key: string]: number } = {
    'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
    'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
  }
  try {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const month = MONTH_MAP[parts[0].toUpperCase()]
      const day = parseInt(parts[1])
      const year = parseInt(parts[2])
      if (month !== undefined && !isNaN(day) && !isNaN(year)) {
        return new Date(year, month, day)
      }
    }
    return null
  } catch {
    return null
  }
}

// Helper function to check if a checklist complies (reused from monthly dashboard)
function checkCompliance(checklist: any, tableName: string): 'comply' | 'not_comply' | 'pending' {
  // For checklists with items array (like pre_operational_review)
  if (checklist.items && Array.isArray(checklist.items)) {
    const items = checklist.items as Array<{ comply: boolean | null; correctiveActionComply?: boolean | null }>
    const hasNotComply = items.some(item => item.comply === false || item.correctiveActionComply === false)
    const allComply = items.every(item => 
      item.comply === true && (item.correctiveActionComply === true || item.correctiveActionComply === null || item.correctiveActionComply === undefined)
    )
    const allAnswered = items.every(item => item.comply !== null)
    
    if (hasNotComply) return 'not_comply'
    if (allComply && allAnswered) return 'comply'
    return 'pending'
  }
  
  // For checklists with bag_entries (like weighing_sealing)
  if (checklist.bag_entries && Array.isArray(checklist.bag_entries)) {
    const entries = checklist.bag_entries as Array<{ sealed?: string[] }>
    const hasNotComply = entries.some(entry => 
      entry.sealed?.some(seal => seal.toLowerCase().includes('not comply') || seal.toLowerCase().includes('no comply'))
    )
    return hasNotComply ? 'not_comply' : 'comply'
  }
  
  // For checklists with measurements (like footbath_control)
  if (checklist.measurements && Array.isArray(checklist.measurements)) {
    const measurements = checklist.measurements as Array<{ correctiveAction?: string; measurePpmValue?: number }>
    const hasCorrectiveAction = measurements.some(m => 
      m.correctiveAction && m.correctiveAction.trim() !== ''
    )
    const hasLowPpm = measurements.some(m => 
      m.measurePpmValue !== undefined && m.measurePpmValue < 200
    )
    return (hasCorrectiveAction || hasLowPpm) ? 'not_comply' : 'comply'
  }
  
  // For checklists with readings (like metal_detector)
  if (checklist.readings && Array.isArray(checklist.readings)) {
    const readings = checklist.readings as Array<{ 
      sensitivity?: string
      noiseAlarm?: string
      rejectingArm?: string
      observation?: string
      correctiveActions?: string
    }>
    const hasNotComply = readings.some(r => 
      r.sensitivity === 'No comply' || 
      r.noiseAlarm === 'No comply' || 
      r.rejectingArm === 'No comply' ||
      (r.observation && r.observation.trim() !== '') ||
      (r.correctiveActions && r.correctiveActions.trim() !== '')
    )
    return hasNotComply ? 'not_comply' : 'comply'
  }
  
  // For checklists with personnel_materials (like materials_control)
  if (checklist.personnel_materials && Array.isArray(checklist.personnel_materials)) {
    const materials = checklist.personnel_materials as Array<{ 
      materialStatus?: string
      materialStatusReceived?: string
      observation?: string
      observationReceived?: string
    }>
    const hasBadStatus = materials.some(m => 
      m.materialStatus === 'Bad/Malo' || m.materialStatusReceived === 'Bad/Malo'
    )
    return hasBadStatus ? 'not_comply' : 'comply'
  }
  
  // For checklists with findings (like foreign_material)
  if (checklist.findings && Array.isArray(checklist.findings)) {
    const findings = checklist.findings as Array<any>
    const noFindings = checklist.no_findings === true
    if (noFindings) return 'comply'
    if (findings.length > 0) return 'not_comply'
    return 'pending'
  }
  
  // Default: if checklist exists, consider it pending (needs manual review)
  return 'pending'
}

// Helper function to parse SKU material name and extract bag weight
function parseBagWeightFromMaterial(material: string): { weight: number; unit: 'oz' | 'lb' } | null {
  if (!material) return null
  // Pattern: *{number} {OZ|LB} or {number} {OZ|LB} (case insensitive)
  // Examples: "*16 OZ", "*2.5 LB", "16 OZ", "2.5 LB"
  const patterns = [
    /\*(\d+\.?\d*)\s*(OZ|LB|oz|lb)/i,  // *16 OZ or *2.5 LB
    /(\d+\.?\d*)\s*(OZ|LB|oz|lb)/i      // 16 OZ or 2.5 LB
  ]
  
  for (const pattern of patterns) {
    const match = material.match(pattern)
    if (match) {
      const weight = parseFloat(match[1])
      const unit = match[2].toUpperCase() === 'LB' ? 'lb' : 'oz'
      return { weight, unit }
    }
  }
  return null
}

// Helper function to convert weight to grams
function convertToGrams(weight: number, unit: 'oz' | 'lb'): number {
  if (unit === 'oz') return weight * 28.3495  // 1 oz = 28.3495 grams
  if (unit === 'lb') return weight * 453.592  // 1 lb = 453.592 grams
  return weight
}

// Helper function to check bag weight deviation
function checkBagWeightDeviation(actualGrams: number, expectedGrams: number, tolerancePercent: number = 5): boolean {
  const deviation = Math.abs(actualGrams - expectedGrams)
  const tolerance = expectedGrams * (tolerancePercent / 100)
  return deviation > tolerance
}

// Comprehensive function to check if checklist needs review
async function checkNeedsReview(checklist: any, tableName: string): Promise<boolean> {
  // First check compliance status
  const compliance = checkCompliance(checklist, tableName)
  if (compliance === 'not_comply') return true
  
  // Then check specific out-of-range conditions based on tableName
  switch (tableName) {
    case 'checklist_pre_operational_review':
      // Any item with comply: false or correctiveActionComply: false
      if (checklist.items && Array.isArray(checklist.items)) {
        return checklist.items.some((item: any) => 
          item.comply === false || 
          item.correctiveActionComply === false ||
          (item.observation && item.observation.trim() !== '') ||
          (item.correctiveActionObservation && item.correctiveActionObservation.trim() !== '')
        )
      }
      return false

    case 'checklist_cleanliness_control_packing':
      // Any part with comply: false or RLU >= 20 (CAUTION) or RLU > 60 (REJECTS)
      if (checklist.areas && Array.isArray(checklist.areas)) {
        for (const area of checklist.areas) {
          if (area.parts && Array.isArray(area.parts)) {
            for (const part of area.parts) {
              if (part.comply === false || part.correctiveActionComply === false) return true
              if (part.bioluminescenceResult) {
                const rlu = parseFloat(part.bioluminescenceResult.toString().replace(/[^\d.]/g, ''))
                if (!isNaN(rlu) && (rlu >= 20 || rlu > 60)) return true
              }
            }
          }
        }
      }
      return false

    case 'checklist_footbath_control':
      // Any measurement with measurePpmValue < 200 or correctiveAction present
      if (checklist.measurements && Array.isArray(checklist.measurements)) {
        return checklist.measurements.some((m: any) => 
          (m.measurePpmValue !== undefined && m.measurePpmValue < 200) ||
          (m.correctiveAction && m.correctiveAction.trim() !== '')
        )
      }
      return false

    case 'checklist_staff_practices':
      // Any staff member with any parameter 'No comply' or correctiveAction/observation present
      if (checklist.personnel_materials && Array.isArray(checklist.personnel_materials)) {
        return checklist.personnel_materials.some((person: any) => 
          person.staffAppearance === 'No comply' ||
          person.completeUniform === 'No comply' ||
          person.accessoriesAbsence === 'No comply' ||
          person.workToolsUsage === 'No comply' ||
          person.cutCleanNotPolishedNails === 'No comply' ||
          person.noMakeupOn === 'No comply' ||
          person.staffBehavior === 'No comply' ||
          person.staffHealth === 'No comply' ||
          (person.correctiveAction && person.correctiveAction.trim() !== '') ||
          (person.observation && person.observation.trim() !== '')
        )
      }
      return false

    case 'checklist_staff_glasses_auditory':
      // Any person with conditionIn/Out 'not_comply' or observations present
      if (checklist.personnel_materials && Array.isArray(checklist.personnel_materials)) {
        return checklist.personnel_materials.some((person: any) => 
          person.conditionIn === 'not_comply' ||
          person.conditionOut === 'not_comply' ||
          (person.observationIn && person.observationIn.trim() !== '') ||
          (person.observationOut && person.observationOut.trim() !== '')
        )
      }
      return false

    case 'checklist_staff_glasses_auditory_setup':
      // Similar to staff_glasses_auditory
      if (checklist.personnel_materials && Array.isArray(checklist.personnel_materials)) {
        return checklist.personnel_materials.some((person: any) => 
          person.conditionIn === 'not_comply' ||
          person.conditionOut === 'not_comply' ||
          (person.observationIn && person.observationIn.trim() !== '') ||
          (person.observationOut && person.observationOut.trim() !== '')
        )
      }
      return false

    case 'checklist_materials_control':
      // Any material with materialStatus 'Bad/Malo' or materialStatusReceived 'Bad/Malo'
      if (checklist.personnel_materials && Array.isArray(checklist.personnel_materials)) {
        return checklist.personnel_materials.some((m: any) => 
          m.materialStatus === 'Bad/Malo' ||
          m.materialStatusReceived === 'Bad/Malo' ||
          ((m.materialStatus === 'Bad/Malo' || m.materialStatusReceived === 'Bad/Malo') &&
           (m.observation && m.observation.trim() !== '' || m.observationReceived && m.observationReceived.trim() !== ''))
        )
      }
      return false

    case 'checklist_metal_detector':
      // Any reading with sensitivity/noiseAlarm/rejectingArm 'No comply', observations, or BF/BNF/BSS with 'ND'
      if (checklist.readings && Array.isArray(checklist.readings)) {
        return checklist.readings.some((r: any) => {
          if (r.sensitivity === 'No comply' || r.noiseAlarm === 'No comply' || r.rejectingArm === 'No comply' || r.beaconLight === 'No comply') {
            return true
          }
          if (r.observation && r.observation.trim() !== '') return true
          if (r.correctiveActions && r.correctiveActions.trim() !== '') return true
          // Check BF, BNF, BSS arrays for "ND"
          if (Array.isArray(r.bf) && r.bf.some((val: string) => val === 'ND')) return true
          if (Array.isArray(r.bnf) && r.bnf.some((val: string) => val === 'ND')) return true
          if (Array.isArray(r.bss) && r.bss.some((val: string) => val === 'ND')) return true
          return false
        })
      }
      return false

    case 'checklist_weighing_sealing':
      // Any bag entry with sealed array containing 'not comply' or 'no comply'
      if (checklist.bag_entries && Array.isArray(checklist.bag_entries)) {
        return checklist.bag_entries.some((entry: any) => 
          entry.sealed && Array.isArray(entry.sealed) && entry.sealed.some((seal: string) => 
            seal.toLowerCase().includes('not comply') || seal.toLowerCase().includes('no comply')
          )
        )
      }
      return false

    case 'checklist_foreign_material':
      // Has findings when no_findings is false
      if (checklist.no_findings === false && checklist.findings && Array.isArray(checklist.findings)) {
        return checklist.findings.length > 0
      }
      return false

    case 'checklist_envtemp':
      // Any reading with temp > 50°F or < 42°F, or observation present
      if (checklist.readings && Array.isArray(checklist.readings)) {
        return checklist.readings.some((r: any) => 
          (r.averageTemp !== undefined && (r.averageTemp > 50 || r.averageTemp < 42)) ||
          r.status === 'Over Limit' ||
          r.status === 'Under Limit' ||
          (r.observation && r.observation.trim() !== '')
        )
      }
      return false

    case 'checklist_producto_mix':
      // Check fruit percentages and bag weight
      if (checklist.pallets && Array.isArray(checklist.pallets)) {
        for (const pallet of checklist.pallets) {
          // Check fruit percentages
          if (pallet.fieldsByFruit && pallet.expectedCompositions) {
            const pesoBolsa = parseFloat(pallet.values?.['Peso Bolsa'] || pallet.values?.['Peso Bolsa (gr)'] || '0')
            if (pesoBolsa > 0) {
              for (const [fruit, expectedPctDecimal] of Object.entries(pallet.expectedCompositions)) {
                const pesoFrutaKey = `Peso Fruta ${fruit}`
                const pesoFruta = parseFloat(pallet.values?.[pesoFrutaKey] || '0')
                if (pesoFruta > 0) {
                  const percentage = (pesoFruta / pesoBolsa) * 100
                  const expectedPercentage = (expectedPctDecimal as number) * 100
                  if (Math.abs(percentage - expectedPercentage) > 5) return true
                }
              }
            }
          }
          // Check bag weight
          if (checklist.producto) {
            const expectedWeight = parseBagWeightFromMaterial(checklist.producto)
            if (expectedWeight) {
              const expectedGrams = convertToGrams(expectedWeight.weight, expectedWeight.unit)
              const pesoBolsa = parseFloat(pallet.values?.['Peso Bolsa'] || pallet.values?.['Peso Bolsa (gr)'] || '0')
              if (pesoBolsa > 0 && checkBagWeightDeviation(pesoBolsa, expectedGrams)) {
                return true
              }
            }
          }
        }
      }
      return false

    case 'checklist_calidad_monoproducto':
      // Check bag weight for each pallet
      if (checklist.producto && checklist.pallets && Array.isArray(checklist.pallets)) {
        const expectedWeight = parseBagWeightFromMaterial(checklist.producto)
        if (expectedWeight) {
          const expectedGrams = convertToGrams(expectedWeight.weight, expectedWeight.unit)
          for (const pallet of checklist.pallets) {
            // Find Peso Bolsa field (may have different names)
            const pesoBolsaKeys = Object.keys(pallet.values || {}).filter(k => 
              k.toLowerCase().includes('peso') && k.toLowerCase().includes('bolsa')
            )
            for (const key of pesoBolsaKeys) {
              const pesoBolsa = parseFloat(pallet.values[key] || '0')
              if (pesoBolsa > 0 && checkBagWeightDeviation(pesoBolsa, expectedGrams)) {
                return true
              }
            }
          }
        }
      }
      return false

    case 'checklist_raw_material_quality':
      // Review box_samples for threshold violations, organoleptic values, temperature ranges
      if (checklist.box_samples && Array.isArray(checklist.box_samples)) {
        for (const sample of checklist.box_samples) {
          // Check organoleptic values
          if (sample.values && sample.values['Organoleptic']) {
            const organoleptic = sample.values['Organoleptic'].toLowerCase()
            if (organoleptic !== 'excellent' && organoleptic !== 'good') {
              return true
            }
          }
          // Check percentage thresholds (if weightSample exists)
          if (sample.weightSample) {
            const weightSample = parseFloat(sample.weightSample.toString().replace(/[^\d.]/g, ''))
            if (!isNaN(weightSample) && weightSample > 0) {
              for (const [key, value] of Object.entries(sample.values || {})) {
                if (key.includes('%')) {
                  const grams = parseFloat(value.toString().replace(/[^\d.]/g, ''))
                  if (!isNaN(grams)) {
                    const percentage = (grams / weightSample) * 100
                    // Flag if percentage is high (thresholds may vary, using 10% as example)
                    if (percentage > 10) return true
                  }
                }
              }
            }
          }
        }
      }
      // Check cold storage temperature
      if (checklist.cold_storage_receiving_temperature !== undefined && checklist.cold_storage_receiving_temperature !== null) {
        const temp = parseFloat(checklist.cold_storage_receiving_temperature.toString())
        // Flag if temperature is out of acceptable range (e.g., > 0°C or < -20°C)
        if (!isNaN(temp) && (temp > 0 || temp < -20)) {
          return true
        }
      }
      return false

    default:
      return compliance === 'not_comply'
  }
}

// Build dashboard URL with date filter
function buildDashboardUrl(checklistType: string, date: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
  const dashboardPath = '/area/calidad/dashboard-quality'
  const mapping = CHECKLIST_MAP[checklistType]
  
  if (!mapping) {
    return `${baseUrl}${dashboardPath}?startDate=${date}&endDate=${date}`
  }
  
  const params = new URLSearchParams({
    checklist: mapping.dashboardName,
    startDate: date,
    endDate: date,
  })
  
  return `${baseUrl}${dashboardPath}?${params.toString()}`
}

// Build historial URL with date filter
function buildHistorialUrl(checklistType: string, date: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
  const historialPath = '/area/calidad/historial'
  const mapping = CHECKLIST_MAP[checklistType]
  
  if (!mapping) {
    return `${baseUrl}${historialPath}?fromDate=${date}&toDate=${date}`
  }
  
  const params = new URLSearchParams({
    selected: mapping.historialName,
    fromDate: date,
    toDate: date,
  })
  
  return `${baseUrl}${historialPath}?${params.toString()}`
}

export async function POST(request: NextRequest) {
  try {
    const { date, recipientEmail, recipientEmails } = await request.json()
    
    // Default to yesterday if not provided
    let targetDate: Date
    if (date) {
      targetDate = new Date(date)
    } else {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      targetDate = yesterday
    }
    
    // Format target date as YYYY-MM-DD
    const year = targetDate.getFullYear()
    const month = String(targetDate.getMonth() + 1).padStart(2, '0')
    const day = String(targetDate.getDate()).padStart(2, '0')
    const targetDateStr = `${year}-${month}-${day}`
    
    // Convert to MMM-DD-YYYY format for comparison
    const targetDateString = formatDateMMMDDYYYY(targetDateStr)
    const targetDateObj = parseDateString(targetDateString)
    
    if (!targetDateObj) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }
    
    // Support both single email and multiple emails
    let emailsToSend: string[] = []
    if (recipientEmails && Array.isArray(recipientEmails)) {
      emailsToSend = recipientEmails.filter((e: string) => e && e.trim() !== '')
    } else if (recipientEmail) {
      emailsToSend = [recipientEmail]
    } else {
      // Try environment variable
      const envRecipients = process.env.DAILY_QUALITY_SUMMARY_RECIPIENTS
      if (envRecipients) {
        emailsToSend = envRecipients.split(',').map(e => e.trim()).filter(e => e !== '')
      }
    }
    
    if (emailsToSend.length === 0) {
      return NextResponse.json({ error: 'No recipient email(s) provided' }, { status: 400 })
    }
    
    console.log(`Querying quality checklists for ${targetDateString}`)
    
    interface ChecklistSummary {
      tableName: string
      displayName: string
      count: number
      needsReview: number
      dashboardUrl: string
      historialUrl: string
      stage: 'preoperational' | 'operational' | 'inbound-outbound'
    }
    
    const summaries: ChecklistSummary[] = []
    
    // Query each quality checklist table
    for (const tableName of QUALITY_CHECKLISTS) {
      try {
        // Fetch all records from the table (we'll filter by date_string in memory)
        let { data: checklists, error } = await supabase
          .from(tableName)
          .select('*')
        
        if (error) {
          console.error(`Error querying ${tableName}:`, error)
          continue
        }
        
        // Filter by date field (the date the user entered in the checklist)
        const dateField = CHECKLIST_DATE_FIELDS[tableName] || 'date_string'
        let filteredChecklists = (checklists || []).filter((checklist: any) => {
          // Handle different date field types
          let recordDateObj: Date | null = null
          
          if (dateField === 'fecha') {
            // For fecha field (like monoproducto) - format YYYY-MM-DD
            if (checklist.fecha) {
              const fechaParts = checklist.fecha.split('-')
              if (fechaParts.length === 3) {
                const [y, m, d] = fechaParts
                recordDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
              }
            }
          } else {
            // Default: date_string (MMM-DD-YYYY format)
            if (checklist.date_string) {
              recordDateObj = parseDateString(checklist.date_string)
            }
          }
          
          if (!recordDateObj) return false
          
          const recordDateOnly = new Date(recordDateObj.getFullYear(), recordDateObj.getMonth(), recordDateObj.getDate())
          const targetDateOnly = new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate())
          
          return recordDateOnly.getTime() === targetDateOnly.getTime()
        })
        
        console.log(`${tableName}: Found ${filteredChecklists.length} records for ${targetDateString}`)
        
        const count = filteredChecklists.length
        let needsReview = 0
        
        if (filteredChecklists.length > 0) {
          // For Producto Mix and Monoproducto, we need to fetch product data for bag weight validation
          let productDataMap: Record<string, string> = {}
          if (tableName === 'checklist_producto_mix' || tableName === 'checklist_calidad_monoproducto') {
            // Get unique SKUs from checklists
            const skus = [...new Set(filteredChecklists.map((c: any) => c.sku).filter(Boolean))]
            if (skus.length > 0) {
              const { data: products } = await supabase
                .from('productos')
                .select('sku, material')
                .in('sku', skus)
              
              if (products) {
                products.forEach((p: any) => {
                  productDataMap[p.sku] = p.material
                })
              }
            }
          }
          
          for (const checklist of filteredChecklists) {
            // For Producto Mix and Monoproducto, add material to checklist for bag weight validation
            if ((tableName === 'checklist_producto_mix' || tableName === 'checklist_calidad_monoproducto') && checklist.sku) {
              checklist.producto = productDataMap[checklist.sku] || checklist.producto
            }
            
            const needsReviewResult = await checkNeedsReview(checklist, tableName)
            if (needsReviewResult) needsReview++
          }
        }
        
        if (count > 0) {
          const mapping = CHECKLIST_MAP[tableName]
          const stage = CHECKLIST_STAGES[tableName] || 'operational'
          summaries.push({
            tableName,
            displayName: mapping?.displayName || tableName.replace('checklist_', '').replace(/_/g, ' '),
            count,
            needsReview,
            dashboardUrl: buildDashboardUrl(tableName, targetDateStr),
            historialUrl: buildHistorialUrl(tableName, targetDateStr),
            stage,
          })
        }
      } catch (err) {
        console.error(`Exception querying ${tableName}:`, err)
      }
    }
    
    // Only send email if there was activity
    if (summaries.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No quality checklists found for the specified date',
        date: targetDateStr,
        summaries: []
      })
    }
    
    // Group summaries by stage
    const preoperational = summaries.filter(s => s.stage === 'preoperational')
    const operational = summaries.filter(s => s.stage === 'operational')
    const inboundOutbound = summaries.filter(s => s.stage === 'inbound-outbound')
    
    // Calculate totals
    const totalChecklists = summaries.reduce((sum, s) => sum + s.count, 0)
    const totalNeedsReview = summaries.reduce((sum, s) => sum + s.needsReview, 0)
    
    // Get list of checklists that need review
    const checklistsNeedingReview = summaries
      .filter(s => s.needsReview > 0)
      .map(s => s.displayName)
    
    const needsReviewText = checklistsNeedingReview.length > 0
      ? checklistsNeedingReview.join(', ')
      : 'N/A'
    
    // Format date for display
    const dateDisplay = targetDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    
    // Helper function to render checklist items
    const renderChecklistItems = (items: ChecklistSummary[]) => {
      if (items.length === 0) return ''
      return items.map(s => `
        <div class="checklist-item ${s.needsReview > 0 ? 'warning' : ''}">
          <div class="checklist-name">
            ${s.needsReview > 0 ? '<span class="warning-icon">⚠️</span>' : ''}
            ${s.displayName}
          </div>
          <div class="checklist-meta">
            Count: ${s.count}${s.needsReview > 0 ? ` | Needs Review: ${s.needsReview}` : ''}
          </div>
          <div class="checklist-links">
            <a href="${s.dashboardUrl}" class="checklist-link">View Dashboard</a>
            <span class="link-separator">•</span>
            <a href="${s.historialUrl}" class="checklist-link">View Historial</a>
          </div>
        </div>
      `).join('')
    }
    
    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background: #1D6FE3; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .summary { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .summary-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .summary-item:last-child { border-bottom: none; }
            .summary-label { font-weight: bold; }
            .checklist-section { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .section-title { font-size: 18px; font-weight: bold; margin-bottom: 16px; color: #1D6FE3; border-bottom: 2px solid #1D6FE3; padding-bottom: 8px; }
            .checklist-item { padding: 16px; margin: 12px 0; border-left: 4px solid #1D6FE3; background: #f5f5f5; border-radius: 4px; }
            .checklist-item.warning { border-left-color: #ef4444; background: #fee; }
            .checklist-name { font-weight: bold; font-size: 16px; margin-bottom: 6px; }
            .checklist-meta { font-size: 14px; color: #666; margin: 6px 0; }
            .checklist-links { margin-top: 12px; font-size: 14px; line-height: 1.8; }
            .checklist-link { color: #1D6FE3; text-decoration: none; font-weight: 500; border-bottom: 1px solid transparent; transition: all 0.2s ease; padding-bottom: 1px; }
            .checklist-link:hover { color: #1557b0; border-bottom-color: #1557b0; }
            .link-separator { color: #ccc; margin: 0 10px; font-weight: 300; }
            .review-section { background: #fff8e1; border-left: 4px solid #ffc107; padding: 16px; margin: 20px 0; border-radius: 4px; }
            .review-section-title { font-weight: 600; margin-bottom: 10px; color: #856404; font-size: 15px; }
            .review-link { display: inline-block; color: #1D6FE3; text-decoration: none; font-weight: 600; border-bottom: 2px solid #1D6FE3; padding-bottom: 2px; transition: all 0.2s ease; margin-top: 4px; }
            .review-link:hover { color: #1557b0; border-bottom-color: #1557b0; }
            .warning-icon { color: #ef4444; font-size: 18px; margin-right: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Daily Quality Summary - ${dateDisplay}</h1>
            </div>
            <div class="content">
              <div class="summary">
                <h2>Summary</h2>
                <div class="summary-item">
                  <span class="summary-label">Total Checklists:</span>
                  <span>${totalChecklists}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">The following checklists require review:</span>
                  <span style="color: #ef4444; font-weight: 500;">${needsReviewText}</span>
                </div>
              </div>
              
              ${checklistsNeedingReview.length > 0 ? `
                <div class="review-section">
                  <div class="review-section-title">👉 Review required items:</div>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/area/calidad/dashboard-quality?startDate=${targetDateStr}&endDate=${targetDateStr}" class="review-link">Open Quality Dashboard →</a>
                </div>
              ` : ''}
              
              ${preoperational.length > 0 ? `
                <div class="checklist-section">
                  <div class="section-title">Preoperational</div>
                  ${renderChecklistItems(preoperational)}
                </div>
              ` : ''}
              
              ${operational.length > 0 ? `
                <div class="checklist-section">
                  <div class="section-title">Operational</div>
                  ${renderChecklistItems(operational)}
                </div>
              ` : ''}
              
              ${inboundOutbound.length > 0 ? `
                <div class="checklist-section">
                  <div class="section-title">Inbound/Outbound</div>
                  ${renderChecklistItems(inboundOutbound)}
                </div>
              ` : ''}
              
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/area/calidad/dashboard-quality" 
                   style="color: #1D6FE3; text-decoration: none;">
                  View Full Quality Dashboard →
                </a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `
    
    // Initialize Resend client
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json({ 
        error: 'RESEND_API_KEY environment variable is not set' 
      }, { status: 500 })
    }
    const resend = new Resend(resendApiKey)
    
    // Get sender email from environment variable, fallback to test domain
    const senderEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    
    // Send email via Resend to all recipients
    const emailResults = []
    for (const emailTo of emailsToSend) {
      try {
        const { data, error } = await resend.emails.send({
          from: senderEmail,
          to: emailTo,
          subject: `Daily Quality Summary - ${dateDisplay}`,
          html: emailHtml,
        })
        
        if (error) {
          console.error(`Error sending email to ${emailTo}:`, error)
          emailResults.push({ email: emailTo, success: false, error: error.message || 'Unknown error' })
        } else {
          emailResults.push({ email: emailTo, success: true, messageId: data?.id })
        }
      } catch (err) {
        console.error(`Exception sending email to ${emailTo}:`, err)
        emailResults.push({ 
          email: emailTo, 
          success: false, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        })
      }
    }
    
    const successCount = emailResults.filter(r => r.success).length
    const failCount = emailResults.filter(r => !r.success).length
    
    if (failCount > 0 && successCount === 0) {
      return NextResponse.json({ 
        error: 'Failed to send all emails', 
        results: emailResults 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Sent ${successCount} of ${emailsToSend.length} emails`,
      results: emailResults,
      date: targetDateStr,
      summaries: summaries.map(s => ({
        displayName: s.displayName,
        count: s.count,
        needsReview: s.needsReview,
      })),
      totals: {
        total: totalChecklists,
        needsReview: totalNeedsReview,
      }
    })
    
  } catch (error) {
    console.error('Error in daily quality summary email:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
