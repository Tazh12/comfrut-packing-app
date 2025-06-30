import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { env, validateEnv } from '@/env'
import { type Database } from '@/types/supabase'

// Validar variables de entorno al inicializar
validateEnv()

// Crear una única instancia del cliente Supabase para componentes de cliente
export const supabase = createClientComponentClient<Database>()

// Función para verificar el bucket de almacenamiento
export const checkStorageBucket = async () => {
  try {
    console.log('Verificando bucket de almacenamiento...')
    console.log('URL de Supabase:', env.NEXT_PUBLIC_SUPABASE_URL)
    
    // Verificar si el bucket existe
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets()

    if (bucketsError) {
      const errorDetails = {
        message: bucketsError.message,
        name: bucketsError.name
      }
      console.error('Error detallado al listar buckets:', JSON.stringify(errorDetails, null, 2))
      throw bucketsError
    }

    if (!buckets) {
      console.error('No se recibieron datos de buckets de Supabase')
      throw new Error('No bucket data received')
    }

    console.log('Buckets encontrados:', buckets.map(b => b.name))

    const checklistBucket = buckets.find(b => b.name === 'checklistpacking')
    if (!checklistBucket) {
      console.error('El bucket checklistpacking no existe. Buckets disponibles:', buckets.map(b => b.name))
      throw new Error('Storage bucket not found')
    }

    console.log('Bucket encontrado:', checklistBucket)

    // Verificar permisos intentando listar archivos
    const { data: files, error: filesError } = await supabase
      .storage
      .from('checklistpacking')
      .list()

    if (filesError) {
      const errorDetails = {
        message: filesError.message,
        name: filesError.name
      }
      console.error('Error detallado al listar archivos:', JSON.stringify(errorDetails, null, 2))
      throw filesError
    }

    console.log('Bucket verificado correctamente. Archivos encontrados:', files?.length || 0)
    return true
  } catch (error) {
    console.error('Error completo al verificar bucket:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error)
    return false
  }
}

export async function uploadPDF(pdfBlob: Blob): Promise<string> {
  const fileName = `checklist_${Date.now()}.pdf`
  const { data, error } = await supabase.storage
    .from('checklists')
    .upload(fileName, pdfBlob, {
      contentType: 'application/pdf',
      cacheControl: '3600'
    })

  if (error) {
    console.error('Error uploading PDF:', error)
    throw new Error('Error uploading PDF')
  }

  const { data: { publicUrl } } = supabase.storage
    .from('checklists')
    .getPublicUrl(fileName)

  return publicUrl
}

export async function saveChecklistRecord({
  items,
  lineManager,
  machineOperator,
  checklistDate,
  product,
  pdfUrl
}: {
  items: any[]
  lineManager: string
  machineOperator: string
  checklistDate: string
  product: any
  pdfUrl: string
}) {
  const { data, error } = await supabase
    .from('checklist_packing')
    .insert([
      {
        items,
        line_manager: lineManager,
        machine_operator: machineOperator,
        checklist_date: checklistDate,
        product_id: product.id,
        product_sku: product.sku,
        pdf_url: pdfUrl,
        created_at: new Date().toISOString()
      }
    ])

  if (error) {
    console.error('Error saving checklist record:', error)
    throw new Error('Error saving checklist record')
  }

  return data
}
