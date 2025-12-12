'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import Link from 'next/link'
import { ArrowLeft, Clock, CheckCircle, User, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface TimelineEvent {
  fecha: string
  hora: string
  tipo: 'creacion' | 'asignacion' | 'trabajo' | 'validacion' | 'otro'
  descripcion: string
}

export default function MisSolicitudDetallePage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { showToast } = useToast()

  const [solicitud, setSolicitud] = useState<any>(null)
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])

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
          router.push('/area/mantencion/solicitudes/mis')
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
  }, [id, router, showToast])

  const parseTimeline = (sol: any): TimelineEvent[] => {
    const events: TimelineEvent[] = []
    
    // Event 1: Creación
    const fechaCreacion = sol.fecha
    const horaCreacion = sol.hora
    events.push({
      fecha: fechaCreacion,
      hora: horaCreacion,
      tipo: 'creacion',
      descripcion: `Solicitud creada por ${sol.solicitante}.`
    })
    
    // Parse observaciones for other events
    if (sol.observaciones) {
      const entries = sol.observaciones.split('\n\n')
      
      entries.forEach((entry: string) => {
        // Parse [Asignación] entries
        if (entry.includes('[Asignación]')) {
          const tecnicoMatch = entry.match(/Técnico:\s*([^|]+)/)
          const prioridadMatch = entry.match(/Prioridad:\s*([^|]+)/)
          const fechaProgMatch = entry.match(/Fecha programada:\s*([^|]+)/)
          const notasMatch = entry.match(/Notas:\s*(.+)/)
          
          const tecnico = tecnicoMatch ? tecnicoMatch[1].trim() : ''
          const prioridad = prioridadMatch ? prioridadMatch[1].trim() : ''
          const fechaProg = fechaProgMatch ? fechaProgMatch[1].trim() : ''
          const notas = notasMatch ? notasMatch[1].trim() : ''
          
          let desc = `Asignada a ${tecnico}`
          if (prioridad) desc += ` (prioridad: ${prioridad}`
          if (fechaProg) desc += `, fecha programada: ${fechaProg}`
          if (prioridad || fechaProg) desc += ')'
          if (notas) desc += `. Nota: "${notas}"`
          
          // Try to extract date from entry or use creation date
          const dateMatch = entry.match(/\[(\d{2}\/\d{2}\/\d{4}[^\]]+)\]/)
          if (dateMatch) {
            const dateStr = dateMatch[1]
            const [datePart, timePart] = dateStr.split(', ')
            if (datePart && timePart) {
              try {
                const parsed = parseISO(datePart.split('/').reverse().join('-') + 'T' + timePart)
                events.push({
                  fecha: format(parsed, 'yyyy-MM-dd'),
                  hora: format(parsed, 'HH:mm:ss'),
                  tipo: 'asignacion',
                  descripcion: desc
                })
              } catch {
                events.push({
                  fecha: sol.fecha,
                  hora: sol.hora,
                  tipo: 'asignacion',
                  descripcion: desc
                })
              }
            }
          } else {
            events.push({
              fecha: sol.fecha,
              hora: sol.hora,
              tipo: 'asignacion',
              descripcion: desc
            })
          }
        }
        // Parse work completion entries
        else if (entry.includes('marcó la solicitud como') || entry.includes('Marcado como resuelto')) {
          const tecnicoMatch = entry.match(/\[([^\]]+)\]\s*([^-]+)/)
          const estadoMatch = entry.match(/como\s+([^.]+)/)
          const obsMatch = entry.match(/Observaciones:\s*(.+)/)
          
          const tecnico = tecnicoMatch ? tecnicoMatch[2].trim().split(' - ')[0] : sol.tecnico || 'Técnico'
          const estado = estadoMatch ? estadoMatch[1].trim() : 'resuelta'
          const obs = obsMatch ? obsMatch[1].trim() : ''
          
          let desc = `${tecnico} marcó la solicitud como ${estado}`
          if (obs) desc += `. Observaciones: ${obs}`
          
          const dateMatch = entry.match(/\[(\d{2}\/\d{2}\/\d{4}[^\]]+)\]/)
          if (dateMatch) {
            const dateStr = dateMatch[1]
            const [datePart, timePart] = dateStr.split(', ')
            if (datePart && timePart) {
              try {
                const parsed = parseISO(datePart.split('/').reverse().join('-') + 'T' + timePart)
                events.push({
                  fecha: format(parsed, 'yyyy-MM-dd'),
                  hora: format(parsed, 'HH:mm:ss'),
                  tipo: 'trabajo',
                  descripcion: desc
                })
              } catch {
                events.push({
                  fecha: sol.fecha_ejecucion || sol.fecha,
                  hora: sol.hora,
                  tipo: 'trabajo',
                  descripcion: desc
                })
              }
            }
          } else {
            events.push({
              fecha: sol.fecha_ejecucion || sol.fecha,
              hora: sol.hora,
              tipo: 'trabajo',
              descripcion: desc
            })
          }
        }
        // Parse validation entries
        else if (entry.includes('Validada') || entry.includes('validado')) {
          const dateMatch = entry.match(/\[(\d{2}\/\d{2}\/\d{4}[^\]]+)\]/)
          events.push({
            fecha: dateMatch ? dateMatch[1].split(', ')[0] : sol.fecha,
            hora: dateMatch ? dateMatch[1].split(', ')[1] : sol.hora,
            tipo: 'validacion',
            descripcion: entry.trim()
          })
        }
      })
    }
    
    // Sort by date and time
    return events.sort((a, b) => {
      const dateA = new Date(`${a.fecha} ${a.hora}`)
      const dateB = new Date(`${b.fecha} ${b.hora}`)
      return dateA.getTime() - dateB.getTime()
    })
  }

  const getEstadoBadgeStyle = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return { bg: '#FEF3C7', text: '#B45309', label: 'En revisión por mantención' }
      case 'programada':
        return { bg: '#DBEAFE', text: '#1D4ED8', label: 'Programada' }
      case 'en_ejecucion':
        return { bg: '#DBEAFE', text: '#1D4ED8', label: 'En ejecución' }
      case 'derivada':
        return { bg: '#E0E7FF', text: '#4F46E5', label: 'Derivada' }
      case 'por_validar':
        return { bg: '#FCE7F3', text: '#BE185D', label: 'En validación interna' }
      case 'finalizada':
        return { bg: '#DCFCE7', text: '#15803D', label: 'Finalizada' }
      case 'no procede':
        return { bg: '#F3F4F6', text: '#6B7280', label: 'No procede' }
      default:
        return { bg: '#F3F4F6', text: '#6B7280', label: estado }
    }
  }

  const getEstadoSummary = (sol: any): string => {
    const estado = sol.estado
    
    switch (estado) {
      case 'pendiente':
        return 'Tu solicitud está siendo revisada por el área de mantención. Aún no ha sido asignada a un técnico.'
      
      case 'programada':
        const fechaProg = sol.fecha_programada || extractFechaProgramada(sol.observaciones)
        const tecnico = sol.tecnico || extractTecnico(sol.observaciones)
        const prioridad = extractPrioridad(sol.observaciones)
        let text = `Trabajo programado`
        if (fechaProg) text += ` para el ${formatDate(fechaProg)}`
        if (tecnico) text += `. Técnico asignado: ${tecnico}`
        if (prioridad) text += `. Prioridad: ${prioridad}`
        return text + '.'
      
      case 'en_ejecucion':
        const tecnicoEjec = sol.tecnico || extractTecnico(sol.observaciones)
        return tecnicoEjec 
          ? `Trabajo en ejecución por ${tecnicoEjec}.`
          : 'Trabajo en ejecución.'
      
      case 'por_validar':
        const tecnicoValid = sol.tecnico || extractTecnico(sol.observaciones)
        return tecnicoValid
          ? `Trabajo completado por ${tecnicoValid}. Pendiente de validación.`
          : 'Trabajo completado. Pendiente de validación.'
      
      case 'finalizada':
        const fechaEjec = sol.fecha_ejecucion || extractFechaEjecucion(sol.observaciones)
        const tecnicoFin = sol.tecnico || extractTecnico(sol.observaciones)
        let finText = 'Trabajo finalizado'
        if (fechaEjec) finText += ` el ${formatDate(fechaEjec)}`
        if (tecnicoFin) finText += ` por ${tecnicoFin}`
        return finText + '.'
      
      case 'no procede':
        return 'La solicitud fue marcada como "No procede".'
      
      default:
        return `Estado: ${estado}`
    }
  }

  const extractFechaProgramada = (obs?: string): string | null => {
    if (!obs) return null
    const match = obs.match(/Fecha programada:\s*([^|]+)/)
    return match ? match[1].trim() : null
  }

  const extractTecnico = (obs?: string): string | null => {
    if (!obs) return null
    const match = obs.match(/Técnico:\s*([^|]+)/)
    return match ? match[1].trim() : null
  }

  const extractPrioridad = (obs?: string): string | null => {
    if (!obs) return null
    const match = obs.match(/Prioridad:\s*([^|]+)/)
    return match ? match[1].trim() : null
  }

  const extractFechaEjecucion = (obs?: string): string | null => {
    if (!obs) return null
    // Try to find date in format [DD/MM/YYYY, HH:MM]
    const match = obs.match(/\[(\d{2}\/\d{2}\/\d{4})/)
    if (match) {
      const dateStr = match[1]
      const [day, month, year] = dateStr.split('/')
      return `${year}-${month}-${day}`
    }
    return null
  }

  const formatDate = (dateStr: string): string => {
    try {
      const date = parseISO(dateStr)
      return format(date, 'dd-MM-yyyy', { locale: es })
    } catch {
      return dateStr
    }
  }

  const formatDateTime = (fecha: string, hora: string): string => {
    try {
      const date = parseISO(`${fecha}T${hora}`)
      return format(date, 'dd-MM-yyyy HH:mm', { locale: es })
    } catch {
      return `${fecha} ${hora}`
    }
  }

  const parseObservacionesField = (obs?: string): Record<string, string> => {
    const parsed: Record<string, string> = {}
    if (!obs) return parsed
    
    // Extract fields from observaciones
    const areaMatch = obs.match(/Área\/Depto:\s*([^|]+)/)
    const lugarMatch = obs.match(/Lugar específico:\s*([^|]+)/)
    const desdeCuandoMatch = obs.match(/Desde cuándo:\s*([^|]+)/)
    const afectaProdMatch = obs.match(/Afecta producción:\s*([^|]+)/)
    const riesgoMatch = obs.match(/Riesgo seguridad\/inocuidad:\s*([^|]+)/)
    const urgenciaMatch = obs.match(/Urgencia:\s*([^|]+)/)
    const solucionTempMatch = obs.match(/Solución temporal:\s*([^|]+)/)
    
    if (areaMatch) parsed.areaDepto = areaMatch[1].trim()
    if (lugarMatch) parsed.lugarEspecifico = lugarMatch[1].trim()
    if (desdeCuandoMatch) parsed.desdeCuando = desdeCuandoMatch[1].trim()
    if (afectaProdMatch) parsed.afectaProduccion = afectaProdMatch[1].trim()
    if (riesgoMatch) parsed.riesgoSeguridad = riesgoMatch[1].trim()
    if (urgenciaMatch) parsed.urgencia = urgenciaMatch[1].trim()
    if (solucionTempMatch) parsed.solucionTemporal = solucionTempMatch[1].trim()
    
    return parsed
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

  const extractAsignacionInfo = (sol: any) => {
    const obs = sol.observaciones || ''
    return {
      tecnico: sol.tecnico || extractTecnico(obs),
      fechaProgramada: sol.fecha_programada || extractFechaProgramada(obs),
      prioridad: extractPrioridad(obs),
      notas: obs.match(/Notas:\s*([^|]+)/)?.[1]?.trim() || null
    }
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

  const estadoStyle = getEstadoBadgeStyle(solicitud.estado)
  const estadoSummary = getEstadoSummary(solicitud)
  const riskStyle = getRiskBadgeStyle(solicitud.nivel_riesgo)
  const parsedFields = parseObservacionesField(solicitud.observaciones)
  const asignacionInfo = extractAsignacionInfo(solicitud)

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Link 
        href="/area/mantencion/solicitudes/mis"
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Volver a Mis Solicitudes
      </Link>
      
      {/* BLOQUE 1 - Encabezado de estado */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-3">
          Detalle de Solicitud {solicitud.ticket_id && `#${solicitud.ticket_id}`}
        </h1>
        <div className="flex items-center gap-3 mb-2">
          <span 
            className="px-3 py-1.5 rounded-full text-sm font-medium"
            style={{ 
              backgroundColor: estadoStyle.bg,
              color: estadoStyle.text
            }}
          >
            {estadoStyle.label}
          </span>
        </div>
        <p className="text-base" style={{ color: '#6B7280' }}>
          {estadoSummary}
        </p>
      </div>
      
      {/* BLOQUE 2 - Timeline / Historial */}
      {timelineEvents.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#111827' }}>
            Historial
          </h2>
          <div className="space-y-4">
            {timelineEvents.map((event, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ 
                      backgroundColor: event.tipo === 'creacion' ? '#FEF3C7' :
                                      event.tipo === 'asignacion' ? '#DBEAFE' :
                                      event.tipo === 'trabajo' ? '#DCFCE7' :
                                      event.tipo === 'validacion' ? '#FCE7F3' : '#F3F4F6'
                    }}
                  >
                    {event.tipo === 'creacion' && <Clock className="h-5 w-5" style={{ color: '#B45309' }} />}
                    {event.tipo === 'asignacion' && <User className="h-5 w-5" style={{ color: '#1D4ED8' }} />}
                    {event.tipo === 'trabajo' && <CheckCircle className="h-5 w-5" style={{ color: '#15803D' }} />}
                    {event.tipo === 'validacion' && <CheckCircle className="h-5 w-5" style={{ color: '#BE185D' }} />}
                  </div>
                  {idx < timelineEvents.length - 1 && (
                    <div className="w-0.5 h-full mx-auto mt-2" style={{ backgroundColor: '#E5E7EB', minHeight: '20px' }}></div>
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium" style={{ color: '#111827' }}>
                      {formatDateTime(event.fecha, event.hora)}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    {event.descripcion}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* BLOQUE 3 - Datos originales de la solicitud */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#111827' }}>
          Datos de la Solicitud
        </h2>
        <div className="space-y-4">
          {solicitud.ticket_id && (
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Ticket ID</p>
              <p className="text-base" style={{ color: '#111827' }}>#{solicitud.ticket_id}</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Fecha</p>
              <p className="text-base" style={{ color: '#111827' }}>{formatDate(solicitud.fecha)}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Hora</p>
              <p className="text-base" style={{ color: '#111827' }}>{solicitud.hora}</p>
            </div>
          </div>
          
          {parsedFields.areaDepto && (
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Área / Departamento</p>
              <p className="text-base" style={{ color: '#111827' }}>{parsedFields.areaDepto}</p>
            </div>
          )}
          
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Zona</p>
            <p className="text-base" style={{ color: '#111827' }}>{solicitud.zona}</p>
          </div>
          
          {(solicitud.lugar_especifico || parsedFields.lugarEspecifico) && (
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Lugar específico</p>
              <p className="text-base" style={{ color: '#111827' }}>{solicitud.lugar_especifico || parsedFields.lugarEspecifico}</p>
            </div>
          )}
          
          {parsedFields.afectaProduccion && (
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Afecta producción</p>
              <p className="text-base" style={{ color: '#111827' }}>{parsedFields.afectaProduccion}</p>
            </div>
          )}
          
          {parsedFields.riesgoSeguridad && (
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Riesgo seguridad/inocuidad</p>
              <p className="text-base" style={{ color: '#111827' }}>{parsedFields.riesgoSeguridad}</p>
            </div>
          )}
          
          {parsedFields.urgencia && (
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Urgencia</p>
              <p className="text-base" style={{ color: '#111827' }}>{parsedFields.urgencia}</p>
            </div>
          )}
          
          {parsedFields.desdeCuando && (
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Desde cuándo</p>
              <p className="text-base" style={{ color: '#111827' }}>{parsedFields.desdeCuando}</p>
            </div>
          )}
          
          {parsedFields.solucionTemporal && (
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Solución temporal aplicada</p>
              <p className="text-base" style={{ color: '#111827' }}>{parsedFields.solucionTemporal}</p>
            </div>
          )}
          
          {solicitud.equipo_afectado && (
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Equipo / Activo Afectado</p>
              <p className="text-base" style={{ color: '#111827' }}>{solicitud.equipo_afectado}</p>
            </div>
          )}
          
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Tipo de problema</p>
            <p className="text-base" style={{ color: '#111827' }}>{solicitud.tipo_falla}</p>
          </div>
          
          {solicitud.nivel_riesgo && (
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Nivel de Riesgo</p>
              <span 
                className="inline-block px-2 py-1 rounded text-sm font-medium"
                style={{ 
                  backgroundColor: riskStyle.bg,
                  color: riskStyle.text
                }}
              >
                {getRiskLabel(solicitud.nivel_riesgo)}
              </span>
            </div>
          )}
          
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Descripción</p>
            <p className="text-base whitespace-pre-line" style={{ color: '#111827' }}>{solicitud.descripcion}</p>
          </div>
          
          {solicitud.recomendacion && (
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Recomendación</p>
              <p className="text-base whitespace-pre-line" style={{ color: '#111827' }}>{solicitud.recomendacion}</p>
            </div>
          )}
          
          {solicitud.fotos_urls && solicitud.fotos_urls.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: '#6B7280' }}>Fotos adjuntas</p>
              <div className="flex flex-wrap gap-2">
                {solicitud.fotos_urls.map((url: string, i: number) => (
                  <img 
                    key={i} 
                    src={url} 
                    alt={`Foto ${i+1}`} 
                    className="h-24 w-24 object-cover rounded-md border"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BLOQUE 4 - Trabajo programado / realizado */}
      {(['programada', 'en_ejecucion', 'derivada'].includes(solicitud.estado) && asignacionInfo.tecnico) && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4 text-blue-900">Trabajo Programado</h2>
          <div className="space-y-3">
            {asignacionInfo.tecnico && (
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Técnico asignado</p>
                <p className="text-base font-semibold" style={{ color: '#111827' }}>{asignacionInfo.tecnico}</p>
              </div>
            )}
            {asignacionInfo.fechaProgramada && (
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Fecha programada</p>
                <p className="text-base" style={{ color: '#111827' }}>{formatDate(asignacionInfo.fechaProgramada)}</p>
              </div>
            )}
            {asignacionInfo.prioridad && (
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Prioridad</p>
                <p className="text-base" style={{ color: '#111827' }}>{asignacionInfo.prioridad}</p>
              </div>
            )}
            {asignacionInfo.notas && (
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Notas al técnico</p>
                <p className="text-base" style={{ color: '#111827' }}>{asignacionInfo.notas}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {solicitud.estado === 'pendiente' && !asignacionInfo.tecnico && (
        <div className="bg-gray-50 border-l-4 border-gray-400 p-6 rounded-lg shadow mb-6">
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Aún no se ha asignado un técnico.
          </p>
        </div>
      )}
      
      {(solicitud.estado === 'finalizada' || solicitud.estado === 'no procede' || solicitud.accion_realizada) && (
        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4 text-green-900">Trabajo Realizado</h2>
          <div className="space-y-3">
            {solicitud.tecnico && (
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Técnico responsable</p>
                <p className="text-base font-semibold" style={{ color: '#111827' }}>{solicitud.tecnico}</p>
              </div>
            )}
            {solicitud.fecha_ejecucion && (
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Fecha de ejecución</p>
                <p className="text-base" style={{ color: '#111827' }}>{formatDate(solicitud.fecha_ejecucion)}</p>
              </div>
            )}
            {solicitud.accion_realizada && (
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Acción realizada</p>
                <p className="text-base whitespace-pre-line" style={{ color: '#111827' }}>{solicitud.accion_realizada}</p>
              </div>
            )}
            {solicitud.observaciones && solicitud.estado === 'finalizada' && (
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>Observaciones</p>
                <p className="text-base whitespace-pre-line" style={{ color: '#111827' }}>
                  {solicitud.observaciones.split('\n\n').find((entry: string) => 
                    entry.includes('marcó') || entry.includes('Marcado')
                  ) || solicitud.observaciones}
                </p>
              </div>
            )}
            {solicitud.fotos_ejecucion?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: '#6B7280' }}>Fotos de ejecución</p>
                <div className="flex flex-wrap gap-2">
                  {solicitud.fotos_ejecucion.map((url: string, i: number) => (
                    <img 
                      key={i} 
                      src={url} 
                      alt={`Ejecución ${i+1}`} 
                      className="h-24 w-24 object-cover rounded-md border"
                    />
                  ))}
                </div>
              </div>
            )}
            {solicitud.estado === 'finalizada' && pdfUrl && (
              <div className="pt-4 border-t border-green-200">
                <a 
                  href={pdfUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  📄 Descargar PDF Completo del Trabajo
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
