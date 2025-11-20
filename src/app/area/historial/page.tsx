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
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--page-bg)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Enlace para volver al Dashboard */}
        <div className="mb-6">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center hover:underline"
            style={{ color: 'var(--icon-primary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            ← Volver al Dashboard
          </Link>
        </div>

        {/* Título y subtítulo */}
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--title-text)' }}>Historial Global</h1>
        <p className="mb-6" style={{ color: 'var(--muted-text)' }}>Selecciona el área para revisar su historial</p>

        {/* Grid de áreas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {areas.map((area) => (
            <Link
              key={area.name}
              href={area.path}
              className="group relative p-6 rounded-lg transition-shadow"
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: '0 1px 3px var(--card-shadow)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 10px 15px var(--card-shadow-hover)'
                const span = e.currentTarget.querySelector('span')
                if (span) span.style.color = 'var(--icon-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px var(--card-shadow)'
                const span = e.currentTarget.querySelector('span')
                if (span) span.style.color = 'var(--title-text)'
              }}
            >
              <div className="flex items-center space-x-4">
                <area.icon className="h-6 w-6" style={{ color: 'var(--icon-primary)' }} />
                <span className="text-lg font-medium transition-colors" style={{ color: 'var(--title-text)' }}>
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