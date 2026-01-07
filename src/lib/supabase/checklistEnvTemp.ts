import { supabase } from '@/lib/supabase'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { formatDateMMMDDYYYY } from '@/lib/date-utils'

/**
 * Uploads a PDF file to Supabase Storage bucket 'checklist-envtemp'
 * @param file - The PDF file to upload (can be File or Blob)
 * @param filename - The filename to use for the uploaded file
 * @returns The public URL of the uploaded file
 * @throws Error if upload fails or public URL cannot be retrieved
 */
export async function uploadChecklistPDF(
  file: File | Blob,
  filename: string
): Promise<string> {
  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('storage/not-authenticated: User not authenticated')
    }

    // Validate file
    if (!file) {
      throw new Error('storage/invalid-file: File is null or undefined')
    }

    console.log('Uploading PDF to checklist-envtemp:', {
      filename,
      fileSize: file.size,
      fileType: file instanceof File ? file.type : 'blob'
    })

    // Upload file with upsert option to replace existing files
    const { data, error } = await supabase.storage
      .from('checklist-envtemp')
      .upload(filename, file, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true // Replace existing file if it exists
      })

    if (error) {
      console.error('Error uploading PDF:', {
        message: error.message,
        name: error.name,
        filename
      })
      throw new Error(`storage/upload-failed: ${error.message}`)
    }

    if (!data) {
      console.error('No data returned from upload')
      throw new Error('storage/upload-no-data: No data returned from upload')
    }

    console.log('PDF uploaded successfully:', { filename, path: data.path })

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('checklist-envtemp')
      .getPublicUrl(filename)

    if (!urlData?.publicUrl) {
      console.error('Could not retrieve public URL')
      throw new Error('storage/public-url-not-available: Could not retrieve public URL')
    }

    console.log('Public URL retrieved:', urlData.publicUrl)
    return urlData.publicUrl
  } catch (error) {
    console.error('Error in uploadChecklistPDF:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error)
    throw error
  }
}

/**
 * Interface for checklist environment temperature data
 */
export interface ChecklistEnvTempData {
  date_string: string
  shift: string
  monitor_name: string
  monitor_signature: string
  checker_name: string | null
  checker_signature: string | null
  verification_date: string | null
  readings: Array<{
    time: string
    digitalThermometer: number
    wallThermometer: number
    averageTemp: number
    status: string
    observation: string | null
  }>
  pdf_url: string | null
}

/**
 * Inserts a record into the checklist_envtemp table
 * @param data - The checklist data to insert
 * @returns The inserted row data
 * @throws Error if insert fails
 */
export async function insertChecklistEnvTemp(
  data: ChecklistEnvTempData
): Promise<any> {
  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('database/not-authenticated: User not authenticated')
    }

    // Validate data
    if (!data || Object.keys(data).length === 0) {
      throw new Error('database/empty-data: Data is empty or undefined')
    }

    console.log('Inserting checklist_envtemp record:', {
      date_string: data.date_string,
      shift: data.shift,
      monitor_name: data.monitor_name,
      checker_name: data.checker_name,
      readings_count: data.readings?.length || 0,
      pdf_url: data.pdf_url
    })

    // Insert record - Phase 1: Only insert monitor data, checker fields will be added in Phase 2
    const insertData: any = {
      date_string: data.date_string,
      shift: data.shift,
      monitor_name: data.monitor_name,
      monitor_signature: data.monitor_signature,
      readings: data.readings,
      pdf_url: data.pdf_url
    }

    // Only include checker fields if they have values (for Phase 2)
    if (data.checker_name) {
      insertData.checker_name = data.checker_name
    }
    if (data.checker_signature) {
      insertData.checker_signature = data.checker_signature
    }
    if (data.verification_date) {
      insertData.verification_date = data.verification_date
    }

    const { data: insertedData, error } = await supabase
      .from('checklist_envtemp')
      .insert([insertData])
      .select()

    if (error) {
      console.error('Error inserting checklist_envtemp record:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        error
      })
      throw new Error(`database/insert-failed: ${error.message}`)
    }

    if (!insertedData || insertedData.length === 0) {
      console.error('No data returned from insert')
      throw new Error('database/insert-no-data: No data returned from insert')
    }

    console.log('Checklist_envtemp record inserted successfully:', insertedData[0])
    return insertedData[0]
  } catch (error) {
    console.error('Error in insertChecklistEnvTemp:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error)
    throw error
  }
}

/**
 * EST timezone identifier
 */
const EST_TIMEZONE = 'America/New_York'

/**
 * Converts EST date string to UTC ISO string for database querying
 * @param dateStr - Date string in YYYY-MM-DD format (assumed to be EST)
 * @returns ISO string in UTC
 */
function convertESTToUTC(dateStr: string): string {
  // Parse date string (YYYY-MM-DD) and create date at midnight EST/EDT
  // Validate format first
  if (!dateStr || typeof dateStr !== 'string') {
    console.error('Invalid date string:', dateStr)
    throw new Error(`Invalid date string: ${dateStr}`)
  }
  
  const dateParts = dateStr.split('-')
  if (dateParts.length !== 3) {
    console.error('Invalid date format, expected YYYY-MM-DD:', dateStr)
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`)
  }
  
  const [year, month, day] = dateParts.map(Number)
  
  // Validate numeric values
  if (isNaN(year) || isNaN(month) || isNaN(day) || year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    console.error('Invalid date values:', { year, month, day, dateStr })
    throw new Error(`Invalid date values: ${dateStr}`)
  }
  
  const monthNum = month - 1 // JavaScript months are 0-indexed
  
  // Determine if date is in DST period (roughly March to November)
  // EST: UTC-5, EDT: UTC-4
  // For 2025: DST starts March 9, ends November 2
  let offsetHours = -5 // EST default
  if (monthNum >= 2 && monthNum <= 10) { // March (2) to November (10)
    // Check more precisely - DST starts 2nd Sunday in March, ends 1st Sunday in November
    const dateObj = new Date(year, monthNum, day)
    const marchSecondSunday = new Date(year, 2, 8) // March 8
    marchSecondSunday.setDate(marchSecondSunday.getDate() + (7 - marchSecondSunday.getDay()))
    const novFirstSunday = new Date(year, 10, 1) // November 1
    novFirstSunday.setDate(novFirstSunday.getDate() + (7 - novFirstSunday.getDay()))
    
    if (dateObj >= marchSecondSunday && dateObj < novFirstSunday) {
      offsetHours = -4 // EDT
    }
  }
  
  // Create date string with explicit offset (format: -05:00 or -04:00)
  const offsetStr = `${offsetHours >= 0 ? '+' : '-'}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`
  const dateWithOffset = `${dateStr}T00:00:00${offsetStr}`
  const estDate = new Date(dateWithOffset)
  return estDate.toISOString()
}

/**
 * Converts UTC timestamp to EST date string
 * @param utcTimestamp - UTC timestamp string
 * @returns Date string in YYYY-MM-DD format in EST
 */
function convertUTCToEST(utcTimestamp: string): string {
  const utcDate = new Date(utcTimestamp)
  // toZonedTime converts UTC to the given timezone
  const estDate = toZonedTime(utcDate, EST_TIMEZONE)
  // Format as YYYY-MM-DD
  const year = estDate.getFullYear()
  const month = String(estDate.getMonth() + 1).padStart(2, '0')
  const day = String(estDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parses date_string in format "MMM-DD-YYYY" to a comparable format
 * @param dateString - Date string in format "MMM-DD-YYYY" (e.g., "NOV-01-2025")
 * @returns Date object for comparison, or null if invalid
 */
function parseDateString(dateString: string): Date | null {
  if (!dateString) return null
  try {
    const MONTH_MAP: { [key: string]: number } = {
      'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
      'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
    }
    const parts = dateString.split('-')
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

/**
 * Fetches checklist environment temperature records with optional date filtering
 * @param startDate - Optional start date filter (YYYY-MM-DD format, assumed EST)
 * @param endDate - Optional end date filter (YYYY-MM-DD format, assumed EST)
 * @returns Array of checklist records
 * @throws Error if fetch fails
 */
export async function fetchChecklistEnvTempData(
  startDate?: string,
  endDate?: string
): Promise<any[]> {
  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('database/not-authenticated: User not authenticated')
    }

    let query = supabase
      .from('checklist_envtemp')
      .select('*')
      .order('date_utc', { ascending: false })

    // Note: We don't filter by date_string in the query because string comparison
    // doesn't work correctly across months (e.g., "DEC" < "NOV" alphabetically)
    // We'll filter after fetching the data

    const { data, error } = await query

    if (error) {
      console.error('Error fetching checklist_envtemp records:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        error
      })
      throw new Error(`database/fetch-failed: ${error.message}`)
    }

    // Convert date_utc to EST date_string for compatibility
    let processedData = (data || []).map((record: any) => {
      if (record.date_utc && !record.date_string) {
        record.date_string = convertUTCToEST(record.date_utc)
      }
      return record
    })

    // Filter by date_string (the date the user entered in the checklist)
    // date_string format: "MMM-DD-YYYY" (e.g., "NOV-01-2025")
    if (startDate || endDate) {
      const startDateString = startDate ? formatDateMMMDDYYYY(startDate) : null
      const endDateString = endDate ? formatDateMMMDDYYYY(endDate) : null
      
      // Parse filter dates for comparison
      const startDateObj = startDateString ? parseDateString(startDateString) : null
      const endDateObj = endDateString ? parseDateString(endDateString) : null
      
      processedData = processedData.filter((record: any) => {
        if (!record.date_string) return false
        
        const recordDateObj = parseDateString(record.date_string)
        if (!recordDateObj) return false
        
        // Compare dates
        if (startDateObj && recordDateObj < startDateObj) return false
        if (endDateObj && recordDateObj > endDateObj) return false
        
        return true
      })
    }

    // Debug logging
    if (startDate || endDate) {
      console.log('Query result:', {
        startDate,
        endDate,
        recordCount: processedData?.length || 0,
        hasData: (processedData?.length || 0) > 0
      })
    }

    return processedData
  } catch (error) {
    console.error('Error in fetchChecklistEnvTempData:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error)
    throw error
  }
}

