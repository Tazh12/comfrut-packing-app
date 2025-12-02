import { supabase } from '@/lib/supabase'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

/**
 * Gets the next available number for PDF filename based on existing files for the same date
 * @param datePrefix - The date prefix (e.g., "2025-NOVEMBER-17")
 * @returns The next available number (e.g., "01", "02", etc.)
 */
export async function getNextPdfNumber(datePrefix: string): Promise<string> {
  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('storage/not-authenticated: User not authenticated')
    }

    // List all files in the bucket
    const { data: files, error } = await supabase.storage
      .from('checklist-materials-control')
      .list('', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (error) {
      console.error('Error listing files:', error)
      // If we can't list files, default to "01"
      return '01'
    }

    if (!files || files.length === 0) {
      return '01'
    }

    // Filter files that match the date prefix pattern
    // Pattern: YYYY-MONTHNAME-DD-Internal-Control-Materials-NN.pdf
    const pattern = new RegExp(`^${datePrefix}-Internal-Control-Materials-(\\d+)\\.pdf$`)
    
    const matchingFiles = files
      .filter(file => pattern.test(file.name))
      .map(file => {
        const match = file.name.match(pattern)
        return match ? parseInt(match[1], 10) : 0
      })
      .filter(num => num > 0)
      .sort((a, b) => b - a) // Sort descending

    if (matchingFiles.length === 0) {
      return '01'
    }

    // Get the highest number and increment
    const nextNumber = matchingFiles[0] + 1
    return nextNumber.toString().padStart(2, '0')
  } catch (error) {
    console.error('Error getting next PDF number:', error)
    // Default to "01" on error
    return '01'
  }
}

/**
 * Uploads a PDF file to Supabase Storage bucket 'checklist-materials-control'
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

    console.log('Uploading PDF to checklist-materials-control:', {
      filename,
      fileSize: file.size,
      fileType: file instanceof File ? file.type : 'blob'
    })

    // Upload file with upsert option to replace existing files
    const { data, error } = await supabase.storage
      .from('checklist-materials-control')
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

    // Get public URL (bucket is now public)
    const { data: urlData } = supabase.storage
      .from('checklist-materials-control')
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
 * Interface for checklist materials control data
 */
export interface ChecklistMaterialsControlData {
  date_string: string
  productive_area: string
  line_manager_name: string
  monitor_name: string
  monitor_signature: string
  personnel_materials: Array<{
    personName: string
    material: string
    quantity: number
    materialStatus: string
    observation: string
    returnMotive: string
    quantityReceived: number
    materialStatusReceived: string
    observationReceived: string
  }>
  pdf_url: string | null
}

/**
 * Inserts a record into the checklist_materials_control table
 * @param data - The checklist data to insert
 * @returns The inserted row data
 * @throws Error if insert fails
 */
export async function insertChecklistMaterialsControl(
  data: ChecklistMaterialsControlData
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

    console.log('Inserting checklist_materials_control record:', {
      date_string: data.date_string,
      productive_area: data.productive_area,
      line_manager_name: data.line_manager_name,
      monitor_name: data.monitor_name,
      personnel_materials_count: data.personnel_materials?.length || 0,
      pdf_url: data.pdf_url
    })

    // Insert record
    const insertData: any = {
      date_string: data.date_string,
      productive_area: data.productive_area,
      line_manager_name: data.line_manager_name,
      monitor_name: data.monitor_name,
      monitor_signature: data.monitor_signature,
      personnel_materials: data.personnel_materials,
      pdf_url: data.pdf_url
    }

    const { data: insertedData, error } = await supabase
      .from('checklist_materials_control')
      .insert([insertData])
      .select()

    if (error) {
      console.error('Error inserting checklist_materials_control record:', {
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

    console.log('Checklist_materials_control record inserted successfully:', insertedData[0])
    return insertedData[0]
  } catch (error) {
    console.error('Error in insertChecklistMaterialsControl:', error instanceof Error ? {
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
  const estDate = toZonedTime(utcDate, EST_TIMEZONE)
  const year = estDate.getFullYear()
  const month = String(estDate.getMonth() + 1).padStart(2, '0')
  const day = String(estDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Fetches checklist materials control records with optional date filtering
 * @param startDate - Optional start date filter (YYYY-MM-DD format, assumed EST)
 * @param endDate - Optional end date filter (YYYY-MM-DD format, assumed EST)
 * @returns Array of checklist records
 * @throws Error if fetch fails
 */
export async function fetchChecklistMaterialsControlData(
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
      .from('checklist_materials_control')
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
      console.error('Error fetching checklist_materials_control records:', {
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
    console.error('Error in fetchChecklistMaterialsControlData:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error)
    throw error
  }
}

