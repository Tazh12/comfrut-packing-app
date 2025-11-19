'use client'

import Link from 'next/link'
import { FileText, History, ArrowLeft } from 'lucide-react'
import { ChecklistCardStatusBadge } from '@/components/ChecklistCardStatusBadge'

// Definición de tipos para los registros
interface RegistroCard {
  title: string
  icon: any
  href: string
  description: string
}

// Array de registros - fácil de expandir en el futuro
const registros: RegistroCard[] = [
  {
    title: 'Checklist de Packaging',
    icon: FileText,
    href: '/area/produccion/checklist-packaging',
    description: 'Registra y verifica el proceso de empaque diario.'
  },
  {
    title: 'Historial',
    icon: History,
    href: '/area/produccion/historial',
    description: 'Busca y revisa registros históricos de producción.'
  }
  // Aquí se pueden agregar más registros en el futuro
]

export default function ProduccionPage() {
  return (
    <div className="min-h-screen bg-[#F5F7FB] p-6">
      {/* Container con ancho fijo y centrado */}
      <div className="max-w-[1150px] mx-auto">
        {/* Encabezado */}
        <div className="mb-8">
          <Link 
            href="/dashboard"
            className="inline-flex items-center text-[#6B7280] hover:text-[#111827] transition-colors mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>Volver</span>
          </Link>
          <h1 className="text-2xl font-semibold text-[#111827] mb-2">Registros de Producción</h1>
          <p className="text-sm text-[#6B7280]">
            Accede a los checklists diarios y al historial de producción.
          </p>
        </div>

        {/* Sección de registros */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-[#6B7280] mb-6">
            ¿Qué quieres hacer?
          </h2>
        </div>

        {/* Grid de registros - 2 columnas en desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {registros.map((registro) => {
            const Icon = registro.icon
            return (
              <Link
                key={registro.title}
                href={registro.href}
                className="group relative bg-[#FFFFFF] border border-[#E2E8F0] p-8 rounded-lg shadow-[0_8px_18px_rgba(15,23,42,0.06)] hover:shadow-[0_10px_24px_rgba(15,23,42,0.10)] hover:border-[#BFDBFE] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE] transition-all duration-200 cursor-pointer transform hover:scale-[1.01]"
              >
                {registro.href.includes('checklist-packaging') && (
                  <ChecklistCardStatusBadge storageKey="checklist-packaging-draft" />
                )}
                <div className="flex flex-col items-center text-center">
                  {/* Icon circle */}
                  <div className="w-16 h-16 rounded-full bg-[#E5EFFA] flex items-center justify-center mb-3 group-hover:bg-[#1D6FE3] transition-colors">
                    <Icon className="h-8 w-8 text-[#1D6FE3] group-hover:text-[#FFFFFF] transition-colors" />
                  </div>
                  {/* Title */}
                  <h3 className="text-lg font-medium text-[#111827] mb-1.5">
                    {registro.title}
                  </h3>
                  {/* Description */}
                  <p className="text-sm text-[#6B7280]">
                    {registro.description}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Espacio para contenido adicional */}
        <div className="mt-12">
          {/* Aquí se puede agregar más contenido específico del área */}
        </div>
      </div>
    </div>
  )
} 