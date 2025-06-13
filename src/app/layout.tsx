import { Inter } from 'next/font/google'
import './globals.css'
import { SupabaseProvider } from '@/components/providers/SupabaseProvider'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { ChecklistProvider } from '@/context/ChecklistContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Sistema de Gestión de Calidad',
  description: 'Sistema de gestión de calidad para empresas',
}

// No revalidar la página en cada request
export const revalidate = 0

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <SupabaseProvider>
          <AuthProvider>
            <ToastProvider>
              <ChecklistProvider>
                {children}
              </ChecklistProvider>
            </ToastProvider>
          </AuthProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}
