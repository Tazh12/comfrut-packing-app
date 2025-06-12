import { config } from 'dotenv'

// Cargar variables de entorno desde .env
config()

// Definir las variables de entorno requeridas
const requiredEnvVars = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
} as const

// Verificar que todas las variables requeridas estén definidas
function validateEnvVars() {
  const missingVars = []
  
  if (!requiredEnvVars.supabaseUrl) {
    missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
  }
  if (!requiredEnvVars.supabaseAnonKey) {
    missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  if (!requiredEnvVars.supabaseServiceRoleKey) {
    missingVars.push('SUPABASE_SERVICE_ROLE_KEY')
  }

  if (missingVars.length > 0) {
    console.error('Variables de entorno faltantes:', missingVars)
    if (typeof window === 'undefined') {
      // Solo lanzar error en el servidor
      throw new Error(`Variables de entorno requeridas no encontradas: ${missingVars.join(', ')}`)
    }
  }
}

// Validar en el servidor
if (typeof window === 'undefined') {
  validateEnvVars()
}

// Exportar variables de entorno tipadas
export const env = {
  NEXT_PUBLIC_SUPABASE_URL: requiredEnvVars.supabaseUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requiredEnvVars.supabaseAnonKey,
  SUPABASE_SERVICE_ROLE_KEY: requiredEnvVars.supabaseServiceRoleKey
} as const

// Exportar una función para verificar que las variables estén cargadas
export function validateEnv(): void {
  console.log('=== Variables de entorno ===')
  console.log(`NEXT_PUBLIC_SUPABASE_URL: ${env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌'}`)
  console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌'}`)
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌'}`)
} 