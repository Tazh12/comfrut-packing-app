import './globals.css'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import SupabaseProvider from '@/components/providers/SupabaseProvider'
import { Inter } from 'next/font/google'
import { ToastProvider } from '@/context/ToastContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Sistema de Gestión de Calidad',
  description: 'Sistema de gestión de calidad para empresas',
}

// No revalidar la página en cada request
export const revalidate = 0

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const supabase = createServerComponentClient({ cookies })
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return (
      <html lang="es">
        <body className={inter.className}>
          <ToastProvider>
            <SupabaseProvider session={session}>
              {children}
            </SupabaseProvider>
          </ToastProvider>
        </body>
      </html>
    )
  } catch (error) {
    console.error('Error en RootLayout:', error)
    // En caso de error, renderizar sin sesión
  return (
      <html lang="es">
        <body className={inter.className}>
          <ToastProvider>
            <SupabaseProvider session={null}>
        {children}
          </SupabaseProvider>
          </ToastProvider>
      </body>
    </html>
    )
  }
}
