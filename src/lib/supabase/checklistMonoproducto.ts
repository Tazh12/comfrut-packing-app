import { supabase } from '@/lib/supabase'
import { formatDateMMMDDYYYY } from '@/lib/date-utils'

/**
 * Uploads a PDF file to Supabase Storage bucket 'checklistcalidad'
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

    console.log('Uploading PDF to checklistcalidad:', {
      filename,
      fileSize: file.size,
      fileType: file instanceof File ? file.type : 'blob'
    })

    // Upload file with upsert option to replace existing files
    const { data, error } = await supabase.storage
      .from('checklistcalidad')
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
      .from('checklistcalidad')
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
 * Interface for checklist monoproducto data
 */
export interface ChecklistMonoproductoData {
  date_string: string // Format: MMM-DD-YYYY
  date_utc?: string // ISO timestamp string (YYYY-MM-DDTHH:mm:ss.sssZ) - optional, will be calculated from date_string if not provided
  orden_fabricacion: string
  jefe_linea: string
  control_calidad: string
  cliente: string
  producto: string
  sku: string
  pallets: Array<{
    id: number
    hour: string
    values: Record<string, string>
  }>
  pdf_url: string | null
}

/**
 * Inserts a record into the checklist_calidad_monoproducto table
 * @param data - The checklist data to insert
 * @returns The inserted row data
 * @throws Error if insert fails
 */
export async function insertChecklistMonoproducto(
  data: ChecklistMonoproductoData
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

    // Convert date_string (MMM-DD-YYYY) to UTC timestamp if date_utc is not provided
    let dateUtc = data.date_utc
    if (!dateUtc && data.date_string) {
      try {
        // Parse MMM-DD-YYYY format
        const monthMap: Record<string, string> = {
          'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
          'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
        }
        const parts = data.date_string.split('-')
        if (parts.length === 3) {
          const [month, day, year] = parts
          const monthNum = monthMap[month.toUpperCase()] || '01'
          // Create date at midnight UTC
          const dateStr = `${year}-${monthNum}-${day.padStart(2, '0')}T00:00:00.000Z`
          dateUtc = new Date(dateStr).toISOString()
        }
      } catch (error) {
        console.error('Error converting date_string to date_utc:', error)
        // Fallback to current time if conversion fails
        dateUtc = new Date().toISOString()
      }
    }
    
    // If still no date_utc, use current time as fallback
    if (!dateUtc) {
      dateUtc = new Date().toISOString()
    }

    console.log('Inserting checklist_calidad_monoproducto record:', {
      date_string: data.date_string,
      date_utc: dateUtc,
      orden_fabricacion: data.orden_fabricacion,
      cliente: data.cliente,
      producto: data.producto,
      sku: data.sku,
      pallets_count: data.pallets?.length || 0,
      pdf_url: data.pdf_url
    })

    // Insert record - store pallets as JSONB
    const insertData: any = {
      date_string: data.date_string,
      date_utc: dateUtc,
      orden_fabricacion: data.orden_fabricacion,
      jefe_linea: data.jefe_linea,
      control_calidad: data.control_calidad,
      cliente: data.cliente,
      producto: data.producto,
      sku: data.sku,
      pallets: data.pallets.map(p => ({
        id: p.id,
        hour: p.hour,
        values: p.values
      })),
      pdf_url: data.pdf_url
    }

    const { data: insertedData, error } = await supabase
      .from('checklist_calidad_monoproducto')
      .insert([insertData])
      .select()

    if (error) {
      console.error('Error inserting checklist_calidad_monoproducto record:', {
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

    console.log('Checklist_calidad_monoproducto record inserted successfully:', insertedData[0])
    return insertedData[0]
  } catch (error) {
    console.error('Error in insertChecklistMonoproducto:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error)
    throw error
  }
}

/**
 * Fetches checklist monoproducto records with optional date filtering.
 * Filters by date_string (the date the user entered in the checklist).
 */
export async function fetchChecklistMonoproductoData(
  startDate?: string,
  endDate?: string
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('checklist_calidad_monoproducto')
      .select('id, date_string, date_utc, orden_fabricacion, jefe_linea, control_calidad, cliente, producto, sku, pallets, pdf_url')
      .order('date_utc', { ascending: false })

    if (error) {
      console.error('Error fetching checklist_calidad_monoproducto:', {
        message: error.message,
        code: error.code,
        error
      })
      throw new Error(`database/fetch-failed: ${error.message}`)
    }

    let processedData = (data || []).map((r: any) => ({
      ...r,
      // Ensure pallets is always an array
      pallets: Array.isArray(r?.pallets) ? r.pallets : []
    }))

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
    console.error('Error in fetchChecklistMonoproductoData:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error)
    throw error
  }
}

