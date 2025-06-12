import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { type Database } from '@/types/supabase'

export const createClient = () => {
  return createClientComponentClient<Database>()
}

// Para uso en el servidor
export const createServerClient = () => {
  return createClientComponentClient<Database>({
    // Opciones específicas del servidor si son necesarias
  })
} 