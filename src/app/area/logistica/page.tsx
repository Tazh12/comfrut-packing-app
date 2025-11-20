'use client'

import Link from 'next/link'

export default function LogisticaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--page-bg)' }}>
      <div className="text-center p-6">
        <h1 className="text-2xl font-semibold mb-4" style={{ color: 'var(--title-text)' }}>
          🚧 Esta área aún no tiene checklist disponibles
        </h1>
        <p style={{ color: 'var(--muted-text)' }}>
          Pronto podrás gestionar checklist y consultar historial aquí.
        </p>
        <div className="mt-6">
          <Link 
            href="/dashboard" 
            className="hover:underline"
            style={{ color: 'var(--icon-primary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            ← Volver al Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
} 