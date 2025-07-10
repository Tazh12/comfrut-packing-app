'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastContext'
import { PackageCheck, FlaskConical, History, ArrowLeft } from 'lucide-react'

export default function CalidadPage() {
  const router = useRouter()
  const { showToast } = useToast()

  const handleMixClick = () => {
    showToast('Página en mantención', 'info')
  }

  const handleHistorialClick = () => {
    showToast('Página en mantención', 'info')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Área de Calidad</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/area/calidad/checklist-monoproducto"
            className="group bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <PackageCheck className="h-8 w-8 text-green-600" />
              <h3 className="text-lg font-medium text-gray-900">Checklist Monoproducto</h3>
              <p className="text-sm text-gray-500">Gestión de checklist para monoproducto</p>
            </div>
          </Link>

          <Link
            href="/area/calidad/checklist-labPT"
            className="group bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <FlaskConical className="h-8 w-8 text-indigo-600" />
              <h3 className="text-lg font-medium text-gray-900">Ingreso resultados Lab PT</h3>
              <p className="text-sm text-gray-500">Ingreso de resultados microbiológicos Producto Terminado</p>
            </div>
          </Link>

          <button
            onClick={handleMixClick}
            className="group bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <FlaskConical className="h-8 w-8 text-purple-600" />
              <h3 className="text-lg font-medium text-gray-900">Checklist Mix Producto</h3>
              <p className="text-sm text-gray-500">Gestión de checklist para mezcla de productos</p>
            </div>
          </button>

          <button
            onClick={handleHistorialClick}
            className="group bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <History className="h-8 w-8 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Historial</h3>
              <p className="text-sm text-gray-500">Revisa registros históricos de calidad</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
} 