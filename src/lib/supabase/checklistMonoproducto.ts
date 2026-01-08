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

    console.log('Inserting checklist_calidad_monoproducto record:', {
      date_string: data.date_string,
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

