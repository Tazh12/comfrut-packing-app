'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PackageCheck, FlaskConical, History, ArrowLeft, BarChart3, Search, Thermometer, Users, AlertTriangle, ClipboardCheck, Package, Eye, Droplet, Scale, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { ChecklistCardStatusBadge } from '@/components/ChecklistCardStatusBadge'

// Definición de tipos para los registros
interface CalidadCard {
  title: string
  icon: any
  href: string
  description: string
  storageKey?: string
  colorType?: 'normal' | 'critical' | 'dashboard'
  category: 'pre-operational' | 'operational' | 'review'
}

// PRE-OPERATIONAL checklists (ordered by workflow)
const preOperationalChecklists: CalidadCard[] = [
  {
    title: 'Pre-Operational Review Processing Areas',
    icon: ClipboardCheck,
    href: '/area/calidad/checklist-pre-operational-review',
    description: 'Áreas de procesamiento de revisión preoperacional.',
    storageKey: 'checklist-pre-operational-review-draft',
    colorType: 'normal',
    category: 'pre-operational'
  },
  {
    title: 'Cleanliness Control Packing',
    icon: Sparkles,
    href: '/area/calidad/checklist-cleanliness-control-packing',
    description: 'Control de limpieza de empaque.',
    storageKey: 'checklist-cleanliness-control-packing-draft',
    colorType: 'normal',
    category: 'pre-operational'
  },
  {
    title: 'Footbath Control',
    icon: Droplet,
    href: '/area/calidad/checklist-footbath-control',
    description: 'Control de pediluvios y concentración de sanitizante.',
    storageKey: 'checklist-footbath-control-draft',
    colorType: 'normal',
    category: 'pre-operational'
  },
  {
    title: 'Staff Good Practices Control',
    icon: Users,
    href: '/area/calidad/checklist-staff-practices',
    description: 'Control de buenas prácticas del personal.',
    storageKey: 'checklist-staff-practices-draft',
    colorType: 'normal',
    category: 'pre-operational'
  },
  {
    title: 'Process Area Staff Glasses and Auditory Protector Control',
    icon: Eye,
    href: '/area/calidad/checklist-staff-glasses-auditory',
    description: 'Control de lentes y/o protector auditivo del personal que ingresa a áreas de proceso.',
    storageKey: 'checklist-staff-glasses-auditory-draft',
    colorType: 'normal',
    category: 'pre-operational'
  },
  {
    title: 'Internal Control of Materials Used in Production Areas',
    icon: Package,
    href: '/area/calidad/checklist-materials-control',
    description: 'Control interno de materiales usados en áreas productivas.',
    storageKey: 'checklist-materials-control-draft',
    colorType: 'normal',
    category: 'pre-operational'
  }
]

// OPERATIONAL checklists (ordered by criticality/frequency)
const operationalChecklists: CalidadCard[] = [
  {
    title: 'Metal Detector (PCC #1)',
    icon: Search,
    href: '/area/calidad/checklist-metal-detector',
    description: 'Checklist de control crítico de detector de metales.',
    storageKey: 'checklist-metal-detector-draft',
    colorType: 'critical',
    category: 'operational'
  },
  {
    title: 'Monoproduct Checklist',
    icon: PackageCheck,
    href: '/area/calidad/checklist-monoproducto',
    description: 'Gestión de checklist para monoproducto.',
    storageKey: 'checklist-monoproducto-draft',
    colorType: 'normal',
    category: 'operational'
  },
  {
    title: 'Mix Product Checklist',
    icon: FlaskConical,
    href: '/area/calidad/checklist_producto_mix',
    description: 'Gestión de checklist para mezcla de productos.',
    storageKey: 'checklist-producto-mix-draft',
    colorType: 'normal',
    category: 'operational'
  },
  {
    title: 'Check Weighing and Sealing of Packaged Products',
    icon: Scale,
    href: '/area/calidad/checklist-weighing-sealing',
    description: 'Chequeo de pesaje y sellado de los productos envasados.',
    storageKey: 'checklist-weighing-sealing-draft',
    colorType: 'normal',
    category: 'operational'
  },
  {
    title: 'Process Environmental Temperature Control',
    icon: Thermometer,
    href: '/area/calidad/checklist-envtemp',
    description: 'Checklist de monitoreo de temperatura ambiental.',
    storageKey: 'checklist-envtemp-draft',
    colorType: 'normal',
    category: 'operational'
  },
  {
    title: 'Foreign Material Findings Record',
    icon: AlertTriangle,
    href: '/area/calidad/checklist-foreign-material',
    description: 'Record de hallazgos de materia extraña.',
    storageKey: 'checklist-foreign-material-draft',
    colorType: 'normal',
    category: 'operational'
  }
]

// All checklists combined
const allChecklists = [...preOperationalChecklists, ...operationalChecklists]

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
      className="group relative p-6 rounded-lg transition-all duration-200 cursor-pointer transform hover:scale-[1.01] focus:outline-none focus:ring-2"
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
          className="w-14 h-14 rounded-full flex items-center justify-center mb-2.5 transition-colors"
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
            className="h-7 w-7 transition-colors" 
            style={{ color: iconStyles.iconColor }}
          />
        </div>
        {/* Title */}
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--title-text)' }}>
          {card.title}
        </h3>
        {/* Description */}
        <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-text)' }}>
          {card.description}
        </p>
      </div>
    </Link>
  )
}

// Accordion Section Component
function AccordionSection({ 
  title, 
  isExpanded, 
  onToggle, 
  children 
}: { 
  title: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="mb-4 rounded-lg overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 transition-colors"
        style={{
          backgroundColor: isExpanded ? 'var(--card-bg)' : 'var(--card-bg)',
          color: 'var(--title-text)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--card-hover-bg, rgba(0,0,0,0.02))'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--card-bg)'
        }}
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5" style={{ color: 'var(--muted-text)' }} />
        ) : (
          <ChevronDown className="h-5 w-5" style={{ color: 'var(--muted-text)' }} />
        )}
      </button>
      {isExpanded && (
        <div className="p-4" style={{ backgroundColor: 'var(--page-bg)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default function CalidadPage() {
  const [isPreOperationalExpanded, setIsPreOperationalExpanded] = useState(true) // Start expanded
  const [isOperationalExpanded, setIsOperationalExpanded] = useState(true) // Start expanded

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--page-bg)' }}>
      {/* Container con ancho fijo y centrado */}
      <div className="max-w-[1150px] mx-auto">
        {/* Header */}
        <div className="mb-6">
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
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--title-text)' }}>
                Área de Calidad
              </h1>
              <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
                Gestiona los checklists, controles críticos y análisis de calidad.
              </p>
            </div>
            
            {/* Header buttons */}
            <div className="flex gap-2">
              <Link
                href="/area/calidad/historial"
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  color: 'var(--title-text)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--card-hover-bg, rgba(0,0,0,0.05))'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--card-bg)'
                }}
              >
                <History className="h-4 w-4 mr-2" />
                Historial
              </Link>
              <Link
                href="/area/calidad/dashboard-quality"
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  color: 'var(--title-text)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--card-hover-bg, rgba(0,0,0,0.05))'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--card-bg)'
                }}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard de Calidad
              </Link>
            </div>
          </div>
        </div>

        {/* Accordion Sections */}
        <div className="space-y-4">
          {/* PRE-OPERATIONAL Section */}
          <AccordionSection
            title="PRE-OPERATIONAL"
            isExpanded={isPreOperationalExpanded}
            onToggle={() => setIsPreOperationalExpanded(!isPreOperationalExpanded)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {preOperationalChecklists.map((card) => (
                <CalidadCardComponent key={card.title} card={card} />
              ))}
            </div>
          </AccordionSection>

          {/* OPERATIONAL Section */}
          <AccordionSection
            title="OPERATIONAL"
            isExpanded={isOperationalExpanded}
            onToggle={() => setIsOperationalExpanded(!isOperationalExpanded)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {operationalChecklists.map((card) => (
                <CalidadCardComponent key={card.title} card={card} />
              ))}
            </div>
          </AccordionSection>
        </div>
      </div>
    </div>
  )
} 