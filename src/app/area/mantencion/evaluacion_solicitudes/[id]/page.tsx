'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { FormularioResolucion } from '@/components/FormularioResolucion'
import { pdf, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { ChecklistPDFMantenimientoDocument } from '@/components/ChecklistPDFMantenimiento'

// Validation Section Component
function ValidationSection({ 
  solicitud, 
  onValidate, 
  onReturnToReview 
}: { 
  solicitud: any
  onValidate: () => Promise<void>
  onReturnToReview: (nota: string) => Promise<void>
}) {
  const [showReturnForm, setShowReturnForm] = useState(false)
  const [nota, setNota] = useState('')

  const handleReturnToReview = async () => {
    if (!nota.trim()) {
      alert('Por favor, agregue una nota explicando qué necesita ser revisado')
      return
    }
    await onReturnToReview(nota)
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg shadow mb-6">
      <h2 className="text-xl font-semibold text-yellow-900 mb-4">Validar Trabajo</h2>
      <p className="text-sm text-yellow-800 mb-4">
        El técnico ha marcado este trabajo como resuelto. Por favor, valide que todo esté correcto antes de finalizar.
      </p>
      
      {!showReturnForm ? (
        <div className="flex gap-4">
          <button
            onClick={onValidate}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Validar y Finalizar
          </button>
          <button
            onClick={() => setShowReturnForm(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
          >
            Volver a Revisar
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nota para el técnico (requerida) *
            </label>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Explique qué necesita ser corregido o revisado..."
              rows={4}
              className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleReturnToReview}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
            >
              Enviar y Devolver a Ejecución
            </button>
            <button
              onClick={() => {
                setShowReturnForm(false)
                setNota('')
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EvaluacionSolicitudPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { showToast } = useToast()

  const [solicitud, setSolicitud] = useState<any>(null)
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)

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

  const handleFinalize = async (data: any) => {
    // Verificar usuario autenticado
    const { data: userCheck, error: userError } = await supabase.auth.getUser()
    if (userError || !userCheck.user) {
      console.error('❌ Usuario no autenticado', JSON.stringify(userError || {}, null, 2))
      showToast('Debe iniciar sesión para finalizar la solicitud', 'error')
      return
    }
    console.log('✅ Usuario autenticado:', userCheck.user.id)
    const { tecnico, fechaEjecucion, accion, observaciones, estadoFinal, fotos: execFiles } = data
    // Verificar ID definido
    if (!id) {
      console.error('ID de solicitud indefinido:', id)
      showToast('ID de solicitud indefinido', 'error')
      return
    }
    // Validación
    if (!tecnico.trim() || !fechaEjecucion || !accion.trim() || !estadoFinal || execFiles.length === 0) {
      showToast('Por favor complete todos los campos obligatorios', 'error')
      return
    }
    try {
      // 1. Subir fotos de ejecución (using same bucket as request photos, with different prefix)
      const execUrls: string[] = []
      const execFileNames: string[] = []
      
      // Verify bucket permissions first
      const { error: permCheck } = await supabase.storage.from('mtto-fotos-temp').list('', { limit: 1 })
      if (permCheck) {
        console.error('Sin permisos para el bucket mtto-fotos-temp:', JSON.stringify(permCheck, null, 2))
        showToast('No tiene permisos para subir fotos', 'error')
        return
      }
      
      for (const file of execFiles) {
        // Use "exec-" prefix to distinguish execution photos from request photos
        // Ensure filename is safe (remove special characters)
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const fileNameExec = `${id}-exec-${safeFileName}`
        execFileNames.push(fileNameExec)
        
        // Ensure file is a proper File/Blob object
        const fileToUpload = file instanceof File ? file : new File([file], safeFileName, { type: 'image/jpeg' })
        
        const { error: uploadExecError } = await supabase.storage
          .from('mtto-fotos-temp')
          .upload(fileNameExec, fileToUpload, { 
            contentType: 'image/jpeg', 
            upsert: true,
            cacheControl: '3600'
          })
        if (uploadExecError) {
          console.error('Error al subir foto de ejecución:', JSON.stringify(uploadExecError, null, 2))
          showToast('Error al subir fotos de ejecución', 'error')
          return
        }
        const { data: { publicUrl: execUrl } } = supabase.storage.from('mtto-fotos-temp').getPublicUrl(fileNameExec)
        execUrls.push(execUrl)
      }
      // 2. Actualizar registro
      // Workflow logic:
      // - If estadoFinal is 'resuelta', move to 'por_validar' (needs manager validation)
      // - If estadoFinal is 'derivada', stay in 'en_ejecucion' (3rd party hasn't finished yet)
      // - If estadoFinal is 'no procede', move to Historial (closed)
      let newEstado = estadoFinal
      if (estadoFinal === 'resuelta') {
        newEstado = 'por_validar' // Needs validation before going to Historial
      } else if (estadoFinal === 'derivada') {
        newEstado = 'derivada' // Status stays as 'derivada' but appears in En Ejecución tab
      } else if (estadoFinal === 'no procede') {
        newEstado = 'no procede' // Goes to Historial (closed)
      }
      
      // Get current observaciones to append history
      const { data: currentData } = await supabase
        .from('solicitudes_mantenimiento')
        .select('observaciones')
        .eq('id', id)
        .single()
      
      const historyEntry = `[${new Date().toLocaleString('es-ES')}] ${tecnico} - ${estadoFinal === 'resuelta' ? 'Marcado como resuelto' : estadoFinal === 'derivada' ? 'Derivado a terceros' : 'No procede'}\nAcción: ${accion}${observaciones ? `\nObservaciones: ${observaciones}` : ''}`
      const updatedObservaciones = currentData?.observaciones 
        ? `${currentData.observaciones}\n\n${historyEntry}`
        : historyEntry
      
      const { error: updateError } = await supabase
        .from('solicitudes_mantenimiento')
        .update({
          tecnico,
          fecha_ejecucion: fechaEjecucion,
          accion_realizada: accion,
          observaciones: updatedObservaciones,
          estado_final: estadoFinal,
          fotos_ejecucion: execUrls,
          estado: newEstado
        })
        .eq('id', id)
      if (updateError) {
        console.error('Error al actualizar solicitud:', JSON.stringify(updateError, null, 2))
        showToast('Error al actualizar la solicitud', 'error')
        return
      }
      
      // 3. Generate PDF only if ticket is being closed (going to Historial)
      // PDF is generated when status is 'no procede' (closed) or when validated from 'por_validar'
      if (newEstado === 'no procede') {
        // Get updated solicitud data to ensure we have ticket_id
        const { data: updatedSolicitud, error: fetchError } = await supabase
          .from('solicitudes_mantenimiento')
          .select('*')
          .eq('id', id)
          .single()
        
        if (fetchError || !updatedSolicitud) {
          console.error('Error al obtener solicitud actualizada:', fetchError)
          showToast('Error al obtener datos de la solicitud', 'error')
          return
        }
        
        // Generate PDF filename using ticket_id
        const ticketId = updatedSolicitud.ticket_id
        if (!ticketId) {
          showToast('Error: Ticket ID no encontrado', 'error')
          return
        }
        const pdfFileName = `Ticket_${ticketId}_Full_Report.pdf`
      // Estilos para PDF de resolución
      const styles = StyleSheet.create({
        page: { padding: 30, fontFamily: 'Roboto', backgroundColor: '#ffffff' },
        section: { marginBottom: 20 },
        title: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: '#005F9E' },
        label: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
        value: { fontSize: 12, marginBottom: 8 },
        photo: { width: '100%', height: 150, objectFit: 'contain', marginBottom: 10 },
        footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', color: '#9CA3AF', fontSize: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10 }
      })
      // Generar documento con página de solicitud + página de resolución
      const fullReportDoc = (
        <Document>
          <ChecklistPDFMantenimientoDocument 
            data={{
              fecha: updatedSolicitud.fecha,
              hora: updatedSolicitud.hora,
              solicitante: updatedSolicitud.solicitante,
              zona: updatedSolicitud.zona,
              tipo_falla: updatedSolicitud.tipo_falla,
              nivel_riesgo: updatedSolicitud.nivel_riesgo,
              equipo_afectado: updatedSolicitud.equipo_afectado,
              descripcion_falla: updatedSolicitud.descripcion,
              recomendacion: updatedSolicitud.recomendacion
            }} 
            fotos={updatedSolicitud.fotos_urls || []} 
          />
          <Page size="A4" style={styles.page}>
            <Text style={styles.title}>Resolución de Solicitud #{ticketId}</Text>
            <View style={styles.section}><Text style={styles.label}>Técnico:</Text><Text style={styles.value}>{tecnico}</Text></View>
            <View style={styles.section}><Text style={styles.label}>Fecha de Ejecución:</Text><Text style={styles.value}>{fechaEjecucion}</Text></View>
            <View style={styles.section}><Text style={styles.label}>Acción Realizada:</Text><Text style={styles.value}>{accion}</Text></View>
            {observaciones && <View style={styles.section}><Text style={styles.label}>Observaciones:</Text><Text style={styles.value}>{observaciones}</Text></View>}
            <View style={styles.section}><Text style={styles.label}>Estado Final:</Text><Text style={styles.value}>{estadoFinal}</Text></View>
            {execUrls.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.label}>Fotos de Ejecución:</Text>
                {execUrls.map((url, i) => (
                  <Image key={i} src={url} style={styles.photo} />
                ))}
              </View>
            )}
            <Text style={styles.footer}>Este documento es parte del sistema de gestión de calidad de Comfrut</Text>
          </Page>
        </Document>
      )
      
      let pdfBlob: Blob
      try {
        pdfBlob = await pdf(fullReportDoc).toBlob()
      } catch (err) {
        console.error('Error al generar PDF:', err)
        showToast('Error al generar el PDF', 'error')
        return
      }
      
      // 4. Upload PDF to Supabase Storage
      const { error: permPdfError } = await supabase.storage.from('mtto-pdf-solicitudes').list('', { limit: 1 })
      if (permPdfError) {
        console.error('Sin permisos para el bucket mtto-pdf-solicitudes:', JSON.stringify(permPdfError, null, 2))
        showToast('No tiene permisos para subir el PDF', 'error')
        return
      }
      
      // Upload PDF with conflict handling
      let uploadFileName = pdfFileName
      let attemptIndex = 0
      while (true) {
        const { error: pdfUploadError } = await supabase.storage
          .from('mtto-pdf-solicitudes')
          .upload(uploadFileName, pdfBlob, { contentType: 'application/pdf', upsert: true })
        
        if (pdfUploadError) {
          if (((pdfUploadError as any).status === 409) && attemptIndex < 26) {
            // Conflict, add suffix
            const suffix = String.fromCharCode('a'.charCodeAt(0) + attemptIndex)
            uploadFileName = `${pdfFileName.replace('.pdf', '')}-${suffix}.pdf`
            attemptIndex++
            continue
          }
          console.error('Error al subir PDF:', JSON.stringify(pdfUploadError, null, 2))
          showToast('Error al subir el PDF', 'error')
          return
        }
        break
      }
      
        console.log('PDF generado y subido con éxito:', uploadFileName)
        showToast('Solicitud cerrada y PDF generado con éxito', 'success', 3000)
      } else if (newEstado === 'por_validar') {
        showToast('Solicitud marcada como resuelta. Pendiente de validación', 'success', 3000)
      } else if (newEstado === 'en_ejecucion') {
        showToast('Solicitud derivada a terceros. Continúa en ejecución', 'success', 3000)
      }
      
      setTimeout(() => router.push('/area/mantencion/evaluacion_solicitudes'), 3000)
    } catch (err) {
      console.error('Error en resolución de solicitud:', err)
      showToast('Error inesperado al finalizar solicitud', 'error')
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-blue-600"></div></div>
  }

  if (!solicitud) {
    return <p className="text-center mt-8">Solicitud no encontrada.</p>
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <button onClick={() => router.back()} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
        ← Volver
      </button>
      <h1 className="text-2xl font-bold mb-4">
        Detalle de Solicitud {solicitud.ticket_id && `#${solicitud.ticket_id}`}
      </h1>
      
      {/* History Section - Show previous steps */}
      {solicitud.observaciones && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
          <h2 className="text-lg font-semibold mb-2 text-blue-900">Historial de Acciones</h2>
          <div className="space-y-3">
            {solicitud.observaciones.split('\n\n').map((entry: string, idx: number) => (
              <div key={idx} className="p-3 bg-white rounded border-l-2 border-blue-300">
                <div className="text-sm text-gray-700 whitespace-pre-line">{entry}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow mb-6 space-y-2">
        {solicitud.ticket_id && <p><strong>Ticket ID:</strong> #{solicitud.ticket_id}</p>}
        <p><strong>Fecha:</strong> {solicitud.fecha}</p>
        <p><strong>Hora:</strong> {solicitud.hora}</p>
        <p><strong>Solicitante:</strong> {solicitud.solicitante}</p>
        <p><strong>Zona:</strong> {solicitud.zona}</p>
        <p><strong>Tipo de falla:</strong> {solicitud.tipo_falla}</p>
        {solicitud.nivel_riesgo && <p><strong>Nivel de Riesgo:</strong> {solicitud.nivel_riesgo}</p>}
        {solicitud.equipo_afectado && <p><strong>Equipo / Activo Afectado:</strong> {solicitud.equipo_afectado}</p>}
        <p><strong>Descripción:</strong> {solicitud.descripcion}</p>
        <p><strong>Recomendación:</strong> {solicitud.recomendacion}</p>
        <p><strong>Estado:</strong> {solicitud.estado}</p>
        {solicitud.tecnico && <p><strong>Técnico Asignado:</strong> {solicitud.tecnico}</p>}
        {/* Resumen de resolución - Show if ticket has been worked on */}
        {(solicitud.estado === 'por_validar' || solicitud.estado === 'finalizada' || solicitud.accion_realizada) && (
          <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg shadow mb-6 space-y-2">
            <h2 className="text-xl font-semibold text-green-900">Resumen de Trabajo Realizado</h2>
            {solicitud.tecnico && <p><strong>Técnico responsable:</strong> {solicitud.tecnico}</p>}
            {solicitud.fecha_ejecucion && <p><strong>Fecha de ejecución:</strong> {solicitud.fecha_ejecucion}</p>}
            {solicitud.accion_realizada && <p><strong>Acción realizada:</strong> {solicitud.accion_realizada}</p>}
            {solicitud.fotos_ejecucion?.length > 0 && (
              <div>
                <p><strong>Fotos de ejecución:</strong></p>
                <div className="flex space-x-2 mt-2">
                  {solicitud.fotos_ejecucion.map((url: string, i: number) => (
                    <img key={i} src={url} alt={`Ejecución ${i+1}`} className="h-20 w-20 object-cover rounded-md" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Validation Section - Only show if ticket is in "por_validar" status */}
        {solicitud.estado === 'por_validar' && (
          <ValidationSection 
            solicitud={solicitud}
            onValidate={async () => {
              // Generate PDF when validating
              const ticketId = solicitud.ticket_id
              if (ticketId) {
                const pdfFileName = `Ticket_${ticketId}_Full_Report.pdf`
                const styles = StyleSheet.create({
                  page: { padding: 30, fontFamily: 'Roboto', backgroundColor: '#ffffff' },
                  section: { marginBottom: 20 },
                  title: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: '#005F9E' },
                  label: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
                  value: { fontSize: 12, marginBottom: 8 },
                  photo: { width: '100%', height: 150, objectFit: 'contain', marginBottom: 10 },
                  footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', color: '#9CA3AF', fontSize: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10 }
                })
                
                const fullReportDoc = (
                  <Document>
                    <ChecklistPDFMantenimientoDocument 
                      data={{
                        fecha: solicitud.fecha,
                        hora: solicitud.hora,
                        solicitante: solicitud.solicitante,
                        zona: solicitud.zona,
                        tipo_falla: solicitud.tipo_falla,
                        nivel_riesgo: solicitud.nivel_riesgo,
                        equipo_afectado: solicitud.equipo_afectado,
                        descripcion_falla: solicitud.descripcion,
                        recomendacion: solicitud.recomendacion
                      }} 
                      fotos={solicitud.fotos_urls || []} 
                    />
                    <Page size="A4" style={styles.page}>
                      <Text style={styles.title}>Resolución de Solicitud #{ticketId}</Text>
                      {solicitud.tecnico && <View style={styles.section}><Text style={styles.label}>Técnico:</Text><Text style={styles.value}>{solicitud.tecnico}</Text></View>}
                      {solicitud.fecha_ejecucion && <View style={styles.section}><Text style={styles.label}>Fecha de Ejecución:</Text><Text style={styles.value}>{solicitud.fecha_ejecucion}</Text></View>}
                      {solicitud.accion_realizada && <View style={styles.section}><Text style={styles.label}>Acción Realizada:</Text><Text style={styles.value}>{solicitud.accion_realizada}</Text></View>}
                      {solicitud.observaciones && <View style={styles.section}><Text style={styles.label}>Observaciones:</Text><Text style={styles.value}>{solicitud.observaciones}</Text></View>}
                      <View style={styles.section}><Text style={styles.label}>Estado Final:</Text><Text style={styles.value}>Finalizada</Text></View>
                      {solicitud.fotos_ejecucion?.length > 0 && (
                        <View style={styles.section}>
                          <Text style={styles.label}>Fotos de Ejecución:</Text>
                          {solicitud.fotos_ejecucion.map((url: string, i: number) => (
                            <Image key={i} src={url} style={styles.photo} />
                          ))}
                        </View>
                      )}
                      <Text style={styles.footer}>Este documento es parte del sistema de gestión de calidad de Comfrut</Text>
                    </Page>
                  </Document>
                )
                
                try {
                  const pdfBlob = await pdf(fullReportDoc).toBlob()
                  
                  // Check if bucket exists, if not, show error
                  const { error: permPdfError } = await supabase.storage.from('mtto-pdf-solicitudes').list('', { limit: 1 })
                  if (permPdfError) {
                    console.error('Error al acceder al bucket mtto-pdf-solicitudes:', permPdfError)
                    showToast('Error: El bucket de PDFs no existe. Por favor créelo en Supabase Storage.', 'error')
                    return
                  }
                  
                  const { error: pdfUploadError } = await supabase.storage
                    .from('mtto-pdf-solicitudes')
                    .upload(pdfFileName, pdfBlob, { contentType: 'application/pdf', upsert: true })
                  
                  if (pdfUploadError) {
                    console.error('Error al subir PDF:', pdfUploadError)
                    showToast('Error al subir el PDF', 'error')
                    return
                  }
                } catch (err) {
                  console.error('Error al generar PDF:', err)
                  showToast('Error al generar el PDF', 'error')
                  return
                }
              }
              
              const { error } = await supabase
                .from('solicitudes_mantenimiento')
                .update({ estado: 'finalizada' })
                .eq('id', id)
              if (error) {
                showToast('Error al validar', 'error')
              } else {
                showToast('Trabajo validado y finalizado', 'success')
                setTimeout(() => router.push('/area/mantencion/evaluacion_solicitudes'), 1500)
              }
            }}
            onReturnToReview={async (nota: string) => {
              // Get current observaciones to append history
              const { data: currentData } = await supabase
                .from('solicitudes_mantenimiento')
                .select('observaciones')
                .eq('id', id)
                .single()
              
              const historyEntry = `[${new Date().toLocaleString('es-ES')}] Manager - Devuelto a revisión\nNota: ${nota}`
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
                showToast('Error al devolver a revisión', 'error')
              } else {
                showToast('Solicitud devuelta a ejecución', 'success')
                setTimeout(() => router.push('/area/mantencion/evaluacion_solicitudes'), 1500)
              }
            }}
          />
        )}
      </div>
      {/* Only show resolution form if ticket is in execution and not in validation */}
      {solicitud.estado !== 'no procede' && solicitud.estado !== 'finalizada' && solicitud.estado !== 'por_validar' && (
        <FormularioResolucion 
          solicitudId={id} 
          assignedTecnico={solicitud.tecnico}
          onFinalize={handleFinalize} 
        />
      )}
      
      {/* Show PDF link if finalized */}
      {solicitud.estado === 'finalizada' && pdfUrl && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <a 
            href={pdfUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-600 hover:underline font-medium"
          >
            📄 Descargar PDF Completo del Trabajo
          </a>
        </div>
      )}
    </div>
  )
} 