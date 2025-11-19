'use client'

import Link from 'next/link'
import { useToast } from '@/context/ToastContext'
import { PackageCheck, FlaskConical, History, ArrowLeft, BarChart3, Search, Thermometer } from 'lucide-react'
import { ChecklistCardStatusBadge } from '@/components/ChecklistCardStatusBadge'

// Definición de tipos para los registros
interface CalidadCard {
  title: string
  icon: any
  href: string
  description: string
  storageKey?: string
  colorType?: 'normal' | 'critical' | 'dashboard'
}

// Registro operativo - Primera fila
const registroOperativo: CalidadCard[] = [
  {
    title: 'Metal Detector (PCC #1)',
    icon: Search,
    href: '/area/calidad/checklist-metal-detector',
    description: 'Checklist de control crítico de detector de metales.',
    storageKey: 'checklist-metal-detector-draft',
    colorType: 'critical'
  },
  {
    title: 'Checklist Monoproducto',
    icon: PackageCheck,
    href: '/area/calidad/checklist-monoproducto',
    description: 'Gestión de checklist para monoproducto.',
    storageKey: 'checklist-monoproducto-draft',
    colorType: 'normal'
  },
  {
    title: 'Checklist Mix Producto',
    icon: FlaskConical,
    href: '/area/calidad/checklist_producto_mix',
    description: 'Gestión de checklist para mezcla de productos.',
    storageKey: 'checklist-producto-mix-draft',
    colorType: 'normal'
  }
]

// Registro + análisis - Segunda fila
const registroAnalisis: CalidadCard[] = [
  {
    title: 'Control Temperatura de Proceso',
    icon: Thermometer,
    href: '/area/calidad/checklist-envtemp',
    description: 'Checklist de monitoreo de temperatura ambiental.',
    storageKey: 'checklist-envtemp-draft',
    colorType: 'normal'
  },
  {
    title: 'Historial',
    icon: History,
    href: '/area/calidad/historial',
    description: 'Revisa registros históricos de calidad.',
    colorType: 'normal'
  },
  {
    title: 'Dashboard de Calidad',
    icon: BarChart3,
    href: '/area/calidad/dashboard-quality',
    description: 'Visualiza y analiza datos de calidad.',
    colorType: 'dashboard'
  }
]

// Componente de tarjeta reutilizable
function CalidadCardComponent({ card }: { card: CalidadCard }) {
  const Icon = card.icon
  const colorType = card.colorType || 'normal'
  
  // Definir clases CSS según el tipo
  const colorClasses = {
    normal: {
      circleBg: 'bg-[#E5EFFA]',
      iconColor: 'text-[#1D6FE3]',
      hoverCircleBg: 'group-hover:bg-[#1D6FE3]',
      hoverIconColor: 'group-hover:text-[#FFFFFF]'
    },
    critical: {
      circleBg: 'bg-[#FEF3C7]',
      iconColor: 'text-[#F97316]',
      hoverCircleBg: 'group-hover:bg-[#F97316]',
      hoverIconColor: 'group-hover:text-[#FFFFFF]'
    },
    dashboard: {
      circleBg: 'bg-[#DCFCE7]',
      iconColor: 'text-[#16A34A]',
      hoverCircleBg: 'group-hover:bg-[#16A34A]',
      hoverIconColor: 'group-hover:text-[#FFFFFF]'
    }
  }
  
  const classes = colorClasses[colorType]
  
  return (
    <Link
      href={card.href}
      className="group relative bg-[#FFFFFF] border border-[#E2E8F0] p-8 rounded-lg shadow-[0_8px_18px_rgba(15,23,42,0.06)] hover:shadow-[0_10px_24px_rgba(15,23,42,0.10)] hover:border-[#BFDBFE] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE] focus:border-[#2563EB] transition-all duration-200 cursor-pointer transform hover:scale-[1.01]"
    >
      {card.storageKey && (
        <ChecklistCardStatusBadge storageKey={card.storageKey} />
      )}
      <div className="flex flex-col items-center text-center">
        {/* Icon circle */}
        <div className={`w-16 h-16 rounded-full ${classes.circleBg} ${classes.hoverCircleBg} flex items-center justify-center mb-3 transition-colors`}>
          <Icon className={`h-8 w-8 ${classes.iconColor} ${classes.hoverIconColor} transition-colors`} />
        </div>
        {/* Title */}
        <h3 className="text-lg font-semibold text-[#111827] mb-1.5">
          {card.title}
        </h3>
        {/* Description */}
        <p className="text-sm text-[#6B7280]">
          {card.description}
        </p>
      </div>
    </Link>
  )
}

export default function CalidadPage() {
  const { showToast } = useToast()

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
          <h1 className="text-2xl font-semibold text-[#111827] mb-2">Área de Calidad</h1>
          <p className="text-sm text-[#6B7280]">
            Gestiona los checklists, controles críticos y análisis de calidad.
          </p>
        </div>

        {/* Sección de registros */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-[#6B7280] mb-6">
            ¿Qué quieres hacer?
          </h2>
        </div>

        {/* Primera fila: Registro operativo */}
        <div className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {registroOperativo.map((card) => (
              <CalidadCardComponent key={card.title} card={card} />
            ))}
          </div>
        </div>

        {/* Segunda fila: Registro + análisis */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {registroAnalisis.map((card) => (
              <CalidadCardComponent key={card.title} card={card} />
            ))}
          </div>
        </div>

        {/* Espacio para contenido adicional */}
        <div className="mt-12">
          {/* Aquí se puede agregar más contenido específico del área */}
        </div>
      </div>
    </div>
  )
} 