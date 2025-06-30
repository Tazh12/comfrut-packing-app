'use client'

import Link from 'next/link'

export default function LogisticaPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          🚧 Esta área aún no tiene checklist disponibles
        </h1>
        <p className="text-gray-600">
          Pronto podrás gestionar checklist y consultar historial aquí.
        </p>
        <div className="mt-6">
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            ← Volver al Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
} 