import { supabase } from '@/lib/supabase'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

/**
 * Uploads a PDF file to Supabase Storage bucket 'checklist-metal-detector'
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

    console.log('Uploading PDF to checklist-metal-detector:', {
      filename,
      fileSize: file.size,
      fileType: file instanceof File ? file.type : 'blob'
    })

    // Upload file with upsert option to replace existing files
    const { data, error } = await supabase.storage
      .from('checklist-metal-detector')
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
      .from('checklist-metal-detector')
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
 * Interface for checklist metal detector data
 */
export interface ChecklistMetalDetectorData {
  date_string: string
  process_line: string
  metal_detector_id: string
  metal_detector_start_time: string
  metal_detector_finish_time: string
  orden: string
  brand: string
  product: string
  monitor_name: string
  monitor_signature: string
  readings: Array<{
    hour: string
    bf: string
    bnf: string
    bss: string
    sensitivity: string
    noiseAlarm: string
    rejectingArm: string
    observation: string
    correctiveActions: string
  }>
  pdf_url: string | null
}

/**
 * Inserts a record into the checklist_metal_detector table
 * @param data - The checklist data to insert
 * @returns The inserted row data
 * @throws Error if insert fails
 */
export async function insertChecklistMetalDetector(
  data: ChecklistMetalDetectorData
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

    console.log('Inserting checklist_metal_detector record:', {
      date_string: data.date_string,
      process_line: data.process_line,
      metal_detector_id: data.metal_detector_id,
      orden: data.orden,
      brand: data.brand,
      product: data.product,
      monitor_name: data.monitor_name,
      readings_count: data.readings?.length || 0,
      pdf_url: data.pdf_url
    })

    // Insert record
    const insertData: any = {
      date_string: data.date_string,
      process_line: data.process_line,
      metal_detector_id: data.metal_detector_id,
      metal_detector_start_time: data.metal_detector_start_time,
      metal_detector_finish_time: data.metal_detector_finish_time,
      orden: data.orden,
      brand: data.brand,
      product: data.product,
      monitor_name: data.monitor_name,
      monitor_signature: data.monitor_signature,
      readings: data.readings,
      pdf_url: data.pdf_url
    }

    const { data: insertedData, error } = await supabase
      .from('checklist_metal_detector')
      .insert([insertData])
      .select()

    if (error) {
      console.error('Error inserting checklist_metal_detector record:', {
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

    console.log('Checklist_metal_detector record inserted successfully:', insertedData[0])
    return insertedData[0]
  } catch (error) {
    console.error('Error in insertChecklistMetalDetector:', error instanceof Error ? {
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
  // Create date at midnight EST/EDT (handles DST automatically)
  // fromZonedTime treats the date as if it's in the given timezone and returns UTC
  const estDate = new Date(`${dateStr}T00:00:00`)
  const utcDate = fromZonedTime(estDate, EST_TIMEZONE)
  return utcDate.toISOString()
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
 * Fetches checklist metal detector records with optional date filtering
 * @param startDate - Optional start date filter (YYYY-MM-DD format, assumed EST)
 * @param endDate - Optional end date filter (YYYY-MM-DD format, assumed EST)
 * @returns Array of checklist records
 * @throws Error if fetch fails
 */
export async function fetchChecklistMetalDetectorData(
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
      .from('checklist_metal_detector')
      .select('*')
      .order('date_utc', { ascending: false })

    // Apply date filters if provided
    // Convert EST dates to UTC for querying
    if (startDate) {
      const startUTC = convertESTToUTC(startDate)
      query = query.gte('date_utc', startUTC)
    }
    if (endDate) {
      // Add one day to include the end date, then convert to UTC
      const endDateObj = new Date(`${endDate}T00:00:00`)
      endDateObj.setDate(endDateObj.getDate() + 1)
      const endUTC = fromZonedTime(endDateObj, EST_TIMEZONE)
      query = query.lt('date_utc', endUTC.toISOString())
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching checklist_metal_detector records:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        error
      })
      throw new Error(`database/fetch-failed: ${error.message}`)
    }

    // Convert date_utc to EST date_string for compatibility
    const processedData = (data || []).map((record: any) => {
      if (record.date_utc && !record.date_string) {
        record.date_string = convertUTCToEST(record.date_utc)
      }
      return record
    })

    return processedData
  } catch (error) {
    console.error('Error in fetchChecklistMetalDetectorData:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error)
    throw error
  }
}

