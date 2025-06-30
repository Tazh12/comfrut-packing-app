'use client'

import Link from 'next/link'
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'

// Definición de tipos para los registros
interface RegistroCard {
  title: string
  icon: any // Tipo any para el ícono por ahora, podríamos ser más específicos si es necesario
  href: string
  description?: string
}

// Array de registros - fácil de expandir en el futuro
const registros: RegistroCard[] = [
  {
    title: 'Checklist de Packaging',
    icon: ClipboardDocumentCheckIcon,
    href: '/area/produccion/checklist-packaging',
    description: 'Control y verificación del proceso de empaque'
  },
  {
    title: 'Historial',
    icon: ClipboardDocumentCheckIcon,
    href: '/area/produccion/historial',
    description: 'Buscar registros de producción históricos'
  }
  // Aquí se pueden agregar más registros en el futuro
]

export default function ProduccionPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Encabezado */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link 
            href="/dashboard"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <span className="mr-2">←</span>
            <span>Volver</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Registros de Producción</h1>
        </div>

        {/* Grid de registros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {registros.map((registro) => (
            <Link
              key={registro.title}
              href={registro.href}
              className="group relative bg-white p-6 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-indigo-100 rounded-full group-hover:bg-indigo-200 transition-colors">
                  <registro.icon className="h-8 w-8 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {registro.title}
                  </h3>
                  {registro.description && (
                    <p className="mt-2 text-sm text-gray-500">
                      {registro.description}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Espacio para contenido adicional */}
        <div className="mt-12">
          {/* Aquí se puede agregar más contenido específico del área */}
        </div>
      </div>
    </div>
  )
} 