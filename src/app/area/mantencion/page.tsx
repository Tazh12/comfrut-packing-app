'use client'

import Link from 'next/link'
import { Wrench, ClipboardCheck, BarChart3, ArrowLeft } from 'lucide-react'
import { ChecklistCardStatusBadge } from '@/components/ChecklistCardStatusBadge'

// Definición de tipos para las tarjetas
interface MantencionCard {
  title: string
  icon: any
  href: string
  description: string
  storageKey?: string
  colorType?: 'normal' | 'dashboard'
}

// Array de tarjetas de mantención
const mantencionCards: MantencionCard[] = [
  {
    title: 'Crear solicitud de mantenimiento',
    icon: Wrench,
    href: '/area/mantencion/checklist/solicitud_mtto',
    description: 'Registra una nueva solicitud de mantenimiento correctivo programado.',
    storageKey: 'checklist-solicitud-mtto-draft',
    colorType: 'normal'
  },
  {
    title: 'Solicitudes por evaluar',
    icon: ClipboardCheck,
    href: '/area/mantencion/evaluacion_solicitudes',
    description: 'Revisa y evalúa solicitudes pendientes.',
    colorType: 'normal'
  },
  {
    title: 'Dashboard de Solicitudes',
    icon: BarChart3,
    href: '/area/mantencion/historial',
    description: 'Visualiza y analiza datos de solicitudes.',
    colorType: 'dashboard'
  }
]

// Componente de tarjeta reutilizable
function MantencionCardComponent({ card }: { card: MantencionCard }) {
  const Icon = card.icon
  const colorType = card.colorType || 'normal'
  
  // Get icon colors based on type
  const getIconStyles = () => {
    switch (colorType) {
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
  
  const handleCardMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.10)'
    e.currentTarget.style.borderColor = iconStyles.hoverCircleBg
    // Update icon circle on card hover
    const iconCircle = e.currentTarget.querySelector('.icon-circle') as HTMLElement
    if (iconCircle) {
      iconCircle.style.backgroundColor = iconStyles.hoverCircleBg
      const icon = iconCircle.querySelector('svg')
      if (icon) icon.style.color = '#FFFFFF'
    }
  }
  
  const handleCardMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.boxShadow = '0 8px 18px rgba(15, 23, 42, 0.06)'
    e.currentTarget.style.borderColor = '#E2E8F0'
    // Reset icon circle on card leave
    const iconCircle = e.currentTarget.querySelector('.icon-circle') as HTMLElement
    if (iconCircle) {
      iconCircle.style.backgroundColor = iconStyles.circleBg
      const icon = iconCircle.querySelector('svg')
      if (icon) icon.style.color = iconStyles.iconColor
    }
  }
  
  return (
    <Link
      href={card.href}
      className="group relative p-8 rounded-lg transition-all duration-200 cursor-pointer transform hover:scale-[1.01] focus:outline-none focus:ring-2"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)',
        '--tw-ring-color': iconStyles.hoverCircleBg
      } as React.CSSProperties}
      onMouseEnter={handleCardMouseEnter}
      onMouseLeave={handleCardMouseLeave}
    >
      {card.storageKey && (
        <ChecklistCardStatusBadge storageKey={card.storageKey} />
      )}
      <div className="flex flex-col items-center text-center">
        {/* Icon circle */}
        <div 
          className="icon-circle w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-colors"
          style={{ backgroundColor: iconStyles.circleBg }}
        >
          <Icon 
            className="h-8 w-8 transition-colors" 
            style={{ color: iconStyles.iconColor }}
          />
        </div>
        {/* Title */}
        <h3 className="text-lg font-semibold mb-1.5" style={{ color: '#111827' }}>
          {card.title}
        </h3>
        {/* Description */}
        <p className="text-sm" style={{ color: '#6B7280' }}>
          {card.description}
        </p>
      </div>
    </Link>
  )
}

export default function MantencionPage() {
  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F5F7FB' }}>
      {/* Container con ancho fijo y centrado */}
      <div className="max-w-[1150px] mx-auto">
        {/* Encabezado */}
        <div className="mb-8">
          <Link 
            href="/dashboard"
            className="inline-flex items-center transition-colors mb-4"
            style={{ color: '#1D6FE3' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#1557B0' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#1D6FE3' }}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>Volver</span>
          </Link>
          <h1 className="text-2xl font-semibold mb-2" style={{ color: '#111827' }}>Área de mantención</h1>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Gestiona solicitudes de mantenimiento correctivo y su estado.
          </p>
        </div>

        {/* Sección de tarjetas */}
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-6" style={{ color: '#6B7280' }}>
            ¿Qué quieres hacer?
          </h2>
        </div>

        {/* Grid de tarjetas - responsive: 1 col mobile, 2 cols tablet, 3 cols desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mantencionCards.map((card) => (
            <MantencionCardComponent key={card.title} card={card} />
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