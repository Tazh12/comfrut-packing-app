'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { PhotoUpload, ChecklistPhotos } from '@/context/ChecklistContext'
import { processImage } from '@/lib/imageProcessing'

interface PhotoUploadSectionProps {
  title: string
  description: string
  photoKey: keyof ChecklistPhotos
  photo: PhotoUpload
  photos: ChecklistPhotos
  setPhotos: (photos: ChecklistPhotos) => void
  onUploadClick: (key: keyof ChecklistPhotos) => void
  required?: boolean
}

const PhotoUploadSection = ({ 
  title, 
  description, 
  photoKey,
  photo,
  photos,
  setPhotos,
  onUploadClick,
  required = false
}: PhotoUploadSectionProps) => {
  const [mounted, setMounted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleFileSelect = async (file: File) => {
    try {
      setIsProcessing(true)
      const processedImage = await processImage(file)
      
      setPhotos({
        ...photos,
        [photoKey]: {
          file: processedImage.file,
          preview: processedImage.dataUrl
        }
      })
    } catch (error) {
      console.error('Error processing image:', error)
      // Fallback to original file if processing fails
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
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUploadClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        handleFileSelect(file)
      }
    }
    input.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof PhotoFields) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotos(prev => ({
        ...prev,
        [field]: {
          file,
          preview: URL.createObjectURL(file)
        }
      }))
    }
  }

  if (!mounted) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {title}
                {required && <span className="text-red-500 ml-1">*</span>}
              </h3>
              <p className="text-gray-600 text-sm mt-1">{description}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full aspect-[4/3] bg-gray-100 rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {title}
              {required && <span className="text-red-500 ml-1">*</span>}
            </h3>
            <p className="text-gray-600 text-sm mt-1">{description}</p>
          </div>
        </div>

        {/* Vista previa o botón de carga */}
        <div className="mt-4">
          {photo?.preview ? (
            <div className="space-y-3">
              <div className="relative w-full aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={photo.preview}
                  alt={title}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setPhotos({
                    ...photos,
                    [photoKey]: { file: null, preview: null }
                  })
                }}
                disabled={isProcessing}
                className={`w-full sm:w-auto px-4 py-2 bg-white border border-red-300 
                  text-red-600 rounded-md hover:bg-red-50 transition-colors 
                  text-sm font-medium flex items-center justify-center gap-2
                  hover:border-red-400 hover:text-red-700
                  ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Procesando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar foto
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={isProcessing}
              className={`w-full aspect-[4/3] border-2 border-dashed border-gray-300 rounded-lg 
                flex flex-col items-center justify-center gap-3 hover:border-blue-400 
                transition-colors bg-gray-50 relative group
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center gap-3">
                  <svg className="animate-spin h-10 w-10 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <div className="text-center px-4">
                    <p className="text-gray-600 font-medium">Procesando imagen</p>
                    <p className="text-sm text-gray-500">Por favor espere...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 
                    group-hover:opacity-100 transition-opacity bg-blue-50">
                    <div className="text-blue-400 font-medium">Seleccionar o tomar foto</div>
                  </div>
                  <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="text-center px-4">
                    <p className="text-gray-600 font-medium">Haz clic para agregar foto</p>
                    <p className="text-sm text-gray-500">Tomar foto o seleccionar desde galería</p>
                  </div>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default PhotoUploadSection 