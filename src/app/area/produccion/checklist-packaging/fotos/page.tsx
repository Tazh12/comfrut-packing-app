'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useChecklist, ChecklistPhotos } from '@/context/ChecklistContext'
import PhotoUploadSection from '@/components/PhotoUploadSection'
import { ChecklistPDFLink } from '@/components/ChecklistPDF'
import { uploadPDF, saveChecklistRecord, normalizeMaterial, ChecklistData } from '@/lib/checklist'
import { format } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { useToast } from '@/context/ToastContext'

export default function ChecklistPhotosPage() {
  const router = useRouter()
  const {
    formData,
    photos,
    setPhotos,
    lineManager,
    machineOperator,
    checklistDate,
    selectedBrand,
    selectedMaterial,
    selectedSku,
    ordenFabricacion,
    clearContext
  } = useChecklist()
  const { showToast } = useToast()

  const [error, setError] = useState('')
  const [showPDFButton, setShowPDFButton] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pdfPreviewEnabled, setPdfPreviewEnabled] = useState(false)

  // Función para formatear la fecha como DD-MMM-YYYY
  const formatDate = (date: Date): string => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const day = date.getDate().toString().padStart(2, '0')
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  // Función para generar el objeto JSON del checklist
  const generateChecklistData = (pdfUrl: string): ChecklistData => {
    // Validar que todos los campos requeridos estén presentes
    if (!lineManager) {
      throw new Error('form/missing-field: El campo Jefe de línea es requerido')
    }
    if (!machineOperator) {
      throw new Error('form/missing-field: El campo Operador de máquina es requerido')
    }
    if (!selectedBrand) {
      throw new Error('form/missing-field: El campo Marca es requerido')
    }
    if (!selectedMaterial) {
      throw new Error('form/missing-field: El campo Material es requerido')
    }
    if (!selectedSku) {
      throw new Error('form/missing-field: El campo SKU es requerido')
    }
    if (!ordenFabricacion) {
      throw new Error('form/missing-field: El campo Orden de Fabricación es requerido')
    }
    if (!formData || formData.length === 0) {
      throw new Error('form/missing-field: No hay items en el checklist')
    }
    if (!pdfUrl) {
      throw new Error('form/missing-field: No se ha generado la URL del PDF')
    }

    // Log de los datos antes de generar el objeto
    console.log('Generando datos del checklist:', {
      lineManager,
      machineOperator,
      selectedBrand,
      selectedMaterial,
      selectedSku,
      ordenFabricacion,
      formDataLength: formData.length,
      pdfUrl
    })

    // Formatear la fecha directamente en la zona horaria EST
    const fecha = format(
      checklistDate || new Date(),
      'yyyy-MM-dd'
    )
    
    return {
      fecha,
      jefe_linea: lineManager,
      operador_maquina: machineOperator,
      marca: selectedBrand,
      material: selectedMaterial,
      sku: selectedSku,
      orden_fabricacion: ordenFabricacion,
      items: formData.map(item => ({
        id: item.id,
        nombre: item.name,
        estado: item.status === 'cumple' ? 'cumple' : 'no_cumple'
      })) as ChecklistData['items'],
      pdf_url: pdfUrl
    }
  }

  const handleUploadClick = async (key: keyof ChecklistPhotos) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        try {
          const reader = new FileReader()
          reader.onloadend = () => {
            setPhotos({
              ...photos,
              [key]: {
                file,
                preview: reader.result as string
              }
            })
          }
          reader.readAsDataURL(file)
        } catch (error) {
          console.error('Error al procesar la imagen:', error)
          setError('Ocurrió un error al procesar la imagen. Por favor intente nuevamente.')
        }
      }
    }
    input.click()
  }

  const isFormComplete = photos.photo1.file && (photos.photo2.file || photos.photo3.file)

  const handleFinish = () => {
    if (!isFormComplete) {
      setError('Por favor complete todos los campos requeridos antes de finalizar')
      return
    }
    setError('')
    setShowPDFButton(true)
    setPdfPreviewEnabled(true)
  }

  const handleFinishAndExit = async () => {
    if (!isFormComplete) {
      setError('Por favor complete todos los campos requeridos antes de finalizar')
      return
    }

    // Validar campos requeridos antes de proceder
    if (!lineManager || !machineOperator || !selectedBrand || !selectedMaterial || !selectedSku || !ordenFabricacion) {
      setError('Por favor complete todos los campos del formulario antes de continuar')
      return
    }

    setPdfPreviewEnabled(false)
    setIsSubmitting(true)
    setError('')

    try {
      // Log del estado del formulario antes de procesar
      console.log('Estado del formulario antes de procesar:', {
        formData: {
          itemCount: formData.length,
          items: formData.map(item => ({
            id: item.id,
            name: item.name,
            status: item.status
          }))
        },
        photos: {
          photo1: photos.photo1.file ? {
            name: photos.photo1.file.name,
            size: photos.photo1.file.size,
            type: photos.photo1.file.type
          } : null,
          photo2: photos.photo2.file ? {
            name: photos.photo2.file.name,
            size: photos.photo2.file.size,
            type: photos.photo2.file.type
          } : null,
          photo3: photos.photo3.file ? {
            name: photos.photo3.file.name,
            size: photos.photo3.file.size,
            type: photos.photo3.file.type
          } : null
        },
        metadata: {
          date: checklistDate,
          lineManager,
          machineOperator,
          brand: selectedBrand,
          material: selectedMaterial,
          sku: selectedSku,
          ordenFabricacion
        }
      })

      // 1. Obtener el blob del PDF
      const downloadLink = document.querySelector('a[download]') as HTMLAnchorElement
      if (!downloadLink?.href) {
        console.error('No se encontró el enlace de descarga del PDF')
        throw new Error('pdf/download-link-not-found: No se encontró el enlace de descarga del PDF')
      }

      console.log('Obteniendo PDF del enlace:', downloadLink.href)
      
      const response = await fetch(downloadLink.href)
      if (!response.ok) {
        console.error('Error al descargar el PDF:', {
          status: response.status,
          statusText: response.statusText
        })
        throw new Error(`pdf/fetch-failed: ${response.status} ${response.statusText}`)
      }
      
      const pdfBlob = await response.blob()
      if (!pdfBlob || pdfBlob.size === 0) {
        console.error('PDF inválido:', {
          size: pdfBlob?.size,
          type: pdfBlob?.type
        })
        throw new Error('pdf/invalid-blob: El PDF generado está vacío o es inválido')
      }

      console.log('PDF obtenido correctamente:', {
        size: pdfBlob.size,
        type: pdfBlob.type
      })
      
      // 2. Subir el PDF a Supabase Storage
      const fecha = format(checklistDate || new Date(), 'yyyy-MM-dd')
      console.log('Subiendo PDF con fecha:', fecha, 'y material:', selectedMaterial)
      
      const pdfUrl = await uploadPDF(pdfBlob, fecha, selectedMaterial)
      console.log('PDF subido exitosamente, URL:', pdfUrl)

      // 3. Generar y guardar el registro en la base de datos
      const checklistData = generateChecklistData(pdfUrl)
      console.log('Guardando registro en la base de datos:', {
        fecha: checklistData.fecha,
        marca: checklistData.marca,
        material: checklistData.material,
        items: checklistData.items.length,
        pdf_url: checklistData.pdf_url,
        datos_completos: JSON.stringify(checklistData, null, 2)
      })
      
      await saveChecklistRecord(checklistData)
      console.log('Registro guardado exitosamente')

      // Guardar el toast en localStorage antes de redirigir
      localStorage.setItem('pendingToast', JSON.stringify({
        message: 'Checklist guardado exitosamente',
        type: 'success'
      }))

      // 4. Limpiar el formulario y redirigir
      clearContext()
      router.push('/dashboard')
    } catch (error) {
      console.error('Error detallado al finalizar el registro:', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause
        } : error,
        context: {
          fecha: checklistDate ? format(checklistDate, 'yyyy-MM-dd') : null,
          marca: selectedBrand,
          material: selectedMaterial,
          sku: selectedSku,
          ordenFabricacion,
          formDataLength: formData.length,
          photosLoaded: {
            photo1: !!photos.photo1.file,
            photo2: !!photos.photo2.file,
            photo3: !!photos.photo3.file
          }
        }
      })
      
      let errorMessage = 'Ocurrió un error al guardar el registro. '
      
      if (error instanceof Error) {
        const [errorCode, errorDetails] = error.message.split(': ')
        switch (errorCode) {
          // Errores de formulario
          case 'form/missing-field':
            errorMessage = errorDetails
            break

          // Errores de PDF
          case 'pdf/download-link-not-found':
            errorMessage = `No se pudo generar el PDF: ${errorDetails}`
            break
          case 'pdf/fetch-failed':
            errorMessage = `Error al descargar el PDF: ${errorDetails}`
            break
          case 'pdf/invalid-blob':
            errorMessage = `El PDF generado es inválido: ${errorDetails}`
            break

          // Errores de Storage
          case 'storage/bucket-not-available':
            errorMessage = 'El sistema de almacenamiento no está disponible. Por favor contacte al administrador.'
            break
          case 'storage/upload-failed':
            errorMessage = `Error al subir el PDF: ${errorDetails}`
            break
          case 'storage/public-url-not-available':
            errorMessage = 'No se pudo obtener el enlace del PDF. Por favor intente nuevamente.'
            break
          case 'storage/upload-no-data':
            errorMessage = 'Error al procesar el archivo subido. Por favor intente nuevamente.'
            break

          // Errores de Base de Datos
          case 'database/missing-fields':
            errorMessage = `Faltan campos requeridos: ${errorDetails}`
            break
          case 'database/invalid-items-format':
            errorMessage = `Formato de items inválido: ${errorDetails}`
            break
          case 'database/duplicate-record':
            errorMessage = `Ya existe un registro: ${errorDetails}`
            break
          case 'database/invalid-reference':
            errorMessage = `Referencia inválida: ${errorDetails}`
            break
          case 'database/missing-required-field':
            errorMessage = `Campo requerido faltante: ${errorDetails}`
            break
          case 'database/insert-failed':
            errorMessage = `Error al guardar en la base de datos: ${errorDetails}`
            break
          case 'database/unknown-error':
            errorMessage = `Error desconocido: ${errorDetails}`
            break
          default:
            if (errorCode.startsWith('database/error-')) {
              errorMessage = `Error en la base de datos (${errorCode.split('-')[1]}): ${errorDetails}`
            } else {
              errorMessage = `Error inesperado: ${error.message}`
            }
        }
      }
      
      setError(errorMessage)
      showToast(errorMessage, 'error')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background py-6 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <div className="mb-4 sm:mb-6">
          <Link
            href="/area/produccion/checklist-packaging"
            className="inline-flex items-center text-blue-400 hover:text-blue-500 transition-colors mb-4"
          >
            <span className="mr-2">←</span>
            <span>Atrás</span>
          </Link>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-blue-400 mt-4">
            Fotografías del Checklist
          </h1>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-500 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Formulario */}
        <div className="space-y-4 sm:space-y-6">
          <PhotoUploadSection
            title="Foto 1: Codificación de bolsa"
            description="Tome una foto clara de la codificación en la bolsa del producto"
            photoKey="photo1"
            photo={photos.photo1}
            photos={photos}
            setPhotos={setPhotos}
            onUploadClick={handleUploadClick}
            required
          />

          <PhotoUploadSection
            title="Foto 2: Codificación de caja"
            description="Tome una foto de la codificación en la caja"
            photoKey="photo2"
            photo={photos.photo2}
            photos={photos}
            setPhotos={setPhotos}
            onUploadClick={handleUploadClick}
          />

          <PhotoUploadSection
            title="Foto 3: Etiqueta adicional"
            description="Tome una foto de la etiqueta adicional si es necesario"
            photoKey="photo3"
            photo={photos.photo3}
            photos={photos}
            setPhotos={setPhotos}
            onUploadClick={handleUploadClick}
          />

          {/* Botones de navegación y finalizar */}
          <div className="flex flex-col sm:flex-row justify-end gap-4 mt-8">
            {!showPDFButton ? (
              <button
                type="button"
                onClick={handleFinish}
                disabled={!isFormComplete}
                className={`w-full sm:w-auto px-6 py-3 rounded-md transition-colors
                  text-base font-medium text-center
                  ${isFormComplete 
                    ? 'bg-blue-400 hover:bg-blue-500 text-white shadow-md hover:shadow-lg focus:ring-2 focus:ring-blue-300 focus:ring-offset-2' 
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  }`}
              >
                Finalizar registro
              </button>
            ) : (
              <>
                {showPDFButton && pdfPreviewEnabled && (
                  <div className="mt-8">
                    <ChecklistPDFLink
                      formData={formData}
                      photos={photos}
                      metadata={{
                        date: checklistDate || new Date(),
                        lineManager,
                        machineOperator,
                        brand: selectedBrand,
                        material: selectedMaterial,
                        sku: selectedSku,
                        ordenFabricacion
                      }}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleFinishAndExit}
                  disabled={isSubmitting}
                  className={`w-full sm:w-auto px-6 py-3 rounded-md transition-colors
                    text-base font-medium text-center
                    ${isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-400 hover:bg-green-500 text-white shadow-md hover:shadow-lg focus:ring-2 focus:ring-green-300 focus:ring-offset-2'
                    }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Guardando...</span>
                    </div>
                  ) : (
                    'Finalizar y salir'
                  )}
                </button>
              </>
            )}
          </div>

          {/* Mensaje de validación */}
          {!isFormComplete && (
            <p className="text-sm text-gray-600 text-right mt-2">
              {!photos.photo1.file 
                ? 'Debe cargar la foto de codificación de bolsa'
                : 'Debe cargar al menos una foto adicional (caja o etiqueta)'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}