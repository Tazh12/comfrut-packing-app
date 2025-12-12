'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import Link from 'next/link'
import { ArrowLeft, Search, X, Inbox, CheckCircle, Clock, Archive, AlertCircle, Filter, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react'
import { format, subDays, isBefore, parseISO } from 'date-fns'

type TabType = 'pendientes' | 'en_ejecucion' | 'por_validar' | 'historial'
type DateRange = '7' | '30' | 'todos'

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
  tecnico?: string
  fecha_programada?: string
  fecha_ejecucion?: string
  accion_realizada?: string
  observaciones?: string
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
  const [tecnicoFilter, setTecnicoFilter] = useState<string[]>([])
  const [showTecnicoDropdown, setShowTecnicoDropdown] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>('todos')
  
  // Sorting
  const [sortBy, setSortBy] = useState<'priority' | 'technician' | 'ticket' | 'creation' | 'fecha_programada'>('priority')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc') // Default: desc for priority (alta primero)

  const fetchSolicitudes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('solicitudes_mantenimiento')
        .select('*')
        .order('fecha', { ascending: false })

      if (error) {
        console.error('Error al buscar solicitudes:', JSON.stringify(error, null, 2))
        showToast(`Error al buscar solicitudes: ${error.message || 'Error desconocido'}`, 'error')
        setResults([])
        setAllResults([])
        return
      }
      
      const solicitudes = (data || []) as Solicitud[]
      setAllResults(solicitudes)
      
      // Calculate counts for each tab
      const counts = {
        pendientes: solicitudes.filter(s => s.estado === 'pendiente').length,
        en_ejecucion: solicitudes.filter(s => ['programada', 'en_ejecucion', 'derivada'].includes(s.estado)).length,
        por_validar: solicitudes.filter(s => s.estado === 'por_validar').length,
        historial: solicitudes.filter(s => ['finalizada', 'no procede'].includes(s.estado)).length,
      }
      setTabCounts(counts)
      
      // Apply filters and sorting
      applyFiltersAndSort(solicitudes)
    } catch (err: any) {
      console.error('Error inesperado al buscar solicitudes:', err)
      showToast(`Error inesperado: ${err?.message || 'Error desconocido'}`, 'error')
      setResults([])
      setAllResults([])
    } finally {
      setLoading(false)
    }
  }

  const applyFiltersAndSort = (solicitudes: Solicitud[]) => {
    let filtered = [...solicitudes]
    
    // Filter by active tab
    switch (activeTab) {
      case 'pendientes':
        filtered = filtered.filter(s => s.estado === 'pendiente')
        break
      case 'en_ejecucion':
        filtered = filtered.filter(s => ['programada', 'en_ejecucion', 'derivada'].includes(s.estado))
        break
      case 'por_validar':
        filtered = filtered.filter(s => s.estado === 'por_validar')
        break
      case 'historial':
        filtered = filtered.filter(s => ['finalizada', 'no procede'].includes(s.estado))
        break
    }
    
    // Apply date range filter (only for historial and en_ejecucion)
    if ((activeTab === 'historial' || activeTab === 'en_ejecucion') && dateRange !== 'todos') {
      const cutoffDate = subDays(new Date(), parseInt(dateRange))
      filtered = filtered.filter(s => {
        const solicitudDate = new Date(`${s.fecha} ${s.hora}`)
        return solicitudDate >= cutoffDate
      })
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(s => 
        s.ticket_id?.toString().includes(query) ||
        s.zona.toLowerCase().includes(query) ||
        s.equipo_afectado?.toLowerCase().includes(query) ||
        s.solicitante.toLowerCase().includes(query) ||
        s.descripcion?.toLowerCase().includes(query)
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
    
    // Técnico filter (only for en_ejecucion, por_validar, historial)
    if (tecnicoFilter.length > 0 && ['en_ejecucion', 'por_validar', 'historial'].includes(activeTab)) {
      filtered = filtered.filter(s => {
        const tecnico = s.tecnico || extractTecnicoFromObs(s.observaciones)
        return tecnico && tecnicoFilter.includes(tecnico)
      })
    }
    
    // Apply sorting
    filtered = sortSolicitudes(filtered, activeTab, sortBy, sortOrder)
    
    setResults(filtered)
  }

  const extractTecnicoFromObs = (obs?: string): string | null => {
    if (!obs) return null
    const match = obs.match(/Técnico:\s*([^|]+)/)
    return match ? match[1].trim() : null
  }

  const extractFechaProgramadaFromObs = (obs?: string): string | null => {
    if (!obs) return null
    const match = obs.match(/Fecha programada:\s*([^|]+)/)
    return match ? match[1].trim() : null
  }

  const extractPrioridadFromObs = (obs?: string): string | null => {
    if (!obs) return null
    const match = obs.match(/Prioridad:\s*([^|]+)/)
    return match ? match[1].trim() : null
  }

  const getDefaultSortOrder = (field: typeof sortBy): 'asc' | 'desc' => {
    switch (field) {
      case 'priority':
        return 'desc' // Alta primero
      case 'technician':
        return 'asc' // A-Z
      case 'ticket':
        return 'desc' // Más alto primero
      case 'creation':
        return 'desc' // Más reciente primero
      case 'fecha_programada':
        return 'asc' // Más próxima primero
      default:
        return 'desc'
    }
  }

  const handleSortByChange = (newSortBy: typeof sortBy) => {
    setSortBy(newSortBy)
    // Set default order for the new field
    setSortOrder(getDefaultSortOrder(newSortBy))
  }

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  const sortSolicitudes = (solicitudes: Solicitud[], tab: TabType, sortByField: typeof sortBy, sortOrderField: typeof sortOrder): Solicitud[] => {
    const multiplier = sortOrderField === 'asc' ? 1 : -1
    
    return [...solicitudes].sort((a, b) => {
      let comparison = 0
      
      switch (sortByField) {
        case 'priority': {
          const priorityWeight = { 'Crítico': 4, 'Alto': 3, 'Medio': 2, 'Bajo': 1 }
          const nivelA = a.nivel_riesgo || ''
          const nivelB = b.nivel_riesgo || ''
          const weightA = Object.entries(priorityWeight).find(([key]) => nivelA.includes(key))?.[1] ?? 0
          const weightB = Object.entries(priorityWeight).find(([key]) => nivelB.includes(key))?.[1] ?? 0
          comparison = weightA - weightB
          break
        }
        
        case 'technician': {
          const tecnicoA = (a.tecnico || extractTecnicoFromObs(a.observaciones) || '').toLowerCase()
          const tecnicoB = (b.tecnico || extractTecnicoFromObs(b.observaciones) || '').toLowerCase()
          comparison = tecnicoA.localeCompare(tecnicoB)
          break
        }
        
        case 'ticket': {
          const ticketA = a.ticket_id || 0
          const ticketB = b.ticket_id || 0
          comparison = ticketA - ticketB
          break
        }
        
        case 'creation': {
          const dateA = new Date(`${a.fecha} ${a.hora}`).getTime()
          const dateB = new Date(`${b.fecha} ${b.hora}`).getTime()
          comparison = dateA - dateB
          break
        }
        
        case 'fecha_programada': {
          const fechaProgA = a.fecha_programada || extractFechaProgramadaFromObs(a.observaciones)
          const fechaProgB = b.fecha_programada || extractFechaProgramadaFromObs(b.observaciones)
          if (fechaProgA && fechaProgB) {
            comparison = parseISO(fechaProgA).getTime() - parseISO(fechaProgB).getTime()
          } else if (fechaProgA) {
            comparison = -1
          } else if (fechaProgB) {
            comparison = 1
          } else {
            comparison = 0
          }
          break
        }
      }
      
      return comparison * multiplier
    })
  }

  const getSortLabel = (): string => {
    const fieldLabels = {
      priority: 'Prioridad',
      technician: 'Técnico',
      ticket: 'Nº de ticket',
      creation: 'Fecha de creación',
      fecha_programada: 'Fecha programada'
    }
    
    const orderLabels = {
      priority: { asc: 'Baja primero', desc: 'Alta primero' },
      technician: { asc: 'A → Z', desc: 'Z → A' },
      ticket: { asc: '#1 primero', desc: 'Más alto primero' },
      creation: { asc: 'Antigua primero', desc: 'Reciente primero' },
      fecha_programada: { asc: 'Próxima primero', desc: 'Lejana primero' }
    }
    
    return `${fieldLabels[sortBy]} (${orderLabels[sortBy][sortOrder]})`
  }

  useEffect(() => {
    fetchSolicitudes()
  }, [activeTab])

  useEffect(() => {
    applyFiltersAndSort(allResults)
  }, [searchQuery, criticidadFilter, zonaFilter, tecnicoFilter, dateRange, activeTab, allResults, sortBy, sortOrder])

  // Close técnico dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showTecnicoDropdown && !target.closest('.tecnico-filter-dropdown')) {
        setShowTecnicoDropdown(false)
      }
    }
    if (showTecnicoDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showTecnicoDropdown])

  const getZonas = () => {
    const zonas = new Set(allResults.map(s => s.zona))
    return Array.from(zonas).sort()
  }

  const getTecnicos = (): string[] => {
    const tecnicos = new Set<string>()
    allResults.forEach(s => {
      if (s.tecnico) tecnicos.add(s.tecnico)
      const tecnicoFromObs = extractTecnicoFromObs(s.observaciones)
      if (tecnicoFromObs) tecnicos.add(tecnicoFromObs)
    })
    return Array.from(tecnicos).sort()
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

  const getEstadoBadgeStyle = (estado: string) => {
    switch (estado) {
      case 'programada':
        return { bg: '#DBEAFE', text: '#1D4ED8', label: 'Programada' }
      case 'en_ejecucion':
        return { bg: '#DBEAFE', text: '#1D4ED8', label: 'En ejecución' }
      case 'derivada':
        return { bg: '#E0E7FF', text: '#4F46E5', label: 'Derivada' }
      case 'por_validar':
        return { bg: '#FCE7F3', text: '#BE185D', label: 'Por validar' }
      default:
        return { bg: '#F3F4F6', text: '#6B7280', label: estado }
    }
  }

  const isVencida = (sol: Solicitud): boolean => {
    const fechaProg = sol.fecha_programada || extractFechaProgramadaFromObs(sol.observaciones)
    if (!fechaProg) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return isBefore(parseISO(fechaProg), today) && sol.estado !== 'finalizada'
  }

  const formatShortDate = (fecha: string, hora: string) => {
    try {
      const date = new Date(`${fecha} ${hora}`)
      return format(date, 'dd-MM-yyyy HH:mm')
    } catch {
      return `${fecha} ${hora}`
    }
  }

  const formatDateOnly = (fecha: string) => {
    try {
      return format(parseISO(fecha), 'dd-MM-yyyy')
    } catch {
      return fecha
    }
  }

  const getActionButton = (estado: string, id: string) => {
    if (estado === 'pendiente') {
      return { label: 'Evaluar', href: `/area/mantencion/evaluacion_solicitudes/${id}/asignar` }
    } else if (['programada', 'en_ejecucion', 'derivada'].includes(estado)) {
      return { label: 'Revisar', href: `/area/mantencion/evaluacion_solicitudes/${id}` }
    } else if (estado === 'por_validar') {
      return { label: 'Revisar y validar', href: `/area/mantencion/evaluacion_solicitudes/${id}/validar` }
    } else {
      return { label: 'Ver detalle', href: `/area/mantencion/evaluacion_solicitudes/${id}` }
    }
  }

  const hasActiveFilters = searchQuery.trim() || criticidadFilter !== 'todos' || zonaFilter !== 'todos' || tecnicoFilter.length > 0 || dateRange !== 'todos'

  const toggleTecnicoFilter = (tecnico: string) => {
    setTecnicoFilter(prev => {
      if (prev.includes(tecnico)) {
        return prev.filter(t => t !== tecnico)
      } else {
        return [...prev, tecnico]
      }
    })
  }

  const getTecnicoFilterLabel = () => {
    if (tecnicoFilter.length === 0) return 'Técnico: Todos'
    if (tecnicoFilter.length === 1) return `Técnico: ${tecnicoFilter[0]}`
    return `Técnico: ${tecnicoFilter.length} seleccionados`
  }

  const tabs = [
    { id: 'pendientes' as TabType, label: 'Bandeja de entrada', icon: Inbox, count: tabCounts.pendientes },
    { id: 'en_ejecucion' as TabType, label: 'Trabajos en curso', icon: Clock, count: tabCounts.en_ejecucion },
    { id: 'por_validar' as TabType, label: 'Por validar', icon: CheckCircle, count: tabCounts.por_validar },
    { id: 'historial' as TabType, label: 'Historial', icon: Archive, count: tabCounts.historial },
  ]

  // Render card based on tab
  const renderCard = (sol: Solicitud) => {
    const action = getActionButton(sol.estado, sol.id)
    const riskStyle = getRiskBadgeStyle(sol.nivel_riesgo)
    
    if (activeTab === 'pendientes') {
      // Bandeja de entrada layout
      return (
        <Link key={sol.id} href={action.href} className="block">
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
            <div className="grid grid-cols-12 gap-4 items-start">
              {/* Left: ID + Criticidad + Date */}
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
              
              {/* Center: Zona + Equipo + Descripción + Solicitante */}
              <div className="col-span-12 md:col-span-7">
                <p className="text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                  Zona: {sol.zona}
                  {sol.equipo_afectado && ` · Equipo: ${sol.equipo_afectado}`}
                </p>
                {sol.descripcion && (
                  <p className="text-sm mb-1 line-clamp-1" style={{ color: '#4B5563' }}>
                    {sol.descripcion}
                  </p>
                )}
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  Solicitante: {sol.solicitante}
                </p>
              </div>
              
              {/* Right: Action Button */}
              <div className="col-span-12 md:col-span-2 flex justify-end">
                <div
                  className="inline-block px-4 py-2 rounded-lg font-medium text-sm text-white transition-colors"
                  style={{ backgroundColor: '#1D6FE3' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563EB' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1D6FE3' }}
                >
                  {action.label}
                </div>
              </div>
            </div>
          </div>
        </Link>
      )
    } else if (activeTab === 'en_ejecucion') {
      // Trabajos en curso layout
      const tecnico = sol.tecnico || extractTecnicoFromObs(sol.observaciones) || 'Sin asignar'
      const fechaProg = sol.fecha_programada || extractFechaProgramadaFromObs(sol.observaciones)
      const estadoStyle = getEstadoBadgeStyle(sol.estado)
      const vencida = isVencida(sol)
      
      return (
        <Link key={sol.id} href={action.href} className="block">
          <div 
            className="rounded-lg p-6 transition-all duration-200 cursor-pointer transform hover:scale-[1.01] border"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: vencida ? '#FEE2E2' : '#E5E7EB',
              boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#BFDBFE'
              e.currentTarget.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.10)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = vencida ? '#FEE2E2' : '#E5E7EB'
              e.currentTarget.style.boxShadow = '0 8px 18px rgba(15, 23, 42, 0.06)'
            }}
          >
            <div className="grid grid-cols-12 gap-4 items-start">
              {/* Left: ID + Criticidad */}
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
                {fechaProg && (
                  <div className="flex items-center gap-2">
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      Programada: {formatDateOnly(fechaProg)}
                    </p>
                    {vencida && (
                      <span 
                        className="px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: '#DC2626' }}
                      >
                        Vencida
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Center: Técnico + Estado + Zona + Equipo + Solicitante */}
              <div className="col-span-12 md:col-span-7">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-bold" style={{ color: '#111827' }}>
                    {tecnico}
                  </h3>
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{ 
                      backgroundColor: estadoStyle.bg,
                      color: estadoStyle.text
                    }}
                  >
                    {estadoStyle.label}
                  </span>
                </div>
                <p className="text-sm mb-1" style={{ color: '#4B5563' }}>
                  Zona: {sol.zona}
                  {sol.equipo_afectado && ` · Equipo: ${sol.equipo_afectado}`}
                </p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  Solicitante: {sol.solicitante} · Creada: {formatShortDate(sol.fecha, sol.hora)}
                </p>
              </div>
              
              {/* Right: Action Button */}
              <div className="col-span-12 md:col-span-2 flex justify-end">
                <div
                  className="inline-block px-4 py-2 rounded-lg font-medium text-sm text-white transition-colors"
                  style={{ backgroundColor: '#1D6FE3' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563EB' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1D6FE3' }}
                >
                  {action.label}
                </div>
              </div>
            </div>
          </div>
        </Link>
      )
    } else if (activeTab === 'por_validar') {
      // Por validar layout
      const tecnico = sol.tecnico || extractTecnicoFromObs(sol.observaciones) || 'Sin asignar'
      const accionResumen = sol.accion_realizada ? sol.accion_realizada.split('\n')[0].substring(0, 60) : 'Sin acción reportada'
      
      return (
        <Link key={sol.id} href={action.href} className="block">
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
            <div className="grid grid-cols-12 gap-4 items-start">
              {/* Left: ID + Criticidad */}
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
                  Zona: {sol.zona}
                  {sol.equipo_afectado && ` · ${sol.equipo_afectado}`}
                </p>
              </div>
              
              {/* Center: Técnico + Acción + Fecha ejecución */}
              <div className="col-span-12 md:col-span-7">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-bold" style={{ color: '#111827' }}>
                    {tecnico}
                  </h3>
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{ 
                      backgroundColor: '#FCE7F3',
                      color: '#BE185D'
                    }}
                  >
                    Por validar
                  </span>
                </div>
                <p className="text-sm mb-1" style={{ color: '#4B5563' }}>
                  Acción reportada: {accionResumen}
                </p>
                {sol.fecha_ejecucion && (
                  <p className="text-xs" style={{ color: '#6B7280' }}>
                    Fecha ejecución: {formatDateOnly(sol.fecha_ejecucion)}
                  </p>
                )}
              </div>
              
              {/* Right: Action Button */}
              <div className="col-span-12 md:col-span-2 flex justify-end">
                <div
                  className="inline-block px-4 py-2 rounded-lg font-medium text-sm text-white transition-colors"
                  style={{ backgroundColor: '#1D6FE3' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563EB' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1D6FE3' }}
                >
                  {action.label}
                </div>
              </div>
            </div>
          </div>
        </Link>
      )
    } else {
      // Historial layout (similar to current)
      return (
        <Link key={sol.id} href={action.href} className="block">
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
                  <p 
                    className="text-xs capitalize"
                    style={{ color: '#6B7280' }}
                  >
                    {sol.estado.replace('_', ' ')}
                  </p>
                  {sol.tecnico && (
                    <>
                      <span style={{ color: '#9CA3AF' }}>·</span>
                      <p className="text-xs" style={{ color: '#6B7280' }}>
                        Técnico: {sol.tecnico}
                      </p>
                    </>
                  )}
                </div>
              </div>
              
              {/* Right Block: Action Button */}
              <div className="col-span-12 md:col-span-2 flex justify-end">
                <div
                  className="inline-block px-4 py-2 rounded-lg font-medium text-sm text-white transition-colors"
                  style={{ backgroundColor: '#1D6FE3' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563EB' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1D6FE3' }}
                >
                  {action.label}
                </div>
              </div>
            </div>
          </div>
        </Link>
      )
    }
  }

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
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold mb-2" style={{ color: '#111827' }}>
                Gestión de Solicitudes de Mantenimiento
              </h1>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Bandeja de entrada, seguimiento de trabajos en curso y validación de resultados.
              </p>
            </div>
            
            {/* Date Range Selector (only for historial and en_ejecucion) */}
            {(['historial', 'en_ejecucion'].includes(activeTab)) && (
              <div className="flex items-center gap-2">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as DateRange)}
                  className="px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                  style={{ 
                    color: '#111827',
                    borderColor: '#E2E8F0',
                    '--tw-ring-color': '#1D6FE3'
                  } as React.CSSProperties}
                >
                  <option value="todos">Todos</option>
                  <option value="7">Últimos 7 días</option>
                  <option value="30">Últimos 30 días</option>
                </select>
              </div>
            )}
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
        <div className="mb-4">
          <div 
            className="rounded-lg p-4 shadow-sm border"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E2E8F0',
              boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)'
            }}
          >
            {/* Filters Row - Compact */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="flex-1 min-w-[200px] relative">
                <Search 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" 
                  style={{ color: '#9CA3AF' }}
                />
                <input
                  type="text"
                  placeholder="Buscar por #ID, zona o equipo"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors placeholder-gray-400 text-sm"
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
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors text-sm"
                style={{ 
                  color: '#111827',
                  borderColor: '#E2E8F0',
                  '--tw-ring-color': '#1D6FE3'
                } as React.CSSProperties}
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
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors text-sm"
                  style={{ 
                    color: '#111827',
                    borderColor: '#E2E8F0',
                    '--tw-ring-color': '#1D6FE3'
                  } as React.CSSProperties}
                >
                  <option value="todos">Zona: Todas</option>
                  {getZonas().map(zona => (
                    <option key={zona} value={zona}>{zona}</option>
                  ))}
                </select>
              )}
              
              {/* Técnico Filter (only for en_ejecucion, por_validar, historial) */}
              {['en_ejecucion', 'por_validar', 'historial'].includes(activeTab) && getTecnicos().length > 0 && (
                <div className="tecnico-filter-dropdown relative">
                  <button
                    type="button"
                    onClick={() => setShowTecnicoDropdown(!showTecnicoDropdown)}
                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors text-sm flex items-center gap-2 min-w-[160px] justify-between"
                    style={{ 
                      color: '#111827',
                      borderColor: showTecnicoDropdown ? '#1D6FE3' : '#E2E8F0',
                      backgroundColor: '#FFFFFF',
                      '--tw-ring-color': '#1D6FE3'
                    } as React.CSSProperties}
                  >
                    <span className="truncate">{getTecnicoFilterLabel()}</span>
                    {showTecnicoDropdown ? (
                      <ChevronUp className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 flex-shrink-0" />
                    )}
                  </button>
                  
                  {showTecnicoDropdown && (
                    <div 
                      className="absolute top-full left-0 mt-1 w-full bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
                      style={{
                        borderColor: '#E2E8F0',
                        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.10)'
                      }}
                    >
                      <div className="p-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTecnicoFilter([])
                            setShowTecnicoDropdown(false)
                          }}
                          className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                          style={{ color: '#1D6FE3' }}
                        >
                          Todos
                        </button>
                        <div className="border-t my-1" style={{ borderColor: '#E5E7EB' }}></div>
                        {getTecnicos().map(tecnico => (
                          <label
                            key={tecnico}
                            className="flex items-center px-3 py-2 text-sm rounded hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={tecnicoFilter.includes(tecnico)}
                              onChange={() => toggleTecnicoFilter(tecnico)}
                              className="mr-2 h-4 w-4 rounded border-gray-300"
                              style={{ accentColor: '#1D6FE3' }}
                            />
                            <span style={{ color: '#111827' }}>{tecnico}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setCriticidadFilter('todos')
                    setZonaFilter('todos')
                    setTecnicoFilter([])
                    setDateRange('todos')
                  }}
                  className="px-3 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg border"
                  style={{ 
                    color: '#6B7280',
                    borderColor: '#E2E8F0'
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.color = '#111827'
                    e.currentTarget.style.borderColor = '#D1D5DB'
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.color = '#6B7280'
                    e.currentTarget.style.borderColor = '#E2E8F0'
                  }}
                >
                  <X className="h-4 w-4" />
                  Limpiar
                </button>
              )}
              
              {/* Sort Toolbar - Aligned Right */}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm" style={{ color: '#6B7280' }}>Ordenar por:</span>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortByChange(e.target.value as typeof sortBy)}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors text-sm"
                  style={{ 
                    color: '#111827',
                    borderColor: '#E2E8F0',
                    '--tw-ring-color': '#1D6FE3'
                  } as React.CSSProperties}
                >
                  <option value="priority">Prioridad</option>
                  <option value="technician">Técnico</option>
                  <option value="ticket">Nº de ticket</option>
                  <option value="creation">Fecha de creación</option>
                  <option value="fecha_programada">Fecha programada</option>
                </select>
                <button
                  onClick={toggleSortOrder}
                  className="px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                  style={{ 
                    borderColor: '#E2E8F0',
                    color: '#111827'
                  }}
                  title={sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        {!loading && results.length > 0 && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Mostrando {results.length} {results.length === 1 ? 'trabajo' : 'trabajos'}
            </p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              Ordenado por {getSortLabel()}
            </p>
          </div>
        )}

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
                    setTecnicoFilter([])
                    setDateRange('todos')
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
                      Bandeja vacía
                    </h3>
                    <p className="text-sm" style={{ color: '#6B7280' }}>
                      Nuevas solicitudes aparecerán aquí para ser evaluadas y asignadas.
                    </p>
                  </>
                )}
                {activeTab === 'en_ejecucion' && (
                  <>
                    <Clock className="h-12 w-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#111827' }}>
                      No hay trabajos en curso
                    </h3>
                    <p className="text-sm" style={{ color: '#6B7280' }}>
                      Trabajos programados y en ejecución aparecerán aquí.
                    </p>
                  </>
                )}
                {activeTab === 'por_validar' && (
                  <>
                    <CheckCircle className="h-12 w-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#111827' }}>
                      No hay trabajos por validar
                    </h3>
                    <p className="text-sm" style={{ color: '#6B7280' }}>
                      Trabajos completados por técnicos aparecerán aquí para validación.
                    </p>
                  </>
                )}
                {activeTab === 'historial' && (
                  <>
                    <Archive className="h-12 w-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#111827' }}>
                      No hay registros en el historial
                    </h3>
                    <p className="text-sm" style={{ color: '#6B7280' }}>
                      Solicitudes finalizadas y no procede aparecerán aquí. Para análisis detallado visita el Dashboard.
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((sol) => renderCard(sol))}
          </div>
        )}
      </div>
    </div>
  )
}
