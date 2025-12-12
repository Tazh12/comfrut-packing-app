'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { ArrowLeft, Clock, User, Calendar, ZoomIn, X, FileText, UserPlus, Info, Download, ExternalLink } from 'lucide-react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface TimelineEvent {
  fecha: string
  hora?: string
  tipo: 'creacion' | 'asignacion' | 'reasignacion' | 'inicio' | 'actualizacion' | 'validacion' | 'finalizacion'
  descripcion: string
  icon: string
  autor?: string
}

export default function EvaluacionSolicitudPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { showToast } = useToast()

  const [solicitud, setSolicitud] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [pdfUrl, setPdfUrl] = useState<string>('')

  useEffect(() => {
    const fetchSolicitud = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('solicitudes_mantenimiento')
          .select('*')
          .eq('id', id)
          .single()
        if (error || !data) {
          console.error('Error al obtener solicitud:', error)
          showToast('No se encontró la solicitud', 'error')
          return
        }
        setSolicitud(data)
        
        // Parse timeline from observaciones
        const events = parseTimeline(data)
        setTimelineEvents(events)
        
        // Check if PDF exists (only if ticket is finalized)
        if (data.estado === 'finalizada' || data.estado_final) {
          const ticketId = data.ticket_id
          if (ticketId) {
            const pdfFileName = `Ticket_${ticketId}_Full_Report.pdf`
            const { data: { publicUrl } } = supabase.storage.from('mtto-pdf-solicitudes').getPublicUrl(pdfFileName)
            setPdfUrl(publicUrl)
          }
        }
      } catch (err) {
        console.error('Error inesperado al cargar solicitud:', err)
        showToast('Error al cargar solicitud', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchSolicitud()
  }, [id, showToast])

  const isValidDate = (dateStr: string): boolean => {
    if (!dateStr) return false
    try {
      const date = parseISO(dateStr)
      return !isNaN(date.getTime())
    } catch {
      return false
    }
  }

  const formatDateSafe = (fecha: string, hora?: string): string => {
    if (!fecha) return 'Fecha no disponible'
    try {
      const dateStr = hora ? `${fecha}T${hora}` : `${fecha}T00:00:00`
      const date = parseISO(dateStr)
      if (isNaN(date.getTime())) {
        return fecha
      }
      return format(date, 'dd-MM-yyyy HH:mm', { locale: es })
    } catch {
      return fecha
    }
  }

  const parseTimeline = (sol: any): TimelineEvent[] => {
    const events: TimelineEvent[] = []
    
    // Creation event - only if fecha is valid
    if (sol.fecha && isValidDate(sol.fecha)) {
      events.push({
        fecha: sol.fecha,
        hora: sol.hora || '00:00:00',
        tipo: 'creacion',
        descripcion: `Creó la solicitud`,
        autor: sol.solicitante || 'Usuario',
        icon: '📄'
      })
    }

    // Parse observaciones for assignment and other events
    if (sol.observaciones) {
      const obs = sol.observaciones
      
      // Check for assignment - improved regex to capture all details
      const asignacionMatch = obs.match(/\[Asignación\]\s*Técnico:\s*([^|]+)\s*\|\s*Prioridad:\s*([^|]+)\s*\|\s*Fecha programada:\s*([^|\n]+)(?:\s*\|\s*Notas:\s*([^|\n]+))?/i)
      if (asignacionMatch && sol.fecha && isValidDate(sol.fecha)) {
        const tecnico = asignacionMatch[1].trim()
        const prioridad = asignacionMatch[2].trim()
        const fechaProg = asignacionMatch[3].trim()
        const notas = asignacionMatch[4]?.trim() || ''
        
        // Format fecha programada
        let fechaProgFormatted = fechaProg
        try {
          if (isValidDate(fechaProg)) {
            fechaProgFormatted = format(parseISO(fechaProg), 'dd-MM-yyyy', { locale: es })
          }
        } catch {}
        
        const descripcion = `Asignó a ${tecnico}${prioridad ? ` (Prioridad: ${prioridad}` : ''}${fechaProgFormatted ? ` · Programado: ${fechaProgFormatted}` : ''}${notas ? ` · Nota: ${notas}` : ''}${prioridad ? ')' : ''}`
        
        events.push({
          fecha: sol.fecha,
          hora: sol.hora || '00:00:00',
          tipo: 'asignacion',
          descripcion,
          autor: 'Supervisor',
          icon: '👤'
        })
      }

      // Check for work start
      const inicioMatch = obs.match(/Trabajo iniciado|Iniciado por|\[.*\]\s*([^-\n]+)\s*-\s*Trabajo iniciado/i)
      if (inicioMatch) {
        const fechaInicio = sol.fecha_ejecucion || sol.fecha
        if (fechaInicio && isValidDate(fechaInicio)) {
          events.push({
            fecha: fechaInicio,
            hora: sol.hora || '00:00:00',
            tipo: 'inicio',
            descripcion: `Trabajo iniciado`,
            autor: sol.tecnico || 'Técnico',
            icon: '🔧'
          })
        }
      }

      // Check for updates - only meaningful ones
      const updateMatches = obs.matchAll(/\[([^\]]+)\]\s*([^-\n]+)\s*-\s*(.+?)(?=\n\n|$)/g)
      for (const match of updateMatches) {
        const fechaHora = match[1]
        const autor = match[2].trim()
        const accion = match[3].trim()
        
        // Skip assignment duplicates and work start duplicates
        if (accion.includes('Asignación') || accion.includes('Trabajo iniciado')) {
          continue
        }
        
        // Only include meaningful updates
        if (accion.includes('Marcado como resuelto') || 
            accion.includes('Derivado') || 
            accion.includes('No procede') ||
            accion.includes('Devuelto')) {
          const fechaEvento = fechaHora.split(' ')[0] || sol.fecha
          const horaEvento = fechaHora.split(' ')[1] || '00:00:00'
          
          const fechaFinal = (fechaEvento && isValidDate(fechaEvento)) ? fechaEvento : (sol.fecha && isValidDate(sol.fecha) ? sol.fecha : null)
          
          if (fechaFinal) {
            let icon = '📝'
            let tipo: TimelineEvent['tipo'] = 'actualizacion'
            
            if (accion.includes('Marcado como resuelto') || accion.includes('Enviado a validación')) {
              icon = '✅'
              tipo = 'finalizacion'
            } else if (accion.includes('Devuelto')) {
              icon = '↩️'
              tipo = 'reasignacion'
            }
            
            events.push({
              fecha: fechaFinal,
              hora: horaEvento,
              tipo,
              descripcion: accion,
              autor,
              icon
            })
          }
        }
      }

      // Check for validation
      if (sol.estado === 'por_validar') {
        const fechaValidacion = sol.fecha_ejecucion || sol.fecha
        if (fechaValidacion && isValidDate(fechaValidacion)) {
          events.push({
            fecha: fechaValidacion,
            hora: sol.hora || '00:00:00',
            tipo: 'validacion',
            descripcion: `Enviado a validación`,
            autor: sol.tecnico || 'Técnico',
            icon: '✔️'
          })
        }
      }

      // Check for finalization
      if (sol.estado === 'finalizada' || sol.estado_final === 'resuelta') {
        const fechaFinalizacion = sol.fecha_ejecucion || sol.fecha
        if (fechaFinalizacion && isValidDate(fechaFinalizacion)) {
          events.push({
            fecha: fechaFinalizacion,
            hora: sol.hora || '00:00:00',
            tipo: 'finalizacion',
            descripcion: `Trabajo finalizado`,
            autor: sol.tecnico || 'Técnico',
            icon: '✅'
          })
        }
      }
    }

    return events
      .filter(event => event.fecha && isValidDate(event.fecha))
      .sort((a, b) => {
        try {
          const dateA = parseISO(`${a.fecha}T${a.hora || '00:00:00'}`)
          const dateB = parseISO(`${b.fecha}T${b.hora || '00:00:00'}`)
          if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
            return 0
          }
          // Reverse order - most recent first
          return dateB.getTime() - dateA.getTime()
        } catch {
          return 0
        }
      })
  }

  const getRiskBadgeStyle = (nivelRiesgo?: string) => {
    if (!nivelRiesgo) return { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB', label: 'Sin definir' }
    
    if (nivelRiesgo.includes('Crítico')) {
      return { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA', label: 'Crítico' }
    } else if (nivelRiesgo.includes('Alto')) {
      return { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA', label: 'Alto' }
    } else if (nivelRiesgo.includes('Medio')) {
      return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A', label: 'Medio' }
    } else {
      return { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0', label: 'Bajo' }
    }
  }

  const getEstadoBadgeStyle = (estado: string) => {
    switch (estado) {
      case 'en_ejecucion':
        return { bg: '#DBEAFE', text: '#1E40AF', label: 'En curso' }
      case 'programada':
        return { bg: '#FEF3C7', text: '#B45309', label: 'Asignado' }
      case 'por_validar':
        return { bg: '#EDE9FE', text: '#6D28D9', label: 'Terminado por técnico' }
      case 'finalizada':
        return { bg: '#DCFCE7', text: '#15803D', label: 'Validado' }
      default:
        return { bg: '#F3F4F6', text: '#6B7280', label: estado }
    }
  }

  const getTituloDinamico = (estado: string, ticketId?: number): string => {
    const ticketStr = ticketId ? ` #${ticketId}` : ''
    switch (estado) {
      case 'programada':
        return `Trabajo asignado${ticketStr}`
      case 'en_ejecucion':
        return `Trabajo en curso${ticketStr}`
      case 'por_validar':
        return `Trabajo finalizado${ticketStr}`
      case 'finalizada':
        return `Trabajo validado${ticketStr}`
      default:
        return `Trabajo${ticketStr}`
    }
  }

  const extractValidacionInfo = (obs?: string): { supervisor?: string; fecha?: string; comentario?: string } | null => {
    if (!obs) return null
    // Look for "Validó el trabajo" entry
    const match = obs.match(/\[(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2}:\d{2})\]\s*(.+?)\s*-\s*Validó el trabajo(?:\s*Comentario:\s*(.+))?/i)
    if (match) {
      const [, fecha, hora, supervisor, comentario] = match
      return {
        supervisor: supervisor.trim(),
        fecha: `${fecha} ${hora}`,
        comentario: comentario?.trim() || undefined
      }
    }
    return null
  }

  const parseObservacionesForImpact = (obs?: string): string | null => {
    if (!obs) return null
    const match = obs.match(/Afecta producción:\s*([^|]+)/)
    return match ? match[1].trim() : null
  }

  const extractAsignacionInfo = (obs?: string) => {
    if (!obs) return null
    const match = obs.match(/\[Asignación\]\s*Técnico:\s*([^|]+)\s*\|\s*Prioridad:\s*([^|]+)\s*\|\s*Fecha programada:\s*([^|\n]+)/)
    if (match) {
      return {
        tecnico: match[1].trim(),
        prioridad: match[2].trim(),
        fechaProgramada: match[3].trim(),
        notas: obs.match(/Notas:\s*([^|\n]+)/)?.[1]?.trim() || ''
      }
    }
    return null
  }

  const getTimeSinceCreation = (fecha: string, hora: string): string => {
    try {
      const date = parseISO(`${fecha}T${hora}`)
      return formatDistanceToNow(date, { addSuffix: true, locale: es })
    } catch {
      return 'Fecha inválida'
    }
  }

  const getTimeSinceAssignment = (fecha: string, hora?: string): string => {
    if (!fecha) return ''
    try {
      const date = parseISO(`${fecha}T${hora || '00:00:00'}`)
      return formatDistanceToNow(date, { addSuffix: true, locale: es })
    } catch {
      return ''
    }
  }

  const isOverdue = (fechaProgramada?: string): boolean => {
    if (!fechaProgramada) return false
    try {
      const programada = parseISO(fechaProgramada)
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      return programada < hoy
    } catch {
      return false
    }
  }

  const getProgressSteps = () => {
    const estado = solicitud?.estado || ''
    const steps = [
      { label: 'Asignado', completed: ['programada', 'en_ejecucion', 'por_validar', 'finalizada'].includes(estado), active: estado === 'programada' },
      { label: 'En curso', completed: ['en_ejecucion', 'por_validar', 'finalizada'].includes(estado), active: estado === 'en_ejecucion' },
      { label: 'Terminado por técnico', completed: ['por_validar', 'finalizada'].includes(estado), active: estado === 'por_validar' },
      { label: 'Validado', completed: ['finalizada'].includes(estado), active: estado === 'finalizada' }
    ]
    return steps
  }

  if (loading) {
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
  const estadoStyle = getEstadoBadgeStyle(solicitud.estado)
  const impacto = parseObservacionesForImpact(solicitud.observaciones)
  const tiempoDesdeCreacion = getTimeSinceCreation(solicitud.fecha, solicitud.hora)
  const asignacionInfo = extractAsignacionInfo(solicitud.observaciones) || { tecnico: solicitud.tecnico || '', prioridad: '', fechaProgramada: '', notas: '' }
  const tiempoDesdeAsignacion = asignacionInfo.fechaProgramada ? getTimeSinceAssignment(asignacionInfo.fechaProgramada) : ''
  const vencida = isOverdue(asignacionInfo.fechaProgramada)
  const progressSteps = getProgressSteps()
  const fotos = solicitud.fotos_urls && Array.isArray(solicitud.fotos_urls) ? solicitud.fotos_urls.filter((url: string) => url && url.trim()) : []
  const fotosEjecucion = solicitud.fotos_ejecucion && Array.isArray(solicitud.fotos_ejecucion) ? solicitud.fotos_ejecucion.filter((url: string) => url && url.trim()) : []
  const maxVisibleFotos = 3
  const isFinalizada = solicitud.estado === 'finalizada'
  const tituloDinamico = getTituloDinamico(solicitud.estado, solicitud.ticket_id)
  const validacionInfo = extractValidacionInfo(solicitud.observaciones)

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F5F7FB' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <button 
                onClick={() => router.push('/area/mantencion/evaluacion_solicitudes')} 
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Volver
      </button>
              
              <h1 className="text-2xl font-bold mb-3" style={{ color: '#111827' }}>
                {tituloDinamico}
              </h1>
      
              <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: '#6B7280' }}>
                {isFinalizada && solicitud.fecha_ejecucion ? (
                  <>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Cerrado el {format(parseISO(solicitud.fecha_ejecucion), 'dd-MM-yyyy', { locale: es })}
                    </span>
                    <span>·</span>
                  </>
                ) : asignacionInfo.fechaProgramada ? (
                  <>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Programado: {format(parseISO(asignacionInfo.fechaProgramada), 'dd/MM/yyyy', { locale: es })}
                    </span>
                    <span>·</span>
                  </>
                ) : null}
                {asignacionInfo.tecnico && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      Técnico: {asignacionInfo.tecnico}
                    </span>
                    <span>·</span>
                  </>
                )}
                <span className="flex items-center gap-1.5">
                  {solicitud.zona}
                </span>
              </div>
            </div>
            
            <span 
              className="px-4 py-2 rounded-lg text-base font-semibold inline-flex items-center"
              style={{ 
                backgroundColor: estadoStyle.bg,
                color: estadoStyle.text
              }}
            >
              {vencida && solicitud.estado === 'programada' ? 'Retrasado' : estadoStyle.label}
            </span>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Resumen de la solicitud / Solicitud original */}
          <div className="space-y-6">
            {/* Card: Resumen de la solicitud / Solicitud original */}
            <div 
              className="bg-white rounded-xl p-6 shadow-sm border"
              style={{
                borderColor: '#E5E7EB',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)'
              }}
            >
              {/* Header */}
              <h2 className="text-lg font-semibold mb-6" style={{ color: '#111827' }}>
                {isFinalizada ? 'Solicitud original' : 'Resumen de la solicitud'}
              </h2>
              <div className="flex items-center justify-between mb-6">
                <span 
                  className="px-3 py-1.5 rounded-lg font-bold text-xl text-white"
                  style={{ backgroundColor: '#1D4ED8' }}
                >
                  #{solicitud.ticket_id}
                </span>
                <span 
                  className="px-4 py-2 rounded-lg font-semibold text-sm border"
                  style={{ 
                    backgroundColor: riskStyle.bg,
                    color: riskStyle.text,
                    borderColor: riskStyle.border
                  }}
                >
                  {riskStyle.label}
                </span>
              </div>

              {/* Body */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <span style={{ color: '#6B7280' }}>Fecha</span>
                  <span style={{ color: '#111827', fontWeight: '500' }}>
                    {format(parseISO(solicitud.fecha), 'dd-MM-yyyy', { locale: es })}
                  </span>
                  <span style={{ color: '#9CA3AF' }}>·</span>
                  <span style={{ color: '#6B7280' }}>Hora</span>
                  <span style={{ color: '#111827', fontWeight: '500' }}>{solicitud.hora}</span>
                </div>
                
                <div>
                  <span className="text-sm" style={{ color: '#6B7280' }}>Zona</span>
                  <p className="text-sm font-medium mt-1" style={{ color: '#111827' }}>
                    {solicitud.zona}
                  </p>
                </div>

                {solicitud.equipo_afectado && (
                  <div>
                    <span className="text-sm" style={{ color: '#6B7280' }}>Equipo afectado</span>
                    <p className="text-sm font-medium mt-1" style={{ color: '#111827' }}>
                      {solicitud.equipo_afectado}
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-sm" style={{ color: '#6B7280' }}>Solicitante</span>
                  <p className="text-sm font-medium mt-1" style={{ color: '#111827' }}>
                    {solicitud.solicitante}
                  </p>
                </div>

                {solicitud.nivel_riesgo && (
                  <div>
                    <span className="text-sm" style={{ color: '#6B7280' }}>Nivel de riesgo</span>
                    <div className="mt-1">
                      <span 
                        className="inline-block px-2 py-1 rounded text-xs font-medium border"
                        style={{ 
                          backgroundColor: riskStyle.bg,
                          color: riskStyle.text,
                          borderColor: riskStyle.border
                        }}
                      >
                        {riskStyle.label}
                      </span>
                    </div>
                  </div>
                )}

                {impacto && (
                  <div>
                    <span className="text-sm" style={{ color: '#6B7280' }}>Impacto</span>
                    <div className="mt-1">
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
        </div>
      )}
      
              <div>
                  <span className="text-sm" style={{ color: '#6B7280' }}>Descripción</span>
                  <p className="text-sm mt-1 whitespace-pre-line" style={{ color: '#111827' }}>
                    {solicitud.descripcion}
                  </p>
                </div>
              </div>

              {/* Footer - Fotos adjuntas */}
              {fotos.length > 0 && (
                <div className="pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>Fotos adjuntas</p>
                  <div className="flex items-center gap-2">
                    {fotos.slice(0, maxVisibleFotos).map((url: string, index: number) => (
                      <div
                        key={index}
                        className="relative cursor-pointer rounded border overflow-hidden"
                        style={{ 
                          borderColor: '#E5E7EB',
                          width: '64px',
                          height: '64px'
                        }}
                        onClick={() => setSelectedImageIndex(index)}
                      >
                        <img
                          src={url}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent) {
                              parent.style.backgroundColor = '#F3F4F6'
                              parent.style.display = 'flex'
                              parent.style.alignItems = 'center'
                              parent.style.justifyContent = 'center'
                            }
                          }}
                        />
                      </div>
                    ))}
                    {fotos.length > maxVisibleFotos && (
                      <div
                        className="flex items-center justify-center rounded border cursor-pointer"
                        style={{ 
                          borderColor: '#E5E7EB',
                          width: '64px',
                          height: '64px',
                          backgroundColor: '#F9FAFB',
                          color: '#6B7280',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}
                        onClick={() => setSelectedImageIndex(0)}
                      >
                        +{fotos.length - maxVisibleFotos}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Optional: Info adicional */}
            {solicitud.recomendacion && (
              <div 
                className="bg-white rounded-xl p-6 shadow-sm border"
                style={{
                  borderColor: '#E5E7EB',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)'
                }}
              >
                <h3 className="text-sm font-semibold mb-2" style={{ color: '#111827' }}>Recomendación del solicitante</h3>
                <p className="text-sm" style={{ color: '#6B7280' }}>{solicitud.recomendacion}</p>
              </div>
            )}
          </div>

          {/* Right Column - Estado del trabajo / Resultado del trabajo */}
          <div className="space-y-6">
            {isFinalizada ? (
              /* Card: Resultado del trabajo (para trabajos finalizados) */
              <div 
                className="bg-white rounded-xl p-6 shadow-sm border"
                style={{
                  borderColor: '#E5E7EB',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)'
                }}
              >
                <h2 className="text-lg font-semibold mb-6" style={{ color: '#111827' }}>
                  Resultado del trabajo
                </h2>

                {/* Técnico responsable */}
                {asignacionInfo.tecnico && (
                  <div className="mb-6 pb-6 border-b" style={{ borderColor: '#E5E7EB' }}>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-semibold flex-shrink-0"
                        style={{ backgroundColor: '#1D4ED8' }}
                      >
                        {asignacionInfo.tecnico.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-base font-semibold" style={{ color: '#111827' }}>
                          {asignacionInfo.tecnico}
                        </p>
                        <p className="text-xs" style={{ color: '#64748B' }}>
                          Técnico de mantención
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Datos de ejecución */}
                <div className="mb-6 pb-6 border-b space-y-3" style={{ borderColor: '#E5E7EB' }}>
                  {solicitud.fecha_ejecucion && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Fecha de ejecución</p>
                      <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                        {format(parseISO(solicitud.fecha_ejecucion), 'dd-MM-yyyy', { locale: es })}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {asignacionInfo.prioridad && (
                      <span 
                        className="px-3 py-1 rounded-lg text-xs font-medium border"
                        style={{
                          backgroundColor: asignacionInfo.prioridad.toLowerCase().includes('alta') ? '#FFEDD5' :
                                          asignacionInfo.prioridad.toLowerCase().includes('media') ? '#FEF3C7' :
                                          asignacionInfo.prioridad.toLowerCase().includes('baja') ? '#DCFCE7' : '#F3F4F6',
                          color: asignacionInfo.prioridad.toLowerCase().includes('alta') ? '#C2410C' :
                                asignacionInfo.prioridad.toLowerCase().includes('media') ? '#B45309' :
                                asignacionInfo.prioridad.toLowerCase().includes('baja') ? '#15803D' : '#6B7280',
                          borderColor: asignacionInfo.prioridad.toLowerCase().includes('alta') ? '#FED7AA' :
                                      asignacionInfo.prioridad.toLowerCase().includes('media') ? '#FDE68A' :
                                      asignacionInfo.prioridad.toLowerCase().includes('baja') ? '#BBF7D0' : '#E5E7EB'
                        }}
                      >
                        Prioridad: {asignacionInfo.prioridad}
                      </span>
                    )}
                    <span 
                      className="px-3 py-1 rounded-lg text-xs font-medium border"
                      style={{ 
                        backgroundColor: riskStyle.bg,
                        color: riskStyle.text,
                        borderColor: riskStyle.border
                      }}
                    >
                      Nivel de riesgo: {riskStyle.label}
                    </span>
                  </div>
                </div>

                {/* Acción realizada */}
                {solicitud.accion_realizada && (
                  <div className="mb-6 pb-6 border-b" style={{ borderColor: '#E5E7EB' }}>
                    <p className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>Acción realizada</p>
                    <p className="text-sm whitespace-pre-line" style={{ color: '#111827' }}>
                      {solicitud.accion_realizada}
                    </p>
                  </div>
                )}

                {/* Fotos de ejecución */}
                {fotosEjecucion.length > 0 && (
                  <div className="mb-6 pb-6 border-b" style={{ borderColor: '#E5E7EB' }}>
                    <p className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>Fotos de ejecución</p>
                    <div className="grid grid-cols-3 gap-2">
                      {fotosEjecucion.map((url: string, index: number) => (
                        <div
                          key={index}
                          className="relative cursor-pointer rounded border overflow-hidden"
                          style={{ 
                            borderColor: '#E5E7EB',
                            aspectRatio: '1/1'
                          }}
                          onClick={() => setSelectedImageIndex(fotos.length + index)}
                        >
                          <img
                            src={url}
                            alt={`Ejecución ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Validación */}
                {validacionInfo && (
                  <div className="mb-6 pb-6 border-b" style={{ borderColor: '#E5E7EB' }}>
                    <p className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>Validación</p>
                    <div className="space-y-1">
                      <p className="text-sm" style={{ color: '#111827' }}>
                        <span className="font-medium">Validado por:</span> {validacionInfo.supervisor}
                      </p>
                      {validacionInfo.fecha && (
                        <p className="text-sm" style={{ color: '#111827' }}>
                          <span className="font-medium">Fecha de validación:</span> {validacionInfo.fecha}
                        </p>
                      )}
                      {validacionInfo.comentario && (
                        <p className="text-sm mt-2 whitespace-pre-line" style={{ color: '#4B5563' }}>
                          <span className="font-medium">Comentario:</span> {validacionInfo.comentario}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Acciones - PDF */}
                {pdfUrl && (
                  <div className="space-y-2">
                    <a
                      href={pdfUrl}
                      download
                      className="w-full px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      style={{ 
                        borderColor: '#1D6FE3',
                        color: '#1D6FE3',
                        backgroundColor: '#FFFFFF'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#EFF6FF'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF'
                      }}
                    >
                      <Download className="h-4 w-4" />
                      Descargar informe PDF
                    </a>
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-4 py-2 text-sm text-center text-blue-600 hover:text-blue-700 transition-colors flex items-center justify-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ver PDF en nueva pestaña
                    </a>
                  </div>
                )}
              </div>
            ) : (
              /* Card: Estado del trabajo (para trabajos en curso) */
              <div 
                className="bg-white rounded-xl p-6 shadow-sm border"
                style={{
                  borderColor: '#E5E7EB',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)'
                }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>
                    Estado del trabajo
                  </h2>
                  <button
                    onClick={() => {
                      showToast('La funcionalidad de reasignación está en desarrollo. Próximamente disponible.', 'info', 4000)
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors font-medium"
                  >
                    <UserPlus className="h-4 w-4" />
                    Reasignar
                  </button>
                </div>

                {/* Bloque 1 - Técnico */}
                {asignacionInfo.tecnico && (
                  <div className="mb-6 pb-6 border-b" style={{ borderColor: '#E5E7EB' }}>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-semibold flex-shrink-0"
                        style={{ backgroundColor: '#1D4ED8' }}
                      >
                        {asignacionInfo.tecnico.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-base font-semibold" style={{ color: '#111827' }}>
                          {asignacionInfo.tecnico}
                        </p>
                        <p className="text-xs" style={{ color: '#64748B' }}>
                          Técnico de mantención
                        </p>
                      </div>
                    </div>
                  </div>
                )}
        
                {/* Bloque 2 - Tags */}
                <div className="mb-6 pb-6 border-b flex flex-wrap gap-2" style={{ borderColor: '#E5E7EB' }}>
                  {asignacionInfo.prioridad && (
                    <span 
                      className="px-3 py-1 rounded-lg text-xs font-medium border"
                      style={{
                        backgroundColor: asignacionInfo.prioridad.toLowerCase().includes('alta') ? '#FFEDD5' :
                                        asignacionInfo.prioridad.toLowerCase().includes('media') ? '#FEF3C7' :
                                        asignacionInfo.prioridad.toLowerCase().includes('baja') ? '#DCFCE7' : '#F3F4F6',
                        color: asignacionInfo.prioridad.toLowerCase().includes('alta') ? '#C2410C' :
                              asignacionInfo.prioridad.toLowerCase().includes('media') ? '#B45309' :
                              asignacionInfo.prioridad.toLowerCase().includes('baja') ? '#15803D' : '#6B7280',
                        borderColor: asignacionInfo.prioridad.toLowerCase().includes('alta') ? '#FED7AA' :
                                    asignacionInfo.prioridad.toLowerCase().includes('media') ? '#FDE68A' :
                                    asignacionInfo.prioridad.toLowerCase().includes('baja') ? '#BBF7D0' : '#E5E7EB'
                      }}
                    >
                      Prioridad: {asignacionInfo.prioridad}
                    </span>
                  )}
                  <span 
                    className="px-3 py-1 rounded-lg text-xs font-medium border"
                    style={{ 
                      backgroundColor: riskStyle.bg,
                      color: riskStyle.text,
                      borderColor: riskStyle.border
                    }}
                  >
                    Nivel de riesgo: {riskStyle.label}
                  </span>
                </div>

                {/* Bloque 3 - Fechas */}
                <div className="mb-6 pb-6 border-b space-y-2" style={{ borderColor: '#E5E7EB' }}>
                  {asignacionInfo.fechaProgramada && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Programado para</p>
                      <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                        {format(parseISO(asignacionInfo.fechaProgramada), 'dd-MM-yyyy', { locale: es })}
                        {vencida && (
                          <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}>
                            Retrasado
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  {tiempoDesdeAsignacion && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Tiempo desde asignación</p>
                      <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                        {tiempoDesdeAsignacion}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bloque 4 - Progreso */}
                <div>
                  <p className="text-xs font-medium mb-3" style={{ color: '#6B7280' }}>Progreso</p>
                  <div className="flex items-center gap-2">
                    {progressSteps.map((step, index) => (
                      <React.Fragment key={index}>
                        <div className="flex-1">
                          <div 
                            className="h-2 rounded-full"
                            style={{ 
                              backgroundColor: step.active ? estadoStyle.bg.replace('50', '600') : step.completed ? '#CBD5E1' : '#E5E7EB'
                            }}
                          ></div>
                          <p className="text-xs mt-1 text-center" style={{ color: step.active ? estadoStyle.text : step.completed ? '#64748B' : '#9CA3AF' }}>
                            {step.label}
                          </p>
                        </div>
                        {index < progressSteps.length - 1 && (
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E5E7EB' }}></div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Card: Última actualización del técnico */}
            <div 
              className="bg-white rounded-xl p-6 shadow-sm border"
              style={{
                borderColor: '#E5E7EB',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)'
              }}
            >
              <h2 className="text-lg font-semibold mb-4" style={{ color: '#111827' }}>
                Última actualización del técnico
              </h2>
              
              {solicitud.fecha_ejecucion || solicitud.accion_realizada ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-sm" style={{ color: '#94A3B8' }}>
                      {solicitud.fecha_ejecucion && formatDateSafe(solicitud.fecha_ejecucion, solicitud.hora)}
                    </span>
                    {asignacionInfo.tecnico && (
                      <>
                        <span style={{ color: '#94A3B8' }}>·</span>
                        <span className="text-sm font-medium" style={{ color: '#111827' }}>
                          {asignacionInfo.tecnico}
                        </span>
                      </>
                    )}
                  </div>
                  {solicitud.accion_realizada && (
                    <p className="text-sm whitespace-pre-line" style={{ color: '#111827' }}>
                      {solicitud.accion_realizada}
                    </p>
                  )}
                  {solicitud.observaciones && solicitud.observaciones.includes('Observaciones:') && (
                    <p className="text-sm whitespace-pre-line" style={{ color: '#6B7280' }}>
                      {solicitud.observaciones.split('Observaciones:')[1]?.trim() || ''}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Info className="h-8 w-8 mx-auto mb-2" style={{ color: '#9CA3AF' }} />
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>
                    El técnico aún no ha registrado avances en este trabajo.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Historial de acciones - Full width card (below columns) */}
        {timelineEvents.length > 0 && (
          <div 
            className="bg-white rounded-xl p-6 shadow-sm border"
            style={{
              borderColor: '#E5E7EB',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)'
            }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#111827' }}>
              Historial de acciones
            </h2>
            <div className="space-y-3">
              {timelineEvents.map((event, index) => (
                <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-b-0 last:pb-0" style={{ borderColor: '#F1F5F9' }}>
                  <span className="text-lg flex-shrink-0">{event.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>
                        {formatDateSafe(event.fecha, event.hora || '00:00:00', 'dd-MM-yyyy HH:mm')}
                      </span>
                      {event.autor && (
                        <>
                          <span style={{ color: '#94A3B8' }}>·</span>
                          <span className="text-xs font-semibold" style={{ color: '#111827' }}>
                            {event.autor}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: '#4B5563' }}>
                      {event.descripcion}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Modal/Lightbox */}
      {selectedImageIndex !== null && (
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
            {(() => {
              const allImages = [...fotos, ...fotosEjecucion]
              const currentImage = allImages[selectedImageIndex]
              const totalImages = allImages.length
              
              return (
                <>
                  <img
                    src={currentImage}
                    alt={`Imagen ${selectedImageIndex + 1}`}
                    className="max-w-full max-h-[90vh] object-contain rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {totalImages > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedImageIndex((selectedImageIndex - 1 + totalImages) % totalImages)
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white hover:bg-gray-100 transition-colors"
                        style={{ color: '#111827' }}
                      >
                        <ArrowLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedImageIndex((selectedImageIndex + 1) % totalImages)
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white hover:bg-gray-100 transition-colors"
                        style={{ color: '#111827' }}
                      >
                        <ArrowLeft className="h-6 w-6 rotate-180" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black bg-opacity-50 text-white text-sm">
                        {selectedImageIndex + 1} / {totalImages}
                      </div>
                    </>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
} 
