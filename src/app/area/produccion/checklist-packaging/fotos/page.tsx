'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useChecklist, ChecklistPhotos, ChecklistItem } from '@/context/ChecklistContext'
import PhotoUploadSection from '@/components/PhotoUploadSection'
import { ChecklistPDFLink } from '@/components/ChecklistPDF'
import { uploadPDF, saveChecklistRecord, normalizeMaterial, ChecklistData, ChecklistItem as ChecklistDataItem } from '@/lib/checklist'
import { format } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { useToast } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { initialChecklistItems } from '@/lib/checklist'
import { MASTER_ITEM_LIST } from '@/lib/constants'
import * as XLSX from 'xlsx'

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
    clearContext,
    setLineManager,
    setMachineOperator,
    setChecklistDate,
    setSelectedBrand,
    setSelectedMaterial,
    setSelectedSku,
    setOrdenFabricacion,
    setFormData
  } = useChecklist()
  const { showToast } = useToast()

  // Recuperar datos del checklist al cargar la página
  useEffect(() => {
    const saved = localStorage.getItem('checklistData')
    if (saved) {
      const d = JSON.parse(saved)
      if (d.lineManager) setLineManager(d.lineManager)
      if (d.machineOperator) setMachineOperator(d.machineOperator)
      if (d.checklistDate) setChecklistDate(d.checklistDate)
      if (d.ordenFabricacion) setOrdenFabricacion(d.ordenFabricacion)
      if (d.selectedBrand) setSelectedBrand(d.selectedBrand)
      if (d.selectedMaterial) setSelectedMaterial(d.selectedMaterial)
      if (d.selectedSku) setSelectedSku(d.selectedSku)
      if (Array.isArray(d.items) && d.items.length) {
        setFormData(d.items)
      }
    }
  }, [])

  // Guard de fallback si photos no está inicializado
  if (!photos) {
    return null;
  }

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

  // Función para mapear los ítems del formulario a la lista completa
  const mapItemsToFullList = (formData: ChecklistItem[]): ChecklistDataItem[] => {
    return initialChecklistItems.map((item) => {
      const found = formData.find(i => i.id === item.id)
      return {
        id: item.id,
        nombre: item.nombre,
        estado: found?.status === 'cumple' ? 'cumple' : 'no_cumple'
      }
    })
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

    // Usar la cadena de fecha proporcionada por el operario o fallback a la fecha actual
    const fecha = checklistDate ?? format(new Date(), 'yyyy-MM-dd')
    
    return {
      fecha,
      jefe_linea: lineManager,
      operador_maquina: machineOperator,
      marca: selectedBrand,
      material: selectedMaterial,
      sku: selectedSku,
      orden_fabricacion: ordenFabricacion,
      items: mapItemsToFullList(formData),
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

  const isFormComplete =
    !!photos?.photo1?.file &&
    (!!photos?.photo2?.file || !!photos?.photo3?.file);

  const handleFinish = () => {
    if (!isFormComplete) {
      setError(
        !photos?.photo1?.file
          ? 'Debe cargar la foto de codificación de bolsa'
          : 'Debe cargar al menos una foto adicional (caja o etiqueta)'
      )
      return
    }
    setError('')
    setShowPDFButton(true)
    setPdfPreviewEnabled(true)
  }

  const handleFinishAndExit = async () => {
    if (!isFormComplete) {
      setError(
        !photos?.photo1?.file
          ? 'Debe cargar la foto de codificación de bolsa'
          : 'Debe cargar al menos una foto adicional (caja o etiqueta)'
      )
      return
    }

    setPdfPreviewEnabled(false)
    setIsSubmitting(true)
    setError('')

    try {
      console.log('Estado del formulario antes de procesar:', {
        formData: {
          itemCount: formData.length,
          items: formData.map(item => ({
            id: item.id,
            name: item.nombre,
            status: item.status
          }))
        },
        photos: {
          photo1: photos?.photo1?.file ? {
            name: photos.photo1.file.name,
            size: photos.photo1.file.size,
            type: photos.photo1.file.type
          } : null,
          photo2: photos?.photo2?.file ? {
            name: photos.photo2.file.name,
            size: photos.photo2.file.size,
            type: photos.photo2.file.type
          } : null,
          photo3: photos?.photo3?.file ? {
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
      
      // 2. Subir el PDF a Supabase Storage usando la fecha en texto proporcionada por el operario
      const fecha = checklistDate ?? format(new Date(), 'yyyy-MM-dd')
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

      // Limpiar estado y localStorage antes de navegar
      clearContext()
      localStorage.removeItem('checklistData')
      router.push('/dashboard')
    } catch (error: any) {
      // Imprime el error crudo para ver name y message
      console.error('Error detallado al finalizar el registro:', error)

      // Usa el message real o un fallback
      const message = error instanceof Error ? error.message : 'Error inesperado al guardar'

      // Mostrar toast y mensaje en pantalla
      showToast(message, 'error')
      setError(message)

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
                  <div className="mt-8 flex items-center gap-4">
                    <div className="flex-none">
                      <ChecklistPDFLink
                        formData={formData}
                        photos={photos}
                        metadata={{
                          date: checklistDate ?? format(new Date(), 'yyyy-MM-dd'),
                          lineManager,
                          machineOperator,
                          brand: selectedBrand,
                          material: selectedMaterial,
                          sku: selectedSku,
                          ordenFabricacion,
                          operator: machineOperator
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleFinishAndExit}
                      disabled={isSubmitting}
                      className={`flex-none px-6 py-3 rounded-md text-base font-medium transition-colors ${
                        isSubmitting
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-400 hover:bg-green-500 text-white shadow-md hover:shadow-lg focus:ring-green-300'
                      }`}
                    >
                      {isSubmitting ? 'Guardando…' : 'Finalizar y salir'}
                    </button>
                  </div>
                )}

                {/* Mensaje de validación */}
                {!isFormComplete && (
                  <p className="text-sm text-gray-600 text-right mt-2">
                    {!photos?.photo1?.file
                      ? 'Debe cargar la foto de codificación de bolsa'
                      : 'Debe cargar al menos una foto adicional (caja o etiqueta)'}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}