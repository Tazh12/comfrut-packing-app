'use client'

import { redirect } from 'next/navigation'

// Función auxiliar para capitalizar texto
const capitalizeText = (text: string): string => {
  return text
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

type PageProps = {
  params: {
    nombre: string
  }
}

export default function AreaPage({ params }: PageProps) {
  const areaName = capitalizeText(params.nombre)

  // Opcional: valida que el área sea válida, si no, redirige
  const validAreas = ['administracion', 'calidad', 'logistica', 'produccion']
  if (!validAreas.includes(params.nombre)) {
    redirect('/dashboard') // Redirige si el área no es válida
  }

  const getAreaContent = () => {
    switch (params.nombre) {
      case 'administracion':
        return { description: 'Gestión administrativa y recursos humanos' }
      case 'calidad':
        return { description: 'Control y aseguramiento de la calidad' }
      case 'logistica':
        return { description: 'Gestión de inventario y distribución' }
      case 'produccion':
        return { description: 'Procesos de manufactura y producción' }
      default:
        return { description: 'Aquí se mostrarán los formularios o registros de esta área' }
    }
  }

  const areaContent = getAreaContent()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Botón Volver */}
      <div className="p-4">
        <a
          href="/dashboard"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span className="mr-2">←</span>
          <span>Volver</span>
        </a>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Área: {areaName}
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            {areaContent.description}
          </p>

          {/* Espacio para contenido específico del área */}
          <div className="space-y-6">
            {/* Aquí puedes agregar componentes específicos según el área */}
          </div>
        </div>
      </div>
    </div>
  )
}
 