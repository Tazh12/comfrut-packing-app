'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { ArrowLeft, Clock, User, Calendar, ZoomIn, X, Wrench, Play, CheckCircle2, Save, Upload, AlertCircle } from 'lucide-react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface TimelineEvent {
  fecha: string
  hora?: string
  tipo: 'creacion' | 'asignacion' | 'inicio' | 'actualizacion' | 'validacion' | 'finalizacion'
  descripcion: string
  icon: string
  autor?: string
}

export default function TecnicoTrabajoPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { showToast } = useToast()

  const [solicitud, setSolicitud] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [saving, setSaving] = useState<boolean>(false)
  
  // Form state for execution
  const [fechaInicio, setFechaInicio] = useState<string>('')
  const [horaInicio, setHoraInicio] = useState<string>('')
  const [fechaTermino, setFechaTermino] = useState<string>('')
  const [horaTermino, setHoraTermino] = useState<string>('')
  const [accionRealizada, setAccionRealizada] = useState<string>('')
  const [materialesUtilizados, setMaterialesUtilizados] = useState<string>('')
  const [observacionesSeguridad, setObservacionesSeguridad] = useState<string>('')
  const [fotosEjecucion, setFotosEjecucion] = useState<File[]>([])
  const [fotoPreviews, setFotoPreviews] = useState<string[]>([]) // Only existing URLs from DB
  const [nuevasFotoPreviews, setNuevasFotoPreviews] = useState<string[]>([]) // Temporary previews for new files
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          showToast('No se encontró el trabajo', 'error')
          router.push('/area/mantencion/tecnico/mis-trabajos')
          return
        }
        setSolicitud(data)
        
        // Load existing execution data if available
        if (data.fecha_ejecucion) {
          try {
            const fechaEjec = parseISO(data.fecha_ejecucion)
            if (!isNaN(fechaEjec.getTime())) {
              setFechaTermino(format(fechaEjec, 'yyyy-MM-dd'))
              setHoraTermino(format(fechaEjec, 'HH:mm'))
            }
          } catch (err) {
            console.error('Error parsing fecha_ejecucion:', err)
          }
        }
        if (data.accion_realizada) {
          setAccionRealizada(data.accion_realizada)
        }
        if (data.fotos_ejecucion && Array.isArray(data.fotos_ejecucion)) {
          // Filter out any invalid/null URLs
          const validUrls = data.fotos_ejecucion.filter((url: string) => url && url.trim())
          setFotoPreviews(validUrls)
        }
        
        // Parse timeline
        const events = parseTimeline(data)
        setTimelineEvents(events)
      } catch (err) {
        console.error('Error inesperado al cargar trabajo:', err)
        showToast('Error al cargar trabajo', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchSolicitud()
  }, [id, router, showToast])

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
    
    // Creation event
    if (sol.fecha && isValidDate(sol.fecha)) {
      events.push({
        fecha: sol.fecha,
        hora: sol.hora || '00:00:00',
        tipo: 'creacion',
        descripcion: `creó la solicitud`,
        autor: sol.solicitante || 'Usuario',
        icon: '📄'
      })
    }

    // Parse observaciones for assignment
    if (sol.observaciones) {
      const obs = sol.observaciones
      
      // Check for assignment
      const asignacionMatch = obs.match(/\[Asignación\]\s*Técnico:\s*([^|]+)\s*\|\s*Prioridad:\s*([^|]+)\s*\|\s*Fecha programada:\s*([^|\n]+)/i)
      if (asignacionMatch && sol.fecha && isValidDate(sol.fecha)) {
        const tecnico = asignacionMatch[1].trim()
        const prioridad = asignacionMatch[2].trim()
        const fechaProg = asignacionMatch[3].trim()
        
        let fechaProgFormatted = fechaProg
        try {
          if (isValidDate(fechaProg)) {
            fechaProgFormatted = format(parseISO(fechaProg), 'dd-MM-yyyy', { locale: es })
          }
        } catch {}
        
        events.push({
          fecha: sol.fecha,
          hora: sol.hora || '00:00:00',
          tipo: 'asignacion',
          descripcion: `fue asignado como técnico${prioridad ? ` (Prioridad: ${prioridad}` : ''}${fechaProgFormatted ? ` · Programado: ${fechaProgFormatted}` : ''}${prioridad ? ')' : ''}`,
          autor: tecnico,
          icon: '✅'
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
            descripcion: `marcó el trabajo como "En curso"`,
            autor: sol.tecnico || 'Técnico',
            icon: '🔧'
          })
        }
      }

      // Check for completion
      if (sol.estado === 'por_validar' || sol.estado_final === 'resuelta') {
        const fechaFinalizacion = sol.fecha_ejecucion || sol.fecha
        if (fechaFinalizacion && isValidDate(fechaFinalizacion)) {
          events.push({
            fecha: fechaFinalizacion,
            hora: sol.hora || '00:00:00',
            tipo: 'finalizacion',
            descripcion: `marcó el trabajo como "Terminado por técnico"`,
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
        return { bg: '#FEF3C7', text: '#B45309', label: 'Pendiente de ejecución' }
      case 'por_validar':
        return { bg: '#EDE9FE', text: '#6D28D9', label: 'Terminado por técnico' }
      default:
        return { bg: '#F3F4F6', text: '#6B7280', label: estado }
    }
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

  const extractComentariosSupervisor = (obs?: string): { comentario: string; fecha?: string } | null => {
    if (!obs) return null
    // Look for "Devolvió el trabajo para corrección" followed by "Comentario:" on next line
    const match = obs.match(/Devolvió el trabajo para corrección[\s\S]*?Comentario:\s*([^\n]+(?:\n[^\n]+)*)/)
    if (match) {
      return { comentario: match[1].trim() }
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

  // Compress image to reduce file size
  const compressImage = (file: File, maxWidth = 1920, quality = 0.85, maxSizeKB = 300): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const reader = new FileReader()

      reader.onload = (e) => {
        img.src = e.target?.result as string
      }

      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) return reject('No se pudo obtener contexto de canvas')

        ctx.drawImage(img, 0, 0, width, height)

        const tryCompress = (currentQuality: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject('Error al comprimir imagen')
              
              const sizeKB = blob.size / 1024
              
              if (sizeKB > maxSizeKB && currentQuality > 0.3) {
                tryCompress(currentQuality - 0.1)
              } else {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                })
                resolve(compressedFile)
              }
            },
            'image/jpeg',
            currentQuality
          )
        }

        tryCompress(quality)
      }

      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleStartWork = async () => {
    setSaving(true)
    try {
      const now = new Date()
      const fechaInicioStr = format(now, 'yyyy-MM-dd')
      const horaInicioStr = format(now, 'HH:mm:ss')
      
      setFechaInicio(fechaInicioStr)
      setHoraInicio(horaInicioStr)

      // Get current observaciones
      const { data: currentData } = await supabase
        .from('solicitudes_mantenimiento')
        .select('observaciones')
        .eq('id', id)
        .single()

      const historyEntry = `[${format(now, 'dd-MM-yyyy HH:mm:ss', { locale: es })}] ${solicitud.tecnico || 'Técnico'} - Trabajo iniciado`
      const updatedObservaciones = currentData?.observaciones 
        ? `${currentData.observaciones}\n\n${historyEntry}`
        : historyEntry

      const { error } = await supabase
        .from('solicitudes_mantenimiento')
        .update({
          estado: 'en_ejecucion',
          observaciones: updatedObservaciones
        })
        .eq('id', id)

      if (error) {
        console.error('Error al iniciar trabajo:', error)
        showToast('Error al iniciar trabajo', 'error')
        return
      }

      showToast('Trabajo iniciado correctamente', 'success')
      // Reload solicitud
      const { data: updatedData } = await supabase
        .from('solicitudes_mantenimiento')
        .select('*')
        .eq('id', id)
        .single()
      
      if (updatedData) {
        setSolicitud(updatedData)
        const events = parseTimeline(updatedData)
        setTimelineEvents(events)
      }
    } catch (err) {
      console.error('Error inesperado:', err)
      showToast('Error inesperado', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveProgress = async () => {
    if (!accionRealizada.trim()) {
      showToast('Por favor completa la acción realizada', 'error')
      return
    }

    setSaving(true)
    try {
      // Upload photos if any (with compression)
      // Start with existing photos from DB (only URLs, not data URLs)
      const fotoUrls: string[] = fotoPreviews.filter(url => url && url.startsWith('http'))
      
      // Upload new files and add their URLs
      for (const file of fotosEjecucion) {
        try {
          const compressedFile = await compressImage(file)
          const fileName = `${id}-exec-${Date.now()}-${compressedFile.name}`
          const { error: uploadError } = await supabase.storage
            .from('mtto-fotos-temp')
            .upload(fileName, compressedFile, { contentType: 'image/jpeg' })
          
          if (uploadError) {
            console.error('Error al subir foto:', uploadError)
            continue
          }
          
          const { data: { publicUrl } } = supabase.storage.from('mtto-fotos-temp').getPublicUrl(fileName)
          // Only add if not already in the array
          if (!fotoUrls.includes(publicUrl)) {
            fotoUrls.push(publicUrl)
          }
        } catch (err) {
          console.error('Error al comprimir/subir foto:', err)
        }
      }

      // Get current observaciones
      const { data: currentData } = await supabase
        .from('solicitudes_mantenimiento')
        .select('observaciones')
        .eq('id', id)
        .single()

      const now = new Date()
      const historyEntry = `[${format(now, 'dd-MM-yyyy HH:mm:ss', { locale: es })}] ${solicitud.tecnico || 'Técnico'} - Avance guardado\nAcción: ${accionRealizada}${materialesUtilizados ? `\nMateriales: ${materialesUtilizados}` : ''}${observacionesSeguridad ? `\nObservaciones seguridad: ${observacionesSeguridad}` : ''}`
      const updatedObservaciones = currentData?.observaciones 
        ? `${currentData.observaciones}\n\n${historyEntry}`
        : historyEntry

      const updateData: any = {
        accion_realizada: accionRealizada,
        observaciones: updatedObservaciones
      }

      if (fotoUrls.length > 0) {
        updateData.fotos_ejecucion = fotoUrls
      }

      if (materialesUtilizados.trim()) {
        updateData.observaciones = `${updatedObservaciones}\nMateriales utilizados: ${materialesUtilizados}`
      }

      const { error } = await supabase
        .from('solicitudes_mantenimiento')
        .update(updateData)
        .eq('id', id)

      if (error) {
        console.error('Error al guardar avance:', error)
        showToast('Error al guardar avance', 'error')
        return
      }

      showToast('Avance guardado correctamente', 'success')
      setFotosEjecucion([])
      setNuevasFotoPreviews([])
      setFotoPreviews(fotoUrls)
    } catch (err) {
      console.error('Error inesperado:', err)
      showToast('Error inesperado', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkAsCompleted = async () => {
    if (!accionRealizada.trim()) {
      showToast('Por favor completa la acción realizada', 'error')
      return
    }

    if (fotosEjecucion.length === 0 && fotoPreviews.length === 0 && nuevasFotoPreviews.length === 0) {
      showToast('Por favor adjunta al menos una foto de ejecución', 'error')
      return
    }

    if (!fechaTermino || !horaTermino) {
      showToast('Por favor completa la fecha y hora de término', 'error')
      return
    }

    setSaving(true)
    try {
      // Upload photos if any (with compression)
      // Start with existing photos from DB (only URLs, not data URLs)
      const fotoUrls: string[] = fotoPreviews.filter(url => url && url.startsWith('http'))
      
      // Upload new files and add their URLs
      for (const file of fotosEjecucion) {
        try {
          const compressedFile = await compressImage(file)
          const fileName = `${id}-exec-${Date.now()}-${compressedFile.name}`
          const { error: uploadError } = await supabase.storage
            .from('mtto-fotos-temp')
            .upload(fileName, compressedFile, { contentType: 'image/jpeg' })
          
          if (uploadError) {
            console.error('Error al subir foto:', uploadError)
            continue
          }
          
          const { data: { publicUrl } } = supabase.storage.from('mtto-fotos-temp').getPublicUrl(fileName)
          // Only add if not already in the array
          if (!fotoUrls.includes(publicUrl)) {
            fotoUrls.push(publicUrl)
          }
        } catch (err) {
          console.error('Error al comprimir/subir foto:', err)
        }
      }

      const fechaEjecucion = `${fechaTermino}T${horaTermino}:00`

      // Get current observaciones
      const { data: currentData } = await supabase
        .from('solicitudes_mantenimiento')
        .select('observaciones')
        .eq('id', id)
        .single()

      const now = new Date()
      const historyEntry = `[${format(now, 'dd-MM-yyyy HH:mm:ss', { locale: es })}] ${solicitud.tecnico || 'Técnico'} - Marcado como resuelto\nAcción: ${accionRealizada}${materialesUtilizados ? `\nMateriales: ${materialesUtilizados}` : ''}${observacionesSeguridad ? `\nObservaciones seguridad: ${observacionesSeguridad}` : ''}`
      const updatedObservaciones = currentData?.observaciones 
        ? `${currentData.observaciones}\n\n${historyEntry}`
        : historyEntry

      const updateData: any = {
        estado: 'por_validar',
        estado_final: 'resuelta',
        fecha_ejecucion: fechaEjecucion,
        accion_realizada: accionRealizada,
        fotos_ejecucion: fotoUrls,
        observaciones: updatedObservaciones
      }

      if (materialesUtilizados.trim()) {
        updateData.observaciones = `${updatedObservaciones}\nMateriales utilizados: ${materialesUtilizados}`
      }

      const { error } = await supabase
        .from('solicitudes_mantenimiento')
        .update(updateData)
        .eq('id', id)

      if (error) {
        console.error('Error al marcar como terminado:', error)
        showToast('Error al marcar como terminado', 'error')
        return
      }

      showToast('Trabajo marcado como terminado. Pendiente de validación', 'success', 3000)
      setTimeout(() => {
        router.push('/area/mantencion/tecnico/mis-trabajos')
      }, 2000)
    } catch (err) {
      console.error('Error inesperado:', err)
      showToast('Error inesperado', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files || files.length === 0) return
    
    const totalFotos = fotoPreviews.length + nuevasFotoPreviews.length + fotosEjecucion.length
    const availableSlots = 3 - totalFotos
    
    if (availableSlots <= 0) {
      showToast('Máximo 3 fotos permitidas', 'error')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }
    
    // Only take the number of files that fit in available slots
    const newFiles = files.slice(0, availableSlots)
    
    // Add files to state
    setFotosEjecucion(prev => [...prev, ...newFiles])
    
    // Create temporary previews for new files (these are data URLs, not uploaded yet)
    newFiles.forEach((file, fileIndex) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        // Use a functional update to ensure we're adding to the current state
        setNuevasFotoPreviews(prev => {
          // Check if this data URL is already in the array to prevent duplicates
          if (prev.includes(dataUrl)) {
            return prev
          }
          return [...prev, dataUrl]
        })
      }
      reader.onerror = () => {
        console.error('Error reading file:', file.name)
      }
      reader.readAsDataURL(file)
    })
    
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removePhoto = (index: number) => {
    const totalExisting = fotoPreviews.length
    if (index < totalExisting) {
      // Remove from existing previews (from DB)
      setFotoPreviews(prev => prev.filter((_, i) => i !== index))
    } else {
      // Remove from new files
      const newIndex = index - totalExisting
      setFotosEjecucion(prev => prev.filter((_, i) => i !== newIndex))
      setNuevasFotoPreviews(prev => prev.filter((_, i) => i !== newIndex))
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
        <p className="text-gray-600">Trabajo no encontrado.</p>
      </div>
    )
  }

  const riskStyle = getRiskBadgeStyle(solicitud.nivel_riesgo)
  const estadoStyle = getEstadoBadgeStyle(solicitud.estado)
  const impacto = parseObservacionesForImpact(solicitud.observaciones)
  const tiempoDesdeCreacion = getTimeSinceCreation(solicitud.fecha, solicitud.hora)
  const asignacionInfo = extractAsignacionInfo(solicitud.observaciones) || { tecnico: solicitud.tecnico || '', prioridad: '', fechaProgramada: '', notas: '' }
  const tiempoDesdeAsignacion = asignacionInfo.fechaProgramada ? getTimeSinceAssignment(asignacionInfo.fechaProgramada) : ''
  const fotos = solicitud.fotos_urls && Array.isArray(solicitud.fotos_urls) ? solicitud.fotos_urls.filter((url: string) => url && url.trim()) : []
  const maxVisibleFotos = 3
  const canEdit = solicitud.estado === 'programada' || solicitud.estado === 'en_ejecucion'
  const isCompleted = solicitud.estado === 'por_validar' || solicitud.estado === 'finalizada'

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F5F7FB' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <button 
                onClick={() => router.push('/area/mantencion/tecnico/mis-trabajos')} 
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Volver
              </button>
              
              <h1 className="text-2xl font-bold mb-3" style={{ color: '#111827' }}>
                Trabajo {solicitud.ticket_id && `#${solicitud.ticket_id}`}
              </h1>
              
              <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: '#6B7280' }}>
                {asignacionInfo.tecnico && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <Wrench className="h-4 w-4" />
                      {asignacionInfo.tecnico} (técnico)
                    </span>
                    <span>·</span>
                  </>
                )}
                {asignacionInfo.fechaProgramada && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Programado: {format(parseISO(asignacionInfo.fechaProgramada), 'dd/MM/yyyy', { locale: es })}
                    </span>
                    <span>·</span>
                  </>
                )}
                {tiempoDesdeAsignacion && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    Asignado {tiempoDesdeAsignacion}
                  </span>
                )}
              </div>
            </div>
            
            <span 
              className="px-4 py-2 rounded-lg text-base font-semibold inline-flex items-center"
              style={{ 
                backgroundColor: estadoStyle.bg,
                color: estadoStyle.text
              }}
            >
              {estadoStyle.label}
            </span>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Resumen de la solicitud (solo lectura) */}
          <div className="space-y-6">
            <div 
              className="bg-white rounded-xl p-6 shadow-sm border"
              style={{
                borderColor: '#E5E7EB',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)'
              }}
            >
              {/* Header */}
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

                {solicitud.recomendacion && (
                  <div>
                    <span className="text-sm" style={{ color: '#6B7280' }}>Recomendación</span>
                    <p className="text-sm mt-1" style={{ color: '#111827' }}>
                      {solicitud.recomendacion}
                    </p>
                  </div>
                )}
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
          </div>

          {/* Right Column - Ejecución del trabajo (editable) */}
          <div className="space-y-6">
            {/* Card: Estado del trabajo */}
            <div 
              className="bg-white rounded-xl p-6 shadow-sm border"
              style={{
                borderColor: '#E5E7EB',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)'
              }}
            >
              <h2 className="text-lg font-semibold mb-6" style={{ color: '#111827' }}>
                Ejecución del trabajo
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

              {/* Progreso / Stepper */}
              <div className="mb-6 pb-6 border-b" style={{ borderColor: '#E5E7EB' }}>
                <p className="text-xs font-medium mb-3" style={{ color: '#6B7280' }}>Progreso</p>
                <div className="flex items-center gap-2">
                  {[
                    { label: 'Asignado', completed: ['programada', 'en_ejecucion', 'por_validar', 'finalizada'].includes(solicitud.estado), active: solicitud.estado === 'programada' },
                    { label: 'En curso', completed: ['en_ejecucion', 'por_validar', 'finalizada'].includes(solicitud.estado), active: solicitud.estado === 'en_ejecucion' },
                    { label: 'Terminado por técnico', completed: ['por_validar', 'finalizada'].includes(solicitud.estado), active: solicitud.estado === 'por_validar' },
                    { label: 'Validado', completed: ['finalizada'].includes(solicitud.estado), active: solicitud.estado === 'finalizada' }
                  ].map((step, index) => (
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
                      {index < 3 && (
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E5E7EB' }}></div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Comentarios del supervisor (si fue devuelto) */}
              {extractComentariosSupervisor(solicitud.observaciones) && (
                <div className="mb-6 pb-6 border-b" style={{ borderColor: '#E5E7EB' }}>
                  <div 
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#B91C1C' }} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold mb-1" style={{ color: '#B91C1C' }}>
                          Trabajo devuelto para corrección
                        </p>
                        <p className="text-sm whitespace-pre-line" style={{ color: '#7F1D1D' }}>
                          {extractComentariosSupervisor(solicitud.observaciones)?.comentario}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {canEdit && (
                <div className="mb-6 pb-6 border-b space-y-3" style={{ borderColor: '#E5E7EB' }}>
                  {solicitud.estado === 'programada' && (
                    <button
                      onClick={handleStartWork}
                      disabled={saving}
                      className="w-full px-4 py-3 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ backgroundColor: '#16A34A' }}
                      onMouseEnter={(e) => {
                        if (!saving) e.currentTarget.style.backgroundColor = '#15803D'
                      }}
                      onMouseLeave={(e) => {
                        if (!saving) e.currentTarget.style.backgroundColor = '#16A34A'
                      }}
                    >
                      <Play className="h-5 w-5" />
                      {saving ? 'Iniciando...' : 'Comenzar trabajo'}
                    </button>
                  )}
                </div>
              )}

              {/* Campos de ejecución - Solo visibles cuando está en curso o terminado */}
              {(solicitud.estado === 'en_ejecucion' || solicitud.estado === 'por_validar') && (
                <div className="space-y-4">
                  {/* Fecha y hora de término */}
                  {solicitud.estado === 'en_ejecucion' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                          Fecha de término *
                        </label>
                        <input
                          type="date"
                          value={fechaTermino}
                          onChange={(e) => setFechaTermino(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          style={{ borderColor: '#E5E7EB' }}
                          disabled={isCompleted}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                          Hora de término *
                        </label>
                        <input
                          type="time"
                          value={horaTermino}
                          onChange={(e) => setHoraTermino(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          style={{ borderColor: '#E5E7EB' }}
                          disabled={isCompleted}
                        />
                      </div>
                    </div>
                  )}

                  {/* Acción realizada */}
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                      Acción realizada *
                    </label>
                    <textarea
                      value={accionRealizada}
                      onChange={(e) => setAccionRealizada(e.target.value)}
                      placeholder="Describe lo que hiciste para resolver la falla..."
                      rows={4}
                      className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                      style={{ borderColor: '#E5E7EB' }}
                      disabled={isCompleted}
                    />
                  </div>

                  {/* Materiales utilizados */}
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                      Materiales utilizados
                    </label>
                    <textarea
                      value={materialesUtilizados}
                      onChange={(e) => setMaterialesUtilizados(e.target.value)}
                      placeholder="Opcional: repuestos, consumibles, etc."
                      rows={2}
                      className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                      style={{ borderColor: '#E5E7EB' }}
                      disabled={isCompleted}
                    />
                  </div>

                  {/* Observaciones de seguridad */}
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                      Observaciones de seguridad
                    </label>
                    <textarea
                      value={observacionesSeguridad}
                      onChange={(e) => setObservacionesSeguridad(e.target.value)}
                      placeholder="Opcional: observaciones sobre seguridad..."
                      rows={2}
                      className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                      style={{ borderColor: '#E5E7EB' }}
                      disabled={isCompleted}
                    />
                  </div>

                  {/* Fotos de ejecución */}
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                      Fotos de ejecución {solicitud.estado === 'en_ejecucion' && '*'}
                    </label>
                    <div className="space-y-2">
                      {(fotoPreviews.length > 0 || nuevasFotoPreviews.length > 0) && (
                        <div className="flex flex-wrap gap-2">
                          {/* Existing photos from DB */}
                          {fotoPreviews.map((url, index) => (
                            <div key={`existing-${index}`} className="relative">
                              <img
                                src={url}
                                alt={`Ejecución ${index + 1}`}
                                className="w-20 h-20 object-cover rounded border"
                                style={{ borderColor: '#E5E7EB' }}
                              />
                              {!isCompleted && (
                                <button
                                  onClick={() => removePhoto(index)}
                                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                          {/* New photo previews (temporary data URLs) */}
                          {nuevasFotoPreviews.map((dataUrl, index) => (
                            <div key={`new-${index}`} className="relative">
                              <img
                                src={dataUrl}
                                alt={`Nueva ejecución ${index + 1}`}
                                className="w-20 h-20 object-cover rounded border"
                                style={{ borderColor: '#E5E7EB' }}
                              />
                              {!isCompleted && (
                                <button
                                  onClick={() => removePhoto(fotoPreviews.length + index)}
                                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {!isCompleted && (fotoPreviews.length + nuevasFotoPreviews.length) < 3 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full px-4 py-3 border-2 border-dashed rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                          style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#1D6FE3'
                            e.currentTarget.style.color = '#1D6FE3'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#E5E7EB'
                            e.currentTarget.style.color = '#6B7280'
                          }}
                        >
                          <Upload className="h-4 w-4" />
                          Agregar foto ({(fotoPreviews.length + nuevasFotoPreviews.length)}/3)
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {solicitud.estado === 'en_ejecucion' && (
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleSaveProgress}
                        disabled={saving || !accionRealizada.trim()}
                        className="flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed border flex items-center justify-center gap-2"
                        style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                        onMouseEnter={(e) => {
                          if (!saving && accionRealizada.trim()) {
                            e.currentTarget.style.backgroundColor = '#F9FAFB'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!saving && accionRealizada.trim()) {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
                      >
                        <Save className="h-4 w-4" />
                        Guardar avance
                      </button>
                      <button
                        onClick={handleMarkAsCompleted}
                        disabled={saving || !accionRealizada.trim() || !fechaTermino || !horaTermino || (fotoPreviews.length === 0 && nuevasFotoPreviews.length === 0 && fotosEjecucion.length === 0)}
                        className="flex-1 px-4 py-2 rounded-lg font-medium text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{ backgroundColor: saving || !accionRealizada.trim() || !fechaTermino || !horaTermino || (fotoPreviews.length === 0 && nuevasFotoPreviews.length === 0 && fotosEjecucion.length === 0) ? '#9CA3AF' : '#16A34A' }}
                        onMouseEnter={(e) => {
                          if (!saving && accionRealizada.trim() && fechaTermino && horaTermino && (fotoPreviews.length > 0 || nuevasFotoPreviews.length > 0 || fotosEjecucion.length > 0)) {
                            e.currentTarget.style.backgroundColor = '#15803D'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!saving && accionRealizada.trim() && fechaTermino && horaTermino && (fotoPreviews.length > 0 || nuevasFotoPreviews.length > 0 || fotosEjecucion.length > 0)) {
                            e.currentTarget.style.backgroundColor = '#16A34A'
                          }
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Marcar trabajo como terminado
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Show completed message */}
              {isCompleted && (
                <div className="text-center py-4">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2" style={{ color: '#16A34A' }} />
                  <p className="text-sm font-medium" style={{ color: '#16A34A' }}>
                    Trabajo terminado. Pendiente de validación.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Historial de acciones - Full width */}
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
            {timelineEvents.length > 0 ? (
              timelineEvents.map((event, index) => (
                <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-b-0 last:pb-0" style={{ borderColor: '#F1F5F9' }}>
                  <span className="text-lg flex-shrink-0">{event.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs mb-1" style={{ color: '#94A3B8' }}>
                      {formatDateSafe(event.fecha, event.hora).split(' ')[1] || formatDateSafe(event.fecha, event.hora)}
                    </p>
                    <p className="text-sm" style={{ color: '#111827' }}>
                      {event.autor && <span style={{ fontWeight: '500' }}>{event.autor}</span>}
                      {event.autor && ' — '}
                      {event.descripcion}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-center py-4" style={{ color: '#9CA3AF' }}>
                No hay eventos registrados
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal/Lightbox */}
      {selectedImageIndex !== null && fotos && (
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
              src={fotos[selectedImageIndex]}
              alt={`Foto ${selectedImageIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            {fotos.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex((selectedImageIndex - 1 + fotos.length) % fotos.length)
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white hover:bg-gray-100 transition-colors"
                  style={{ color: '#111827' }}
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex((selectedImageIndex + 1) % fotos.length)
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white hover:bg-gray-100 transition-colors"
                  style={{ color: '#111827' }}
                >
                  <ArrowLeft className="h-6 w-6 rotate-180" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black bg-opacity-50 text-white text-sm">
                  {selectedImageIndex + 1} / {fotos.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
