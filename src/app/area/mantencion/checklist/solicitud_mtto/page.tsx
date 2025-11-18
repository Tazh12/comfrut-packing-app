'use client'

import React, { useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { pdf } from '@react-pdf/renderer'
import { ChecklistPDFMantenimientoDocument } from '@/components/ChecklistPDFMantenimiento'
import { format } from 'date-fns'
import { useChecklistPersistence } from '@/lib/hooks/useChecklistPersistence'
import { DeleteDraftButton } from '@/components/DeleteDraftButton'

// Función para redimensionar imagenes antes de convertir a Base64
const resizeImage = (file: File, maxWidth = 1200): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string
    }

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scaleFactor = Math.min(maxWidth / img.width, 1)
      canvas.width = img.width * scaleFactor
      canvas.height = img.height * scaleFactor

      const ctx = canvas.getContext('2d')
      if (!ctx) return reject('No se pudo obtener contexto de canvas')

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8)
      resolve(resizedDataUrl)
    }

    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function SolicitudMttoPage() {
  const { showToast } = useToast()
  const [solicitante, setSolicitante] = useState<string>('')
  const [zona, setZona] = useState<string>('')
  const [tipoFalla, setTipoFalla] = useState<string>('')
  const [descripcion, setDescripcion] = useState<string>('')
  const [recomendacion, setRecomendacion] = useState<string>('')
  const [fotos, setFotos] = useState<File[]>([])
  const [fotoPreviews, setFotoPreviews] = useState<string[]>([]) // Store base64 previews for persistence
  const [isSubmitted, setIsSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    setZona('')
    setTipoFalla('')
    setDescripcion('')
    setRecomendacion('')
    setFotos([])
    setFotoPreviews([])
    setIsSubmitted(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Persistence hook
  const { clearDraft } = useChecklistPersistence(
    'checklist-solicitud-mtto-draft',
    { solicitante, zona, tipoFalla, descripcion, recomendacion, fotoPreviews },
    isSubmitted,
    async (data) => {
      if (data.solicitante) setSolicitante(data.solicitante)
      if (data.zona) setZona(data.zona)
      if (data.tipoFalla) setTipoFalla(data.tipoFalla)
      if (data.descripcion) setDescripcion(data.descripcion)
      if (data.recomendacion) setRecomendacion(data.recomendacion)
      if (data.fotoPreviews && Array.isArray(data.fotoPreviews)) {
        setFotoPreviews(data.fotoPreviews)
        // Convert base64 previews back to File objects for the form
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

  const isFormValid = zona !== '' && tipoFalla !== '' && descripcion.trim() !== ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) {
      showToast('Por favor complete los campos obligatorios', 'error')
      return
    }
    try {
      // Obtener fecha y hora en formatos locales
      const now = new Date()
      const fecha = now.toLocaleDateString('sv-SE')         // YYYY-MM-DD local
      const hora = now.toTimeString().split(' ')[0]         // HH:mm:ss
      const id = crypto.randomUUID()
      // Preparar arrays de nombres y URLs de fotos
      const localFiles = [...fotos]
      const fileNames: string[] = []
      const photoUrls: string[] = []
      // Subir fotos temporales y recolectar URLs
      for (const file of localFiles) {
        const fileName = `${id}-${file.name}`
        fileNames.push(fileName)
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('mtto-fotos-temp')
          .upload(fileName, file, { contentType: file.type })
        if (uploadError) {
          console.error('Error al subir foto:', JSON.stringify(uploadError, null, 2))
          showToast('Error al subir las fotos', 'error')
          return
        }
        console.log('Foto subida:', fileName, uploadData)
        const { data: { publicUrl } } = supabase
          .storage
          .from('mtto-fotos-temp')
          .getPublicUrl(fileName)
        photoUrls.push(publicUrl)
      }
      const { data: insertData, error: insertError } = await supabase
        .from('solicitudes_mantenimiento')
        .insert([
          {
            id,
            fecha,
            hora,
            solicitante,
            zona,
            tipo_falla: tipoFalla,
            descripcion,
            recomendacion,
            fotos_urls: photoUrls, // array de URLs en columna fotos_urls
          }
        ])
      if (insertError) {
        console.error('Error al guardar solicitud:', JSON.stringify(insertError, null, 2))
        showToast('Error al guardar la solicitud', 'error')
        return
      }
      console.log('Solicitud insertada:', insertData)
      // Correlativo para nombre de PDF
      const year = now.getFullYear()
      const { count, error: countError } = await supabase
        .from('solicitudes_mantenimiento')
        .select('id', { count: 'exact', head: true })
        .gte('fecha', `${year}-01-01`)
        .lte('fecha', `${year}-12-31`)
      if (countError) {
        console.error('Error al contar solicitudes del año:', { message: countError.message, stack: countError.stack, full: countError })
        showToast('Error al contar solicitudes', 'error')
        return
      }
      const correlativo = (count || 0) + 1
      const correlativoStr = String(correlativo).padStart(4, '0')
      // Fecha en formato YYYYMMMDD con mes abreviado en inglés y mayúsculas
      const dateStr = format(now, 'yyyyLLLdd').toUpperCase()
      const pdfFileName = `06.${dateStr}-${correlativoStr}.pdf`
      // Redimensionar y convertir fotos a Base64 de los archivos originales
      const base64Urls = await Promise.all(localFiles.map(file => resizeImage(file)))
      const validBase64Urls = base64Urls.filter(Boolean)
      // Generar PDF con @react-pdf/renderer usando fotos redimensionadas
      let pdfBlob: Blob
      try {
        pdfBlob = await pdf(
          <ChecklistPDFMantenimientoDocument
            data={{ fecha, hora, solicitante, zona, tipo_falla: tipoFalla, descripcion_falla: descripcion, recomendacion }}
            fotos={validBase64Urls}
          />
        ).toBlob()
      } catch (err) {
        console.error('Error al generar PDF:', err)
        showToast('Error al generar el PDF', 'error')
        return
      }
      console.log('PDF blob generado:', pdfBlob, 'tamaño:', (pdfBlob as any).size)
      // Subida de PDF con manejo de conflicto 409
      let uploadFileName = pdfFileName
      let attemptIndex = 0
      let uploadData: any = null
      while (true) {
        const { data: curData, error: pdfError } = await supabase
          .storage
          .from('mtto-pdf-solicitudes')
          .upload(uploadFileName, pdfBlob, { contentType: 'application/pdf' })
        if (pdfError) {
          console.error('Error al subir PDF:', { message: pdfError.message, stack: pdfError.stack, full: pdfError })
          if (((pdfError as any).status === 409) && attemptIndex < 26) {
            // conflicto, agregar sufijo
            const suffix = String.fromCharCode('a'.charCodeAt(0) + attemptIndex)
            uploadFileName = `${pdfFileName.replace('.pdf', '')}-${suffix}.pdf`
            attemptIndex++
            continue
          }
          showToast('Error al subir el PDF', 'error')
          return
        }
        uploadData = curData
        break
      }
      console.log('PDF subido con nombre:', uploadFileName, uploadData)
      // Eliminar fotos temporales
      const { data: removedData, error: removeError } = await supabase
        .storage
        .from('mtto-fotos-temp')
        .remove(fileNames)
      if (removeError) {
        console.error('Error al eliminar fotos temporales:', JSON.stringify(removeError, null, 2))
        showToast('Error al eliminar fotos temporales', 'error')
      }
      console.log('Fotos temporales eliminadas:', removedData)
      showToast('Solicitud guardada y PDF generado con éxito', 'success', 3000)
      setIsSubmitted(true)
      clearDraft()
      // Limpiar formulario
      setSolicitante('')
      setZona('')
      setTipoFalla('')
      setDescripcion('')
      setRecomendacion('')
      setFotos([])
      setFotoPreviews([])
      setIsSubmitted(false)
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
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="solicitante" className="block text-sm font-medium text-gray-700 mb-1">
            Solicitante
          </label>
          <input
            type="text"
            id="solicitante"
            value={solicitante}
            onChange={e => setSolicitante(e.target.value)}
            placeholder="Nombre y Apellido"
            className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
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
          <label htmlFor="tipoFalla" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de falla *
          </label>
          <select
            id="tipoFalla"
            value={tipoFalla}
            onChange={e => setTipoFalla(e.target.value)}
            className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          >
            <option value="">Seleccione un tipo de falla</option>
            <option value="Eléctrica">Eléctrica</option>
            <option value="Mecánica">Mecánica</option>
            <option value="Sanitaria">Sanitaria</option>
            <option value="Infraestructura">Infraestructura</option>
            <option value="Otra">Otra</option>
          </select>
        </div>
        <div>
          <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
            Descripción de la falla *
          </label>
          <textarea
            id="descripcion"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            rows={4}
            className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>
        <div>
          <label htmlFor="recomendacion" className="block text-sm font-medium text-gray-700 mb-1">
            Recomendación del solicitante
          </label>
          <textarea
            id="recomendacion"
            value={recomendacion}
            onChange={e => setRecomendacion(e.target.value)}
            rows={3}
            className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        <div>
          <label htmlFor="fotos" className="block text-sm font-medium text-gray-700 mb-1">
            Adjuntar fotos (máximo 3, max 5MB c/u)
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
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
        <div className="pt-4">
          <Button type="submit" disabled={!isFormValid}>
            Enviar solicitud
          </Button>
        </div>
      </form>
    </div>
  )
} 