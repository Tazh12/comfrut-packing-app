'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { ArrowLeft, Clock, User, Calendar, X, ZoomIn } from 'lucide-react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface TecnicoInfo {
  nombre: string
  trabajosEnCurso: number
  especialidad?: string
}

export default function AsignarSolicitudPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { showToast } = useToast()

  const [solicitud, setSolicitud] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [showTecnicoDropdown, setShowTecnicoDropdown] = useState(false)
  const [tecnicoSearch, setTecnicoSearch] = useState('')
  const [tecnicos, setTecnicos] = useState<TecnicoInfo[]>([])
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  
  // Form state
  const [tecnico, setTecnico] = useState<string>('')
  const [prioridad, setPrioridad] = useState<string>('')
  const [fechaProgramada, setFechaProgramada] = useState<string>('')
  const [observaciones, setObservaciones] = useState<string>('')

  useEffect(() => {
    // Prevent running if we're redirecting or submitting
    if (isRedirecting || submitting) return

    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch solicitud
        const { data: solicitudData, error: solicitudError } = await supabase
          .from('solicitudes_mantenimiento')
          .select('*')
          .eq('id', id)
          .single()
        
        if (solicitudError || !solicitudData) {
          console.error('Error al obtener solicitud:', solicitudError)
          showToast('No se encontró la solicitud', 'error')
          setIsRedirecting(true)
          router.push('/area/mantencion/evaluacion_solicitudes')
          return
        }
        
        if (solicitudData.estado !== 'pendiente') {
          setIsRedirecting(true)
          showToast('Esta solicitud ya ha sido asignada', 'success')
          setTimeout(() => {
            router.push('/area/mantencion/evaluacion_solicitudes')
          }, 1500)
          return
        }
        
        setSolicitud(solicitudData)

        // Fetch técnicos y calcular carga de trabajo
        const { data: allSolicitudes, error: tecnicosError } = await supabase
          .from('solicitudes_mantenimiento')
          .select('tecnico, observaciones, estado')
          .in('estado', ['programada', 'en_ejecucion', 'derivada', 'por_validar'])

        if (!tecnicosError && allSolicitudes) {
          // Extract técnicos from tecnico field and observaciones
          const tecnicoMap = new Map<string, number>()
          
          allSolicitudes.forEach(s => {
            const tecnico = s.tecnico || extractTecnicoFromObs(s.observaciones)
            if (tecnico) {
              tecnicoMap.set(tecnico, (tecnicoMap.get(tecnico) || 0) + 1)
            }
          })

          // Convert to array
          const tecnicosList: TecnicoInfo[] = Array.from(tecnicoMap.entries()).map(([nombre, trabajosEnCurso]) => ({
            nombre,
            trabajosEnCurso
          }))

          // Sort by nombre
          tecnicosList.sort((a, b) => a.nombre.localeCompare(b.nombre))
          setTecnicos(tecnicosList)
        }
      } catch (err) {
        console.error('Error inesperado al cargar datos:', err)
        showToast('Error al cargar datos', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]) // Only depend on id, not router or showToast

  const extractTecnicoFromObs = (obs?: string): string | null => {
    if (!obs) return null
    const match = obs.match(/Técnico:\s*([^|]+)/)
    return match ? match[1].trim() : null
  }

  // Close técnico dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showTecnicoDropdown && !target.closest('.tecnico-select-dropdown')) {
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

  const getRiskBadgeStyle = (nivelRiesgo?: string) => {
    if (!nivelRiesgo) return { bg: '#F3F4F6', text: '#6B7280', label: 'Sin definir' }
    
    if (nivelRiesgo.includes('Crítico')) {
      return { bg: '#FEE2E2', text: '#B91C1C', label: 'Crítico' }
    } else if (nivelRiesgo.includes('Alto')) {
      return { bg: '#FFEDD5', text: '#C2410C', label: 'Alto' }
    } else if (nivelRiesgo.includes('Medio')) {
      return { bg: '#FEF3C7', text: '#B45309', label: 'Medio' }
    } else {
      return { bg: '#DCFCE7', text: '#15803D', label: 'Bajo' }
    }
  }

  const getPrioridadStyle = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente':
      case 'critica':
        return { bg: '#FEE2E2', text: '#B91C1C', border: '#DC2626' }
      case 'alta':
        return { bg: '#FFEDD5', text: '#C2410C', border: '#EA580C' }
      case 'media':
        return { bg: '#FEF3C7', text: '#B45309', border: '#D97706' }
      case 'baja':
      case 'rutina':
        return { bg: '#DCFCE7', text: '#15803D', border: '#16A34A' }
      default:
        return { bg: '#F3F4F6', text: '#6B7280', border: '#9CA3AF' }
    }
  }

  const getPrioridadLabel = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente':
      case 'critica':
        return 'Crítica'
      case 'alta':
        return 'Alta'
      case 'media':
        return 'Media'
      case 'baja':
      case 'rutina':
        return 'Baja'
      default:
        return prioridad
    }
  }

  const parseObservacionesForImpact = (obs?: string): string | null => {
    if (!obs) return null
    const match = obs.match(/Afecta producción:\s*([^|]+)/)
    return match ? match[1].trim() : null
  }

  const getTimeSinceCreation = (fecha: string, hora: string): string => {
    try {
      const date = parseISO(`${fecha}T${hora}`)
      return formatDistanceToNow(date, { addSuffix: true, locale: es })
    } catch {
      return 'Fecha inválida'
    }
  }

  const getFilteredTecnicos = () => {
    if (!tecnicoSearch.trim()) return tecnicos
    const query = tecnicoSearch.toLowerCase()
    return tecnicos.filter(t => 
      t.nombre.toLowerCase().includes(query) ||
      (t.especialidad && t.especialidad.toLowerCase().includes(query))
    )
  }

  const handleQuickDate = (option: 'hoy' | 'manana' | 'esta_semana') => {
    const today = new Date()
    let targetDate = new Date()
    
    switch (option) {
      case 'hoy':
        targetDate = today
        break
      case 'manana':
        targetDate.setDate(today.getDate() + 1)
        break
      case 'esta_semana':
        // Next Monday or today if it's Monday
        const dayOfWeek = today.getDay()
        const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7
        targetDate.setDate(today.getDate() + daysUntilMonday)
        break
    }
    
    setFechaProgramada(format(targetDate, 'yyyy-MM-dd'))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!tecnico.trim() || !prioridad || !fechaProgramada) {
      showToast('Por favor complete todos los campos obligatorios', 'error')
      return
    }

    setSubmitting(true)
    try {
      const assignmentNotes = `[Asignación] Técnico: ${tecnico} | Prioridad: ${prioridad} | Fecha programada: ${fechaProgramada}${observaciones ? ` | Notas: ${observaciones}` : ''}`
      
      const { error: updateError } = await supabase
        .from('solicitudes_mantenimiento')
        .update({
          estado: 'programada',
          tecnico: tecnico,
          observaciones: assignmentNotes
        })
        .eq('id', id)

      if (updateError) {
        console.error('Error al asignar solicitud:', JSON.stringify(updateError, null, 2))
        showToast('Error al asignar la solicitud', 'error')
        setSubmitting(false)
        return
      }

      setIsRedirecting(true)
      showToast('Solicitud asignada con éxito', 'success', 3000)
      // Redirect immediately without setTimeout to prevent loop
      router.push('/area/mantencion/evaluacion_solicitudes')
    } catch (err) {
      console.error('Error inesperado al asignar solicitud:', err)
      showToast('Error inesperado al asignar solicitud', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!solicitud) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Solicitud no encontrada.</p>
      </div>
    )
  }

  const riskStyle = getRiskBadgeStyle(solicitud.nivel_riesgo)
  const impacto = parseObservacionesForImpact(solicitud.observaciones)
  const tiempoDesdeCreacion = getTimeSinceCreation(solicitud.fecha, solicitud.hora)

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F5F7FB' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={() => router.push('/area/mantencion/evaluacion_solicitudes')} 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>
              Asignar solicitud {solicitud.ticket_id && `#${solicitud.ticket_id}`}
            </h1>
            <span 
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{ 
                backgroundColor: '#F3F4F6',
                color: '#6B7280'
              }}
            >
              Pendiente
            </span>
          </div>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Creada {tiempoDesdeCreacion}
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Card - Resumen (40-45%) */}
          <div className="lg:col-span-5">
            <div 
              className="bg-white rounded-xl p-6 shadow-sm border"
              style={{
                borderColor: '#E5E7EB',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)'
              }}
            >
              <h2 className="text-lg font-semibold mb-4" style={{ color: '#111827' }}>
                Resumen de la solicitud
              </h2>
              
              {/* Top Row: Ticket ID + Risk Badge */}
              <div className="flex items-center justify-between mb-6">
                <span 
                  className="px-3 py-1.5 rounded-lg font-bold text-xl text-white"
                  style={{ backgroundColor: '#1D4ED8' }}
                >
                  #{solicitud.ticket_id}
                </span>
                <span 
                  className="px-4 py-2 rounded-lg font-semibold text-sm"
                  style={{ 
                    backgroundColor: riskStyle.bg,
                    color: riskStyle.text
                  }}
                >
                  {riskStyle.label}
                </span>
              </div>

              {/* 2-column grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Col 1 */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Fecha</p>
                    <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                      {format(parseISO(solicitud.fecha), 'dd-MM-yyyy', { locale: es })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Hora</p>
                    <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                      {solicitud.hora}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Zona</p>
                    <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                      {solicitud.zona}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Solicitante</p>
                    <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                      {solicitud.solicitante}
                    </p>
                  </div>
                </div>

                {/* Col 2 */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Tiempo desde creación</p>
                    <p className="text-sm font-semibold flex items-center gap-1" style={{ color: '#111827' }}>
                      <Clock className="h-3 w-3" />
                      {tiempoDesdeCreacion}
                    </p>
                  </div>
                  {solicitud.equipo_afectado && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Equipo afectado</p>
                      <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                        {solicitud.equipo_afectado}
                      </p>
                    </div>
                  )}
                  {impacto && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Impacto</p>
                      <span 
                        className="inline-block px-2 py-1 rounded text-xs font-medium"
                        style={{ 
                          backgroundColor: impacto.toLowerCase().includes('detenida') ? '#FEE2E2' : 
                                         impacto.toLowerCase().includes('no afecta') ? '#DCFCE7' :
                                         impacto.toLowerCase().includes('afecta pero') ? '#FEF3C7' : '#F3F4F6',
                          color: impacto.toLowerCase().includes('detenida') ? '#B91C1C' : 
                                impacto.toLowerCase().includes('no afecta') ? '#15803D' :
                                impacto.toLowerCase().includes('afecta pero') ? '#B45309' : '#6B7280'
                        }}
                      >
                        {impacto.toLowerCase().includes('detenida') ? 'Parada producción' : 
                         impacto.toLowerCase().includes('no afecta') ? 'No afecta' :
                         impacto.toLowerCase().includes('afecta pero') ? 'Afecta producción' : 
                         impacto.toLowerCase().includes('afecta') ? 'Afecta producción' : impacto}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Descripción - Full width */}
              <div className="pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                <p className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>Descripción</p>
                <p className="text-sm whitespace-pre-line" style={{ color: '#111827' }}>
                  {solicitud.descripcion}
                </p>
              </div>

              {/* Fotos adjuntas */}
              {solicitud.fotos_urls && Array.isArray(solicitud.fotos_urls) && solicitud.fotos_urls.length > 0 && (
                <div className="pt-4 border-t mt-4" style={{ borderColor: '#E5E7EB' }}>
                  <p className="text-xs font-medium mb-3" style={{ color: '#6B7280' }}>Fotos adjuntas</p>
                  <div className="grid grid-cols-2 gap-3">
                    {solicitud.fotos_urls.map((url: string, index: number) => {
                      // Ensure URL is complete and valid
                      const imageUrl = url && url.trim() ? url.trim() : null
                      if (!imageUrl) return null
                      
                      return (
                        <div
                          key={`photo-${index}-${imageUrl}`}
                          style={{ 
                            position: 'relative',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid #E5E7EB',
                            aspectRatio: '4/3',
                            minHeight: '120px',
                            backgroundColor: '#FFFFFF'
                          }}
                          onClick={() => setSelectedImageIndex(index)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                          <img
                            src={imageUrl}
                            alt={`Foto ${index + 1}`}
                            style={{
                              display: 'block',
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              backgroundColor: '#FFFFFF',
                              position: 'relative',
                              zIndex: 0
                            }}
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const parent = target.parentElement
                              if (parent) {
                                parent.style.backgroundColor = '#F3F4F6'
                                if (!parent.querySelector('.image-error-placeholder')) {
                                  const placeholder = document.createElement('div')
                                  placeholder.className = 'image-error-placeholder'
                                  placeholder.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: #9CA3AF; font-size: 0.75rem;'
                                  placeholder.textContent = 'Imagen no disponible'
                                  parent.appendChild(placeholder)
                                }
                              }
                            }}
                            onLoad={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'block'
                              target.style.opacity = '1'
                              const parent = target.parentElement
                              if (parent) {
                                parent.style.backgroundColor = '#FFFFFF'
                                const placeholder = parent.querySelector('.image-error-placeholder')
                                if (placeholder) {
                                  placeholder.remove()
                                }
                              }
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Card - Asignación (55-60%) */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit}>
              <div 
                className="bg-white rounded-xl p-6 shadow-sm border"
                style={{
                  borderColor: '#E5E7EB',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)'
                }}
              >
                <h2 className="text-lg font-semibold mb-6" style={{ color: '#111827' }}>
                  Asignación de trabajo
                </h2>

                <div className="space-y-6">
                  {/* Técnico asignado */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
                      Técnico asignado <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <div className="tecnico-select-dropdown relative">
                      <button
                        type="button"
                        onClick={() => setShowTecnicoDropdown(!showTecnicoDropdown)}
                        className="w-full px-4 py-2.5 border rounded-lg text-left flex items-center justify-between transition-colors"
                        style={{
                          borderColor: showTecnicoDropdown ? '#1D6FE3' : '#E2E8F0',
                          backgroundColor: tecnico ? '#FFFFFF' : '#F9FAFB',
                          color: tecnico ? '#111827' : '#9CA3AF'
                        }}
                      >
                        <span className="flex items-center gap-2">
                          {tecnico ? (
                            <>
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                                style={{ backgroundColor: '#1D4ED8' }}
                              >
                                {tecnico.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                              </div>
                              <span>{tecnico}</span>
                            </>
                          ) : (
                            <span>Selecciona un técnico...</span>
                          )}
                        </span>
                        <User className="h-4 w-4" style={{ color: '#9CA3AF' }} />
                      </button>

                      {showTecnicoDropdown && (
                        <div 
                          className="absolute top-full left-0 mt-1 w-full bg-white border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
                          style={{
                            borderColor: '#E2E8F0',
                            boxShadow: '0 10px 24px rgba(15, 23, 42, 0.10)'
                          }}
                        >
                          <div className="p-2">
                            <input
                              type="text"
                              placeholder="Buscar técnico..."
                              value={tecnicoSearch}
                              onChange={(e) => setTecnicoSearch(e.target.value)}
                              className="w-full px-3 py-2 mb-2 border rounded-lg text-sm"
                              style={{ borderColor: '#E2E8F0' }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            {getFilteredTecnicos().length > 0 ? (
                              <>
                                {getFilteredTecnicos().map((t: TecnicoInfo) => (
                                  <button
                                    key={t.nombre}
                                    type="button"
                                    onClick={() => {
                                      setTecnico(t.nombre)
                                      setShowTecnicoDropdown(false)
                                      setTecnicoSearch('')
                                    }}
                                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-3"
                                  >
                                    <div 
                                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                                      style={{ backgroundColor: '#1D4ED8' }}
                                    >
                                      {t.nombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium" style={{ color: '#111827' }}>
                                        {t.nombre}
                                      </p>
                                      <p className="text-xs" style={{ color: '#6B7280' }}>
                                        {t.trabajosEnCurso} {t.trabajosEnCurso === 1 ? 'trabajo' : 'trabajos'} en curso{t.especialidad ? ` · ${t.especialidad}` : ''}
                                      </p>
                                    </div>
                                  </button>
                                ))}
                                {tecnicoSearch.trim() && (
                                  <>
                                    <div className="border-t my-2" style={{ borderColor: '#E5E7EB' }}></div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTecnico(tecnicoSearch.trim())
                                        setShowTecnicoDropdown(false)
                                        setTecnicoSearch('')
                                      }}
                                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-3"
                                      style={{ color: '#1D6FE3' }}
                                    >
                                      <div 
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                                        style={{ backgroundColor: '#1D6FE3' }}
                                      >
                                        +
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">
                                          Agregar "{tecnicoSearch.trim()}"
                                        </p>
                                        <p className="text-xs" style={{ color: '#6B7280' }}>
                                          Nuevo técnico
                                        </p>
                                      </div>
                                    </button>
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                <p className="px-3 py-2 text-sm mb-2" style={{ color: '#6B7280' }}>
                                  No se encontraron técnicos
                                </p>
                                {tecnicoSearch.trim() && (
                                  <>
                                    <div className="border-t mb-2" style={{ borderColor: '#E5E7EB' }}></div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTecnico(tecnicoSearch.trim())
                                        setShowTecnicoDropdown(false)
                                        setTecnicoSearch('')
                                      }}
                                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-3"
                                      style={{ color: '#1D6FE3' }}
                                    >
                                      <div 
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                                        style={{ backgroundColor: '#1D6FE3' }}
                                      >
                                        +
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">
                                          Agregar "{tecnicoSearch.trim()}"
                                        </p>
                                        <p className="text-xs" style={{ color: '#6B7280' }}>
                                          Nuevo técnico
                                        </p>
                                      </div>
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: '#6B7280' }}>
                      Selecciona quién será responsable de este trabajo.
                    </p>
                  </div>

                  {/* Prioridad - Pills */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
                      Prioridad <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['critica', 'alta', 'media', 'baja'].map((p) => {
                        const style = getPrioridadStyle(p)
                        const isSelected = prioridad === p
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPrioridad(p)}
                            className="px-4 py-2 rounded-lg font-medium text-sm transition-all"
                            style={{
                              backgroundColor: isSelected ? style.bg : 'transparent',
                              color: isSelected ? style.text : '#6B7280',
                              border: `2px solid ${isSelected ? style.border : '#E5E7EB'}`,
                              fontWeight: isSelected ? '600' : '500'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = '#F9FAFB'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = 'transparent'
                              }
                            }}
                          >
                            {getPrioridadLabel(p)}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Fecha programada */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
                      Fecha programada <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => handleQuickDate('hoy')}
                        className="px-3 py-1.5 text-xs rounded-lg border transition-colors"
                        style={{
                          borderColor: '#E5E7EB',
                          color: '#6B7280',
                          backgroundColor: '#FFFFFF'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F9FAFB'
                          e.currentTarget.style.borderColor = '#1D6FE3'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF'
                          e.currentTarget.style.borderColor = '#E5E7EB'
                        }}
                      >
                        Hoy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickDate('manana')}
                        className="px-3 py-1.5 text-xs rounded-lg border transition-colors"
                        style={{
                          borderColor: '#E5E7EB',
                          color: '#6B7280',
                          backgroundColor: '#FFFFFF'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F9FAFB'
                          e.currentTarget.style.borderColor = '#1D6FE3'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF'
                          e.currentTarget.style.borderColor = '#E5E7EB'
                        }}
                      >
                        Mañana
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickDate('esta_semana')}
                        className="px-3 py-1.5 text-xs rounded-lg border transition-colors"
                        style={{
                          borderColor: '#E5E7EB',
                          color: '#6B7280',
                          backgroundColor: '#FFFFFF'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F9FAFB'
                          e.currentTarget.style.borderColor = '#1D6FE3'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF'
                          e.currentTarget.style.borderColor = '#E5E7EB'
                        }}
                      >
                        Esta semana
                      </button>
                    </div>
                    <input
                      type="date"
                      id="fechaProgramada"
                      value={fechaProgramada}
                      onChange={(e) => setFechaProgramada(e.target.value)}
                      className="block w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors"
                      style={{ 
                        borderColor: '#E2E8F0',
                        '--tw-ring-color': '#1D6FE3'
                      } as React.CSSProperties & { '--tw-ring-color': string }}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#1D6FE3'
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#E2E8F0'
                      }}
                    />
                    <p className="text-xs mt-1.5" style={{ color: '#6B7280' }}>
                      Debe ser igual o posterior a hoy.
                    </p>
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
                      Observaciones / Instrucciones
                    </label>
                    <textarea
                      id="observaciones"
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      rows={4}
                      className="block w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors resize-none"
                      style={{ 
                        borderColor: '#E2E8F0',
                        '--tw-ring-color': '#1D6FE3'
                      } as React.CSSProperties & { '--tw-ring-color': string }}
                      placeholder="Ej. Coordinar con producción para parada de 30 min. Revisar sensor X."
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#1D6FE3'
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#E2E8F0'
                      }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 justify-end pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                    <button
                      type="button"
                      onClick={() => router.push('/area/mantencion/evaluacion_solicitudes')}
                      className="px-4 py-2 rounded-lg font-medium text-sm transition-colors border"
                      style={{
                        borderColor: '#E5E7EB',
                        color: '#6B7280',
                        backgroundColor: '#FFFFFF'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9FAFB'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF'
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !tecnico || !prioridad || !fechaProgramada}
                      className="px-6 py-2 rounded-lg font-medium text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ 
                        backgroundColor: submitting || !tecnico || !prioridad || !fechaProgramada ? '#9CA3AF' : '#1D6FE3'
                      }}
                      onMouseEnter={(e) => {
                        if (!submitting && tecnico && prioridad && fechaProgramada) {
                          e.currentTarget.style.backgroundColor = '#2563EB'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!submitting && tecnico && prioridad && fechaProgramada) {
                          e.currentTarget.style.backgroundColor = '#1D6FE3'
                        }
                      }}
                    >
                      {submitting ? 'Asignando...' : 'Asignar trabajo'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Image Modal/Lightbox */}
      {selectedImageIndex !== null && solicitud.fotos_urls && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImageIndex(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setSelectedImageIndex(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white hover:bg-gray-100 transition-colors"
              style={{ color: '#111827' }}
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={solicitud.fotos_urls[selectedImageIndex]}
              alt={`Foto ${selectedImageIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            {solicitud.fotos_urls.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex((selectedImageIndex - 1 + solicitud.fotos_urls.length) % solicitud.fotos_urls.length)
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white hover:bg-gray-100 transition-colors"
                  style={{ color: '#111827' }}
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex((selectedImageIndex + 1) % solicitud.fotos_urls.length)
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white hover:bg-gray-100 transition-colors"
                  style={{ color: '#111827' }}
                >
                  <ArrowLeft className="h-6 w-6 rotate-180" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black bg-opacity-50 text-white text-sm">
                  {selectedImageIndex + 1} / {solicitud.fotos_urls.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
