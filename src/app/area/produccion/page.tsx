'use client'

import Link from 'next/link'
import { FileText, History, ArrowLeft, BarChart3 } from 'lucide-react'
import { ChecklistCardStatusBadge } from '@/components/ChecklistCardStatusBadge'

// Definición de tipos para los registros
interface RegistroCard {
  title: string
  icon: any
  href: string
  description: string
  storageKey?: string
  colorType?: 'normal' | 'critical' | 'dashboard'
}

// Array de registros - fácil de expandir en el futuro
const registros: RegistroCard[] = [
  {
    title: 'Checklist de Packaging',
    icon: FileText,
    href: '/area/produccion/checklist-packaging',
    description: 'Registra y verifica el proceso de empaque diario.',
    storageKey: 'checklist-packaging-draft',
    colorType: 'normal'
  },
  {
    title: 'Historial',
    icon: History,
    href: '/area/produccion/historial',
    description: 'Busca y revisa registros históricos de producción.',
    colorType: 'normal'
  },
  {
    title: 'Dashboard de Producción',
    icon: BarChart3,
    href: '/area/produccion/dashboard-production',
    description: 'Visualiza y analiza datos de producción.',
    colorType: 'dashboard'
  }
  // Aquí se pueden agregar más registros en el futuro
]

// Componente de tarjeta reutilizable
function ProduccionCardComponent({ card }: { card: RegistroCard }) {
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

export default function ProduccionPage() {
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
          <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--title-text)' }}>Registros de Producción</h1>
          <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
            Accede a los checklists diarios y al historial de producción.
          </p>
        </div>

        {/* Sección de registros */}
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-6" style={{ color: 'var(--muted-text)' }}>
            ¿Qué quieres hacer?
          </h2>
        </div>

        {/* Grid de registros - responsive: 1 col mobile, 2 cols tablet, 3 cols desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {registros.map((registro) => (
            <ProduccionCardComponent key={registro.title} card={registro} />
          ))}
        </div>

        {/* Espacio para contenido adicional */}
        <div className="mt-12">
          {/* Aquí se puede agregar más contenido específico del área */}
        </div>
      </div>
    </div>
  )
} 