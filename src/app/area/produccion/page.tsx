'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, History, ArrowLeft, BarChart3, ChevronDown, ChevronUp } from 'lucide-react'
import { ChecklistCardStatusBadge } from '@/components/ChecklistCardStatusBadge'

// Definición de tipos para los registros
interface RegistroCard {
  title: string
  icon: any
  href: string
  description: string
  storageKey?: string
  colorType?: 'normal' | 'critical' | 'dashboard'
  category: 'operational'
}

// OPERATIONAL checklists
const operationalChecklists: RegistroCard[] = [
  {
    title: 'Checklist de Packaging',
    icon: FileText,
    href: '/area/produccion/checklist-packaging',
    description: 'Registra y verifica el proceso de empaque diario.',
    storageKey: 'checklist-packaging-draft',
    colorType: 'normal',
    category: 'operational'
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

export default function ProduccionPage() {
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
                Área de Producción
              </h1>
              <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
                Gestiona los checklists y registros de producción.
              </p>
            </div>
            
            {/* Header buttons */}
            <div className="flex gap-2">
              <Link
                href="/area/produccion/historial"
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
                href="/area/produccion/dashboard-production"
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
                Dashboard de Producción
              </Link>
            </div>
          </div>
        </div>

        {/* Accordion Sections */}
        <div className="space-y-4">
          {/* OPERATIONAL Section */}
          <AccordionSection
            title="OPERATIONAL"
            isExpanded={isOperationalExpanded}
            onToggle={() => setIsOperationalExpanded(!isOperationalExpanded)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {operationalChecklists.map((card) => (
                <ProduccionCardComponent key={card.title} card={card} />
              ))}
            </div>
          </AccordionSection>
        </div>
      </div>
    </div>
  )
} 