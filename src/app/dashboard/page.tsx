'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import LogoutButton from '@/components/LogoutButton'
import {
  BuildingOffice2Icon,
  ClipboardDocumentCheckIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  ClockIcon,
  CubeIcon
} from '@heroicons/react/24/outline'
import { useToast } from '@/context/ToastContext'

const areas = [
  {
    name: 'Administración',
    description: 'Gestión administrativa y recursos humanos',
    icon: BuildingOffice2Icon,
    path: '/area/administracion'
  },
  {
    name: 'Calidad',
    description: 'Control y aseguramiento de calidad',
    icon: ClipboardDocumentCheckIcon,
    path: '/area/calidad'
  },
  {
    name: 'Logística',
    description: 'Gestión de transporte y distribución',
    icon: TruckIcon,
    path: '/area/logistica'
  },
  {
    name: 'Producción',
    description: 'Control y registro de producción',
    icon: CubeIcon,
    path: '/area/produccion'
  },
  {
    name: 'Mantención',
    description: 'Checklist y registros del área de mantención',
    icon: WrenchScrewdriverIcon,
    path: '/area/mantencion'
  },
  {
    name: 'Historial',
    description: 'Registros históricos y reportes',
    icon: ClockIcon,
    path: '/historial'
  }
]

export default function DashboardPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    const supabase = createClientComponentClient()
    
    // Verificar sesión una sola vez al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }
      setEmail(session.user?.email || null)
    })
  }, [router])

  useEffect(() => {
    // Verificar si hay un toast pendiente
    const pendingToast = localStorage.getItem('pendingToast')
    if (pendingToast) {
      const { message, type } = JSON.parse(pendingToast)
      showToast(message, type)
      localStorage.removeItem('pendingToast')
    }
  }, [showToast])

  if (!email) {
    return <div>Cargando...</div>
  }

  return (
    <div className="min-h-screen bg-background py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">{email}</span>
            <LogoutButton />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <button
              key={area.name}
              onClick={() => router.push(area.path)}
              className="flex flex-col items-start p-6 bg-white rounded-lg shadow-sm 
                hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-4 mb-2">
                <area.icon className="h-8 w-8 text-blue-400" />
                <span className="text-lg font-medium text-gray-900">
                  {area.name}
                </span>
              </div>
              <p className="text-sm text-gray-600 ml-12">
                {area.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
} 