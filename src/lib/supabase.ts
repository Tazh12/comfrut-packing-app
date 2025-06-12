import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { env, validateEnv } from '@/env'
import { type Database } from '@/types/supabase'

// Validar variables de entorno al inicializar
validateEnv()

// Crear cliente de Supabase con las variables validadas
export const supabase = createSupabaseClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

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
