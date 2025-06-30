'use client'

import Link from 'next/link'
import { Package, Truck, FileText, Settings } from 'lucide-react'

// Página de Historial Global: menú de navegación a los historiales de cada área
export default function HistorialGlobalPage() {
  const areas = [
    { name: 'Producción', icon: Package, path: '/area/produccion/historial' },
    { name: 'Logística', icon: Truck, path: '/area/logistica/historial' },
    { name: 'Calidad', icon: FileText, path: '/area/calidad/historial' },
    { name: 'Mantención', icon: Settings, path: '/area/mantencion/historial' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Enlace para volver al Dashboard */}
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center text-blue-600 hover:underline">
            ← Volver al Dashboard
          </Link>
        </div>

        {/* Título y subtítulo */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Historial Global</h1>
        <p className="text-gray-600 mb-6">Selecciona el área para revisar su historial</p>

        {/* Grid de áreas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {areas.map((area) => (
            <Link
              key={area.name}
              href={area.path}
              className="group relative bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <area.icon className="h-6 w-6 text-blue-600" />
                <span className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                  {area.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
} 