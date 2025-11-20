'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Wrench, ClipboardCheck, Clock, ArrowLeft } from 'lucide-react'
import { ChecklistCardStatusBadge } from '@/components/ChecklistCardStatusBadge'

export default function ChecklistPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--page-bg)' }}>
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center transition-colors mb-4"
          style={{ color: 'var(--link-color)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--link-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--link-color)' }}
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver
        </Link>
        <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--title-text)' }}>
          Gestión de Mantenimiento Correctivo
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            onClick={() => router.push('/area/mantencion/checklist/solicitud_mtto')}
            className="group relative rounded-2xl p-6 flex flex-col items-center text-center transition-shadow cursor-pointer"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              boxShadow: '0 4px 6px var(--card-shadow)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 10px 15px var(--card-shadow-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 6px var(--card-shadow)'
            }}
          >
            <ChecklistCardStatusBadge storageKey="checklist-solicitud-mtto-draft" />
            <Wrench className="h-12 w-12 mb-4" style={{ color: '#F59E0B' }} />
            <h3 className="text-lg font-medium" style={{ color: 'var(--title-text)' }}>Crear solicitud de mantenimiento</h3>
            <p className="text-sm mt-2" style={{ color: 'var(--muted-text)' }}>Registra una nueva solicitud de mantenimiento correctivo programado</p>
          </div>

          <div
            onClick={() => router.push('/area/mantencion/evaluacion_solicitudes')}
            className="group rounded-2xl p-6 flex flex-col items-center text-center transition-shadow cursor-pointer"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              boxShadow: '0 4px 6px var(--card-shadow)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 10px 15px var(--card-shadow-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 6px var(--card-shadow)'
            }}
          >
            <ClipboardCheck className="h-12 w-12 mb-4" style={{ color: '#22C55E' }} />
            <h3 className="text-lg font-medium" style={{ color: 'var(--title-text)' }}>Solicitudes por evaluar</h3>
            <p className="text-sm mt-2" style={{ color: 'var(--muted-text)' }}>Revisa y evalúa solicitudes pendientes por parte de mantenimiento</p>
          </div>

          <div
            onClick={() => router.push('/area/mantencion/historial')}
            className="group rounded-2xl p-6 flex flex-col items-center text-center transition-shadow cursor-pointer"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              boxShadow: '0 4px 6px var(--card-shadow)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 10px 15px var(--card-shadow-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 6px var(--card-shadow)'
            }}
          >
            <Clock className="h-12 w-12 mb-4" style={{ color: 'var(--icon-primary)' }} />
            <h3 className="text-lg font-medium" style={{ color: 'var(--title-text)' }}>Historial de solicitudes</h3>
            <p className="text-sm mt-2" style={{ color: 'var(--muted-text)' }}>Visualiza el historial de solicitudes realizadas y su estado</p>
          </div>
        </div>
      </div>
    </div>
  )
} 