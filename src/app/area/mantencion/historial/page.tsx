'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import Link from 'next/link'
import { ArrowLeft, Search, Download, Calendar, Filter, X } from 'lucide-react'
import { format, subDays, startOfMonth, startOfYear, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

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
  tipo_falla?: string
  tecnico?: string
  fecha_ejecucion?: string
  estado_final?: string
  created_at?: string
  updated_at?: string
}

type DatePreset = '7d' | '30d' | 'month' | 'year' | 'custom'

export default function HistorialMantenimientoPage() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState<boolean>(true)
  const [allSolicitudes, setAllSolicitudes] = useState<Solicitud[]>([])
  
  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>('30d')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [estadoFilter, setEstadoFilter] = useState<string>('todos')
  const [criticidadFilter, setCriticidadFilter] = useState<string>('todos')
  const [zonaFilter, setZonaFilter] = useState<string>('todos')
  const [equipoFilter, setEquipoFilter] = useState<string>('todos')
  const [tecnicoFilter, setTecnicoFilter] = useState<string>('todos')
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // Table
  const [sortColumn, setSortColumn] = useState<string>('fecha')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage] = useState<number>(25)

  useEffect(() => {
    fetchSolicitudes()
  }, [])

  const fetchSolicitudes = async () => {
    setLoading(true)
    try {
      // Fetch ALL records first to see what we have
      const { data: allData, error: allError } = await supabase
        .from('solicitudes_mantenimiento')
        .select('*')
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })
      
      if (allError) {
        console.error('Error al buscar todas las solicitudes:', allError)
        showToast('Error al buscar solicitudes', 'error')
        setAllSolicitudes([])
        return
      }

      console.log('📊 Total records in database:', allData?.length)
      console.log('📋 Unique estados found:', Array.from(new Set(allData?.map(s => s.estado || 'null'))))
      console.log('📋 All records with estados:', allData?.map(s => ({ 
        id: s.id, 
        ticket_id: s.ticket_id, 
        estado: s.estado, 
        estado_final: s.estado_final,
        fecha: s.fecha 
      })))
      
      // Filter for historial states - include all states that should be in historial
      // This includes finalized ones and also any that have estado_final set
      const historialData = (allData || []).filter(s => {
        const estado = s.estado || ''
        const estadoFinal = s.estado_final || ''
        
        // Include if estado is finalizada or no procede
        if (['finalizada', 'no procede'].includes(estado)) return true
        
        // Include if estado_final is set (means it was processed)
        if (estadoFinal && ['finalizada', 'no procede', 'resuelta'].includes(estadoFinal)) return true
        
        // Also include if fecha_ejecucion is set (means work was done)
        if (s.fecha_ejecucion) return true
        
        return false
      })
      
      console.log('✅ Records matching historial criteria:', historialData.length)
      console.log('📋 Historial estados breakdown:', 
        historialData.reduce((acc, s) => {
          const estado = s.estado || s.estado_final || 'unknown'
          acc[estado] = (acc[estado] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      )
      
      setAllSolicitudes(historialData)
    } catch (err) {
      console.error('Error inesperado:', err)
      showToast('Error inesperado al cargar solicitudes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getDateRange = () => {
    const now = new Date()
    switch (datePreset) {
      case '7d':
        return { start: subDays(now, 7), end: now }
      case '30d':
        return { start: subDays(now, 30), end: now }
      case 'month':
        return { start: startOfMonth(now), end: now }
      case 'year':
        return { start: startOfYear(now), end: now }
      case 'custom':
        return {
          start: customStartDate ? new Date(customStartDate) : subDays(now, 30),
          end: customEndDate ? new Date(customEndDate) : now
        }
    }
  }

  const filteredSolicitudes = useMemo(() => {
    let filtered = [...allSolicitudes]
    const { start, end } = getDateRange()

    // Date filter
    filtered = filtered.filter(s => {
      const solicitudDate = new Date(`${s.fecha} ${s.hora}`)
      return solicitudDate >= start && solicitudDate <= end
    })

    // Estado filter
    if (estadoFilter !== 'todos') {
      filtered = filtered.filter(s => s.estado === estadoFilter || s.estado_final === estadoFilter)
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

    // Equipo filter
    if (equipoFilter !== 'todos') {
      filtered = filtered.filter(s => s.equipo_afectado === equipoFilter)
    }

    // Tecnico filter
    if (tecnicoFilter !== 'todos') {
      filtered = filtered.filter(s => s.tecnico === tecnicoFilter)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(s =>
        s.ticket_id?.toString().includes(query) ||
        s.zona.toLowerCase().includes(query) ||
        s.equipo_afectado?.toLowerCase().includes(query) ||
        s.solicitante.toLowerCase().includes(query) ||
        s.tecnico?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [allSolicitudes, datePreset, customStartDate, customEndDate, estadoFilter, criticidadFilter, zonaFilter, equipoFilter, tecnicoFilter, searchQuery])

  const sortedSolicitudes = useMemo(() => {
    const sorted = [...filteredSolicitudes]
    sorted.sort((a, b) => {
      let aVal: any = a[sortColumn as keyof Solicitud]
      let bVal: any = b[sortColumn as keyof Solicitud]

      if (sortColumn === 'fecha' || sortColumn === 'created_at') {
        aVal = new Date(`${a.fecha} ${a.hora}`).getTime()
        bVal = new Date(`${b.fecha} ${b.hora}`).getTime()
      } else if (sortColumn === 'ticket_id') {
        aVal = a.ticket_id || 0
        bVal = b.ticket_id || 0
      }

      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [filteredSolicitudes, sortColumn, sortDirection])

  const paginatedSolicitudes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return sortedSolicitudes.slice(start, start + itemsPerPage)
  }, [sortedSolicitudes, currentPage, itemsPerPage])

  // Helper function to safely calculate resolution time
  const calculateResolutionTime = (sol: Solicitud): number | null => {
    if (!sol.fecha_ejecucion || !sol.fecha || !sol.hora) return null
    
    try {
      const inicio = new Date(`${sol.fecha} ${sol.hora}`)
      const fin = new Date(sol.fecha_ejecucion)
      
      // Validate dates
      if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return null
      
      const tiempo = (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60) // horas
      
      // Only return positive values (fin must be after inicio)
      return tiempo > 0 ? tiempo : null
    } catch {
      return null
    }
  }

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredSolicitudes.length
    const criticasAltas = filteredSolicitudes.filter(s => {
      const nivel = s.nivel_riesgo || ''
      return nivel.includes('Crítico') || nivel.includes('Alto')
    }).length
    const porcentajeCriticasAltas = total > 0 ? Math.round((criticasAltas / total) * 100) : 0

    // MTTR (Mean Time To Repair)
    const tiemposResolucion = filteredSolicitudes
      .map(s => calculateResolutionTime(s))
      .filter((t): t is number => t !== null && t > 0)
    const mttr = tiemposResolucion.length > 0
      ? tiemposResolucion.reduce((a, b) => a + b, 0) / tiemposResolucion.length
      : 0

    // Backlog máximo (simulado basado en fechas de creación)
    const fechasUnicas = Array.from(new Set(filteredSolicitudes.map(s => s.fecha))).sort()
    let maxBacklog = 0
    fechasUnicas.forEach(fecha => {
      const pendientesEnFecha = filteredSolicitudes.filter(s => {
        const solicitudFecha = new Date(`${s.fecha} ${s.hora}`)
        const fechaLimite = new Date(`${fecha} 23:59:59`)
        return solicitudFecha <= fechaLimite && (!s.fecha_ejecucion || new Date(s.fecha_ejecucion) > fechaLimite)
      }).length
      maxBacklog = Math.max(maxBacklog, pendientesEnFecha)
    })

    // Zona más crítica
    const zonasCount = filteredSolicitudes.reduce((acc, s) => {
      acc[s.zona] = (acc[s.zona] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const zonaMasCritica = Object.entries(zonasCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

    return {
      total,
      porcentajeCriticasAltas,
      mttr: mttr.toFixed(1),
      maxBacklog,
      zonaMasCritica
    }
  }, [filteredSolicitudes])

  // Chart data
  const chartData = useMemo(() => {
    const { start, end } = getDateRange()
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const groupBy = days > 90 ? 'week' : 'day'

    const dataMap: Record<string, { creadas: number; finalizadas: number }> = {}

    filteredSolicitudes.forEach(s => {
      const fecha = new Date(`${s.fecha} ${s.hora}`)
      let key: string
      if (groupBy === 'week') {
        const weekStart = format(fecha, 'yyyy-MM-dd', { locale: es })
        key = `Semana ${format(fecha, 'w', { locale: es })}`
      } else {
        key = format(fecha, 'dd-MM-yyyy', { locale: es })
      }

      if (!dataMap[key]) {
        dataMap[key] = { creadas: 0, finalizadas: 0 }
      }
      dataMap[key].creadas++

      if (s.fecha_ejecucion) {
        dataMap[key].finalizadas++
      }
    })

    return Object.entries(dataMap)
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => {
        try {
          // Try to parse dates - handle different formats
          const dateAStr = a.date.includes('Semana') ? a.date : a.date.split(' ')[0] || a.date
          const dateBStr = b.date.includes('Semana') ? b.date : b.date.split(' ')[0] || b.date
          
          // If it's a week format, extract week number for comparison
          if (a.date.includes('Semana') && b.date.includes('Semana')) {
            return a.date.localeCompare(b.date)
          }
          
          const dateA = dateAStr.includes('-') ? new Date(dateAStr.split('-').reverse().join('-')) : new Date(dateAStr)
          const dateB = dateBStr.includes('-') ? new Date(dateBStr.split('-').reverse().join('-')) : new Date(dateBStr)
          return dateA.getTime() - dateB.getTime()
        } catch {
          return a.date.localeCompare(b.date)
        }
      })
  }, [filteredSolicitudes, datePreset, customStartDate, customEndDate])

  const distributionData = useMemo(() => {
    // Por criticidad
    const criticidadCount = filteredSolicitudes.reduce((acc, s) => {
      const nivel = s.nivel_riesgo || ''
      let key = 'Sin definir'
      if (nivel.includes('Crítico')) key = 'Crítico'
      else if (nivel.includes('Alto')) key = 'Alto'
      else if (nivel.includes('Medio')) key = 'Medio'
      else if (nivel.includes('Bajo')) key = 'Bajo'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Top 5 zonas
    const zonasCount = filteredSolicitudes.reduce((acc, s) => {
      acc[s.zona] = (acc[s.zona] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const topZonas = Object.entries(zonasCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([zona, count]) => ({ zona, count }))

    return { criticidad: criticidadCount, topZonas }
  }, [filteredSolicitudes])

  const getZonas = () => {
    return Array.from(new Set(allSolicitudes.map(s => s.zona))).sort()
  }

  const getEquipos = () => {
    const equipos = allSolicitudes
      .filter(s => s.equipo_afectado)
      .map(s => s.equipo_afectado!)
    return Array.from(new Set(equipos)).sort()
  }

  const getTecnicos = () => {
    const tecnicos = allSolicitudes
      .filter(s => s.tecnico)
      .map(s => s.tecnico!)
    return Array.from(new Set(tecnicos)).sort()
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const exportToExcel = () => {
    const headers = ['#ID', 'Fecha Creación', 'Fecha Finalización', 'Tiempo Resolución (h)', 'Criticidad', 'Zona', 'Equipo', 'Técnico', 'Estado']
    const rows = filteredSolicitudes.map(s => {
      const fechaCreacion = `${s.fecha} ${s.hora}`
      const fechaFinalizacion = s.fecha_ejecucion || '-'
      const tiempoResolucion = calculateResolutionTime(s)
      return [
        s.ticket_id || '-',
        fechaCreacion,
        fechaFinalizacion,
        tiempoResolucion !== null ? tiempoResolucion.toFixed(2) : '-',
        s.nivel_riesgo || '-',
        s.zona,
        s.equipo_afectado || '-',
        s.tecnico || '-',
        s.estado_final || s.estado
      ]
    })

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `historial_mantenimiento_${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
  }

  const hasActiveFilters = estadoFilter !== 'todos' || criticidadFilter !== 'todos' || zonaFilter !== 'todos' || equipoFilter !== 'todos' || tecnicoFilter !== 'todos' || searchQuery.trim()

  const COLORS = {
    crítico: '#B91C1C',
    alto: '#C2410C',
    medio: '#B45309',
    bajo: '#15803D'
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F5F7FB' }}>
      <div className="max-w-[1400px] mx-auto">
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
            Historial de Solicitudes de Mantenimiento
          </h1>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Análisis y métricas de solicitudes finalizadas.
          </p>
        </div>

        {/* Global Filters */}
        <div 
          className="rounded-lg p-4 mb-6 border"
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#E2E8F0',
            boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: '#E2E8F0' }}>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" style={{ color: '#6B7280' }} />
              <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>Filtros</h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm" style={{ color: '#6B7280' }}>
                {filteredSolicitudes.length} solicitud{filteredSolicitudes.length !== 1 ? 'es' : ''} en el período
              </span>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setEstadoFilter('todos')
                    setCriticidadFilter('todos')
                    setZonaFilter('todos')
                    setEquipoFilter('todos')
                    setTecnicoFilter('todos')
                    setSearchQuery('')
                  }}
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
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
                Rango de fechas
              </label>
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: '#E2E8F0', color: '#111827' }}
              >
                <option value="7d">Últimos 7 días</option>
                <option value="30d">Últimos 30 días</option>
                <option value="month">Este mes</option>
                <option value="year">Este año</option>
                <option value="custom">Rango personalizado</option>
              </select>
              {datePreset === 'custom' && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg"
                    style={{ borderColor: '#E2E8F0' }}
                  />
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg"
                    style={{ borderColor: '#E2E8F0' }}
                  />
                </div>
              )}
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
                Estado
              </label>
              <select
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: '#E2E8F0', color: '#111827' }}
              >
                <option value="todos">Todos</option>
                <option value="finalizada">Finalizada</option>
                <option value="no procede">No Procede</option>
              </select>
            </div>

            {/* Criticidad */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
                Criticidad
              </label>
              <select
                value={criticidadFilter}
                onChange={(e) => setCriticidadFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: '#E2E8F0', color: '#111827' }}
              >
                <option value="todos">Todas</option>
                <option value="Crítico">Crítico</option>
                <option value="Alto">Alto</option>
                <option value="Medio">Medio</option>
                <option value="Bajo">Bajo</option>
              </select>
            </div>

            {/* Zona */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
                Zona
              </label>
              <select
                value={zonaFilter}
                onChange={(e) => setZonaFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: '#E2E8F0', color: '#111827' }}
              >
                <option value="todos">Todas</option>
                {getZonas().map(zona => (
                  <option key={zona} value={zona}>{zona}</option>
                ))}
              </select>
            </div>

            {/* Equipo */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
                Equipo
              </label>
              <select
                value={equipoFilter}
                onChange={(e) => setEquipoFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: '#E2E8F0', color: '#111827' }}
              >
                <option value="todos">Todos</option>
                {getEquipos().map(equipo => (
                  <option key={equipo} value={equipo}>{equipo}</option>
                ))}
              </select>
            </div>

            {/* Técnico */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
                Técnico
              </label>
              <select
                value={tecnicoFilter}
                onChange={(e) => setTecnicoFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: '#E2E8F0', color: '#111827' }}
              >
                <option value="todos">Todos</option>
                {getTecnicos().map(tecnico => (
                  <option key={tecnico} value={tecnico}>{tecnico}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* KPIs - First Row (Priority) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <KPICard
            title="Total de solicitudes"
            value={kpis.total}
            subtitle="Solicitudes registradas"
            priority="high"
          />
          <KPICard
            title="Críticas / Altas"
            value={kpis.porcentajeCriticasAltas}
            unit="%"
            subtitle="% de solicitudes con criticidad Crítico o Alto."
            priority="high"
            warning={kpis.porcentajeCriticasAltas > 30}
          />
          <KPICard
            title="Tiempo medio de cierre"
            value={kpis.mttr}
            unit="h"
            subtitle="Promedio desde creación hasta finalización"
            priority="high"
          />
        </div>

        {/* KPIs - Second Row (Supporting) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6" style={{ maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto' }}>
          <KPICard
            title="Máximo pendiente simultáneo"
            value={kpis.maxBacklog}
            subtitle="Pico de carga en el período seleccionado."
            priority="low"
          />
          <KPICard
            title="Zona más crítica"
            value={kpis.zonaMasCritica}
            subtitle="Zona con mayor número de solicitudes."
            priority="low"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Tendency Chart */}
          <div 
            className="rounded-lg p-6 border"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E2E8F0',
              boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)'
            }}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-1" style={{ color: '#111827' }}>
                Tendencia de solicitudes creadas vs finalizadas
              </h3>
              <p className="text-xs" style={{ color: '#6B7280' }}>
                Agrupado por {(() => {
                  const { start, end } = getDateRange()
                  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                  return days > 90 ? 'semana' : 'día'
                })()} (según rango de fechas)
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#6B7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="creadas" stroke="#1D6FE3" strokeWidth={chartData.length < 10 ? 3 : 2} name="Creadas" />
                <Line type="monotone" dataKey="finalizadas" stroke="#22C55E" strokeWidth={chartData.length < 10 ? 3 : 2} name="Finalizadas" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Distribution Chart */}
          <div 
            className="rounded-lg p-6 border"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E2E8F0',
              boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)'
            }}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-1" style={{ color: '#111827' }}>
                Distribución por Criticidad
              </h3>
              <p className="text-xs" style={{ color: '#6B7280' }}>
                % de solicitudes por criticidad (según filtros aplicados)
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Object.entries(distributionData.criticidad)
                .filter(([_, value]) => value > 0)
                .map(([name, value]) => ({ name, value }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#6B7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                <Tooltip />
                <Bar dataKey="value">
                  {Object.entries(distributionData.criticidad)
                    .filter(([_, value]) => value > 0)
                    .map(([name], index) => {
                      const colorMap: Record<string, string> = {
                        'Crítico': '#B91C1C',
                        'Alto': '#C2410C',
                        'Medio': '#B45309',
                        'Bajo': '#15803D',
                        'Sin definir': '#6B7280'
                      }
                      return (
                        <Cell key={`cell-${index}`} fill={colorMap[name] || '#9CA3AF'} />
                      )
                    })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Zonas Chart */}
        {distributionData.topZonas.length > 0 && (
          <div 
            className="rounded-lg p-6 mb-6 border"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E2E8F0',
              boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)'
            }}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-1" style={{ color: '#111827' }}>
                Top 5 Zonas con más Solicitudes
              </h3>
              <p className="text-xs" style={{ color: '#6B7280' }}>
                Según cantidad de solicitudes en el período
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distributionData.topZonas} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" stroke="#6B7280" style={{ fontSize: '12px' }} />
                <YAxis dataKey="zona" type="category" stroke="#6B7280" style={{ fontSize: '12px' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1D6FE3" label={{ position: 'right', fill: '#111827', fontSize: '12px', fontWeight: 'medium' }}>
                  {distributionData.topZonas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#1D6FE3" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Table */}
        <div 
          className="rounded-lg border overflow-hidden"
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#E2E8F0',
            boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)'
          }}
        >
          {/* Header */}
          <div className="p-4 border-b" style={{ borderColor: '#E2E8F0' }}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: '#111827' }}>
                  Detalle de solicitudes
                </h3>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredSolicitudes.length)} de {filteredSolicitudes.length} solicitudes
                </p>
              </div>
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                style={{ backgroundColor: '#1D6FE3' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563EB' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1D6FE3' }}
              >
                <Download className="h-4 w-4" />
                Exportar a Excel
              </button>
            </div>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#9CA3AF' }} />
              <input
                type="text"
                placeholder="Buscar por #ID, zona, equipo, técnico..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: '#E2E8F0', color: '#111827' }}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-b-2 rounded-full" style={{ borderColor: '#1D6FE3' }}></div>
            </div>
          ) : paginatedSolicitudes.length === 0 ? (
            <div className="text-center py-12">
              <p style={{ color: '#6B7280' }}>No se encontraron solicitudes con los filtros aplicados.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10" style={{ backgroundColor: '#F9FAFB' }}>
                    <tr>
                      <TableHeader onClick={() => handleSort('ticket_id')} sorted={sortColumn === 'ticket_id'} direction={sortDirection}>
                        #ID
                      </TableHeader>
                      <TableHeader onClick={() => handleSort('fecha')} sorted={sortColumn === 'fecha'} direction={sortDirection}>
                        Fecha creación
                      </TableHeader>
                      <TableHeader onClick={() => handleSort('fecha_ejecucion')} sorted={sortColumn === 'fecha_ejecucion'} direction={sortDirection}>
                        Fecha finalización
                      </TableHeader>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase cursor-pointer hover:bg-gray-100 transition-colors" style={{ color: '#6B7280' }}>
                        Tiempo de resolución
                      </th>
                      <TableHeader onClick={() => handleSort('nivel_riesgo')} sorted={sortColumn === 'nivel_riesgo'} direction={sortDirection}>
                        Criticidad
                      </TableHeader>
                      <TableHeader onClick={() => handleSort('zona')} sorted={sortColumn === 'zona'} direction={sortDirection}>
                        Zona
                      </TableHeader>
                      <TableHeader onClick={() => handleSort('equipo_afectado')} sorted={sortColumn === 'equipo_afectado'} direction={sortDirection}>
                        Equipo
                      </TableHeader>
                      <TableHeader onClick={() => handleSort('tecnico')} sorted={sortColumn === 'tecnico'} direction={sortDirection}>
                        Técnico
                      </TableHeader>
                      <TableHeader onClick={() => handleSort('estado')} sorted={sortColumn === 'estado'} direction={sortDirection}>
                        Estado
                      </TableHeader>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: '#E5E7EB' }}>
                    {paginatedSolicitudes.map((sol, index) => {
                      const tiempoResolucion = calculateResolutionTime(sol)
                      const riskStyle = getRiskBadgeStyle(sol.nivel_riesgo)
                      return (
                        <tr 
                          key={sol.id} 
                          className="hover:bg-gray-50"
                          style={{ backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}
                        >
                          <td className="px-4 py-2 text-sm font-semibold" style={{ color: '#111827' }}>
                            {sol.ticket_id ? (
                              <Link
                                href={`/area/mantencion/evaluacion_solicitudes/${sol.id}`}
                                className="hover:underline transition-colors"
                                style={{ color: '#1D6FE3' }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#2563EB' }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = '#1D6FE3' }}
                              >
                                #{sol.ticket_id}
                              </Link>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm" style={{ color: '#6B7280' }}>
                            {(() => {
                            try {
                              return format(new Date(`${sol.fecha} ${sol.hora}`), 'dd-MM-yyyy HH:mm', { locale: es })
                            } catch {
                              return `${sol.fecha} ${sol.hora}`
                            }
                          })()}
                          </td>
                          <td className="px-4 py-2 text-sm" style={{ color: '#6B7280' }}>
                            {sol.fecha_ejecucion ? (() => {
                              try {
                                return format(new Date(sol.fecha_ejecucion), 'dd-MM-yyyy HH:mm', { locale: es })
                              } catch {
                                return sol.fecha_ejecucion
                              }
                            })() : '—'}
                          </td>
                          <td className="px-4 py-2 text-sm text-right" style={{ color: '#6B7280' }}>
                            {tiempoResolucion !== null && tiempoResolucion > 0 ? `${tiempoResolucion.toFixed(1)} h` : '—'}
                          </td>
                          <td className="px-4 py-2">
                            {sol.nivel_riesgo && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: riskStyle.bg, color: riskStyle.text }}>
                                {getRiskLabel(sol.nivel_riesgo)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm" style={{ color: '#6B7280' }}>{sol.zona}</td>
                          <td className="px-4 py-2 text-sm" style={{ color: '#6B7280' }}>{sol.equipo_afectado || '-'}</td>
                          <td className="px-4 py-2 text-sm" style={{ color: '#6B7280' }}>{sol.tecnico || '-'}</td>
                          <td className="px-4 py-2 text-sm capitalize" style={{ color: '#6B7280' }}>
                            {sol.estado_final || sol.estado}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t flex justify-between items-center" style={{ borderColor: '#E2E8F0' }}>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredSolicitudes.length)} de {filteredSolicitudes.length}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ borderColor: '#E2E8F0', color: '#111827' }}
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredSolicitudes.length / itemsPerPage), p + 1))}
                    disabled={currentPage >= Math.ceil(filteredSolicitudes.length / itemsPerPage)}
                    className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ borderColor: '#E2E8F0', color: '#111827' }}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function KPICard({ 
  title, 
  value, 
  unit, 
  subtitle, 
  priority = 'low',
  warning = false
}: { 
  title: string
  value: string | number
  unit?: string
  subtitle: string
  priority?: 'high' | 'low'
  warning?: boolean
}) {
  const displayValue = typeof value === 'number' ? value.toString() : value
  const valueColor = warning ? '#C2410C' : '#111827'
  
  return (
    <div 
      className="rounded-lg p-6 border"
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
        boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)'
      }}
    >
      <h3 className="text-sm font-medium mb-2" style={{ color: '#6B7280' }}>{title}</h3>
      <div className="flex items-baseline gap-1 mb-2">
        <p className="text-3xl font-bold" style={{ color: valueColor }}>
          {displayValue}
        </p>
        {unit && (
          <span className="text-lg font-normal" style={{ color: '#6B7280' }}>
            {unit}
          </span>
        )}
      </div>
      <p className="text-xs" style={{ color: '#9CA3AF' }}>{subtitle}</p>
    </div>
  )
}

function TableHeader({ 
  children, 
  onClick, 
  sorted, 
  direction 
}: { 
  children: React.ReactNode
  onClick?: () => void
  sorted?: boolean
  direction?: 'asc' | 'desc'
}) {
  return (
    <th
      onClick={onClick}
      className={`px-4 py-3 text-left text-xs font-semibold uppercase cursor-pointer hover:bg-gray-100 transition-colors ${onClick ? '' : ''}`}
      style={{ color: '#6B7280' }}
    >
      <div className="flex items-center gap-1">
        {children}
        {sorted && (
          <span className="text-xs">{direction === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  )
}

function getRiskBadgeStyle(nivelRiesgo?: string) {
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

function getRiskLabel(nivelRiesgo?: string) {
  if (!nivelRiesgo) return null
  
  if (nivelRiesgo.includes('Crítico')) return 'Crítico'
  if (nivelRiesgo.includes('Alto')) return 'Alto'
  if (nivelRiesgo.includes('Medio')) return 'Medio'
  return 'Bajo'
}

