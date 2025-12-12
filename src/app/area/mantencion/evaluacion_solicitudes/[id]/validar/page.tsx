'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { ArrowLeft, Clock, User, Calendar, ZoomIn, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { pdf } from '@react-pdf/renderer'
import { MantenimientoFullReportPDFDocument } from '@/components/MantenimientoFullReportPDF'
import { uploadMantenimientoPDF } from '@/lib/supabase/mantenimientoPDF'

interface TecnicoInfo {
  nombre: string
  trabajosEnCurso: number
}

export default function ValidarTrabajoPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { showToast } = useToast()

  const [solicitud, setSolicitud] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [tecnicos, setTecnicos] = useState<TecnicoInfo[]>([])
  const [showTecnicoDropdown, setShowTecnicoDropdown] = useState(false)
  const [tecnicoSearch, setTecnicoSearch] = useState('')
  
  // Form state
  const [resultadoValidacion, setResultadoValidacion] = useState<'aprobar' | 'rechazar' | ''>('')
  const [comentarios, setComentarios] = useState<string>('')
  const [devolverMismoTecnico, setDevolverMismoTecnico] = useState<boolean>(true)
  const [tecnicoReasignacion, setTecnicoReasignacion] = useState<string>('')

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
          setIsRedirecting(true)
          showToast('No se encontró la solicitud', 'error')
          router.push('/area/mantencion/evaluacion_solicitudes')
          return
        }
        
        if (solicitudData.estado !== 'por_validar') {
          setIsRedirecting(true)
          showToast('Esta solicitud no está en estado de validación', 'error')
          router.push('/area/mantencion/evaluacion_solicitudes')
          return
        }
        
        setSolicitud(solicitudData)

        // Fetch técnicos for reassignment
        const { data: allSolicitudes } = await supabase
          .from('solicitudes_mantenimiento')
          .select('tecnico, observaciones, estado')
          .in('estado', ['programada', 'en_ejecucion', 'derivada', 'por_validar'])

        if (allSolicitudes) {
          const tecnicoMap = new Map<string, number>()
          
          allSolicitudes.forEach(s => {
            const tecnico = s.tecnico || extractTecnicoFromObs(s.observaciones)
            if (tecnico) {
              tecnicoMap.set(tecnico, (tecnicoMap.get(tecnico) || 0) + 1)
            }
          })

          const tecnicosList: TecnicoInfo[] = Array.from(tecnicoMap.entries()).map(([nombre, trabajosEnCurso]) => ({
            nombre,
            trabajosEnCurso
          }))

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
  }, [id, router, showToast])

  const extractTecnicoFromObs = (obs?: string): string | null => {
    if (!obs) return null
    const match = obs.match(/\[Asignación\]\s*Técnico:\s*([^|]+)/)
    return match ? match[1].trim() : null
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

  const parseObservacionesForImpact = (obs?: string): string | null => {
    if (!obs) return null
    const match = obs.match(/Afecta producción:\s*([^|]+)/)
    return match ? match[1].trim() : null
  }

  const extractTecnicoObservaciones = (obs?: string): string | null => {
    if (!obs) return null
    
    // Extract only specific observation fields from the technician
    // Look for: "Observaciones de seguridad", "Materiales utilizados", or standalone observation notes
    // Exclude all timeline entries and assignment entries
    const lines = obs.split('\n')
    const observacionesLines: string[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Skip timeline entries (format: [DD-MM-YYYY HH:mm:ss] ...)
      if (line.match(/^\[\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2}\]/)) {
        continue
      }
      
      // Skip assignment entries
      if (line.includes('[Asignación]') || line.includes('[Reasignación]')) {
        continue
      }
      
      // Skip action entries (Acción: ...) - these are already shown in "Acción realizada"
      if (line.match(/^Acción:\s*/i)) {
        continue
      }
      
      // Extract "Observaciones de seguridad" or "Materiales utilizados"
      if (line.includes('Observaciones de seguridad:') || line.includes('Materiales utilizados:')) {
        const match = line.match(/:\s*(.+)/)
        if (match && match[1].trim()) {
          observacionesLines.push(line.trim())
        }
        continue
      }
      
      // Skip lines that are part of timeline event descriptions
      if (line.includes('Marcado como resuelto') || 
          line.includes('Trabajo iniciado') || 
          line.includes('Enviado a validación') ||
          line.includes('Avance guardado') ||
          line.includes('Validó el trabajo') ||
          line.includes('Devolvió el trabajo')) {
        continue
      }
    }
    
    // If no specific observations found, return null (don't show the section)
    return observacionesLines.length > 0 ? observacionesLines.join('\n') : null
  }

  const parseTimeline = (sol: any): Array<{ fecha: string; hora: string; tipo: string; descripcion: string; autor: string; icon: string }> => {
    const events: Array<{ fecha: string; hora: string; tipo: string; descripcion: string; autor: string; icon: string }> = []
    
    if (!sol.observaciones) return events
    
    const lines = sol.observaciones.split('\n')
    
    for (const line of lines) {
      // Match timeline entries: [DD-MM-YYYY HH:mm:ss] Author - Description
      const match = line.match(/^\[(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2}:\d{2})\]\s*(.+?)\s*-\s*(.+)$/)
      if (match) {
        const [, fecha, hora, autor, descripcion] = match
        
        // Validate date before adding to events
        const dateStr = `${fecha}T${hora}`
        if (!isValidDate(dateStr)) {
          continue // Skip invalid dates
        }
        
        let tipo = 'actualizacion'
        let icon = '📝'
        
        if (descripcion.includes('creó la solicitud') || descripcion.includes('Creó la solicitud')) {
          tipo = 'creacion'
          icon = '📄'
        } else if (descripcion.includes('Asignó') || descripcion.includes('asignado')) {
          tipo = 'asignacion'
          icon = '✅'
        } else if (descripcion.includes('Trabajo iniciado') || descripcion.includes('marcó el trabajo como "En curso"')) {
          tipo = 'inicio'
          icon = '🔧'
        } else if (descripcion.includes('Validó el trabajo') || descripcion.includes('validó')) {
          tipo = 'validacion'
          icon = '✔️'
        } else if (descripcion.includes('Devolvió el trabajo') || descripcion.includes('devolvió')) {
          tipo = 'devolucion'
          icon = '↩️'
        } else if (descripcion.includes('Marcado como resuelto') || descripcion.includes('marcó la solicitud como')) {
          tipo = 'finalizacion'
          icon = '✅'
        }
        
        events.push({
          fecha,
          hora,
          tipo,
          descripcion,
          autor: autor.trim(),
          icon
        })
      }
    }
    
    return events.sort((a, b) => {
      try {
        const dateA = parseISO(`${a.fecha}T${a.hora}`)
        const dateB = parseISO(`${b.fecha}T${b.hora}`)
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
          return 0
        }
        return dateB.getTime() - dateA.getTime() // Most recent first
      } catch {
        return 0
      }
    })
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

  const getTimeSinceExecution = (fechaEjecucion?: string): string => {
    if (!fechaEjecucion) return ''
    try {
      const date = parseISO(fechaEjecucion)
      if (isNaN(date.getTime())) return ''
      return formatDistanceToNow(date, { addSuffix: true, locale: es })
    } catch {
      return ''
    }
  }

  const isValidDate = (dateStr: string): boolean => {
    if (!dateStr) return false
    try {
      const date = parseISO(dateStr)
      return !isNaN(date.getTime())
    } catch {
      return false
    }
  }

  const formatDateSafe = (fecha: string, hora: string, formatStr: string = 'dd-MM-yyyy HH:mm'): string => {
    if (!fecha || !hora) return 'Fecha no disponible'
    try {
      const dateStr = `${fecha}T${hora}`
      if (!isValidDate(dateStr)) return 'Fecha inválida'
      const date = parseISO(dateStr)
      if (isNaN(date.getTime())) return 'Fecha inválida'
      return format(date, formatStr, { locale: es })
    } catch {
      return 'Fecha inválida'
    }
  }

  const getProgressSteps = () => {
    const estado = solicitud?.estado || ''
    const steps = [
      { label: 'Asignado', completed: true, active: false },
      { label: 'En curso', completed: true, active: false },
      { label: 'Terminado por técnico', completed: true, active: true },
      { label: 'Validado', completed: false, active: false }
    ]
    return steps
  }

  const getFilteredTecnicos = () => {
    if (!tecnicoSearch.trim()) return tecnicos
    const searchLower = tecnicoSearch.toLowerCase()
    return tecnicos.filter(t => t.nombre.toLowerCase().includes(searchLower))
  }

  const handleSubmit = async () => {
    if (!resultadoValidacion) {
      showToast('Por favor selecciona un resultado de validación', 'error')
      return
    }

    if (resultadoValidacion === 'rechazar' && !comentarios.trim()) {
      showToast('Por favor completa los comentarios cuando rechazas un trabajo', 'error')
      return
    }

    if (resultadoValidacion === 'rechazar' && !devolverMismoTecnico && !tecnicoReasignacion.trim()) {
      showToast('Por favor selecciona un técnico para reasignar', 'error')
      return
    }

    setSubmitting(true)
    try {
      // Get current observaciones
      const { data: currentData } = await supabase
        .from('solicitudes_mantenimiento')
        .select('observaciones')
        .eq('id', id)
        .single()

      const now = new Date()
      const supervisorName = 'Supervisor' // TODO: Get from auth context
      
      let updateData: any = {}
      let historyEntry = ''

      if (resultadoValidacion === 'aprobar') {
        // Approve and close
        updateData = {
          estado: 'finalizada',
          estado_final: 'resuelta'
        }
        historyEntry = `[${format(now, 'dd-MM-yyyy HH:mm:ss', { locale: es })}] ${supervisorName} - Validó el trabajo${comentarios.trim() ? `\nComentario: ${comentarios}` : ''}`

        // Generate and upload PDF
        try {
          showToast('Generando PDF del reporte completo...', 'info')
          
          const asignacionInfo = extractAsignacionInfo(solicitud.observaciones)
          const validacionInfoForPDF = {
            supervisor: supervisorName,
            fecha: format(now, 'dd-MM-yyyy HH:mm:ss', { locale: es }),
            comentario: comentarios.trim() || undefined
          }

          const pdfBlob = await pdf(
            <MantenimientoFullReportPDFDocument 
              solicitud={solicitud}
              asignacionInfo={asignacionInfo || undefined}
              validacionInfo={validacionInfoForPDF}
            />
          ).toBlob()

          const pdfFileName = `Ticket_${solicitud.ticket_id}_Full_Report.pdf`
          await uploadMantenimientoPDF(pdfBlob, pdfFileName)
          
          showToast('PDF generado y guardado correctamente', 'success')
        } catch (pdfError) {
          console.error('Error al generar PDF:', pdfError)
          // Don't fail the validation if PDF generation fails, just log it
          showToast('Trabajo validado, pero hubo un error al generar el PDF', 'error')
        }
      } else {
        // Reject and return to technician
        const tecnicoFinal = devolverMismoTecnico 
          ? (extractAsignacionInfo(solicitud.observaciones)?.tecnico || solicitud.tecnico || '')
          : tecnicoReasignacion

        updateData = {
          estado: 'en_ejecucion',
          tecnico: tecnicoFinal
        }
        
        if (!devolverMismoTecnico && tecnicoReasignacion) {
          const reasignacionNote = `[Reasignación] Técnico: ${tecnicoReasignacion} | Motivo: Devolución por corrección`
          updateData.observaciones = currentData?.observaciones 
            ? `${currentData.observaciones}\n\n${reasignacionNote}`
            : reasignacionNote
        }

        historyEntry = `[${format(now, 'dd-MM-yyyy HH:mm:ss', { locale: es })}] ${supervisorName} - Devolvió el trabajo para corrección${comentarios.trim() ? `\nComentario: ${comentarios}` : ''}`
      }

      const updatedObservaciones = currentData?.observaciones 
        ? `${currentData.observaciones}\n\n${historyEntry}`
        : historyEntry

      updateData.observaciones = updatedObservaciones

      const { error } = await supabase
        .from('solicitudes_mantenimiento')
        .update(updateData)
        .eq('id', id)

      if (error) {
        console.error('Error al validar trabajo:', error)
        showToast('Error al validar trabajo', 'error')
        return
      }

      setIsRedirecting(true)
      
      if (resultadoValidacion === 'aprobar') {
        showToast('Trabajo validado y cerrado correctamente', 'success', 3000)
      } else {
        showToast('Trabajo devuelto al técnico para corrección', 'success', 3000)
      }

      // Redirect immediately to prevent loop
      router.push('/area/mantencion/evaluacion_solicitudes')
    } catch (err) {
      console.error('Error inesperado al validar trabajo:', err)
      showToast('Error inesperado al validar trabajo', 'error')
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
  const tiempoDesdeEjecucion = getTimeSinceExecution(solicitud.fecha_ejecucion)
  const asignacionInfo = extractAsignacionInfo(solicitud.observaciones) || { tecnico: solicitud.tecnico || '', prioridad: '', fechaProgramada: '', notas: '' }
  const progressSteps = getProgressSteps()
  const fotosOriginales = solicitud.fotos_urls && Array.isArray(solicitud.fotos_urls) ? solicitud.fotos_urls.filter((url: string) => url && url.trim()) : []
  const fotosEjecucion = solicitud.fotos_ejecucion && Array.isArray(solicitud.fotos_ejecucion) ? solicitud.fotos_ejecucion.filter((url: string) => url && url.trim()) : []
  const maxVisibleFotos = 3
  const tecnicoObservaciones = extractTecnicoObservaciones(solicitud.observaciones)
  const timelineEvents = parseTimeline(solicitud)

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
                Validar trabajo {solicitud.ticket_id && `#${solicitud.ticket_id}`}
              </h1>
              
              <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: '#6B7280' }}>
                {asignacionInfo.tecnico && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      Técnico: {asignacionInfo.tecnico}
                    </span>
                    <span>·</span>
                  </>
                )}
                {solicitud.fecha_ejecucion && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Ejecución: {format(parseISO(solicitud.fecha_ejecucion), 'dd/MM/yyyy', { locale: es })}
                    </span>
                    <span>·</span>
                  </>
                )}
                {tiempoDesdeEjecucion && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    Finalizado {tiempoDesdeEjecucion}
                  </span>
                )}
              </div>
            </div>
            
            <span 
              className="px-4 py-2 rounded-lg text-base font-semibold inline-flex items-center"
              style={{ 
                backgroundColor: '#EDE9FE',
                color: '#6D28D9'
              }}
            >
              En validación
            </span>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Card 1: Resumen de la solicitud */}
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
              <div className="space-y-4">
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
              {fotosOriginales.length > 0 && (
                <div className="pt-4 border-t mt-4" style={{ borderColor: '#E5E7EB' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>Fotos adjuntas</p>
                  <div className="flex items-center gap-2">
                    {fotosOriginales.slice(0, maxVisibleFotos).map((url: string, index: number) => (
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
                        />
                      </div>
                    ))}
                    {fotosOriginales.length > maxVisibleFotos && (
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
                        +{fotosOriginales.length - maxVisibleFotos}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Trabajo realizado por el técnico */}
            <div 
              className="bg-white rounded-xl p-6 shadow-sm border"
              style={{
                borderColor: '#E5E7EB',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
                backgroundColor: '#F0FDF4'
              }}
            >
              <h2 className="text-lg font-semibold mb-4" style={{ color: '#111827' }}>
                Trabajo realizado
              </h2>
              
              <div className="space-y-4">
                <div>
                  <span className="text-sm" style={{ color: '#6B7280' }}>Técnico responsable</span>
                  <p className="text-sm font-medium mt-1" style={{ color: '#111827' }}>
                    {asignacionInfo.tecnico || solicitud.tecnico || 'No asignado'}
                  </p>
                </div>

                {solicitud.fecha_ejecucion && (
                  <div>
                    <span className="text-sm" style={{ color: '#6B7280' }}>Fecha de ejecución</span>
                    <p className="text-sm font-medium mt-1" style={{ color: '#111827' }}>
                      {format(parseISO(solicitud.fecha_ejecucion), 'dd-MM-yyyy', { locale: es })}
                    </p>
                  </div>
                )}

                {solicitud.accion_realizada && (
                  <div>
                    <span className="text-sm" style={{ color: '#6B7280' }}>Acción realizada</span>
                    <p className="text-sm mt-1 whitespace-pre-line" style={{ color: '#111827' }}>
                      {solicitud.accion_realizada}
                    </p>
                  </div>
                )}

                {tecnicoObservaciones && (
                  <div>
                    <span className="text-sm" style={{ color: '#6B7280' }}>Observaciones del técnico</span>
                    <p className="text-sm mt-1 whitespace-pre-line" style={{ color: '#111827' }}>
                      {tecnicoObservaciones}
                    </p>
                  </div>
                )}

                {/* Fotos de ejecución */}
                {fotosEjecucion.length > 0 && (
                  <div>
                    <span className="text-sm block mb-2" style={{ color: '#6B7280' }}>Fotos de ejecución</span>
                    <div className="grid grid-cols-3 gap-2">
                      {fotosEjecucion.map((url: string, index: number) => (
                        <div
                          key={index}
                          className="relative cursor-pointer rounded border overflow-hidden"
                          style={{ 
                            borderColor: '#E5E7EB',
                            aspectRatio: '1/1'
                          }}
                          onClick={() => setSelectedImageIndex(fotosOriginales.length + index)}
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
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Card 3: Estado del trabajo */}
            <div 
              className="bg-white rounded-xl p-6 shadow-sm border"
              style={{
                borderColor: '#E5E7EB',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)'
              }}
            >
              <h2 className="text-lg font-semibold mb-4" style={{ color: '#111827' }}>
                Estado del trabajo
              </h2>
              
              {/* Técnico asignado */}
              {asignacionInfo.tecnico && (
                <div className="mb-6 pb-6 border-b" style={{ borderColor: '#E5E7EB' }}>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-semibold flex-shrink-0"
                      style={{ backgroundColor: '#1D4ED8' }}
                    >
                      {asignacionInfo.tecnico.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                    </div>
                    <div className="flex-1">
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

              {/* Prioridad y riesgo */}
              <div className="mb-6 pb-6 border-b flex flex-wrap gap-2" style={{ borderColor: '#E5E7EB' }}>
                {asignacionInfo.prioridad && (
                  <span 
                    className="px-3 py-1 rounded text-xs font-medium"
                    style={{ 
                      backgroundColor: asignacionInfo.prioridad.toLowerCase().includes('crítica') ? '#FEE2E2' :
                                     asignacionInfo.prioridad.toLowerCase().includes('alta') ? '#FFEDD5' :
                                     asignacionInfo.prioridad.toLowerCase().includes('media') ? '#FEF3C7' : '#DCFCE7',
                      color: asignacionInfo.prioridad.toLowerCase().includes('crítica') ? '#B91C1C' :
                            asignacionInfo.prioridad.toLowerCase().includes('alta') ? '#C2410C' :
                            asignacionInfo.prioridad.toLowerCase().includes('media') ? '#B45309' : '#15803D'
                    }}
                  >
                    Prioridad: {asignacionInfo.prioridad}
                  </span>
                )}
                {solicitud.nivel_riesgo && (
                  <span 
                    className="px-3 py-1 rounded text-xs font-medium border"
                    style={{ 
                      backgroundColor: riskStyle.bg,
                      color: riskStyle.text,
                      borderColor: riskStyle.border
                    }}
                  >
                    Nivel de riesgo: {riskStyle.label}
                  </span>
                )}
              </div>

              {/* Fechas */}
              <div className="mb-6 pb-6 border-b space-y-2" style={{ borderColor: '#E5E7EB' }}>
                {asignacionInfo.fechaProgramada && (
                  <div>
                    <span className="text-xs" style={{ color: '#6B7280' }}>Programado para</span>
                    <p className="text-sm font-medium mt-1" style={{ color: '#111827' }}>
                      {format(parseISO(asignacionInfo.fechaProgramada), 'dd-MM-yyyy', { locale: es })}
                    </p>
                  </div>
                )}
                {asignacionInfo.fechaProgramada && (
                  <div>
                    <span className="text-xs" style={{ color: '#6B7280' }}>Tiempo desde asignación</span>
                    <p className="text-sm font-medium mt-1" style={{ color: '#111827' }}>
                      {formatDistanceToNow(parseISO(asignacionInfo.fechaProgramada), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                )}
              </div>

              {/* Progreso */}
              <div>
                <p className="text-xs font-medium mb-3" style={{ color: '#6B7280' }}>Progreso</p>
                <div className="flex items-center gap-2">
                  {progressSteps.map((step, index) => (
                    <React.Fragment key={index}>
                      <div className="flex-1">
                        <div 
                          className="h-2 rounded-full"
                          style={{ 
                            backgroundColor: step.completed ? (step.active ? '#1D6FE3' : '#10B981') : '#E5E7EB'
                          }}
                        />
                        <p 
                          className="text-xs mt-1 text-center"
                          style={{ color: step.completed ? (step.active ? '#1D6FE3' : '#10B981') : '#9CA3AF' }}
                        >
                          {step.label}
                        </p>
                      </div>
                      {index < progressSteps.length - 1 && (
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 4: Validación del trabajo */}
            <div 
              className="bg-white rounded-xl p-6 shadow-sm border"
              style={{
                borderColor: '#E5E7EB',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)'
              }}
            >
              <h2 className="text-lg font-semibold mb-2" style={{ color: '#111827' }}>
                Validación del trabajo
              </h2>
              <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
                Revisa la evidencia y decide si el trabajo puede darse por finalizado o necesita correcciones.
              </p>
              
              <div className="space-y-6">
                {/* Resultado de la validación */}
                <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: '#111827' }}>
                    Resultado de la validación *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setResultadoValidacion('aprobar')}
                      className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                        resultadoValidacion === 'aprobar' 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 bg-white hover:border-green-300'
                      }`}
                    >
                      <CheckCircle className={`h-5 w-5 ${resultadoValidacion === 'aprobar' ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className={`font-medium ${resultadoValidacion === 'aprobar' ? 'text-green-700' : 'text-gray-700'}`}>
                        Aprobar y cerrar
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultadoValidacion('rechazar')}
                      className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                        resultadoValidacion === 'rechazar' 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 bg-white hover:border-red-300'
                      }`}
                    >
                      <XCircle className={`h-5 w-5 ${resultadoValidacion === 'rechazar' ? 'text-red-600' : 'text-gray-400'}`} />
                      <span className={`font-medium ${resultadoValidacion === 'rechazar' ? 'text-red-700' : 'text-gray-700'}`}>
                        Requiere corrección
                      </span>
                    </button>
                  </div>
                </div>

                {/* Comentarios */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
                    Comentarios para el técnico / registro interno *
                  </label>
                  <textarea
                    value={comentarios}
                    onChange={(e) => setComentarios(e.target.value)}
                    placeholder="Explica por qué apruebas o qué debe corregir el técnico..."
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                  {resultadoValidacion === 'rechazar' && !comentarios.trim() && (
                    <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
                      Este campo es obligatorio cuando se requiere corrección
                    </p>
                  )}
                </div>

                {/* Reasignación (solo si rechaza) */}
                {resultadoValidacion === 'rechazar' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="devolverMismoTecnico"
                        checked={devolverMismoTecnico}
                        onChange={(e) => {
                          setDevolverMismoTecnico(e.target.checked)
                          if (e.target.checked) {
                            setTecnicoReasignacion('')
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <label htmlFor="devolverMismoTecnico" className="text-sm" style={{ color: '#111827' }}>
                        Devolver al mismo técnico
                      </label>
                    </div>

                    {!devolverMismoTecnico && (
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
                          Asignar a otro técnico
                        </label>
                        <div className="relative tecnico-filter-dropdown">
                          <input
                            type="text"
                            value={tecnicoReasignacion}
                            onChange={(e) => {
                              setTecnicoReasignacion(e.target.value)
                              setShowTecnicoDropdown(true)
                            }}
                            onFocus={() => setShowTecnicoDropdown(true)}
                            placeholder="Buscar técnico..."
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            style={{ borderColor: '#E5E7EB' }}
                          />
                          {showTecnicoDropdown && (
                            <div 
                              className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                              style={{ borderColor: '#E5E7EB' }}
                            >
                              {getFilteredTecnicos().length > 0 ? (
                                getFilteredTecnicos().map((t) => (
                                  <button
                                    key={t.nombre}
                                    type="button"
                                    onClick={() => {
                                      setTecnicoReasignacion(t.nombre)
                                      setShowTecnicoDropdown(false)
                                    }}
                                    className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors flex items-center gap-3"
                                  >
                                    <div
                                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                                      style={{ backgroundColor: '#1D6FE3' }}
                                    >
                                      {t.nombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium">{t.nombre}</p>
                                      <p className="text-xs" style={{ color: '#6B7280' }}>
                                        {t.trabajosEnCurso} trabajo{t.trabajosEnCurso !== 1 ? 's' : ''} en curso
                                      </p>
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <p className="px-3 py-2 text-sm" style={{ color: '#6B7280' }}>
                                  No se encontraron técnicos
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex gap-3 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                  <button
                    onClick={() => router.push('/area/mantencion/evaluacion_solicitudes')}
                    className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
                    style={{ 
                      borderColor: '#E5E7EB',
                      color: '#6B7280'
                    }}
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !resultadoValidacion || (resultadoValidacion === 'rechazar' && !comentarios.trim()) || (resultadoValidacion === 'rechazar' && !devolverMismoTecnico && !tecnicoReasignacion.trim())}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors flex-1"
                    style={{ 
                      backgroundColor: submitting || !resultadoValidacion || (resultadoValidacion === 'rechazar' && !comentarios.trim()) || (resultadoValidacion === 'rechazar' && !devolverMismoTecnico && !tecnicoReasignacion.trim()) ? '#9CA3AF' : '#1D6FE3'
                    }}
                  >
                    {submitting ? 'Procesando...' : resultadoValidacion === 'aprobar' ? 'Validar trabajo' : 'Devolver al técnico'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Historial de acciones - Full width card */}
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
              {timelineEvents.map((event, index) => {
                const formattedDate = formatDateSafe(event.fecha, event.hora, 'dd-MM-yyyy HH:mm')
                return (
                  <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-b-0 last:pb-0" style={{ borderColor: '#E5E7EB' }}>
                    <div className="flex-shrink-0 mt-0.5">
                      <span className="text-lg">{event.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium" style={{ color: '#6B7280' }}>
                          {formattedDate}
                        </span>
                        <span className="text-xs font-semibold" style={{ color: '#111827' }}>
                          {event.autor}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: '#4B5563' }}>
                        {event.descripcion}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImageIndex !== null && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setSelectedImageIndex(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <button
              onClick={() => setSelectedImageIndex(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={selectedImageIndex < fotosOriginales.length 
                ? fotosOriginales[selectedImageIndex] 
                : fotosEjecucion[selectedImageIndex - fotosOriginales.length]}
              alt="Imagen ampliada"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  )
}
