'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { useChecklistPersistence } from '@/lib/hooks/useChecklistPersistence'
import { DeleteDraftButton } from '@/components/DeleteDraftButton'

export default function SolicitudMttoPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const { user } = useAuth()
  
  // BLOQUE 1 - Datos del solicitante
  const [solicitante, setSolicitante] = useState<string>('')
  const [areaDepartamento, setAreaDepartamento] = useState<string>('')
  
  // BLOQUE 2 - Dónde está el problema
  const [zona, setZona] = useState<string>('')
  const [lugarEspecifico, setLugarEspecifico] = useState<string>('')
  const [equipoAfectado, setEquipoAfectado] = useState<string>('')
  
  // BLOQUE 3 - Qué está pasando
  const [tipoProblema, setTipoProblema] = useState<string>('')
  const [descripcion, setDescripcion] = useState<string>('')
  const [desdeCuando, setDesdeCuando] = useState<string>('')
  const [solucionTemporal, setSolucionTemporal] = useState<string>('')
  const [tieneSolucionTemporal, setTieneSolucionTemporal] = useState<string>('')
  
  // BLOQUE 4 - Impacto/urgencia (calculado internamente)
  const [afectaProduccion, setAfectaProduccion] = useState<string>('')
  const [riesgoSeguridad, setRiesgoSeguridad] = useState<string>('')
  const [urgenciaResolucion, setUrgenciaResolucion] = useState<string>('')
  const [nivelRiesgoCalculado, setNivelRiesgoCalculado] = useState<string>('')
  
  // BLOQUE 5 - Opcional
  const [recomendacion, setRecomendacion] = useState<string>('')
  const [fotos, setFotos] = useState<File[]>([])
  const [fotoPreviews, setFotoPreviews] = useState<string[]>([])
  const [isSubmitted, setIsSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Autocompletar solicitante desde usuario logueado
  useEffect(() => {
    if (user && !solicitante) {
      // Intentar obtener nombre del email o metadata
      const email = user.email || ''
      const nameFromEmail = email.split('@')[0]
      // Si hay metadata con nombre completo, usarlo
      const fullName = user.user_metadata?.full_name || 
                       user.user_metadata?.name || 
                       nameFromEmail.split('.').map((n: string) => 
                         n.charAt(0).toUpperCase() + n.slice(1)
                       ).join(' ')
      setSolicitante(fullName)
    }
  }, [user])

  // Calcular nivel de riesgo basado en las respuestas
  useEffect(() => {
    if (!afectaProduccion || !riesgoSeguridad || !urgenciaResolucion) {
      setNivelRiesgoCalculado('')
      return
    }

    // Lógica de cálculo
    const produccionDetenida = afectaProduccion === 'detenida'
    const riesgoClaro = riesgoSeguridad === 'riesgo_claro'
    const urgenciaInmediata = urgenciaResolucion === 'inmediatamente'
    const produccionAfectada = afectaProduccion === 'afecta'
    const riesgoPosible = riesgoSeguridad === 'riesgo_posible'

    if (produccionDetenida && riesgoClaro) {
      setNivelRiesgoCalculado('Crítico (Riesgo Inocuidad/Seguridad)')
    } else if ((produccionAfectada && riesgoPosible) || urgenciaInmediata) {
      setNivelRiesgoCalculado('Alto (Parada de Producción)')
    } else if (produccionAfectada || riesgoPosible) {
      setNivelRiesgoCalculado('Medio (Puede esperar)')
    } else {
      setNivelRiesgoCalculado('Bajo (Estético/General)')
    }
  }, [afectaProduccion, riesgoSeguridad, urgenciaResolucion])

  // Compress image to reduce file size while maintaining good quality (target: < 300KB)
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

        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) return reject('No se pudo obtener contexto de canvas')

        ctx.drawImage(img, 0, 0, width, height)

        // Try different quality levels if file is still too large
        const tryCompress = (currentQuality: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject('Error al comprimir imagen')
              
              const sizeKB = blob.size / 1024
              
              if (sizeKB > maxSizeKB && currentQuality > 0.3) {
                // Try lower quality
                tryCompress(currentQuality - 0.1)
              } else {
                // Create File from Blob
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

  // Convert File to base64 for persistence
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Convert base64 back to File (for display purposes, we'll use the preview)
  const base64ToFile = (base64: string, filename: string): File => {
    const arr = base64.split(',')
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new File([u8arr], filename, { type: mime })
  }

  // Reset form function
  const resetForm = () => {
    setSolicitante('')
    setAreaDepartamento('')
    setZona('')
    setLugarEspecifico('')
    setEquipoAfectado('')
    setTipoProblema('')
    setDescripcion('')
    setDesdeCuando('')
    setSolucionTemporal('')
    setTieneSolucionTemporal('')
    setAfectaProduccion('')
    setRiesgoSeguridad('')
    setUrgenciaResolucion('')
    setNivelRiesgoCalculado('')
    setRecomendacion('')
    setFotos([])
    setFotoPreviews([])
    setIsSubmitted(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Persistence hook - actualizado con nuevos campos
  const { clearDraft } = useChecklistPersistence(
    'checklist-solicitud-mtto-draft',
    { 
      solicitante, areaDepartamento,
      zona, lugarEspecifico, equipoAfectado,
      tipoProblema, descripcion, desdeCuando, tieneSolucionTemporal, solucionTemporal,
      afectaProduccion, riesgoSeguridad, urgenciaResolucion,
      recomendacion, fotoPreviews 
    },
    isSubmitted,
    async (data) => {
      if (data.solicitante) setSolicitante(data.solicitante)
      if (data.areaDepartamento) setAreaDepartamento(data.areaDepartamento)
      if (data.zona) setZona(data.zona)
      if (data.lugarEspecifico) setLugarEspecifico(data.lugarEspecifico)
      if (data.equipoAfectado) setEquipoAfectado(data.equipoAfectado)
      if (data.tipoProblema) setTipoProblema(data.tipoProblema)
      if (data.descripcion) setDescripcion(data.descripcion)
      if (data.desdeCuando) setDesdeCuando(data.desdeCuando)
      if (data.tieneSolucionTemporal) setTieneSolucionTemporal(data.tieneSolucionTemporal)
      if (data.solucionTemporal) setSolucionTemporal(data.solucionTemporal)
      if (data.afectaProduccion) setAfectaProduccion(data.afectaProduccion)
      if (data.riesgoSeguridad) setRiesgoSeguridad(data.riesgoSeguridad)
      if (data.urgenciaResolucion) setUrgenciaResolucion(data.urgenciaResolucion)
      if (data.recomendacion) setRecomendacion(data.recomendacion)
      if (data.fotoPreviews && Array.isArray(data.fotoPreviews)) {
        setFotoPreviews(data.fotoPreviews)
        const files = data.fotoPreviews.map((preview, index) => 
          base64ToFile(preview, `foto-${index}.jpg`)
        )
        setFotos(files)
      }
    }
  )

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const filesArray = Array.from(e.target.files)
    const allowed = filesArray.slice(0, 3 - fotos.length).filter(file => file.size <= 5 * 1024 * 1024)
    setFotos(prev => [...prev, ...allowed])
    
    // Convert to base64 for persistence
    const base64Previews = await Promise.all(allowed.map(file => fileToBase64(file)))
    setFotoPreviews(prev => [...prev, ...base64Previews])
  }

  const removeFoto = (index: number) => {
    setFotos(prev => prev.filter((_, i) => i !== index))
    setFotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  // Validación de formulario
  const isFormValid = solicitante.trim() !== '' && 
                      zona !== '' && 
                      tipoProblema !== '' && 
                      descripcion.trim() !== '' &&
                      afectaProduccion !== '' &&
                      riesgoSeguridad !== '' &&
                      urgenciaResolucion !== ''

  // Validar duplicados
  const checkDuplicate = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('solicitudes_mantenimiento')
        .select('id, ticket_id, fecha, hora')
        .eq('solicitante', solicitante)
        .eq('zona', zona)
        .eq('equipo_afectado', equipoAfectado || '')
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error al verificar duplicados:', error)
        return false
      }

      if (data && data.length > 0) {
        const lastRequest = data[0]
        const lastRequestDate = new Date(`${lastRequest.fecha} ${lastRequest.hora}`)
        const now = new Date()
        const diffMinutes = (now.getTime() - lastRequestDate.getTime()) / (1000 * 60)

        // Si hay una solicitud similar en los últimos 5 minutos
        if (diffMinutes < 5) {
          return true
        }
      }

      return false
    } catch (error) {
      console.error('Error inesperado al verificar duplicados:', error)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) {
      showToast('Por favor complete los campos obligatorios', 'error')
      return
    }

    // Validar duplicados
    const isDuplicate = await checkDuplicate()
    if (isDuplicate) {
      const confirm = window.confirm(
        'Ya tienes una solicitud abierta con la misma zona y equipo en los últimos 5 minutos. ¿Quieres continuar igual?'
      )
      if (!confirm) {
        return
      }
    }

    try {
      // Obtener fecha y hora en formatos locales
      const now = new Date()
      const fecha = now.toLocaleDateString('sv-SE')
      const hora = now.toTimeString().split(' ')[0]
      const id = crypto.randomUUID()
      
      // Generate ticket_id - Use MAX to avoid duplicates even if records are deleted
      // Query for the maximum ticket_id value
      const { data: maxTicketData, error: maxTicketError } = await supabase
        .from('solicitudes_mantenimiento')
        .select('ticket_id')
        .order('ticket_id', { ascending: false })
        .limit(1)
      
      let ticketId = 1
      if (maxTicketError) {
        console.error('Error al obtener máximo ticket_id:', JSON.stringify(maxTicketError, null, 2))
        showToast('Error al generar número de ticket', 'error')
        return
      } else if (maxTicketData && maxTicketData.length > 0 && maxTicketData[0].ticket_id) {
        // Get the max ticket_id and add 1
        ticketId = maxTicketData[0].ticket_id + 1
      }
      // If no records exist, ticketId remains 1

      // Preparar arrays de nombres y URLs de fotos
      const localFiles = [...fotos]
      const fileNames: string[] = []
      const photoUrls: string[] = []
      
      // Subir fotos temporales y recolectar URLs (with compression)
      for (const file of localFiles) {
        const compressedFile = await compressImage(file)
        const fileName = `${id}-${compressedFile.name}`
        fileNames.push(fileName)
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('mtto-fotos-temp')
          .upload(fileName, compressedFile, { contentType: 'image/jpeg' })
        if (uploadError) {
          console.error('Error al subir foto:', JSON.stringify(uploadError, null, 2))
          showToast('Error al subir las fotos', 'error')
          return
        }
        const { data: { publicUrl } } = supabase
          .storage
          .from('mtto-fotos-temp')
          .getPublicUrl(fileName)
        photoUrls.push(publicUrl)
      }

      // Construir observaciones con información adicional
      const observaciones = [
        areaDepartamento && `Área/Depto: ${areaDepartamento}`,
        lugarEspecifico && `Lugar específico: ${lugarEspecifico}`,
        desdeCuando && `Desde cuándo: ${desdeCuando}`,
        tieneSolucionTemporal === 'si' && solucionTemporal && `Solución temporal: ${solucionTemporal}`,
        `Afecta producción: ${afectaProduccion === 'no_afecta' ? 'No afecta' : afectaProduccion === 'afecta' ? 'Afecta pero seguimos produciendo' : 'Producción detenida'}`,
        `Riesgo seguridad/inocuidad: ${riesgoSeguridad === 'no' ? 'No' : riesgoSeguridad === 'riesgo_posible' ? 'Podría haber riesgo' : 'Riesgo claro'}`,
        `Urgencia: ${urgenciaResolucion === 'cuando_se_pueda' ? 'Cuando se pueda' : urgenciaResolucion === 'esta_semana' ? 'Dentro de esta semana' : urgenciaResolucion === 'hoy' ? 'Hoy' : 'Inmediatamente (emergencia)'}`
      ].filter(Boolean).join(' | ')

      const { data: insertData, error: insertError } = await supabase
        .from('solicitudes_mantenimiento')
        .insert([
          {
            id,
            ticket_id: ticketId,
            fecha,
            hora,
            solicitante,
            zona,
            tipo_falla: tipoProblema,
            nivel_riesgo: nivelRiesgoCalculado,
            equipo_afectado: equipoAfectado || null,
            descripcion,
            recomendacion: recomendacion || null,
            fotos_urls: photoUrls,
            observaciones: observaciones || null,
            estado: 'pendiente'
          }
        ])

      if (insertError) {
        console.error('Error al guardar solicitud:', JSON.stringify(insertError, null, 2))
        showToast('Error al guardar la solicitud', 'error')
        return
      }

      console.log('Solicitud insertada:', insertData)
      
      // Mensaje de éxito mejorado
      showToast(
        `Tu solicitud #${ticketId} fue registrada. La verá el área de mantención y podrás seguir su estado en 'Mis solicitudes'.`,
        'success',
        5000
      )
      
      setIsSubmitted(true)
      clearDraft()
      
      // Limpiar formulario
      resetForm()
      
      // Navigate back after delay
      setTimeout(() => {
        router.push('/area/mantencion/solicitudes/mis')
      }, 2000)
    } catch (error: any) {
      console.error('Error inesperado al guardar la solicitud:', {
        message: error?.message,
        stack: error?.stack,
        full: error
      })
      showToast('Error inesperado al guardar la solicitud', 'error')
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-4 flex justify-between items-start">
        <Link
          href="/area/mantencion"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver
        </Link>
        <DeleteDraftButton 
          storageKey="checklist-solicitud-mtto-draft"
          checklistName="Solicitud de Mantenimiento"
          onReset={resetForm}
        />
      </div>
      <h1 className="text-3xl font-bold mb-6">Solicitud de Mantenimiento Correctivo Programado</h1>
      <p className="text-sm text-gray-500 mb-6">CF-PC-MAN-001-RG006</p>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* BLOQUE 1 - Datos del solicitante */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#111827' }}>
            1. Datos del solicitante
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="solicitante" className="block text-sm font-medium text-gray-700 mb-1">
                Solicitante *
              </label>
              <input
                type="text"
                id="solicitante"
                value={solicitante}
                onChange={e => setSolicitante(e.target.value)}
                placeholder="Nombre y Apellido"
                className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              />
              {user && (
                <p className="text-xs text-gray-500 mt-1">
                  Autocompletado desde tu cuenta. Puedes editarlo si es necesario.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="areaDepartamento" className="block text-sm font-medium text-gray-700 mb-1">
                Área / Departamento (opcional)
              </label>
              <input
                type="text"
                id="areaDepartamento"
                value={areaDepartamento}
                onChange={e => setAreaDepartamento(e.target.value)}
                placeholder="Ej: Producción, Calidad, Logística..."
                className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
          </div>
        </div>

        {/* BLOQUE 2 - Dónde está el problema */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#111827' }}>
            2. Dónde está el problema
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="zona" className="block text-sm font-medium text-gray-700 mb-1">
                Zona *
              </label>
              <select
                id="zona"
                value={zona}
                onChange={e => setZona(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              >
                <option value="">Seleccione una zona</option>
                <option value="Exteriores">Exteriores</option>
                <option value="Bodega de químicos">Bodega de químicos</option>
                <option value="Pasillo principal">Pasillo principal</option>
                <option value="Baños (hombres - mujeres)">Baños (hombres - mujeres)</option>
                <option value="Filtro sanitario">Filtro sanitario</option>
                <option value="Sala de producción">Sala de producción</option>
              </select>
            </div>
            <div>
              <label htmlFor="lugarEspecifico" className="block text-sm font-medium text-gray-700 mb-1">
                Lugar específico / Referencia
              </label>
              <input
                type="text"
                id="lugarEspecifico"
                value={lugarEspecifico}
                onChange={e => setLugarEspecifico(e.target.value)}
                placeholder="Ej: Al lado de la puerta de cámara 3, Baño mujeres sector packing"
                className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ayuda al técnico a encontrar el problema rápidamente.
              </p>
            </div>
            <div>
              <label htmlFor="equipoAfectado" className="block text-sm font-medium text-gray-700 mb-1">
                Equipo / Activo Afectado
              </label>
              <input
                type="text"
                id="equipoAfectado"
                value={equipoAfectado}
                onChange={e => setEquipoAfectado(e.target.value)}
                placeholder="Ej: Cinta transportadora 3, Selladora A..."
                className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si conoces el nombre o código del equipo, escríbelo aquí.
              </p>
            </div>
          </div>
        </div>

        {/* BLOQUE 3 - Qué está pasando */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#111827' }}>
            3. Qué está pasando
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="tipoProblema" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de problema *
              </label>
              <select
                id="tipoProblema"
                value={tipoProblema}
                onChange={e => setTipoProblema(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              >
                <option value="">Seleccione un tipo de problema</option>
                <option value="Eléctrica">Eléctrica</option>
                <option value="Mecánica">Mecánica</option>
                <option value="Sanitaria">Sanitaria (cañerías, baños, agua, etc.)</option>
                <option value="Infraestructura">Infraestructura (paredes, pisos, techos, puertas)</option>
                <option value="Otra">Otro</option>
              </select>
            </div>
            <div>
              <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
                Descripción del problema *
              </label>
              <textarea
                id="descripcion"
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                rows={4}
                placeholder="Ej: La cinta 3 se detiene cada 5 minutos y hace un ruido metálico."
                className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              />
            </div>
            <div>
              <label htmlFor="desdeCuando" className="block text-sm font-medium text-gray-700 mb-1">
                ¿Desde cuándo pasa esto?
              </label>
              <select
                id="desdeCuando"
                value={desdeCuando}
                onChange={e => setDesdeCuando(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
              >
                <option value="">Seleccione una opción</option>
                <option value="hoy">Hoy</option>
                <option value="menos_semana">Menos de 1 semana</option>
                <option value="mas_semana">Más de 1 semana</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ¿Hay solución temporal aplicada?
              </label>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="solucionTemporal"
                    value="no"
                    checked={tieneSolucionTemporal === 'no'}
                    onChange={e => {
                      setTieneSolucionTemporal(e.target.value)
                      if (e.target.value === 'no') setSolucionTemporal('')
                    }}
                    className="mr-2"
                  />
                  No
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="solucionTemporal"
                    value="si"
                    checked={tieneSolucionTemporal === 'si'}
                    onChange={e => setTieneSolucionTemporal(e.target.value)}
                    className="mr-2"
                  />
                  Sí
                </label>
              </div>
              {tieneSolucionTemporal === 'si' && (
                <textarea
                  value={solucionTemporal}
                  onChange={e => setSolucionTemporal(e.target.value)}
                  rows={2}
                  placeholder="Ej: Detuvimos la máquina y usamos la cinta 2"
                  className="block w-full border border-gray-300 rounded-md shadow-sm p-2 mt-2"
                />
              )}
            </div>
          </div>
        </div>

        {/* BLOQUE 4 - Impacto / urgencia */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#111827' }}>
            4. Impacto y urgencia
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="afectaProduccion" className="block text-sm font-medium text-gray-700 mb-1">
                ¿Está afectando la producción? *
              </label>
              <select
                id="afectaProduccion"
                value={afectaProduccion}
                onChange={e => setAfectaProduccion(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              >
                <option value="">Seleccione una opción</option>
                <option value="no_afecta">No afecta</option>
                <option value="afecta">Afecta pero seguimos produciendo</option>
                <option value="detenida">Producción detenida por este problema</option>
              </select>
            </div>
            <div>
              <label htmlFor="riesgoSeguridad" className="block text-sm font-medium text-gray-700 mb-1">
                ¿Hay riesgo de seguridad o inocuidad? *
              </label>
              <select
                id="riesgoSeguridad"
                value={riesgoSeguridad}
                onChange={e => setRiesgoSeguridad(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              >
                <option value="">Seleccione una opción</option>
                <option value="no">No</option>
                <option value="riesgo_posible">Podría haber riesgo</option>
                <option value="riesgo_claro">Riesgo claro (personas o producto)</option>
              </select>
            </div>
            <div>
              <label htmlFor="urgenciaResolucion" className="block text-sm font-medium text-gray-700 mb-1">
                ¿Para cuándo necesita que se resuelva? *
              </label>
              <select
                id="urgenciaResolucion"
                value={urgenciaResolucion}
                onChange={e => setUrgenciaResolucion(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              >
                <option value="">Seleccione una opción</option>
                <option value="cuando_se_pueda">Cuando se pueda</option>
                <option value="esta_semana">Dentro de esta semana</option>
                <option value="hoy">Hoy</option>
                <option value="inmediatamente">Inmediatamente (emergencia)</option>
              </select>
            </div>
            {nivelRiesgoCalculado && (
              <div className="p-3 rounded-md" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <p className="text-sm font-medium" style={{ color: '#1E40AF' }}>
                  Nivel de riesgo calculado: {nivelRiesgoCalculado}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* BLOQUE 5 - Opcional */}
        <div className="pb-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#111827' }}>
            5. Información adicional (opcional)
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="recomendacion" className="block text-sm font-medium text-gray-500 mb-1">
                Tu sugerencia (si la tienes)
              </label>
              <textarea
                id="recomendacion"
                value={recomendacion}
                onChange={e => setRecomendacion(e.target.value)}
                rows={3}
                placeholder="Si tienes alguna sugerencia o idea de cómo resolver el problema..."
                className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
              <p className="text-xs text-gray-400 mt-1">
                Opcional. Solo si tienes alguna recomendación específica.
              </p>
            </div>
            <div>
              <label htmlFor="fotos" className="block text-sm font-medium text-gray-700 mb-1">
                Adjuntar fotos (máximo 3, max 5MB c/u)
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Adjuntar fotografía
              </button>
              <input
                type="file"
                id="fotos"
                accept="image/*"
                capture="environment"
                multiple
                ref={fileInputRef}
                onChange={handleFotoChange}
                className="hidden"
              />
              <div className="mt-2 flex space-x-2">
                {fotoPreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Foto ${index + 1}`}
                      className="h-20 w-20 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeFoto(index)}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button type="submit" disabled={!isFormValid}>
            Enviar solicitud
          </Button>
        </div>
      </form>
    </div>
  )
}
