'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { FormularioResolucion } from '@/components/FormularioResolucion'
import { pdf, Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'
import { ChecklistPDFMantenimientoDocument } from '@/components/ChecklistPDFMantenimiento'
import { format, parseISO } from 'date-fns'

// Registrar fuentes si es necesario (ya está hecho en el componente)

// Genera el prefijo de fecha para los archivos PDF: 06.YYYYMMMDD
function getDatePrefix(fechaStr: string): string {
  const date = parseISO(fechaStr)
  const year = date.getFullYear()
  const month = format(date, 'LLL').toUpperCase()
  const day = format(date, 'dd')
  return `06.${year}${month}${day}`
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
        // Obtener URL del PDF en bucket
        const prefix = getDatePrefix(data.fecha)
        const { data: files, error: listError } = await supabase.storage.from('mtto-pdf-solicitudes').list('', { limit: 1000 })
        if (listError) console.error('Error listando PDF:', listError)
        else {
          const file = files.find(f => f.name.startsWith(prefix))
          if (file) {
            const { data: { publicUrl } } = supabase.storage.from('mtto-pdf-solicitudes').getPublicUrl(file.name)
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
      // 1. Subir fotos de ejecución
      // Verificar permisos en bucket de ejecución
      const { data: permCheck, error: permError } = await supabase.storage.from('mtto-fotos-ejecucion').list('', { limit: 1 })
      if (permError) {
        console.error('Sin permisos para subir fotos de ejecución:', JSON.stringify(permError, null, 2))
        showToast('No tiene permisos para subir fotos de ejecución', 'error')
        return
      }
      const execUrls: string[] = []
      const execFileNames: string[] = []
      for (const file of execFiles) {
        const fileNameExec = `${id}-${file.name}`
        execFileNames.push(fileNameExec)
        const { error: uploadExecError } = await supabase.storage.from('mtto-fotos-ejecucion').upload(fileNameExec, file, { contentType: file.type, upsert: true })
        if (uploadExecError) {
          console.error('Error al subir foto de ejecución:', JSON.stringify(uploadExecError, null, 2))
          showToast('Error al subir fotos de ejecución', 'error')
          return
        }
        const { data: { publicUrl: execUrl } } = supabase.storage.from('mtto-fotos-ejecucion').getPublicUrl(fileNameExec)
        execUrls.push(execUrl)
      }
      // 2. Actualizar registro
      const { error: updateError } = await supabase
        .from('solicitudes_mantenimiento')
        .update({
          tecnico,
          fecha_ejecucion: fechaEjecucion,
          accion_realizada: accion,
          observaciones,
          estado_final: estadoFinal,
          fotos_ejecucion: execUrls,
          estado: estadoFinal
        })
        .eq('id', id)
      if (updateError) {
        console.error('Error al actualizar solicitud:', JSON.stringify(updateError, null, 2))
        showToast('Error al actualizar la solicitud', 'error')
        return
      }
      // 3. Regenerar PDF de resolución
      // Obtener PDF originario
      const prefix = getDatePrefix(solicitud.fecha)
      const { data: pdfFilesRaw, error: pdfFilesError } = await supabase.storage.from('mtto-pdf-solicitudes').list('', { limit: 1000 })
      if (pdfFilesError) {
        console.error('Error listando archivos PDF:', { message: pdfFilesError.message, stack: pdfFilesError.stack, full: pdfFilesError })
      }
      const pdfFiles = pdfFilesRaw || []
      const originalFile = pdfFiles.find(f => f.name.startsWith(prefix))
      if (!originalFile) {
        showToast('No se encontró el PDF original', 'error')
        return
      }
      const originalName = originalFile.name
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
      // Generar documento con página original + página de resolución
      const resolutionDoc = (
        <Document>
          <ChecklistPDFMantenimientoDocument data={solicitud} fotos={solicitud.fotos_urls || []} />
          <Page size="A4" style={styles.page}>
            <Text style={styles.title}>Resolución de Solicitud</Text>
            <View style={styles.section}><Text style={styles.label}>Técnico:</Text><Text style={styles.value}>{tecnico}</Text></View>
            <View style={styles.section}><Text style={styles.label}>Fecha de Ejecución:</Text><Text style={styles.value}>{fechaEjecucion}</Text></View>
            <View style={styles.section}><Text style={styles.label}>Acción Realizada:</Text><Text style={styles.value}>{accion}</Text></View>
            {observaciones && <View style={styles.section}><Text style={styles.label}>Observaciones:</Text><Text style={styles.value}>{observaciones}</Text></View>}
            <View style={styles.section}><Text style={styles.label}>Estado Final:</Text><Text style={styles.value}>{estadoFinal}</Text></View>
            {execUrls.map((url, i) => (
              <Image key={i} src={url} style={styles.photo} />
            ))}
            <Text style={styles.footer}>Este documento es parte del sistema de gestión de calidad de Comfrut</Text>
          </Page>
        </Document>
      )
      const pdfBlob = await pdf(resolutionDoc).toBlob()
      // 4. Verificar permisos en bucket de PDF antes de reemplazarlo
      const { error: permPdfError } = await supabase.storage.from('mtto-pdf-solicitudes').list('', { limit: 1 })
      if (permPdfError) {
        console.error('Sin permisos para el bucket mtto-pdf-solicitudes:', JSON.stringify(permPdfError, null, 2))
        showToast('No tiene permisos para subir el PDF', 'error')
        return
      }
      // Reemplazar PDF en Supabase
      const { error: pdfReplaceError } = await supabase.storage.from('mtto-pdf-solicitudes').upload(originalName, pdfBlob, { contentType: 'application/pdf', upsert: true })
      if (pdfReplaceError) {
        console.error('Error al reemplazar PDF:', JSON.stringify(pdfReplaceError, null, 2))
        showToast('Error al reemplazar el PDF', 'error')
        return
      }
      // 5. Eliminar fotos temporales de ejecución si existen
      const { error: removeExecError } = await supabase.storage.from('mtto-fotos-ejecucion').remove(execFileNames)
      if (removeExecError) {
        console.error('Error al eliminar fotos de ejecución temporales:', { message: removeExecError.message, stack: removeExecError.stack, full: removeExecError })
      }
      showToast('Solicitud finalizada con éxito', 'success', 3000)
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
      <h1 className="text-2xl font-bold mb-4">Detalle de Solicitud</h1>
      <div className="bg-white p-6 rounded-lg shadow mb-6 space-y-2">
        <p><strong>Fecha:</strong> {solicitud.fecha}</p>
        <p><strong>Hora:</strong> {solicitud.hora}</p>
        <p><strong>Solicitante:</strong> {solicitud.solicitante}</p>
        <p><strong>Zona:</strong> {solicitud.zona}</p>
        <p><strong>Tipo de falla:</strong> {solicitud.tipo_falla}</p>
        <p><strong>Descripción:</strong> {solicitud.descripcion}</p>
        <p><strong>Recomendación:</strong> {solicitud.recomendacion}</p>
        <p><strong>Estado:</strong> {solicitud.estado}</p>
        {pdfUrl && (
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Descargar PDF
          </a>
        )}
        {/* Resumen de resolución */}
        {solicitud.estado === 'finalizada' && (
          <div className="bg-white p-6 rounded-lg shadow mb-6 space-y-2">
            <h2 className="text-xl font-semibold">Resumen de Resolución</h2>
            <p><strong>Técnico responsable:</strong> {solicitud.tecnico}</p>
            <p><strong>Fecha de ejecución:</strong> {solicitud.fecha_ejecucion}</p>
            <p><strong>Acción realizada:</strong> {solicitud.accion_realizada}</p>
            {solicitud.observaciones && <p><strong>Observaciones:</strong> {solicitud.observaciones}</p>}
            {solicitud.fotos_ejecucion_urls?.length > 0 && (
              <div className="flex space-x-2">
                {solicitud.fotos_ejecucion_urls.map((url: string, i: number) => (
                  <img key={i} src={url} alt={`Ejecución ${i+1}`} className="h-20 w-20 object-cover rounded-md" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <FormularioResolucion solicitudId={id} onFinalize={handleFinalize} />
    </div>
  )
} 