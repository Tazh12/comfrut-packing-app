import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
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
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function setupStorage() {
  try {
    console.log('Configurando almacenamiento en Supabase...')

    // 1. Crear el bucket si no existe
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets()

    if (bucketsError) {
      throw new Error(`Error al listar buckets: ${bucketsError.message}`)
    }

    const checklistBucket = buckets.find(b => b.name === 'checklistpacking')
    
    if (!checklistBucket) {
      console.log('Creando bucket checklistpacking...')
      const { error: createError } = await supabase
        .storage
        .createBucket('checklistpacking', {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ['application/pdf']
        })

      if (createError) {
        throw new Error(`Error al crear bucket: ${createError.message}`)
      }
      console.log('Bucket creado exitosamente')
    } else {
      console.log('El bucket checklistpacking ya existe')
    }

    // 2. Configurar políticas de acceso público
    const { error: policyError } = await supabase
      .storage
      .from('checklistpacking')
      .createSignedUrl('test.txt', 60)

    if (policyError) {
      console.log('Configurando políticas de acceso público...')
      console.log('Por favor, configura las siguientes políticas en la interfaz de Supabase:')
      console.log('1. Permitir lectura pública:')
      console.log('   - Bucket: checklistpacking')
      console.log('   - Policy name: Allow public read')
      console.log('   - Definition: storage.objects')
      console.log('   - Policy: (bucket_id = \'checklistpacking\'::text)')
      console.log('\n2. Permitir escritura autenticada:')
      console.log('   - Bucket: checklistpacking')
      console.log('   - Policy name: Allow authenticated uploads')
      console.log('   - Definition: storage.objects')
      console.log('   - Policy: (bucket_id = \'checklistpacking\'::text AND auth.role() = \'authenticated\'::text)')
    }

    console.log('Configuración completada exitosamente')
  } catch (error) {
    console.error('Error durante la configuración:', error)
    process.exit(1)
  }
}

// Ejecutar configuración
setupStorage() 