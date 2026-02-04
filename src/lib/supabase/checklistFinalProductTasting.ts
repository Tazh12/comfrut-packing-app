import { supabase } from '@/lib/supabase'
import { formatDateMMMDDYYYY } from '@/lib/date-utils'

/**
 * Uploads a PDF file to Supabase Storage bucket 'checklist-final-product-tasting'
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

    console.log('Uploading PDF to checklist-final-product-tasting:', {
      filename,
      fileSize: file.size,
      fileType: file instanceof File ? file.type : 'blob'
    })

    // Upload file with upsert option to replace existing files
    const { data, error } = await supabase.storage
      .from('checklist-final-product-tasting')
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
      .from('checklist-final-product-tasting')
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
 * Interface for checklist final product tasting data
 */
export interface ChecklistFinalProductTastingData {
  turno: string
  monitor: string
  formato: string
  bar_code: string
  best_before: string
  brix: string
  ph: string
  date: string // ISO date string (YYYY-MM-DD)
  product: string
  client: string
  process_date: string // ISO date string (YYYY-MM-DD)
  batch: string
  variety: string
  participants: Array<{
    id: number
    name: string
    appearance: string
    color: string
    smell: string
    texture: string
    taste: string
  }>
  mean_appearance: number
  mean_color: number
  mean_smell: number
  mean_texture: number
  mean_taste: number
  final_grade: number
  comments?: string | null
  result: 'approved' | 'rejected' | 'hold'
  analyst_name: string
  analyst_signature: string
  checker_name?: string | null
  checker_signature?: string | null
  checker_date?: string | null
  pdf_url: string | null
  date_string: string
}

/**
 * Inserts a record into the checklist_final_product_tasting table
 * @param data - The checklist data to insert
 * @returns The inserted row data
 * @throws Error if insert fails
 */
export async function insertChecklistFinalProductTasting(
  data: ChecklistFinalProductTastingData
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

    console.log('Inserting checklist_final_product_tasting record:', {
      product: data.product,
      client: data.client,
      monitor: data.monitor,
      participants_count: data.participants?.length || 0,
      final_grade: data.final_grade,
      pdf_url: data.pdf_url
    })

    // Insert record
    const insertData: any = {
      turno: data.turno,
      monitor: data.monitor,
      formato: data.formato,
      bar_code: data.bar_code,
      best_before: data.best_before,
      brix: parseFloat(data.brix) || null,
      ph: parseFloat(data.ph) || null,
      date: data.date,
      product: data.product,
      client: data.client,
      process_date: data.process_date,
      batch: data.batch,
      variety: data.variety,
      participants: data.participants || [],
      mean_appearance: data.mean_appearance || null,
      mean_color: data.mean_color || null,
      mean_smell: data.mean_smell || null,
      mean_texture: data.mean_texture || null,
      mean_taste: data.mean_taste || null,
      final_grade: data.final_grade || null,
      comments: data.comments || null,
      result: data.result,
      analyst_name: data.analyst_name,
      analyst_signature: data.analyst_signature,
      checker_name: data.checker_name || null,
      checker_signature: data.checker_signature || null,
      checker_date: data.checker_date || null,
      pdf_url: data.pdf_url,
      date_string: data.date_string
    }

    const { data: insertedData, error } = await supabase
      .from('checklist_final_product_tasting')
      .insert([insertData])
      .select()

    if (error) {
      console.error('Error inserting checklist_final_product_tasting record:', {
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

    console.log('Checklist_final_product_tasting record inserted successfully:', insertedData[0])
    return insertedData[0]
  } catch (error) {
    console.error('Error in insertChecklistFinalProductTasting:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error)
    throw error
  }
}

/**
 * Fetches checklist final product tasting records with optional date filtering
 * @param startDate - Optional start date filter (YYYY-MM-DD format)
 * @param endDate - Optional end date filter (YYYY-MM-DD format)
 * @returns Array of checklist records
 * @throws Error if fetch fails
 */
export async function fetchChecklistFinalProductTastingData(
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
      .from('checklist_final_product_tasting')
      .select('*')
      .order('date_utc', { ascending: false })

    // Note: We filter by date_string in memory because string comparison doesn't work
    // correctly across months (e.g., "DEC" < "NOV" alphabetically)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching checklist_final_product_tasting records:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        error
      })
      throw new Error(`database/fetch-failed: ${error.message}`)
    }

    let processedData = data || []

    // Filter by date_string (the date the user entered in the checklist)
    if (startDate || endDate) {
      const startDateString = startDate ? formatDateMMMDDYYYY(startDate) : null
      const endDateString = endDate ? formatDateMMMDDYYYY(endDate) : null
      
      const MONTH_MAP: { [key: string]: number } = {
        'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
        'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
      }
      const parseDateString = (dateStr: string): Date | null => {
        if (!dateStr) return null
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
      
      const startDateObj = startDateString ? parseDateString(startDateString) : null
      const endDateObj = endDateString ? parseDateString(endDateString) : null
      
      processedData = processedData.filter((record: any) => {
        if (!record.date_string) return false
        const recordDateObj = parseDateString(record.date_string)
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
    }

    return processedData
  } catch (error) {
    console.error('Error in fetchChecklistFinalProductTastingData:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error)
    throw error
  }
}
