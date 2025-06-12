'use client'

import Link from 'next/link'

export default function MantencionPage() {
  return (
    <div className="min-h-screen bg-background py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-blue-400 hover:text-blue-500 transition-colors"
          >
            <span className="mr-2">←</span>
            <span>Volver al Dashboard</span>
          </Link>
        </div>

        <div className="text-center py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Área de Mantención
          </h1>
          <p className="text-lg text-gray-600">
            En construcción
          </p>
          <div className="mt-6 text-6xl">
            🚧
          </div>
        </div>
      </div>
    </div>
  )
} 