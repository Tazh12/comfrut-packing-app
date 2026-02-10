import { supabase } from '@/lib/supabase'
import { formatDateMMMDDYYYY } from '@/lib/date-utils'

/**
 * Uploads a PDF file to Supabase Storage bucket 'checklist-raw-material-quality'
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

    console.log('Uploading PDF to checklist-raw-material-quality:', {
      filename,
      fileSize: file.size,
      fileType: file instanceof File ? file.type : 'blob'
    })

    // Upload file with upsert option to replace existing files
    const { data, error } = await supabase.storage
      .from('checklist-raw-material-quality')
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
      .from('checklist-raw-material-quality')
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
 * Interface for checklist raw material quality data
 */
export interface ChecklistRawMaterialQualityData {
  supplier: string
  fruit: string
  sku?: string | null
  format_presentation?: string | null
  origin_country: string
  reception_date_time: string // ISO string
  container_number?: string | null
  po_number?: string | null
  lot_number?: string | null
  monitor_name: string
  monitor_signature: string
  processing_plant: string
  inspection_date_time: string // ISO string
  cold_storage_receiving_temperature?: number | null
  ttr?: string | null
  micro_pesticide_sample_taken: string // Y or N
  box_samples: Array<{
    id: number
    boxNumber: string
    values: Record<string, string>
  }>
  // Section 3: Organoleptico
  section3_color?: string
  section3_olor?: string
  section3_sabor?: string
  section3_textura?: string
  section3_packing_condition?: string
  section3_raw_material_approved?: string
  section3_results?: string | null
  // Verification (filled by QA Practitioner later)
  checker_name?: string | null
  checker_signature?: string | null
  checker_date?: string | null
  pdf_url: string | null
  date_string: string
}

/**
 * Inserts a record into the checklist_raw_material_quality table
 * @param data - The checklist data to insert
 * @returns The inserted row data
 * @throws Error if insert fails
 */
export async function insertChecklistRawMaterialQuality(
  data: ChecklistRawMaterialQualityData
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

    console.log('Inserting checklist_raw_material_quality record:', {
      supplier: data.supplier,
      fruit: data.fruit,
      monitor_name: data.monitor_name,
      box_samples_count: data.box_samples?.length || 0,
      pdf_url: data.pdf_url
    })

    // Insert record
    const insertData: any = {
      supplier: data.supplier,
      fruit: data.fruit,
      sku: data.sku || null,
      format_presentation: data.format_presentation || null,
      origin_country: data.origin_country,
      reception_date_time: data.reception_date_time,
      container_number: data.container_number || null,
      po_number: data.po_number || null,
      lot_number: data.lot_number || null,
      monitor_name: data.monitor_name,
      monitor_signature: data.monitor_signature,
      processing_plant: data.processing_plant,
      inspection_date_time: data.inspection_date_time,
      cold_storage_receiving_temperature: data.cold_storage_receiving_temperature || null,
      ttr: data.ttr || null,
      micro_pesticide_sample_taken: data.micro_pesticide_sample_taken,
      box_samples: data.box_samples,
      section3_color: data.section3_color ?? '',
      section3_olor: data.section3_olor ?? '',
      section3_sabor: data.section3_sabor ?? '',
      section3_textura: data.section3_textura ?? '',
      section3_packing_condition: data.section3_packing_condition ?? 'Good',
      section3_raw_material_approved: data.section3_raw_material_approved ?? 'No',
      section3_results: data.section3_results ?? null,
      checker_name: data.checker_name ?? null,
      checker_signature: data.checker_signature ?? null,
      checker_date: data.checker_date ?? null,
      pdf_url: data.pdf_url,
      date_string: data.date_string
    }

    const { data: insertedData, error } = await supabase
      .from('checklist_raw_material_quality')
      .insert([insertData])
      .select()

    if (error) {
      console.error('Error inserting checklist_raw_material_quality record:', {
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

    console.log('Checklist_raw_material_quality record inserted successfully:', insertedData[0])
    return insertedData[0]
  } catch (error) {
    console.error('Error in insertChecklistRawMaterialQuality:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error)
    throw error
  }
}

/**
 * Fetches checklist raw material quality records with optional date filtering
 * @param startDate - Optional start date filter (YYYY-MM-DD format)
 * @param endDate - Optional end date filter (YYYY-MM-DD format)
 * @returns Array of checklist records
 * @throws Error if fetch fails
 */
export async function fetchChecklistRawMaterialQualityData(
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
      .from('checklist_raw_material_quality')
      .select('*')
      .order('date_utc', { ascending: false })

    // Note: We filter by date_string in memory because string comparison doesn't work
    // correctly across months (e.g., "DEC" < "NOV" alphabetically)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching checklist_raw_material_quality records:', {
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
    console.error('Error in fetchChecklistRawMaterialQualityData:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error)
    throw error
  }
}

