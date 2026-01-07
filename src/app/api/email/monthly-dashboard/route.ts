import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role for server-side queries
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// List of all checklist tables
const CHECKLIST_TABLES = [
  'checklist_pre_operational_review',
  'checklist_footbath_control',
  'checklist_metal_detector',
  'checklist_materials_control',
  'checklist_weighing_sealing',
  'checklist_foreign_material',
  'checklist_staff_practices',
  'checklist_raw_material_quality',
  'checklist_producto_mix',
  'checklist_frozen_product_dispatch',
  'checklist_cleanliness_control_packing',
  'checklist_staff_glasses_auditory',
  'checklist_staff_glasses_auditory_setup',
]

interface ChecklistStats {
  tableName: string
  displayName: string
  total: number
  comply: number
  notComply: number
  pending: number
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
    const startDate = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0)
    // Get last day of the month: new Date(year, month, 0) gives last day of previous month
    // So for month 11 (Nov), we use new Date(year, 12, 0) = last day of November
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999)
    
    console.log(`Querying checklists for ${targetMonth}/${targetYear}`)
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`)
    
    const stats: ChecklistStats[] = []
    
    // Query each checklist table
    for (const tableName of CHECKLIST_TABLES) {
      try {
        // Try querying with date_utc first
        let { data: checklists, error } = await supabase
          .from(tableName)
          .select('*')
          .gte('date_utc', startDate.toISOString())
          .lte('date_utc', endDate.toISOString())
        
        // If error suggests date_utc doesn't exist, try created_at
        if (error && (error.message?.includes('column') || error.code === 'PGRST116')) {
          console.log(`${tableName}: date_utc not found, trying created_at`)
          const { data: checklistsAlt, error: errorAlt } = await supabase
            .from(tableName)
            .select('*')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
          
          if (!errorAlt) {
            checklists = checklistsAlt
            error = null
          } else {
            // If both fail, try without date filter to see if table exists
            console.log(`${tableName}: Trying without date filter to check if table exists`)
            const { data: allData } = await supabase
              .from(tableName)
              .select('*')
              .limit(1)
            
            if (allData !== null) {
              console.log(`${tableName}: Table exists but no records in date range`)
              checklists = []
              error = null
            }
          }
        }
        
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
            total: 0,
            comply: 0,
            notComply: 0,
            pending: 0,
          })
          continue
        }
        
        console.log(`${tableName}: Found ${checklists?.length || 0} records`)
        
        const total = checklists?.length || 0
        let comply = 0
        let notComply = 0
        let pending = 0
        
        if (checklists && checklists.length > 0) {
          for (const checklist of checklists) {
            const compliance = checkCompliance(checklist, tableName)
            if (compliance === 'comply') comply++
            else if (compliance === 'not_comply') notComply++
            else pending++
          }
        }
        
        stats.push({
          tableName,
          displayName: getDisplayName(tableName),
          total,
          comply,
          notComply,
          pending,
        })
      } catch (err) {
        console.error(`Exception querying ${tableName}:`, err)
        // Still add the table with zero stats
        stats.push({
          tableName,
          displayName: getDisplayName(tableName),
          total: 0,
          comply: 0,
          notComply: 0,
          pending: 0,
        })
      }
    }
    
    // Calculate totals
    const totalChecklists = stats.reduce((sum, s) => sum + s.total, 0)
    const totalComply = stats.reduce((sum, s) => sum + s.comply, 0)
    const totalNotComply = stats.reduce((sum, s) => sum + s.notComply, 0)
    const totalPending = stats.reduce((sum, s) => sum + s.pending, 0)
    
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
            .comply { color: #22c55e; font-weight: bold; }
            .not-comply { color: #ef4444; font-weight: bold; }
            .pending { color: #f59e0b; font-weight: bold; }
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
                <div class="summary-item">
                  <span class="summary-label">Cumplen:</span>
                  <span class="comply">${totalComply}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">No Cumplen:</span>
                  <span class="not-comply">${totalNotComply}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Pendientes:</span>
                  <span class="pending">${totalPending}</span>
                </div>
              </div>
              
              <h2>Desglose por Checklist</h2>
              <table class="stats-table">
                <thead>
                  <tr>
                    <th>Checklist</th>
                    <th>Total</th>
                    <th>Cumplen</th>
                    <th>No Cumplen</th>
                    <th>Pendientes</th>
                  </tr>
                </thead>
                <tbody>
                  ${stats.map(s => `
                    <tr>
                      <td>${s.displayName}</td>
                      <td>${s.total}</td>
                      <td class="comply">${s.comply}</td>
                      <td class="not-comply">${s.notComply}</td>
                      <td class="pending">${s.pending}</td>
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
    
    // Send email via Resend to all recipients
    const emailResults = []
    for (const emailTo of emailsToSend) {
      try {
        const { data, error } = await resend.emails.send({
          from: 'onboarding@resend.dev', // Resend test domain
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
        comply: totalComply,
        notComply: totalNotComply,
        pending: totalPending,
        byChecklist: stats,
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

