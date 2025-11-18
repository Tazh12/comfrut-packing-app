'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Wrench, ClipboardCheck, Clock, ArrowLeft } from 'lucide-react'
import { ChecklistCardStatusBadge } from '@/components/ChecklistCardStatusBadge'

export default function ChecklistPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Gestión de Mantenimiento Correctivo
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            onClick={() => router.push('/area/mantencion/checklist/solicitud_mtto')}
            className="group relative bg-white rounded-2xl shadow-md p-6 flex flex-col items-center text-center hover:shadow-lg transition-shadow cursor-pointer"
          >
            <ChecklistCardStatusBadge storageKey="checklist-solicitud-mtto-draft" />
            <Wrench className="h-12 w-12 text-yellow-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Crear solicitud de mantenimiento</h3>
            <p className="text-sm text-gray-500 mt-2">Registra una nueva solicitud de mantenimiento correctivo programado</p>
          </div>

          <div
            onClick={() => router.push('/area/mantencion/evaluacion_solicitudes')}
            className="group bg-white rounded-2xl shadow-md p-6 flex flex-col items-center text-center hover:shadow-lg transition-shadow cursor-pointer"
          >
            <ClipboardCheck className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Solicitudes por evaluar</h3>
            <p className="text-sm text-gray-500 mt-2">Revisa y evalúa solicitudes pendientes por parte de mantenimiento</p>
          </div>

          <div
            onClick={() => router.push('/area/mantencion/historial')}
            className="group bg-white rounded-2xl shadow-md p-6 flex flex-col items-center text-center hover:shadow-lg transition-shadow cursor-pointer"
          >
            <Clock className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Historial de solicitudes</h3>
            <p className="text-sm text-gray-500 mt-2">Visualiza el historial de solicitudes realizadas y su estado</p>
          </div>
        </div>
      </div>
    </div>
  )
} 