'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useChecklist } from '@/context/ChecklistContext'
import { ChecklistPDFLink } from '@/components/ChecklistPDF'
import PhotoUploadSection from '@/components/PhotoUploadSection'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectMethod: (useCamera: boolean) => void
  title: string
}

const UploadModal = ({ isOpen, onClose, onSelectMethod, title }: UploadModalProps) => {
  // Cerrar modal con Esc
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  // Agregar/remover event listener
  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-lg max-w-sm w-full mx-auto p-6">
          {/* Cerrar */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Contenido */}
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {title}
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => onSelectMethod(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 
                  bg-blue-400 text-white rounded-md hover:bg-blue-500 
                  transition-colors text-base font-medium shadow-md
                  hover:shadow-lg"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Tomar foto
              </button>
              <button
                onClick={() => onSelectMethod(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 
                  bg-white text-blue-400 border border-blue-400 rounded-md 
                  hover:bg-blue-50 transition-colors text-base font-medium"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Seleccionar desde galería
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ChecklistPhotosPage() {
  const router = useRouter()
  const { 
    photos, 
    setPhotos, 
    formData,
    lineManager,
    machineOperator,
    checklistDate,
    selectedBrand,
    selectedMaterial,
    selectedSku
  } = useChecklist()
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeUpload, setActiveUpload] = useState<keyof typeof photos | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [showPDFButton, setShowPDFButton] = useState(false)
  
  // Referencias para los inputs de archivo
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Verificar si el formulario está completo
  const isFormComplete = photos.photo1.file && (photos.photo2.file || photos.photo3.file)

  const handleFileChange = useCallback((photoKey: keyof typeof photos) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validar tamaño máximo (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen no debe superar los 5MB')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotos({
          ...photos,
          [photoKey]: {
            file,
            preview: reader.result as string
          }
        })
      }
      reader.readAsDataURL(file)
      setError('')
    }
    // Limpiar input para permitir seleccionar el mismo archivo
    event.target.value = ''
  }, [photos, setPhotos])

  const handleUploadClick = useCallback((photoKey: keyof typeof photos) => {
    setActiveUpload(photoKey)
    setModalOpen(true)
  }, [])

  const handleModalClose = useCallback(() => {
    setModalOpen(false)
    setActiveUpload(null)
  }, [])

  const handleUploadMethod = useCallback((useCamera: boolean) => {
    if (!activeUpload) return

    setModalOpen(false)
    setTimeout(() => {
      if (useCamera) {
        cameraInputRef.current?.click()
      } else {
        galleryInputRef.current?.click()
      }
    }, 100)
  }, [activeUpload])

  const handleFinish = async () => {
    if (!isFormComplete) return
    setShowPDFButton(true)
  }

  const handleFinishAndExit = () => {
    router.push('/area/produccion')
  }

  return (
    <div className="min-h-screen bg-background py-4 sm:py-6">
      {/* Inputs ocultos para cámara y galería */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={activeUpload ? handleFileChange(activeUpload) : undefined}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={activeUpload ? handleFileChange(activeUpload) : undefined}
        className="hidden"
      />

      {/* Modal de selección */}
      <UploadModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSelectMethod={handleUploadMethod}
        title={`Agregar ${activeUpload === 'photo1' ? 'foto de codificación de bolsa' : 
          activeUpload === 'photo2' ? 'foto de codificación de caja' : 
          'foto de etiqueta adicional'}`}
      />

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
            setPhotos={setPhotos}
            onUploadClick={handleUploadClick}
            required
          />

          <PhotoUploadSection
            title="Foto 2: Codificación de caja"
            description="Tome una foto de la codificación en la caja"
            photoKey="photo2"
            photo={photos.photo2}
            setPhotos={setPhotos}
            onUploadClick={handleUploadClick}
          />

          <PhotoUploadSection
            title="Foto 3: Etiqueta adicional"
            description="Tome una foto de la etiqueta adicional si es necesario"
            photoKey="photo3"
            photo={photos.photo3}
            setPhotos={setPhotos}
            onUploadClick={handleUploadClick}
          />

          {/* Botones de navegación y finalizar */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8">
            <Link
              href="/area/produccion/checklist-packaging"
              className="w-full sm:w-auto px-6 py-3 bg-white border border-gray-300 
                text-gray-600 rounded-md hover:bg-gray-50 transition-colors 
                text-base font-medium text-center hover:border-blue-400
                hover:text-blue-400"
            >
              Atrás
            </Link>

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
                <ChecklistPDFLink
                  formData={formData}
                  photos={photos}
                  metadata={{
                    date: checklistDate || new Date(),
                    time: new Date().toLocaleTimeString(),
                    lot: 'L123456',
                    lineManager,
                    machineOperator,
                    brand: selectedBrand,
                    material: selectedMaterial,
                    sku: selectedSku
                  }}
                />

                <button
                  type="button"
                  onClick={handleFinishAndExit}
                  className="w-full sm:w-auto px-6 py-3 bg-green-400 text-white rounded-md 
                    hover:bg-green-500 transition-colors text-base font-medium text-center
                    shadow-md hover:shadow-lg focus:ring-2 focus:ring-green-300 
                    focus:ring-offset-2"
                >
                  Finalizar y salir
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