'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { FileText, ArrowLeft, History } from 'lucide-react'
import Link from 'next/link'

interface Documento {
  id: number
  nombre: string
  descripcion: string
  path: string
}

const documentos: Documento[] = [
  {
    id: 1,
    nombre: 'Historial de Checklists',
    descripcion: 'Ver y exportar registros históricos de checklists',
    path: '/historial'
  }
]

export default function DocumentacionPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  // Redirect to login if not authenticated (middleware should handle this, but this is a safety check)
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--page-bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: 'var(--primary-bg)' }}></div>
          <p className="mt-4" style={{ color: 'var(--muted-text)' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center mb-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm mr-4 transition-colors"
              style={{ color: 'var(--link-color)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--link-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--link-color)' }}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver al Dashboard
            </Link>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--title-text)' }}>Área de Documentación</h1>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {documentos.map((documento) => (
              <button
                key={documento.id}
                onClick={() => router.push(documento.path)}
                className="relative group p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 text-left"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  boxShadow: '0 1px 2px var(--card-shadow)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 6px var(--card-shadow-hover)'
                  const arrow = e.currentTarget.querySelector('.arrow') as HTMLElement
                  if (arrow) arrow.style.opacity = '1'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 2px var(--card-shadow)'
                  const arrow = e.currentTarget.querySelector('.arrow') as HTMLElement
                  if (arrow) arrow.style.opacity = '0'
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <History className="h-6 w-6" style={{ color: 'var(--icon-primary)' }} />
                      <h3 className="ml-3 text-lg font-medium" style={{ color: 'var(--title-text)' }}>
                        {documento.nombre}
                      </h3>
                    </div>
                    <div 
                      className="arrow opacity-0 transition-opacity duration-200"
                      style={{ color: 'var(--icon-primary)' }}
                    >
                      →
                    </div>
                  </div>
                  <p className="mt-2 text-sm" style={{ color: 'var(--muted-text)' }}>
                    {documento.descripcion}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 