'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import Link from 'next/link'
import { ArrowLeft, Search, Filter, X, Inbox, CheckCircle, Clock, Archive } from 'lucide-react'
import { format } from 'date-fns'

type TabType = 'pendientes' | 'en_ejecucion' | 'por_validar' | 'historial'

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
}

export default function EvaluacionSolicitudesPage() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('pendientes')
  const [results, setResults] = useState<Solicitud[]>([])
  const [allResults, setAllResults] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [tabCounts, setTabCounts] = useState({ pendientes: 0, en_ejecucion: 0, por_validar: 0, historial: 0 })
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [criticidadFilter, setCriticidadFilter] = useState('todos')
  const [zonaFilter, setZonaFilter] = useState('todos')
  const [showFilters, setShowFilters] = useState(false)

  const fetchSolicitudes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('solicitudes_mantenimiento')
        .select('id, ticket_id, fecha, hora, solicitante, zona, estado, nivel_riesgo, equipo_afectado')
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      if (error) {
        console.error('Error al buscar solicitudes:', error)
        showToast('Error al buscar solicitudes', 'error')
        setResults([])
        setAllResults([])
      } else {
        const solicitudes = data || []
        setAllResults(solicitudes)
        
        // Calculate counts for each tab
        const counts = {
          pendientes: solicitudes.filter(s => s.estado === 'pendiente').length,
          en_ejecucion: solicitudes.filter(s => ['programada', 'en_ejecucion', 'derivada'].includes(s.estado)).length,
          por_validar: solicitudes.filter(s => s.estado === 'por_validar').length,
          historial: solicitudes.filter(s => ['finalizada', 'no procede'].includes(s.estado)).length,
        }
        setTabCounts(counts)
        
        // Filter by active tab
        let filtered: Solicitud[] = solicitudes
        switch (activeTab) {
          case 'pendientes':
            filtered = solicitudes.filter(s => s.estado === 'pendiente')
            break
          case 'en_ejecucion':
            filtered = solicitudes.filter(s => ['programada', 'en_ejecucion', 'derivada'].includes(s.estado))
            break
          case 'por_validar':
            filtered = solicitudes.filter(s => s.estado === 'por_validar')
            break
          case 'historial':
            filtered = solicitudes.filter(s => ['finalizada', 'no procede'].includes(s.estado))
            break
        }
        
        // Apply sorting
        filtered = sortSolicitudes(filtered, activeTab)
        
        // Apply filters
        filtered = applyFilters(filtered)
        
        setResults(filtered)
      }
    } catch (err) {
      console.error('Error inesperado al buscar solicitudes:', err)
      showToast('Error inesperado al buscar solicitudes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const sortSolicitudes = (solicitudes: Solicitud[], tab: TabType): Solicitud[] => {
    if (tab === 'historial') {
      // Sort by date only (most recent first)
      return [...solicitudes].sort((a, b) => {
        const dateA = new Date(`${a.fecha} ${a.hora}`)
        const dateB = new Date(`${b.fecha} ${b.hora}`)
        return dateB.getTime() - dateA.getTime()
      })
    } else {
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
    
    // Zona filter
    if (zonaFilter !== 'todos') {
      filtered = filtered.filter(s => s.zona === zonaFilter)
    }
    
    return filtered
  }

  useEffect(() => {
    fetchSolicitudes()
  }, [activeTab])

  useEffect(() => {
    // Re-apply filters when they change
    let filtered = allResults
    
    // Filter by active tab
    switch (activeTab) {
      case 'pendientes':
        filtered = allResults.filter(s => s.estado === 'pendiente')
        break
      case 'en_ejecucion':
        filtered = allResults.filter(s => ['programada', 'en_ejecucion', 'derivada'].includes(s.estado))
        break
      case 'por_validar':
        filtered = allResults.filter(s => s.estado === 'por_validar')
        break
      case 'historial':
        filtered = allResults.filter(s => ['finalizada', 'no procede'].includes(s.estado))
        break
    }
    
    filtered = sortSolicitudes(filtered, activeTab)
    filtered = applyFilters(filtered)
    setResults(filtered)
  }, [searchQuery, criticidadFilter, zonaFilter])

  const getZonas = () => {
    const zonas = new Set(allResults.map(s => s.zona))
    return Array.from(zonas).sort()
  }

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

  const getActionButton = (estado: string, id: string) => {
    if (estado === 'pendiente') {
      return { label: 'Iniciar', href: `/area/mantencion/evaluacion_solicitudes/${id}/asignar` }
    } else if (['programada', 'en_ejecucion', 'derivada'].includes(estado)) {
      return { label: 'Revisar', href: `/area/mantencion/evaluacion_solicitudes/${id}` }
    } else if (estado === 'por_validar') {
      return { label: 'Validar', href: `/area/mantencion/evaluacion_solicitudes/${id}` }
    } else {
      return { label: 'Ver detalle', href: `/area/mantencion/evaluacion_solicitudes/${id}` }
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

  const hasActiveFilters = searchQuery.trim() || criticidadFilter !== 'todos' || zonaFilter !== 'todos'

  const tabs = [
    { id: 'pendientes' as TabType, label: 'Pendientes', icon: Inbox, count: tabCounts.pendientes },
    { id: 'en_ejecucion' as TabType, label: 'En ejecución', icon: Clock, count: tabCounts.en_ejecucion },
    { id: 'por_validar' as TabType, label: 'Por validar', icon: CheckCircle, count: tabCounts.por_validar },
    { id: 'historial' as TabType, label: 'Historial', icon: Archive, count: tabCounts.historial },
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
            Evaluación de Solicitudes de Mantenimiento
          </h1>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Revisa, ejecuta y valida solicitudes de mantenimiento.
          </p>
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
              
              {/* Zona Filter */}
              {getZonas().length > 0 && (
                <select
                  value={zonaFilter}
                  onChange={(e) => setZonaFilter(e.target.value)}
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
                  <option value="todos">Zona: Todas</option>
                  {getZonas().map(zona => (
                    <option key={zona} value={zona}>{zona}</option>
                  ))}
                </select>
              )}
              
              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setCriticidadFilter('todos')
                    setZonaFilter('todos')
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
            {hasActiveFilters ? (
              <>
                <Filter className="h-12 w-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#111827' }}>
                  No se encontraron resultados
                </h3>
                <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
                  Intenta ajustar los filtros para ver más resultados.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setCriticidadFilter('todos')
                    setZonaFilter('todos')
                  }}
                  className="px-4 py-2 text-white rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: '#1D6FE3',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563EB' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1D6FE3' }}
                >
                  Limpiar filtros
                </button>
              </>
            ) : (
              <>
                {activeTab === 'pendientes' && (
                  <>
                    <Inbox className="h-12 w-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#111827' }}>
                      No hay solicitudes pendientes
                    </h3>
                    <p className="text-sm" style={{ color: '#6B7280' }}>
                      Cuando se registre una solicitud aparecerá aquí para ser evaluada.
                    </p>
                  </>
                )}
                {activeTab === 'en_ejecucion' && (
                  <>
                    <Clock className="h-12 w-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#111827' }}>
                      No hay solicitudes en ejecución
                    </h3>
                    <p className="text-sm" style={{ color: '#6B7280' }}>
                      Las solicitudes asignadas aparecerán aquí.
                    </p>
                  </>
                )}
                {activeTab === 'por_validar' && (
                  <>
                    <CheckCircle className="h-12 w-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#111827' }}>
                      No hay solicitudes por validar
                    </h3>
                    <p className="text-sm" style={{ color: '#6B7280' }}>
                      Las solicitudes resueltas por técnicos aparecerán aquí para validación.
                    </p>
                  </>
                )}
                {activeTab === 'historial' && (
                  <>
                    <Archive className="h-12 w-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#111827' }}>
                      No hay registros para este rango de fechas
                    </h3>
                    <p className="text-sm" style={{ color: '#6B7280' }}>
                      Las solicitudes finalizadas aparecerán aquí.
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((sol) => {
              const action = getActionButton(sol.estado, sol.id)
              const riskStyle = getRiskBadgeStyle(sol.nivel_riesgo)
              const isFinalizada = sol.estado === 'finalizada'
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
                        <h3 className="font-semibold mb-1" style={{ color: '#111827' }}>
                          {sol.solicitante}
                        </h3>
                        <p className="text-sm mb-1" style={{ color: '#4B5563' }}>
                          Zona: {sol.zona}
                          {sol.equipo_afectado && ` · Equipo: ${sol.equipo_afectado}`}
                        </p>
                        <div className="flex items-center gap-1.5">
                          {isFinalizada && (
                            <span 
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: '#22C55E' }}
                            ></span>
                          )}
                          <p 
                            className="text-xs capitalize"
                            style={{ color: isFinalizada ? '#15803D' : '#6B7280' }}
                          >
                            {sol.estado.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      
                      {/* Right Block: Action Button */}
                      <div className="col-span-12 md:col-span-2 flex justify-end">
                        <div
                          className="inline-block px-4 py-2 rounded-lg font-medium text-sm text-white transition-colors"
                          style={{ 
                            backgroundColor: '#1D6FE3'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#2563EB'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#1D6FE3'
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
