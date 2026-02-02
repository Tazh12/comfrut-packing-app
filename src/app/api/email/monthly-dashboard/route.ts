import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { formatDateMMMDDYYYY } from '@/lib/date-utils'

// Initialize Supabase client with service role for server-side queries
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
  'checklist_frozen_product_dispatch': 'inbound-outbound',
}

// Map checklists to their date field names (most use date_string, but some are different)
const CHECKLIST_DATE_FIELDS: Record<string, string> = {
  'checklist_calidad_monoproducto': 'fecha', // Uses fecha instead of date_string
  'checklist_frozen_product_dispatch': 'date', // Uses date (TIMESTAMPTZ) instead of date_string
  // All others use 'date_string'
}

// List of all checklist tables
const CHECKLIST_TABLES = Object.keys(CHECKLIST_STAGES)

interface ChecklistStats {
  tableName: string
  displayName: string
  stage: 'preoperational' | 'operational' | 'inbound-outbound'
  total: number
  notComply: number
}

interface StageStats {
  stage: string
  displayName: string
  total: number
  notComply: number
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

// Helper function to check if a checklist complies
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
  
  // For frozen_product_dispatch
  if (checklist.inspection_result) {
    if (checklist.inspection_result === 'Reject') return 'not_comply'
    if (checklist.inspection_result === 'Approve') return 'comply'
    return 'pending'
  }
  
  // For raw_material_quality - check if there are any non-compliant samples
  if (checklist.box_samples && Array.isArray(checklist.box_samples)) {
    // This is complex, for now just check if checklist exists
    return 'pending'
  }
  
  // Default: if checklist exists, consider it pending (needs manual review)
  return 'pending'
}

// Get display name for checklist table
function getDisplayName(tableName: string): string {
  const names: Record<string, string> = {
    'checklist_pre_operational_review': 'Pre-Operational Review',
    'checklist_footbath_control': 'Footbath Control',
    'checklist_metal_detector': 'Metal Detector',
    'checklist_materials_control': 'Materials Control',
    'checklist_weighing_sealing': 'Weighing and Sealing',
    'checklist_foreign_material': 'Foreign Material',
    'checklist_staff_practices': 'Staff Practices',
    'checklist_raw_material_quality': 'Raw Material Quality',
    'checklist_producto_mix': 'Producto Mix',
    'checklist_frozen_product_dispatch': 'Frozen Product Dispatch',
    'checklist_cleanliness_control_packing': 'Cleanliness Control Packing',
    'checklist_staff_glasses_auditory': 'Staff Glasses Auditory',
    'checklist_staff_glasses_auditory_setup': 'Staff Glasses Auditory Setup',
    'checklist_envtemp': 'Process Environmental Temperature Control',
    'checklist_calidad_monoproducto': 'Monoproduct Checklist',
  }
  return names[tableName] || tableName.replace('checklist_', '').replace(/_/g, ' ')
}

export async function POST(request: NextRequest) {
  try {
    const { month, year, recipientEmail, recipientEmails } = await request.json()
    
    // Default to previous month if not provided
    const now = new Date()
    const targetMonth = month || (now.getMonth() === 0 ? 12 : now.getMonth())
    const targetYear = year || (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear())
    
    // Support both single email and multiple emails
    let emailsToSend: string[] = []
    if (recipientEmails && Array.isArray(recipientEmails)) {
      emailsToSend = recipientEmails.filter((e: string) => e && e.trim() !== '')
    } else if (recipientEmail) {
      emailsToSend = [recipientEmail]
    }
    
    if (emailsToSend.length === 0) {
      return NextResponse.json({ error: 'No recipient email(s) provided' }, { status: 400 })
    }
    
    // Calculate date range for the month (start of month to end of month)
    // targetMonth is 1-indexed (1-12), JavaScript months are 0-indexed (0-11)
    const startDate = new Date(targetYear, targetMonth - 1, 1)
    const endDate = new Date(targetYear, targetMonth, 0) // Last day of the month
    
    // Format dates as YYYY-MM-DD for formatDateMMMDDYYYY
    const startDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`
    const endDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
    
    // Convert to MMM-DD-YYYY format for comparison
    const startDateString = formatDateMMMDDYYYY(startDateStr)
    const endDateString = formatDateMMMDDYYYY(endDateStr)
    
    const startDateObj = parseDateString(startDateString)
    const endDateObj = parseDateString(endDateString)
    
    console.log(`Querying checklists for ${targetMonth}/${targetYear}`)
    console.log(`Date range: ${startDateString} to ${endDateString}`)
    
    const stats: ChecklistStats[] = []
    
    // Query each checklist table
    for (const tableName of CHECKLIST_TABLES) {
      try {
        // Fetch all records from the table (we'll filter by date_string in memory)
        let { data: checklists, error } = await supabase
          .from(tableName)
          .select('*')
        
        if (error) {
          console.error(`Error querying ${tableName}:`, {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          })
          // Still add the table with zero stats
          stats.push({
            tableName,
            displayName: getDisplayName(tableName),
            stage: CHECKLIST_STAGES[tableName],
            total: 0,
            notComply: 0,
          })
          continue
        }
        
        // Filter by date field (the date the user entered in the checklist)
        const dateField = CHECKLIST_DATE_FIELDS[tableName] || 'date_string'
        let filteredChecklists = (checklists || []).filter((checklist: any) => {
          // Handle different date field types
          let recordDateObj: Date | null = null
          
          if (dateField === 'date') {
            // For TIMESTAMPTZ fields (like frozen_product_dispatch)
            if (checklist.date) {
              const dateValue = new Date(checklist.date)
              recordDateObj = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate())
            }
          } else if (dateField === 'fecha') {
            // For fecha field (like monoproducto) - format YYYY-MM-DD
            if (checklist.fecha) {
              const fechaParts = checklist.fecha.split('-')
              if (fechaParts.length === 3) {
                const [year, month, day] = fechaParts
                recordDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
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
          if (startDateObj) {
            const startDateOnly = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate())
            if (recordDateOnly < startDateOnly) return false
          }
          if (endDateObj) {
            const endDateOnly = new Date(endDateObj.getFullYear(), endDateObj.getMonth(), endDateObj.getDate())
            if (recordDateOnly > endDateOnly) return false
          }
          return true
        })
        
        console.log(`${tableName}: Found ${filteredChecklists.length} records in date range`)
        
        const total = filteredChecklists.length
        let notComply = 0
        
        if (filteredChecklists.length > 0) {
          for (const checklist of filteredChecklists) {
            const compliance = checkCompliance(checklist, tableName)
            if (compliance === 'not_comply') notComply++
          }
        }
        
        stats.push({
          tableName,
          displayName: getDisplayName(tableName),
          stage: CHECKLIST_STAGES[tableName],
          total,
          notComply,
        })
      } catch (err) {
        console.error(`Exception querying ${tableName}:`, err)
        // Still add the table with zero stats
        stats.push({
          tableName,
          displayName: getDisplayName(tableName),
          stage: CHECKLIST_STAGES[tableName],
          total: 0,
          notComply: 0,
        })
      }
    }
    
    // Calculate totals
    const totalChecklists = stats.reduce((sum, s) => sum + s.total, 0)
    
    // Group by stage
    const stageStats: StageStats[] = [
      {
        stage: 'preoperational',
        displayName: 'Preoperacional',
        total: stats.filter(s => s.stage === 'preoperational').reduce((sum, s) => sum + s.total, 0),
        notComply: stats.filter(s => s.stage === 'preoperational').reduce((sum, s) => sum + s.notComply, 0),
      },
      {
        stage: 'operational',
        displayName: 'Operacional',
        total: stats.filter(s => s.stage === 'operational').reduce((sum, s) => sum + s.total, 0),
        notComply: stats.filter(s => s.stage === 'operational').reduce((sum, s) => sum + s.notComply, 0),
      },
      {
        stage: 'inbound-outbound',
        displayName: 'Inbound/Outbound',
        total: stats.filter(s => s.stage === 'inbound-outbound').reduce((sum, s) => sum + s.total, 0),
        notComply: stats.filter(s => s.stage === 'inbound-outbound').reduce((sum, s) => sum + s.notComply, 0),
      },
    ]
    
    // Create email HTML
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const monthName = monthNames[targetMonth - 1]
    
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
            .stats-table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; }
            .stats-table th, .stats-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            .stats-table th { background: #1D6FE3; color: white; }
            .stats-table tr:hover { background: #f5f5f5; }
            .not-comply { color: #ef4444; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Dashboard Mensual - ${monthName} ${targetYear}</h1>
            </div>
            <div class="content">
              <div class="summary">
                <h2>Resumen General</h2>
                <div class="summary-item">
                  <span class="summary-label">Total de Checklists:</span>
                  <span>${totalChecklists}</span>
                </div>
              </div>
              
              <h2>Desglose por Etapa</h2>
              <table class="stats-table">
                <thead>
                  <tr>
                    <th>Etapa</th>
                    <th>Total de Checklists</th>
                    <th>No Cumplen</th>
                  </tr>
                </thead>
                <tbody>
                  ${stageStats.map(s => `
                    <tr>
                      <td>${s.displayName}</td>
                      <td>${s.total}</td>
                      <td class="not-comply">${s.notComply}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </body>
      </html>
    `
    
    // Initialize Resend client (only at runtime, not at build time)
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
          subject: `Dashboard Mensual - ${monthName} ${targetYear}`,
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
      stats: {
        total: totalChecklists,
        byStage: stageStats,
      }
    })
    
  } catch (error) {
    console.error('Error in monthly dashboard email:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
