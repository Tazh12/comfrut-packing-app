import { createClient } from './supabase-config'
import { checkStorageBucket } from './supabase'
import { v4 as uuidv4 } from 'uuid'

// Tipos
export interface ChecklistItem {
  id: number
  nombre: string
  estado: 'cumple' | 'no_cumple'
}

export interface ChecklistData {
  fecha: string
  jefe_linea: string
  operador_maquina: string
  marca: string
  material: string
  sku: string
  orden_fabricacion: string
  items: ChecklistItem[]
  pdf_url: string
}

// Función para validar detalladamente los datos del checklist
const validateChecklistData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  // Validar que el objeto existe
  if (!data) {
    return { isValid: false, errors: ['No se recibieron datos'] }
  }

  // Validar campos de texto requeridos
  const requiredFields = {
    fecha: 'Fecha',
    jefe_linea: 'Jefe de línea',
    operador_maquina: 'Operador de máquina',
    marca: 'Marca',
    material: 'Material',
    sku: 'SKU',
    orden_fabricacion: 'Orden de Fabricación',
    pdf_url: 'URL del PDF'
  }

  Object.entries(requiredFields).forEach(([field, label]) => {
    if (!data[field]) {
      errors.push(`El campo ${label} es requerido`)
    }
  })

  // Validar formato de fecha (YYYY-MM-DD)
  if (data.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(data.fecha)) {
    errors.push('El formato de fecha debe ser YYYY-MM-DD')
  }

  // Validar items
  if (!Array.isArray(data.items)) {
    errors.push('Los items deben ser un array')
  } else {
    if (data.items.length !== 25) {
      errors.push(`Se esperan 25 items, se recibieron ${data.items.length}`)
    }

    data.items.forEach((item: any, index: number) => {
      if (!item.id) {
        errors.push(`Item ${index + 1}: Falta el ID`)
      }
      if (!item.nombre) {
        errors.push(`Item ${index + 1}: Falta el nombre`)
      }
      if (!['cumple', 'no_cumple'].includes(item.estado)) {
        errors.push(`Item ${index + 1}: Estado inválido '${item.estado}'`)
      }
    })
  }

  // Validar URL del PDF
  if (data.pdf_url && !data.pdf_url.startsWith('https://')) {
    errors.push('La URL del PDF debe ser una URL HTTPS válida')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Función para normalizar el nombre del material (reemplazar espacios y caracteres especiales)
export const normalizeMaterial = (material: string): string => {
  return material
    .replace(/[^a-zA-Z0-9]/g, '_') // Reemplazar caracteres especiales con _
    .replace(/_+/g, '_')           // Reemplazar múltiples _ con uno solo
    .replace(/^_|_$/g, '')         // Remover _ del inicio y final
}

// Función para subir el PDF al storage
export const uploadPDF = async (pdfBlob: Blob, fecha: string, material: string): Promise<string> => {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    console.error('Usuario no autenticado. Abortando subida.')
    throw new Error('storage/not-authenticated: Usuario no autenticado')
  }
  try {
    if (!pdfBlob) {
      throw new Error('PDF blob is null or undefined')
    }

    const normalizedMaterial = normalizeMaterial(material)
    const uuid = uuidv4()
    const fileName = `${fecha}-${normalizedMaterial}-${uuid}.pdf`

    console.log('Intentando subir PDF:', {
      fileName,
      blobSize: pdfBlob.size,
      blobType: pdfBlob.type
    })

    const { data, error } = await supabase.storage
      .from('checklistpacking')
      .upload(fileName, pdfBlob, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      })

    if (error) {
      console.error('Error detallado de Supabase al subir PDF:', {
        error: {
          message: error.message,
          name: error.name
        },
        fileName,
        material,
        fecha
      })
      throw new Error(`storage/upload-failed: ${error.message}`)
    }

    if (!data) {
      console.error('No se recibieron datos de la subida del archivo')
      throw new Error('storage/upload-no-data')
    }

    console.log('PDF subido exitosamente:', { fileName, data })

    // Obtener la URL pública del archivo
    const { data: urlData } = supabase.storage
      .from('checklistpacking')
      .getPublicUrl(fileName)

    if (!urlData?.publicUrl) {
      console.error('No se pudo obtener la URL pública del archivo')
      throw new Error('storage/public-url-not-available')
    }

    console.log('URL pública obtenida:', urlData.publicUrl)
    return urlData.publicUrl
  } catch (error) {
    console.error('Error detallado al subir el PDF:', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : error,
      fecha,
      material
    })
    throw error
  }
}

// Función para guardar el registro en la base de datos
export const saveChecklistRecord = async (checklistData: ChecklistData): Promise<void> => {
  try {
    // Crear una nueva instancia del cliente para esta operación
    const supabase = createClient()

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      console.error('Usuario no autenticado. Abortando guardado.')
      throw new Error('database/not-authenticated: Usuario no autenticado')
    }

    // Log inicial detallado de los datos que vamos a guardar
    console.log('Datos a guardar (detallado):', {
      fecha: checklistData.fecha,
      jefe_linea: checklistData.jefe_linea,
      operador_maquina: checklistData.operador_maquina,
      marca: checklistData.marca,
      material: checklistData.material,
      sku: checklistData.sku,
      orden_fabricacion: checklistData.orden_fabricacion,
      items_count: checklistData.items?.length || 0,
      items: checklistData.items,
      pdf_url: checklistData.pdf_url,
      datos_completos: JSON.stringify(checklistData, null, 2)
    })

    // Validación inicial de datos nulos o vacíos
    if (!checklistData || Object.keys(checklistData).length === 0) {
      console.error('Error: Datos vacíos o undefined', { checklistData })
      throw new Error('database/empty-data: Los datos están vacíos o son undefined')
    }

    // Validación detallada de los datos
    const validation = validateChecklistData(checklistData)
    if (!validation.isValid) {
      console.error('Error de validación:', validation.errors)
      throw new Error(`database/validation-failed: ${validation.errors.join(', ')}`)
    }

    // Intentar insertar el registro
    const { error } = await supabase
      .from('checklist_packing')
      .insert([{
        fecha: checklistData.fecha,
        jefe_linea: checklistData.jefe_linea,
        operador_maquina: checklistData.operador_maquina,
        marca: checklistData.marca,
        material: checklistData.material,
        sku: checklistData.sku,
        orden_fabricacion: checklistData.orden_fabricacion,
        items: checklistData.items,
        pdf_url: checklistData.pdf_url
      }])

    if (error) {
      console.error('Error completo de Supabase (raw):', JSON.stringify(error, null, 2))
      throw new Error(`database/insert-failed: ${error.message}`)
    }

    console.log('Registro guardado exitosamente')
  } catch (error) {
    console.error('Error al guardar el registro:', error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: error.stack
    } : error)
    throw error
  }
} 