import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { formatDateMMMDDYYYY } from '@/lib/date-utils'

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
      .from('checklist-weighing-sealing')
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
    // Pattern: YYYY-MONTHNAME-DD-Check-Weighing-Sealing-NN.pdf
    const pattern = new RegExp(`^${datePrefix}-Check-Weighing-Sealing-(\\d+)\\.pdf$`)
    
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
 * Uploads a PDF file to Supabase Storage bucket 'checklist-weighing-sealing'
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

    console.log('Uploading PDF to checklist-weighing-sealing:', {
      filename,
      fileSize: file.size,
      fileType: file instanceof File ? file.type : 'blob'
    })

    // Upload file with upsert option to replace existing files
    const { data, error } = await supabase.storage
      .from('checklist-weighing-sealing')
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
      .from('checklist-weighing-sealing')
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
 * Interface for checklist weighing sealing data
 */
export interface ChecklistWeighingSealingData {
  date_string: string
  shift: string
  process_room: string
  brand: string
  product: string
  monitor_name: string
  monitor_signature: string
  bag_entries: Array<{
    id: number
    time: string
    bagCode: string
    weights: string[]
    sealed: string[]
    otherCodification: string
    declarationOfOrigin: string
  }>
  comments?: string | null
  pdf_url: string | null
}

/**
 * Inserts a record into the checklist_weighing_sealing table
 * @param data - The checklist data to insert
 * @returns The inserted row data
 * @throws Error if insert fails
 */
export async function insertChecklistWeighingSealing(
  data: ChecklistWeighingSealingData
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

    console.log('Inserting checklist_weighing_sealing record:', {
      date_string: data.date_string,
      shift: data.shift,
      process_room: data.process_room,
      brand: data.brand,
      product: data.product,
      monitor_name: data.monitor_name,
      bag_entries_count: data.bag_entries?.length || 0,
      pdf_url: data.pdf_url
    })

    // Insert record
    const insertData: any = {
      date_string: data.date_string,
      shift: data.shift,
      process_room: data.process_room,
      brand: data.brand,
      product: data.product,
      monitor_name: data.monitor_name,
      monitor_signature: data.monitor_signature,
      bag_entries: data.bag_entries,
      comments: data.comments || null,
      pdf_url: data.pdf_url
    }

    const { data: insertedData, error } = await supabase
      .from('checklist_weighing_sealing')
      .insert([insertData])
      .select()

    if (error) {
      console.error('Error inserting checklist_weighing_sealing record:', {
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

    console.log('Checklist_weighing_sealing record inserted successfully:', insertedData[0])
    return insertedData[0]
  } catch (error) {
    console.error('Error in insertChecklistWeighingSealing:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error)
    throw error
  }
}

/**
 * Fetches checklist weighing sealing records with optional date filtering
 * @param startDate - Optional start date filter (YYYY-MM-DD format)
 * @param endDate - Optional end date filter (YYYY-MM-DD format)
 * @returns Array of checklist records
 * @throws Error if fetch fails
 */
export async function fetchChecklistWeighingSealingData(
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
      .from('checklist_weighing_sealing')
      .select('*')
      .order('date_utc', { ascending: false })

    // Note: We filter by date_string in memory because string comparison doesn't work
    // correctly across months (e.g., "DEC" < "NOV" alphabetically)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching checklist_weighing_sealing records:', {
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
    console.error('Error in fetchChecklistWeighingSealingData:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error)
    throw error
  }
}

