'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { 
  Package, 
  Truck, 
  FileText, 
  Settings, 
  LogOut 
} from 'lucide-react'

const areas = [
  {
    name: 'Producción',
    description: 'Checklists de producción y empaque',
    icon: Package,
    path: '/area/produccion'
  },
  {
    name: 'Logística',
    description: 'Checklists de logística',
    icon: Truck,
    path: '/area/logistica'
  },
  {
    name: 'Calidad',
    description: 'Checklists y controles de calidad',
    icon: FileText,
    path: '/area/calidad'
  },
  {
    name: 'Mantención',
    description: 'Gestión de mantenimientos y checklist',
    icon: Settings,
    path: '/area/mantencion'
  },
  {
    name: 'Historial Global',
    description: 'Consulta de registros históricos de todas las áreas',
    icon: FileText,
    path: '/area/historial'
  }
]

export default function DashboardPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [email, setEmail] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    (async () => {
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

        setEmail(session.user.email || '')
      } catch (error) {
        console.error('Unexpected error:', error)
        showToast('Error inesperado al verificar la sesión', 'error')
      } finally {
        setIsLoading(false)
      }
    })()
  }, [router, showToast])

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
        showToast('Error al cerrar sesión', 'error')
        return
      }
      router.replace('/login')
    } catch (error) {
      console.error('Unexpected error during sign out:', error)
      showToast('Error inesperado al cerrar sesión', 'error')
    }
  }

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
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Bienvenido, {email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => {
  const Icon = area.icon
  return (
    <button
      key={area.name}
      onClick={() => router.push(area.path)}
      className="relative group bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 text-left"
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Icon className="h-6 w-6 text-blue-600" />
            <h3 className="ml-3 text-lg font-medium text-gray-900">
              {area.name}
            </h3>
          </div>
          <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            →
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {area.description}
        </p>
      </div>
    </button>
            )})}
          </div>
        </div>
      </div>
    </div>
  )
} 