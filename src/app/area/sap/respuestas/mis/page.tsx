'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function MisAsignacionesSAPPage() {
  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F5F7FB' }}>
      <div className="max-w-[1150px] mx-auto">
        <div className="mb-6">
          <Link 
            href="/area/sap"
            className="inline-flex items-center transition-colors mb-4"
            style={{ color: '#1D6FE3' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#1557B0' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#1D6FE3' }}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>Volver</span>
          </Link>
          
          <h1 className="text-2xl font-semibold mb-2" style={{ color: '#111827' }}>
            Mis Asignaciones SAP
          </h1>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            SAP asignadas que requieren tu respuesta.
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-gray-600">Lista de mis asignaciones SAP - En desarrollo</p>
        </div>
      </div>
    </div>
  )
}


