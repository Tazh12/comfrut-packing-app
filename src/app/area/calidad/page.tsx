'use client'

import Link from 'next/link'
import { useToast } from '@/context/ToastContext'
import { PackageCheck, FlaskConical, History, ArrowLeft, BarChart3, Search } from 'lucide-react'
import { ChecklistCardStatusBadge } from '@/components/ChecklistCardStatusBadge'

export default function CalidadPage() {
  const { showToast } = useToast()

  // Eliminado handleHistorialClick porque ahora redirige al historial de calidad

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
            className="group relative bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <ChecklistCardStatusBadge storageKey="checklist-monoproducto-draft" />
            <div className="flex flex-col items-center text-center space-y-4">
              <PackageCheck className="h-8 w-8 text-green-600" />
              <h3 className="text-lg font-medium text-gray-900">Checklist Monoproducto</h3>
              <p className="text-sm text-gray-500">Gestión de checklist para monoproducto</p>
            </div>
          </Link>

          <Link
            href="/area/calidad/checklist_producto_mix"
            className="group relative bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <ChecklistCardStatusBadge storageKey="checklist-producto-mix-draft" />
            <div className="flex flex-col items-center text-center space-y-4">
              <FlaskConical className="h-8 w-8 text-purple-600" />
              <h3 className="text-lg font-medium text-gray-900">Checklist Mix Producto</h3>
              <p className="text-sm text-gray-500">Gestión de checklist para mezcla de productos</p>
            </div>
          </Link>

          <Link
            href="/area/calidad/checklist-envtemp"
            className="group relative bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <ChecklistCardStatusBadge storageKey="checklist-envtemp-draft" />
            <div className="flex flex-col items-center text-center space-y-4">
              <FlaskConical className="h-8 w-8 text-orange-600" />
              <h3 className="text-lg font-medium text-gray-900">Process Environmental Temperature Control</h3>
              <p className="text-sm text-gray-500">Environmental temperature monitoring checklist</p>
            </div>
          </Link>

          <Link
            href="/area/calidad/checklist-metal-detector"
            className="group relative bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <ChecklistCardStatusBadge storageKey="checklist-metal-detector-draft" />
            <div className="flex flex-col items-center text-center space-y-4">
              <Search className="h-8 w-8 text-red-600" />
              <h3 className="text-lg font-medium text-gray-900">Metal Detector (PCC #1)</h3>
              <p className="text-sm text-gray-500">Metal detector control checklist</p>
            </div>
          </Link>

          <Link
            href="/area/calidad/historial"
            className="group bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <History className="h-8 w-8 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Historial</h3>
              <p className="text-sm text-gray-500">Revisa registros históricos de calidad</p>
            </div>
          </Link>

          <Link
            href="/area/calidad/dashboard-quality"
            className="group bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <BarChart3 className="h-8 w-8 text-teal-600" />
              <h3 className="text-lg font-medium text-gray-900">Dashboard Quality</h3>
              <p className="text-sm text-gray-500">Visualiza y analiza datos de calidad</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
} 