'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import Link from 'next/link'
import { ArrowLeft, Search, X, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'

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

type EstadoFilter = 'todos' | 'pendiente' | 'en_proceso' | 'validacion' | 'cerradas'

export default function MisSolicitudesPage() {
  const { showToast } = useToast()
  const [allSolicitudes, setAllSolicitudes] = useState<Solicitud[]>([])
  const [results, setResults] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('todos')
  const [criticidadFilter, setCriticidadFilter] = useState('todos')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const fetchMisSolicitudes = async () => {
    setLoading(true)
    try {
      // TODO: Replace with actual user from auth context
      // For now, we'll fetch all solicitudes and filter by solicitante
      const { data, error } = await supabase
        .from('solicitudes_mantenimiento')
        .select('id, ticket_id, fecha, hora, solicitante, zona, estado, nivel_riesgo, equipo_afectado, descripcion, observaciones')
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      if (error) {
        console.error('Error al buscar solicitudes:', error)
        showToast('Error al buscar solicitudes', 'error')
        setAllSolicitudes([])
        setResults([])
      } else {
        const solicitudes = data || []
        setAllSolicitudes(solicitudes)
        applyFilters(solicitudes)
      }
    } catch (err) {
      console.error('Error inesperado al buscar solicitudes:', err)
      showToast('Error inesperado al buscar solicitudes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = (solicitudes: Solicitud[]) => {
    let filtered = [...solicitudes]
    
    // Estado filter (from cards)
    switch (estadoFilter) {
      case 'pendiente':
        filtered = filtered.filter(s => s.estado === 'pendiente')
        break
      case 'en_proceso':
        filtered = filtered.filter(s => ['programada', 'en_ejecucion', 'derivada'].includes(s.estado))
        break
      case 'validacion':
        filtered = filtered.filter(s => s.estado === 'por_validar')
        break
      case 'cerradas':
        filtered = filtered.filter(s => ['finalizada', 'no procede'].includes(s.estado))
        break
      case 'todos':
      default:
        // No filter
        break
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(s => 
        s.ticket_id?.toString().includes(query) ||
        s.zona.toLowerCase().includes(query) ||
        s.equipo_afectado?.toLowerCase().includes(query) ||
        s.descripcion?.toLowerCase().includes(query)
      )
    }
    
    // Criticidad filter (advanced)
    if (criticidadFilter !== 'todos') {
      filtered = filtered.filter(s => {
        const nivel = s.nivel_riesgo || ''
        return nivel.includes(criticidadFilter)
      })
    }
    
    setResults(filtered)
  }

  useEffect(() => {
    fetchMisSolicitudes()
  }, [])

  useEffect(() => {
    applyFilters(allSolicitudes)
  }, [searchQuery, estadoFilter, criticidadFilter, allSolicitudes])

  const getEstadoCounts = () => {
    return {
      todos: allSolicitudes.length,
      pendiente: allSolicitudes.filter(s => s.estado === 'pendiente').length,
      en_proceso: allSolicitudes.filter(s => ['programada', 'en_ejecucion', 'derivada'].includes(s.estado)).length,
      validacion: allSolicitudes.filter(s => s.estado === 'por_validar').length,
      cerradas: allSolicitudes.filter(s => ['finalizada', 'no procede'].includes(s.estado)).length,
    }
  }

  const counts = getEstadoCounts()

  const getFilterLabel = (): string => {
    switch (estadoFilter) {
      case 'pendiente':
        return 'Pendientes'
      case 'en_proceso':
        return 'En proceso'
      case 'validacion':
        return 'Validación'
      case 'cerradas':
        return 'Cerradas'
      default:
        return 'Todas'
    }
  }

  const clearFilters = () => {
    setEstadoFilter('todos')
    setSearchQuery('')
    setCriticidadFilter('todos')
  }

  const hasActiveFilters = estadoFilter !== 'todos' || searchQuery.trim() || criticidadFilter !== 'todos'

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
      case 'pendiente':
        return { bg: '#FEF3C7', text: '#B45309' }
      case 'programada':
      case 'en_ejecucion':
        return { bg: '#DBEAFE', text: '#1D4ED8' }
      case 'derivada':
        return { bg: '#E0E7FF', text: '#4F46E5' }
      case 'por_validar':
        return { bg: '#FCE7F3', text: '#BE185D' }
      case 'finalizada':
        return { bg: '#DCFCE7', text: '#15803D' }
      case 'no procede':
        return { bg: '#F3F4F6', text: '#6B7280' }
      default:
        return { bg: '#F3F4F6', text: '#6B7280' }
    }
  }

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'En revisión por mantención'
      case 'programada':
        return 'Programada'
      case 'en_ejecucion':
        return 'En ejecución'
      case 'derivada':
        return 'Derivada'
      case 'por_validar':
        return 'En validación interna'
      case 'finalizada':
        return 'Finalizada'
      case 'no procede':
        return 'No procede'
      default:
        return estado
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
            Mis Solicitudes de Mantenimiento
          </h1>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Revisa el estado de las solicitudes que has creado.
          </p>
        </div>

        {/* Summary Cards - Clickable Filters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {/* Total Card */}
          <button
            onClick={() => setEstadoFilter('todos')}
            className={`rounded-lg p-4 border transition-all cursor-pointer text-left ${
              estadoFilter === 'todos' ? 'ring-2 ring-offset-2' : ''
            }`}
            style={{
              backgroundColor: estadoFilter === 'todos' ? '#EFF6FF' : '#FFFFFF',
              borderColor: estadoFilter === 'todos' ? '#1D4ED8' : '#E2E8F0',
              borderWidth: estadoFilter === 'todos' ? '2px' : '1px',
              boxShadow: estadoFilter === 'todos' ? '0 4px 12px rgba(29, 79, 216, 0.15)' : '0 4px 12px rgba(15, 23, 42, 0.06)',
              '--tw-ring-color': '#1D4ED8'
            } as React.CSSProperties & { '--tw-ring-color': string }}
            onMouseEnter={(e) => {
              if (estadoFilter !== 'todos') {
                e.currentTarget.style.backgroundColor = '#F9FAFB'
              }
            }}
            onMouseLeave={(e) => {
              if (estadoFilter !== 'todos') {
                e.currentTarget.style.backgroundColor = '#FFFFFF'
              }
            }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Total</p>
            <p className="text-2xl font-bold" style={{ color: '#111827' }}>{counts.todos}</p>
          </button>

          {/* Pendientes Card */}
          <button
            onClick={() => setEstadoFilter('pendiente')}
            className={`rounded-lg p-4 border transition-all cursor-pointer text-left ${
              estadoFilter === 'pendiente' ? 'ring-2 ring-offset-2' : ''
            }`}
            style={{
              backgroundColor: estadoFilter === 'pendiente' ? '#FFFBEB' : '#FFFBEB',
              borderColor: estadoFilter === 'pendiente' ? '#F59E0B' : '#FEF3C7',
              borderWidth: estadoFilter === 'pendiente' ? '2px' : '1px',
              boxShadow: estadoFilter === 'pendiente' ? '0 4px 12px rgba(245, 158, 11, 0.15)' : '0 4px 12px rgba(15, 23, 42, 0.06)',
              '--tw-ring-color': '#F59E0B'
            } as React.CSSProperties & { '--tw-ring-color': string }}
            onMouseEnter={(e) => {
              if (estadoFilter !== 'pendiente') {
                e.currentTarget.style.backgroundColor = '#FEF3C7'
              }
            }}
            onMouseLeave={(e) => {
              if (estadoFilter !== 'pendiente') {
                e.currentTarget.style.backgroundColor = '#FFFBEB'
              }
            }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: '#92400E' }}>Pendientes</p>
            <p className="text-2xl font-bold" style={{ color: '#92400E' }}>{counts.pendiente}</p>
          </button>

          {/* En proceso Card */}
          <button
            onClick={() => setEstadoFilter('en_proceso')}
            className={`rounded-lg p-4 border transition-all cursor-pointer text-left ${
              estadoFilter === 'en_proceso' ? 'ring-2 ring-offset-2' : ''
            }`}
            style={{
              backgroundColor: estadoFilter === 'en_proceso' ? '#EFF6FF' : '#EFF6FF',
              borderColor: estadoFilter === 'en_proceso' ? '#2563EB' : '#DBEAFE',
              borderWidth: estadoFilter === 'en_proceso' ? '2px' : '1px',
              boxShadow: estadoFilter === 'en_proceso' ? '0 4px 12px rgba(37, 99, 235, 0.15)' : '0 4px 12px rgba(15, 23, 42, 0.06)',
              '--tw-ring-color': '#2563EB'
            } as React.CSSProperties & { '--tw-ring-color': string }}
            onMouseEnter={(e) => {
              if (estadoFilter !== 'en_proceso') {
                e.currentTarget.style.backgroundColor = '#DBEAFE'
              }
            }}
            onMouseLeave={(e) => {
              if (estadoFilter !== 'en_proceso') {
                e.currentTarget.style.backgroundColor = '#EFF6FF'
              }
            }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: '#1E40AF' }}>En proceso</p>
            <p className="text-2xl font-bold" style={{ color: '#1E40AF' }}>{counts.en_proceso}</p>
          </button>

          {/* Validación Card */}
          <button
            onClick={() => setEstadoFilter('validacion')}
            className={`rounded-lg p-4 border transition-all cursor-pointer text-left ${
              estadoFilter === 'validacion' ? 'ring-2 ring-offset-2' : ''
            }`}
            style={{
              backgroundColor: estadoFilter === 'validacion' ? '#FDF4FF' : '#FDF4FF',
              borderColor: estadoFilter === 'validacion' ? '#C026D3' : '#FCE7F3',
              borderWidth: estadoFilter === 'validacion' ? '2px' : '1px',
              boxShadow: estadoFilter === 'validacion' ? '0 4px 12px rgba(192, 38, 211, 0.15)' : '0 4px 12px rgba(15, 23, 42, 0.06)',
              '--tw-ring-color': '#C026D3'
            } as React.CSSProperties & { '--tw-ring-color': string }}
            onMouseEnter={(e) => {
              if (estadoFilter !== 'validacion') {
                e.currentTarget.style.backgroundColor = '#FCE7F3'
              }
            }}
            onMouseLeave={(e) => {
              if (estadoFilter !== 'validacion') {
                e.currentTarget.style.backgroundColor = '#FDF4FF'
              }
            }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: '#9F1239' }}>Validación</p>
            <p className="text-2xl font-bold" style={{ color: '#9F1239' }}>{counts.validacion}</p>
          </button>

          {/* Cerradas Card */}
          <button
            onClick={() => setEstadoFilter('cerradas')}
            className={`rounded-lg p-4 border transition-all cursor-pointer text-left ${
              estadoFilter === 'cerradas' ? 'ring-2 ring-offset-2' : ''
            }`}
            style={{
              backgroundColor: estadoFilter === 'cerradas' ? '#F0FDF4' : '#F0FDF4',
              borderColor: estadoFilter === 'cerradas' ? '#16A34A' : '#DCFCE7',
              borderWidth: estadoFilter === 'cerradas' ? '2px' : '1px',
              boxShadow: estadoFilter === 'cerradas' ? '0 4px 12px rgba(22, 163, 74, 0.15)' : '0 4px 12px rgba(15, 23, 42, 0.06)',
              '--tw-ring-color': '#16A34A'
            } as React.CSSProperties & { '--tw-ring-color': string }}
            onMouseEnter={(e) => {
              if (estadoFilter !== 'cerradas') {
                e.currentTarget.style.backgroundColor = '#DCFCE7'
              }
            }}
            onMouseLeave={(e) => {
              if (estadoFilter !== 'cerradas') {
                e.currentTarget.style.backgroundColor = '#F0FDF4'
              }
            }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: '#14532D' }}>Cerradas</p>
            <p className="text-2xl font-bold" style={{ color: '#14532D' }}>{counts.cerradas}</p>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" 
                style={{ color: '#9CA3AF' }}
              />
              <input
                type="text"
                placeholder="Buscar por #ID, zona o equipo..."
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
            
            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors flex items-center gap-2"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E8F0',
                color: '#6B7280'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB'
                e.currentTarget.style.color = '#111827'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF'
                e.currentTarget.style.color = '#6B7280'
              }}
            >
              Filtros avanzados
              {showAdvancedFilters ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div 
              className="mt-4 p-4 rounded-lg border"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E8F0',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)'
              }}
            >
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Criticidad
                  </label>
                  <select
                    value={criticidadFilter}
                    onChange={(e) => setCriticidadFilter(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                    style={{ 
                      color: '#111827',
                      borderColor: '#E2E8F0',
                      '--tw-ring-color': '#1D6FE3'
                    } as React.CSSProperties}
                  >
                    <option value="todos">Todos</option>
                    <option value="Crítico">Crítico</option>
                    <option value="Alto">Alto</option>
                    <option value="Medio">Medio</option>
                    <option value="Bajo">Bajo</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        {!loading && results.length > 0 && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: '#6B7280' }}>
                Mostrando: <strong style={{ color: '#111827' }}>{getFilterLabel()}</strong> ({results.length})
              </span>
              {criticidadFilter !== 'todos' && (
                <span 
                  className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                  style={{ 
                    backgroundColor: getRiskBadgeStyle(criticidadFilter).bg,
                    color: getRiskBadgeStyle(criticidadFilter).text
                  }}
                >
                  {getRiskLabel(criticidadFilter)}
                  <button
                    onClick={() => setCriticidadFilter('todos')}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm flex items-center gap-1 transition-colors"
                style={{ color: '#6B7280' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#111827' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#6B7280' }}
              >
                <X className="h-4 w-4" />
                Limpiar filtros
              </button>
            )}
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
                <FileText className="h-12 w-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#111827' }}>
                  No se encontraron resultados
                </h3>
                <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
                  Intenta ajustar los filtros para ver más resultados.
                </p>
                <button
                  onClick={clearFilters}
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
                <FileText className="h-12 w-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#111827' }}>
                  No tienes solicitudes
                </h3>
                <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
                  Cuando crees una solicitud de mantenimiento aparecerá aquí.
                </p>
                <Link
                  href="/area/mantencion/checklist/solicitud_mtto"
                  className="inline-block px-6 py-2 text-white rounded-lg transition-colors font-medium"
                  style={{ 
                    backgroundColor: '#1D6FE3',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563EB' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1D6FE3' }}
                >
                  Crear solicitud
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((sol) => {
              const estadoStyle = getEstadoBadgeStyle(sol.estado)
              const riskStyle = getRiskBadgeStyle(sol.nivel_riesgo)
              return (
                <Link
                  key={sol.id}
                  href={`/area/mantencion/solicitudes/mis/${sol.id}`}
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
                    <div className="grid grid-cols-12 gap-4 items-start">
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
                        <div className="mb-2">
                          <span 
                            className="px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: estadoStyle.bg,
                              color: estadoStyle.text
                            }}
                          >
                            {getEstadoLabel(sol.estado)}
                          </span>
                        </div>
                        <h3 className="font-semibold mb-1" style={{ color: '#111827' }}>
                          {sol.zona}
                          {sol.equipo_afectado && ` · ${sol.equipo_afectado}`}
                        </h3>
                        {sol.descripcion && (
                          <p className="text-sm line-clamp-2" style={{ color: '#6B7280' }}>
                            {sol.descripcion}
                          </p>
                        )}
                        {sol.observaciones && sol.estado !== 'pendiente' && (
                          <p className="text-xs mt-2 italic" style={{ color: '#9CA3AF' }}>
                            {sol.observaciones.substring(0, 100)}{sol.observaciones.length > 100 ? '...' : ''}
                          </p>
                        )}
                      </div>
                      
                      {/* Right Block: Action */}
                      <div className="col-span-12 md:col-span-2 flex justify-end items-start">
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
                          Ver detalle
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
