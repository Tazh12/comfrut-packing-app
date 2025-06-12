import { supabase } from '../supabase'

export async function createStorageBucket() {
  try {
    // 1. Verificar si el bucket existe
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(bucket => bucket.name === 'checklistpacking')

    if (!bucketExists) {
      // 2. Crear el bucket si no existe
      const { data, error } = await supabase.storage.createBucket('checklistpacking', {
        public: true, // Hacer el bucket público
        fileSizeLimit: 5242880, // 5MB en bytes
        allowedMimeTypes: ['application/pdf']
      })

      if (error) {
        throw error
      }

      console.log('Bucket checklistpacking creado exitosamente')
    } else {
      console.log('El bucket checklistpacking ya existe')
    }

    // 3. Verificar que la tabla existe
    const { error: tableError } = await supabase
      .from('checklist_packing')
      .select('id')
      .limit(1)

    if (tableError) {
      // Si la tabla no existe, crearla
      const { error: createError } = await supabase.rpc('create_checklist_packing_table')
      if (createError) {
        throw createError
      }
      console.log('Tabla checklist_packing creada exitosamente')
    } else {
      console.log('La tabla checklist_packing ya existe')
    }

  } catch (error) {
    console.error('Error al configurar el almacenamiento:', error)
    throw error
  }
} 