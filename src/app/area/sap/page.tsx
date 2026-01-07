'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ClipboardCheck, BarChart3, ArrowLeft, ChevronDown, ChevronUp, History, FileText } from 'lucide-react'
import { ChecklistCardStatusBadge } from '@/components/ChecklistCardStatusBadge'

// Definición de tipos para las tarjetas
interface SAPCard {
  title: string
  icon: any
  href: string
  description: string
  storageKey?: string
  colorType?: 'normal' | 'dashboard'
  badge?: string
  badgeColor?: string
}

// Definición de secciones por rol
interface SAPSection {
  title: string
  description: string
  cards: SAPCard[]
}

// Secciones organizadas por rol y flujo
const sapSections: SAPSection[] = [
  {
    title: 'Solicitudes',
    description: 'Para todos los usuarios',
    cards: [
      {
        title: 'Nueva solicitud SAP',
        icon: AlertTriangle,
        href: '/area/sap/solicitudes/nueva',
        description: 'Crea una nueva solicitud de acción preventiva o correctiva.',
        storageKey: 'checklist-sap-nueva-draft',
        colorType: 'normal'
      },
      {
        title: 'Mis solicitudes',
        icon: ClipboardCheck,
        href: '/area/sap/solicitudes/mis',
        description: 'Revisa el estado de tus solicitudes SAP.',
        colorType: 'normal'
      }
    ]
  },
  {
    title: 'Gestión',
    description: 'Para gerentes de QA y gerentes de planta',
    cards: [
      {
        title: 'Gestión de solicitudes',
        icon: ClipboardCheck,
        href: '/area/sap/gestion',
        description: 'Asigna áreas responsables y envía notificaciones por email.',
        colorType: 'normal',
        badge: 'Gestor'
      }
    ]
  },
  {
    title: 'Respuestas',
    description: 'Para personal asignado',
    cards: [
      {
        title: 'Mis asignaciones',
        icon: FileText,
        href: '/area/sap/respuestas/mis',
        description: 'SAP asignadas que requieren respuesta.',
        colorType: 'normal',
        badge: 'Asignado'
      }
    ]
  }
]

// Componente de tarjeta reutilizable
function SAPCardComponent({ card }: { card: SAPCard }) {
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
      {card.badge && (
        <div 
          className="absolute top-3 right-3 px-2 py-0.5 rounded text-xs font-medium"
          style={{ 
            backgroundColor: '#EFF6FF',
            color: '#1D4ED8'
          }}
        >
          {card.badge}
        </div>
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

// Accordion Section Component
function AccordionSection({ 
  title, 
  description,
  isExpanded, 
  onToggle, 
  children 
}: { 
  title: string
  description: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="mb-4 rounded-lg overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 transition-colors"
        style={{
          backgroundColor: '#FFFFFF',
          color: '#111827'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#F9FAFB'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#FFFFFF'
        }}
      >
        <div className="text-left">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
            {description}
          </p>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5" style={{ color: '#6B7280' }} />
        ) : (
          <ChevronDown className="h-5 w-5" style={{ color: '#6B7280' }} />
        )}
      </button>
      {isExpanded && (
        <div className="p-4" style={{ backgroundColor: '#F5F7FB' }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default function SAPPage() {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Solicitudes': true,
    'Gestión': true,
    'Respuestas': true
  })

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }))
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F5F7FB' }}>
      {/* Container con ancho fijo y centrado */}
      <div className="max-w-[1150px] mx-auto">
        {/* Encabezado */}
        <div className="mb-6">
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
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold mb-2" style={{ color: '#111827' }}>
                Solicitudes de Acciones Preventivas/Correctivas (SAP)
              </h1>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Gestiona acciones preventivas y correctivas asignadas a diferentes áreas.
              </p>
            </div>
            
            {/* Header buttons */}
            <div className="flex gap-2">
              <Link
                href="/area/sap/historial"
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  color: '#111827'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF'
                }}
              >
                <History className="h-4 w-4 mr-2" />
                Historial
              </Link>
              <Link
                href="/area/sap/dashboard"
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  color: '#111827'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF'
                }}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Accordion Sections */}
        <div className="space-y-4">
          {sapSections.map((section) => (
            <AccordionSection
              key={section.title}
              title={section.title}
              description={section.description}
              isExpanded={expandedSections[section.title] ?? true}
              onToggle={() => toggleSection(section.title)}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {section.cards.map((card) => (
                  <SAPCardComponent key={card.title} card={card} />
                ))}
              </div>
            </AccordionSection>
          ))}
        </div>
      </div>
    </div>
  )
}


