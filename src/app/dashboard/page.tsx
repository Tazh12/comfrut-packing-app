'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  BuildingOffice2Icon,
  ClipboardDocumentCheckIcon,
  TruckIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'

const areas = [
  {
    name: 'Administración',
    icon: BuildingOffice2Icon,
    path: '/area/administracion'
  },
  {
    name: 'Calidad',
    icon: ClipboardDocumentCheckIcon,
    path: '/area/calidad'
  },
  {
    name: 'Logística',
    icon: TruckIcon,
    path: '/area/logistica'
  },
  {
    name: 'Producción',
    icon: WrenchScrewdriverIcon,
    path: '/area/produccion'
  }
]

export default function DashboardPage() {
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {areas.map((area) => (
            <button
              key={area.name}
              onClick={() => router.push(area.path)}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 flex flex-col items-center group"
            >
              <area.icon className="h-12 w-12 text-gray-600 group-hover:text-indigo-600 transition-colors" />
              <span className="mt-4 text-gray-900 font-medium group-hover:text-indigo-600 transition-colors">
                {area.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
} 