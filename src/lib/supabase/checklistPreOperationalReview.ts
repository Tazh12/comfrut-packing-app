import { supabase } from '@/lib/supabase'
import { fromZonedTime } from 'date-fns-tz'

/**
 * Uploads a PDF file to Supabase Storage bucket 'checklist-pre-operational-review'
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

    console.log('Uploading PDF to checklist-pre-operational-review:', {
      filename,
      fileSize: file.size,
      fileType: file instanceof File ? file.type : 'blob'
    })

    // Upload file with upsert option to replace existing files
    const { data, error } = await supabase.storage
      .from('checklist-pre-operational-review')
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
      .from('checklist-pre-operational-review')
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
 * Interface for checklist pre-operational review data
 */
export interface ChecklistPreOperationalReviewData {
  date_string: string
  hour_string: string
  brand: string
  product: string
  monitor_name: string
  monitor_signature: string
  items: Array<{
    id: string
    name: string
    comply: boolean | null
    observation?: string
    correctiveAction?: string
    correctiveActionComply?: boolean | null
    correctiveActionObservation?: string
  }>
  pdf_url: string | null
}

/**
 * Inserts a record into the checklist_pre_operational_review table
 * @param data - The checklist data to insert
 * @returns The inserted row data
 * @throws Error if insert fails
 */
export async function insertChecklistPreOperationalReview(
  data: ChecklistPreOperationalReviewData
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

    console.log('Inserting checklist_pre_operational_review record:', {
      date_string: data.date_string,
      hour_string: data.hour_string,
      brand: data.brand,
      product: data.product,
      monitor_name: data.monitor_name,
      items_count: data.items?.length || 0,
      pdf_url: data.pdf_url
    })

    // Insert record
    const insertData: any = {
      date_string: data.date_string,
      hour_string: data.hour_string,
      brand: data.brand,
      product: data.product,
      monitor_name: data.monitor_name,
      monitor_signature: data.monitor_signature,
      items: data.items,
      pdf_url: data.pdf_url
    }

    const { data: insertedData, error } = await supabase
      .from('checklist_pre_operational_review')
      .insert([insertData])
      .select()

    if (error) {
      console.error('Error inserting checklist_pre_operational_review record:', {
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

    console.log('Checklist_pre_operational_review record inserted successfully:', insertedData[0])
    return insertedData[0]
  } catch (error) {
    console.error('Error in insertChecklistPreOperationalReview:', error instanceof Error ? {
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
 * Fetches checklist pre-operational review records with optional date filtering
 * @param startDate - Optional start date filter (YYYY-MM-DD format, assumed EST)
 * @param endDate - Optional end date filter (YYYY-MM-DD format, assumed EST)
 * @returns Array of checklist records
 * @throws Error if fetch fails
 */
export async function fetchChecklistPreOperationalReviewData(
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
      .from('checklist_pre_operational_review')
      .select('*')
      .order('date_utc', { ascending: false })

    // Apply date filters if provided - use date_utc for proper date comparison
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
      console.error('Error fetching checklist_pre_operational_review records:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        error
      })
      throw new Error(`database/fetch-failed: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchChecklistPreOperationalReviewData:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error)
    throw error
  }
}

