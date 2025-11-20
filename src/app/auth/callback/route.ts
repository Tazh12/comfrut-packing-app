import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')

  if (code) {
    // Pass cookies function directly - createRouteHandlerClient expects a function that returns a Promise
    const supabase = createRouteHandlerClient({ cookies })

    // Si es una recuperación de contraseña, redirigir a la página de actualización
    if (type === 'recovery') {
      return NextResponse.redirect(`${requestUrl.origin}/update-password`)
    }

    // Intercambiar el código por una sesión
    await supabase.auth.exchangeCodeForSession(code)
  }

  // URL a la que redirigir después de la autenticación
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
} 