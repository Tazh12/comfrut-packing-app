'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { PhotoUpload } from '@/context/ChecklistContext'

interface PhotoUploadSectionProps {
  title: string
  description: string
  photoKey: keyof { photo1: PhotoUpload; photo2: PhotoUpload; photo3: PhotoUpload }
  photo: PhotoUpload
  setPhotos: (photos: { photo1: PhotoUpload; photo2: PhotoUpload; photo3: PhotoUpload }) => void
  onUploadClick: (key: keyof { photo1: PhotoUpload; photo2: PhotoUpload; photo3: PhotoUpload }) => void
  required?: boolean
}

const PhotoUploadSection = ({ 
  title, 
  description, 
  photoKey,
  photo,
  setPhotos,
  onUploadClick,
  required = false
}: PhotoUploadSectionProps) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
                onClick={() => onUploadClick(photoKey)}
                className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-300 
                  text-gray-600 rounded-md hover:bg-gray-50 transition-colors 
                  text-sm font-medium flex items-center justify-center gap-2
                  hover:border-blue-400 hover:text-blue-400"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Reemplazar foto
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onUploadClick(photoKey)}
              className="w-full aspect-[4/3] border-2 border-dashed border-gray-300 rounded-lg 
                flex flex-col items-center justify-center gap-3 hover:border-blue-400 
                transition-colors bg-gray-50 relative group"
            >
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
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default PhotoUploadSection 