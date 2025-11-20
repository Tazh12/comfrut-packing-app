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
  
  // Get icon colors based on type
  const getIconStyles = () => {
    switch (colorType) {
      case 'critical':
        return {
          circleBg: 'var(--icon-circle-critical)',
          iconColor: 'var(--icon-critical-color)',
          hoverCircleBg: 'var(--icon-critical-color)',
        }
      case 'dashboard':
        return {
          circleBg: 'var(--icon-circle-dashboard)',
          iconColor: 'var(--icon-dashboard-color)',
          hoverCircleBg: 'var(--icon-dashboard-color)',
        }
      default:
        return {
          circleBg: 'var(--icon-circle-normal)',
          iconColor: 'var(--icon-primary)',
          hoverCircleBg: 'var(--icon-primary)',
        }
    }
  }
  
  const iconStyles = getIconStyles()
  
  return (
    <Link
      href={card.href}
      className="group relative p-8 rounded-lg transition-all duration-200 cursor-pointer transform hover:scale-[1.01] focus:outline-none focus:ring-2"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        boxShadow: '0 8px 18px var(--card-shadow)',
        '--tw-ring-color': 'var(--card-hover-border)'
      } as React.CSSProperties}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 10px 24px var(--card-shadow-hover)'
        e.currentTarget.style.borderColor = 'var(--card-hover-border)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 18px var(--card-shadow)'
        e.currentTarget.style.borderColor = 'var(--card-border)'
      }}
    >
      {card.storageKey && (
        <ChecklistCardStatusBadge storageKey={card.storageKey} />
      )}
      <div className="flex flex-col items-center text-center">
        {/* Icon circle */}
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-colors"
          style={{ backgroundColor: iconStyles.circleBg }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = iconStyles.hoverCircleBg
            const icon = e.currentTarget.querySelector('svg')
            if (icon) icon.style.color = '#FFFFFF'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = iconStyles.circleBg
            const icon = e.currentTarget.querySelector('svg')
            if (icon) icon.style.color = iconStyles.iconColor
          }}
        >
          <Icon 
            className="h-8 w-8 transition-colors" 
            style={{ color: iconStyles.iconColor }}
          />
        </div>
        {/* Title */}
        <h3 className="text-lg font-semibold mb-1.5" style={{ color: 'var(--title-text)' }}>
          {card.title}
        </h3>
        {/* Description */}
        <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
          {card.description}
        </p>
      </div>
    </Link>
  )
}

export default function CalidadPage() {
  const { showToast } = useToast()

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--page-bg)' }}>
      {/* Container con ancho fijo y centrado */}
      <div className="max-w-[1150px] mx-auto">
        {/* Encabezado */}
        <div className="mb-8">
          <Link 
            href="/dashboard"
            className="inline-flex items-center transition-colors mb-4"
            style={{ color: 'var(--link-color)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--link-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--link-color)' }}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>Volver</span>
          </Link>
          <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--title-text)' }}>Área de Calidad</h1>
          <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
            Gestiona los checklists, controles críticos y análisis de calidad.
          </p>
        </div>

        {/* Sección de registros */}
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-6" style={{ color: 'var(--muted-text)' }}>
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