import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { format } from 'date-fns'
import fs from 'fs/promises'
import * as dotenv from 'dotenv'

// Configurar la ruta del archivo .env
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '..', '.env')

// Cargar variables de entorno
dotenv.config({ path: envPath })

// Validar variables de entorno requeridas
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
] as const

// Verificar que todas las variables requeridas estén definidas
console.log('\n=== Verificando variables de entorno ===')
for (const envVar of requiredEnvVars) {
  console.log(`${envVar}: ${process.env[envVar] ? '✅' : '❌'}`)
  if (!process.env[envVar]) {
    throw new Error(`Variable de entorno requerida no encontrada: ${envVar}`)
  }
}

// Crear cliente de Supabase con la service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Tipos
interface ChecklistItem {
  id: number
  nombre: string
  estado: 'cumple' | 'no_cumple'
}

interface ChecklistData {
  fecha: string
  jefe_linea: string
  operador_maquina: string
  marca: string
  material: string
  sku: string
  items: ChecklistItem[]
  pdf_url: string
}

async function testStorage() {
  try {
    console.log('\n=== Iniciando prueba de almacenamiento ===')
    console.log('URL de Supabase:', process.env.NEXT_PUBLIC_SUPABASE_URL)

    // 1. Crear un PDF de prueba
    const testPdfPath = join(__dirname, 'test.pdf')
    await fs.writeFile(testPdfPath, 'Test PDF content')
    const pdfBuffer = await fs.readFile(testPdfPath)
    
    // 2. Datos de prueba
    const fecha = format(new Date(), 'yyyy-MM-dd')
    const fileName = `${fecha}-test-${Date.now()}.pdf`
    
    console.log('\n=== Subiendo PDF ===')
    console.log('Nombre del archivo:', fileName)
    
    // Subir directamente a Supabase Storage
    const { data, error } = await supabase.storage
      .from('checklistpacking')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      })

    if (error) {
      throw new Error(`Error al subir PDF: ${error.message}`)
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('checklistpacking')
      .getPublicUrl(fileName)

    if (!urlData?.publicUrl) {
      throw new Error('No se pudo obtener la URL pública')
    }

    const pdfUrl = urlData.publicUrl
    console.log('PDF subido exitosamente')
    console.log('URL pública:', pdfUrl)

    // 3. Crear registro de prueba
    const checklistData: ChecklistData = {
      fecha,
      jefe_linea: 'Test Manager',
      operador_maquina: 'Test Operator',
      marca: 'Test Brand',
      material: 'Material Test',
      sku: 'TEST-123',
      items: [
        { id: 1, nombre: 'Test Item 1', estado: 'cumple' },
        { id: 2, nombre: 'Test Item 2', estado: 'no_cumple' }
      ],
      pdf_url: pdfUrl
    }

    console.log('\n=== Guardando registro en la base de datos ===')
    console.log('Datos a insertar:', JSON.stringify(checklistData, null, 2))
    
    const { error: dbInsertError } = await supabase
      .from('checklist_packing')
      .insert([checklistData])

    if (dbInsertError) {
      throw new Error(`Error al insertar en la base de datos: ${dbInsertError.message}`)
    }

    console.log('Registro guardado exitosamente')

    // Limpiar archivo temporal
    await fs.unlink(testPdfPath)
    console.log('\n=== Prueba completada exitosamente ===')

  } catch (error) {
    console.error('\n❌ Error durante la prueba:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// Ejecutar prueba
testStorage() 