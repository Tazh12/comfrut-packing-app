'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { FileTextIcon, ArrowLeftIcon, HistoryIcon } from 'lucide-react'
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
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error checking session:', error)
          showToast('Error al verificar la sesión', 'error')
          return
        }

        if (!session) {
          return router.replace('/login')
        }
      } catch (error) {
        console.error('Unexpected error:', error)
        showToast('Error inesperado al verificar la sesión', 'error')
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [router, showToast])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center mb-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mr-4"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Volver al Dashboard
            </Link>
            <h1 className="text-2xl font-semibold text-gray-900">Área de Documentación</h1>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {documentos.map((documento) => (
              <button
                key={documento.id}
                onClick={() => router.push(documento.path)}
                className="relative group bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 text-left"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <HistoryIcon className="h-6 w-6 text-blue-600" />
                      <h3 className="ml-3 text-lg font-medium text-gray-900">
                        {documento.nombre}
                      </h3>
                    </div>
                    <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      →
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
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