'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import Link from 'next/link'
import { ArrowLeft, Search, X, Wrench, Clock, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'

type TabType = 'programadas' | 'en_ejecucion' | 'por_validar'

interface Solicitud {
  id: string
  ticket_id?: number
  fecha: string
  hora: string
  solicitante: string
  zona: string
  estado: string
  nivel_riesgo?: string
  equipo_afectado?: string
  descripcion?: string
  observaciones?: string
}

export default function MisTrabajosPage() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('programadas')
  const [results, setResults] = useState<Solicitud[]>([])
  const [allResults, setAllResults] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [tabCounts, setTabCounts] = useState({ programadas: 0, en_ejecucion: 0, por_validar: 0 })
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [criticidadFilter, setCriticidadFilter] = useState('todos')

  const fetchMisTrabajos = async () => {
    setLoading(true)
    try {
      // TODO: Replace with actual user from auth context
      // For now, we'll fetch solicitudes that are in programada, en_ejecucion, or por_validar
      // and filter by técnico in observaciones (temporary until we have proper tecnico field)
      const { data, error } = await supabase
        .from('solicitudes_mantenimiento')
        .select('id, ticket_id, fecha, hora, solicitante, zona, estado, nivel_riesgo, equipo_afectado, descripcion, observaciones')
        .in('estado', ['programada', 'en_ejecucion', 'por_validar'])
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      if (error) {
        console.error('Error al buscar trabajos:', error)
        showToast('Error al buscar trabajos', 'error')
        setResults([])
        setAllResults([])
      } else {
        const solicitudes = data || []
        setAllResults(solicitudes)
        
        // Calculate counts for each tab
        const counts = {
          programadas: solicitudes.filter(s => s.estado === 'programada').length,
          en_ejecucion: solicitudes.filter(s => s.estado === 'en_ejecucion').length,
          por_validar: solicitudes.filter(s => s.estado === 'por_validar').length,
        }
        setTabCounts(counts)
        
        // Filter by active tab
        let filtered: Solicitud[] = solicitudes
        switch (activeTab) {
          case 'programadas':
            filtered = solicitudes.filter(s => s.estado === 'programada')
            break
          case 'en_ejecucion':
            filtered = solicitudes.filter(s => s.estado === 'en_ejecucion')
            break
          case 'por_validar':
            filtered = solicitudes.filter(s => s.estado === 'por_validar')
            break
        }
        
        // Apply sorting
        filtered = sortSolicitudes(filtered)
        
        // Apply filters
        filtered = applyFilters(filtered)
        
        setResults(filtered)
      }
    } catch (err) {
      console.error('Error inesperado al buscar trabajos:', err)
      showToast('Error inesperado al buscar trabajos', 'error')
    } finally {
      setLoading(false)
    }
  }

  const sortSolicitudes = (solicitudes: Solicitud[]): Solicitud[] => {
    // Sort by criticidad first, then date (newest first)
    const criticidadOrder = { 'Crítico': 0, 'Alto': 1, 'Medio': 2, 'Bajo': 3 }
    return [...solicitudes].sort((a, b) => {
      const nivelA = a.nivel_riesgo || ''
      const nivelB = b.nivel_riesgo || ''
      const orderA = Object.entries(criticidadOrder).find(([key]) => nivelA.includes(key))?.[1] ?? 99
      const orderB = Object.entries(criticidadOrder).find(([key]) => nivelB.includes(key))?.[1] ?? 99
      
      if (orderA !== orderB) {
        return orderA - orderB
      }
      
      // Same criticidad, sort by date
      const dateA = new Date(`${a.fecha} ${a.hora}`)
      const dateB = new Date(`${b.fecha} ${b.hora}`)
      return dateB.getTime() - dateA.getTime()
    })
  }

  const applyFilters = (solicitudes: Solicitud[]): Solicitud[] => {
    let filtered = [...solicitudes]
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(s => 
        s.ticket_id?.toString().includes(query) ||
        s.zona.toLowerCase().includes(query) ||
        s.equipo_afectado?.toLowerCase().includes(query) ||
        s.solicitante.toLowerCase().includes(query)
      )
    }
    
    // Criticidad filter
    if (criticidadFilter !== 'todos') {
      filtered = filtered.filter(s => {
        const nivel = s.nivel_riesgo || ''
        return nivel.includes(criticidadFilter)
      })
    }
    
    return filtered
  }

  useEffect(() => {
    fetchMisTrabajos()
  }, [activeTab])

  useEffect(() => {
    // Re-apply filters when they change
    let filtered = allResults
    
    // Filter by active tab
    switch (activeTab) {
      case 'programadas':
        filtered = allResults.filter(s => s.estado === 'programada')
        break
      case 'en_ejecucion':
        filtered = allResults.filter(s => s.estado === 'en_ejecucion')
        break
      case 'por_validar':
        filtered = allResults.filter(s => s.estado === 'por_validar')
        break
    }
    
    filtered = sortSolicitudes(filtered)
    filtered = applyFilters(filtered)
    setResults(filtered)
  }, [searchQuery, criticidadFilter])

  const getRiskBadgeStyle = (nivelRiesgo?: string) => {
    if (!nivelRiesgo) return { bg: '#F3F4F6', text: '#6B7280' }
    
    if (nivelRiesgo.includes('Crítico')) {
      return { bg: '#FEE2E2', text: '#B91C1C' }
    } else if (nivelRiesgo.includes('Alto')) {
      return { bg: '#FFEDD5', text: '#C2410C' }
    } else if (nivelRiesgo.includes('Medio')) {
      return { bg: '#FEF3C7', text: '#B45309' }
    } else {
      return { bg: '#DCFCE7', text: '#15803D' }
    }
  }

  const getRiskLabel = (nivelRiesgo?: string) => {
    if (!nivelRiesgo) return null
    
    if (nivelRiesgo.includes('Crítico')) return 'Crítico'
    if (nivelRiesgo.includes('Alto')) return 'Alto'
    if (nivelRiesgo.includes('Medio')) return 'Medio'
    return 'Bajo'
  }

  const isDevueltoParaCorreccion = (observaciones?: string): boolean => {
    if (!observaciones) return false
    return observaciones.includes('Devolvió el trabajo para corrección')
  }

  const getActionButton = (estado: string, id: string) => {
    if (estado === 'programada') {
      return { label: 'Iniciar trabajo', href: `/area/mantencion/tecnico/trabajos/${id}`, style: { bg: '#16A34A', hover: '#15803D' } }
    } else if (estado === 'en_ejecucion') {
      return { label: 'Continuar', href: `/area/mantencion/tecnico/trabajos/${id}`, style: { bg: '#1D6FE3', hover: '#2563EB' } }
    } else {
      return { label: 'Ver resultado', href: `/area/mantencion/tecnico/trabajos/${id}`, style: { bg: '#6B7280', hover: '#4B5563' } }
    }
  }

  const formatShortDate = (fecha: string, hora: string) => {
    try {
      const date = new Date(`${fecha} ${hora}`)
      return format(date, 'dd-MM-yyyy HH:mm')
    } catch {
      return `${fecha} ${hora}`
    }
  }

  const hasActiveFilters = searchQuery.trim() || criticidadFilter !== 'todos'

  const tabs = [
    { id: 'programadas' as TabType, label: 'Programadas', icon: Clock, count: tabCounts.programadas },
    { id: 'en_ejecucion' as TabType, label: 'En ejecución', icon: Wrench, count: tabCounts.en_ejecucion },
    { id: 'por_validar' as TabType, label: 'En validación', icon: CheckCircle2, count: tabCounts.por_validar },
  ]

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F5F7FB' }}>
      <div className="max-w-[1150px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/area/mantencion"
            className="inline-flex items-center transition-colors mb-4"
            style={{ color: '#1D6FE3' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#1557B0' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#1D6FE3' }}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>Volver</span>
          </Link>
          <h1 className="text-2xl font-semibold mb-2" style={{ color: '#111827' }}>
            Mis Trabajos Asignados
          </h1>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Gestiona los trabajos de mantenimiento que tienes asignados.
          </p>
        </div>

        {/* Summary Banner */}
        <div 
          className="rounded-lg p-6 mb-6 border"
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#E2E8F0',
            boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)'
          }}
        >
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#FEF3C7' }}
                >
                  <Clock className="h-6 w-6" style={{ color: '#B45309' }} />
                </div>
              </div>
              <p className="text-2xl font-bold mb-1" style={{ color: '#111827' }}>
                {tabCounts.programadas}
              </p>
              <p className="text-sm" style={{ color: '#6B7280' }}>Por iniciar</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#DBEAFE' }}
                >
                  <Wrench className="h-6 w-6" style={{ color: '#1D4ED8' }} />
                </div>
              </div>
              <p className="text-2xl font-bold mb-1" style={{ color: '#111827' }}>
                {tabCounts.en_ejecucion}
              </p>
              <p className="text-sm" style={{ color: '#6B7280' }}>En proceso</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#FCE7F3' }}
                >
                  <CheckCircle2 className="h-6 w-6" style={{ color: '#BE185D' }} />
                </div>
              </div>
              <p className="text-2xl font-bold mb-1" style={{ color: '#111827' }}>
                {tabCounts.por_validar}
              </p>
              <p className="text-sm" style={{ color: '#6B7280' }}>En validación</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 border-2"
                  style={{
                    backgroundColor: isActive ? '#EFF6FF' : '#FFFFFF',
                    color: isActive ? '#1D4ED8' : '#6B7280',
                    borderColor: isActive ? '#1D4ED8' : '#E5E7EB',
                    boxShadow: isActive ? '0 4px 12px rgba(29, 79, 216, 0.15)' : '0 2px 4px rgba(15, 23, 42, 0.06)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#111827'
                      e.currentTarget.style.backgroundColor = '#F9FAFB'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#6B7280'
                      e.currentTarget.style.backgroundColor = '#FFFFFF'
                    }
                  }}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: isActive ? '#E5EFFA' : '#F3F4F6',
                      color: isActive ? '#1D4ED8' : '#6B7280'
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mb-6">
          <div 
            className="rounded-lg p-4 shadow-sm border"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E2E8F0',
              boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)'
            }}
          >
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" 
                  style={{ color: '#9CA3AF' }}
                />
                <input
                  type="text"
                  placeholder="Buscar por #ID, zona o equipo"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors placeholder-gray-400"
                  style={{ 
                    color: '#111827',
                    borderColor: '#E2E8F0',
                    '--tw-ring-color': '#1D6FE3'
                  } as React.CSSProperties & { '--tw-ring-color': string }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#1D6FE3'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0'
                  }}
                />
              </div>
              
              {/* Criticidad Filter */}
              <select
                value={criticidadFilter}
                onChange={(e) => setCriticidadFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                style={{ 
                  color: '#111827',
                  borderColor: '#E2E8F0',
                  '--tw-ring-color': '#1D6FE3'
                } as React.CSSProperties}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#1D6FE3'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0'
                }}
              >
                <option value="todos">Criticidad: Todos</option>
                <option value="Crítico">Crítico</option>
                <option value="Alto">Alto</option>
                <option value="Medio">Medio</option>
                <option value="Bajo">Bajo</option>
              </select>
              
              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setCriticidadFilter('todos')
                  }}
                  className="px-4 py-2 text-sm flex items-center gap-2 transition-colors"
                  style={{ color: '#6B7280' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#111827' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#6B7280' }}
                >
                  <X className="h-4 w-4" />
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div 
              className="animate-spin h-8 w-8 border-b-2 rounded-full"
              style={{ borderColor: '#1D6FE3' }}
            ></div>
          </div>
        ) : results.length === 0 ? (
          <div 
            className="text-center py-16 rounded-lg shadow-sm border"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E2E8F0',
              boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)'
            }}
          >
            {activeTab === 'programadas' && !hasActiveFilters && (
              <>
                <Clock className="h-12 w-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#111827' }}>
                  No tienes trabajos programados
                </h3>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Los trabajos asignados a ti aparecerán aquí.
                </p>
              </>
            )}
            {activeTab === 'en_ejecucion' && !hasActiveFilters && (
              <>
                <Wrench className="h-12 w-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#111827' }}>
                  No tienes trabajos en ejecución
                </h3>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Inicia un trabajo programado para verlo aquí.
                </p>
              </>
            )}
            {activeTab === 'por_validar' && !hasActiveFilters && (
              <>
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#111827' }}>
                  No tienes trabajos en validación
                </h3>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Los trabajos que envíes a validación aparecerán aquí.
                </p>
              </>
            )}
            {hasActiveFilters && (
              <>
                <Search className="h-12 w-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#111827' }}>
                  No se encontraron resultados
                </h3>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Intenta ajustar los filtros.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((sol) => {
              const action = getActionButton(sol.estado, sol.id)
              const riskStyle = getRiskBadgeStyle(sol.nivel_riesgo)
              return (
                <Link
                  key={sol.id}
                  href={action.href}
                  className="block"
                >
                  <div 
                    className="rounded-lg p-6 transition-all duration-200 cursor-pointer transform hover:scale-[1.01] border"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E5E7EB',
                      boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#BFDBFE'
                      e.currentTarget.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.10)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E5E7EB'
                      e.currentTarget.style.boxShadow = '0 8px 18px rgba(15, 23, 42, 0.06)'
                    }}
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Left Block: ID + Criticidad + Date */}
                      <div className="col-span-12 md:col-span-3">
                        <div className="flex items-center gap-2 mb-1">
                          {sol.ticket_id && (
                            <span 
                              className="px-2 py-0.5 rounded font-bold text-lg text-white"
                              style={{ backgroundColor: '#1D4ED8' }}
                            >
                              #{sol.ticket_id}
                            </span>
                          )}
                          {sol.nivel_riesgo && (
                            <>
                              <span style={{ color: '#9CA3AF' }}>·</span>
                              <span 
                                className="px-2 py-0.5 rounded text-xs font-medium"
                                style={{ 
                                  backgroundColor: riskStyle.bg,
                                  color: riskStyle.text
                                }}
                              >
                                {getRiskLabel(sol.nivel_riesgo)}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: '#6B7280' }}>
                          {formatShortDate(sol.fecha, sol.hora)}
                        </p>
                      </div>
                      
                      {/* Center Block: Main Info */}
                      <div className="col-span-12 md:col-span-7">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold" style={{ color: '#111827' }}>
                            {sol.solicitante}
                          </h3>
                          {isDevueltoParaCorreccion(sol.observaciones) && (
                            <span 
                              className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{ 
                                backgroundColor: '#FEE2E2',
                                color: '#B91C1C'
                              }}
                            >
                              Devuelto para corrección
                            </span>
                          )}
                        </div>
                        <p className="text-sm mb-1" style={{ color: '#4B5563' }}>
                          Zona: {sol.zona}
                          {sol.equipo_afectado && ` · Equipo: ${sol.equipo_afectado}`}
                        </p>
                        {sol.descripcion && (
                          <p className="text-xs line-clamp-1" style={{ color: '#6B7280' }}>
                            {sol.descripcion}
                          </p>
                        )}
                      </div>
                      
                      {/* Right Block: Action Button */}
                      <div className="col-span-12 md:col-span-2 flex justify-end">
                        <div
                          className="inline-block px-4 py-2 rounded-lg font-medium text-sm text-white transition-colors"
                          style={{ 
                            backgroundColor: action.style.bg
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = action.style.hover
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = action.style.bg
                          }}
                        >
                          {action.label}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
