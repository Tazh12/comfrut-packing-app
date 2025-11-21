'use client'

import React, { useState, useRef, ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'

interface FormularioResolucionProps {
  solicitudId: string
  assignedTecnico?: string
  onFinalize: (data: {
    tecnico: string
    fechaEjecucion: string
    accion: string
    observaciones: string
    estadoFinal: string
    fotos: File[]
  }) => void
}

export const FormularioResolucion: React.FC<FormularioResolucionProps> = ({ solicitudId, assignedTecnico, onFinalize }) => {
  const [tecnico, setTecnico] = useState<string>(assignedTecnico || '')
  const [fechaEjecucion, setFechaEjecucion] = useState<string>(new Date().toISOString().slice(0,16))
  const [accion, setAccion] = useState<string>('')
  const [observaciones, setObservaciones] = useState<string>('')
  const [estadoFinal, setEstadoFinal] = useState<string>('resuelta')
  const [fotos, setFotos] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

  const handleFotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const filesArray = Array.from(e.target.files)
    const allowed = filesArray.slice(0, 3 - fotos.length)
    
    // Compress all images before adding them
    try {
      const compressedFiles = await Promise.all(
        allowed.map(file => compressImage(file))
      )
      setFotos(prev => [...prev, ...compressedFiles])
    } catch (error) {
      console.error('Error comprimiendo imágenes:', error)
    }
  }

  const removeFoto = (index: number) => {
    setFotos(prev => prev.filter((_, i) => i !== index))
  }

  // Validación condicional:
  // - Fotos: obligatorias solo si estadoFinal es 'resuelta'
  // - Observaciones: obligatorias si estadoFinal es 'no procede'
  const fotosValid = estadoFinal === 'resuelta' ? fotos.length > 0 : true
  const observacionesValid = estadoFinal === 'no procede' ? observaciones.trim() !== '' : true
  const isValid = tecnico.trim() !== '' && fechaEjecucion !== '' && accion.trim() !== '' && estadoFinal !== '' && fotosValid && observacionesValid

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    onFinalize({ tecnico, fechaEjecucion, accion, observaciones, estadoFinal, fotos })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <h2 className="text-xl font-semibold">Resolución de Solicitud</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700">Técnico Responsable *</label>
        {assignedTecnico && (
          <div className="mb-2">
            <button
              type="button"
              onClick={() => setTecnico(assignedTecnico)}
              className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              Usar técnico asignado: {assignedTecnico}
            </button>
          </div>
        )}
        <input
          type="text"
          value={tecnico}
          onChange={e => setTecnico(e.target.value)}
          placeholder={assignedTecnico ? `Técnico asignado: ${assignedTecnico}` : 'Nombre del técnico'}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Fecha de Ejecución *</label>
        <input
          type="datetime-local"
          value={fechaEjecucion}
          onChange={e => setFechaEjecucion(e.target.value)}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Acción Realizada *</label>
        <textarea
          value={accion}
          onChange={e => setAccion(e.target.value)}
          rows={4}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Estado Final *</label>
        <select
          value={estadoFinal}
          onChange={e => setEstadoFinal(e.target.value)}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
          required
        >
          <option value="resuelta">Resuelta (Requiere Validación)</option>
          <option value="derivada">Derivada a Terceros (Continúa en Ejecución)</option>
          <option value="no procede">No Procede</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Observaciones {estadoFinal === 'no procede' && '*'}
        </label>
        <textarea
          value={observaciones}
          onChange={e => setObservaciones(e.target.value)}
          rows={3}
          placeholder={estadoFinal === 'no procede' ? 'Explique por qué esta solicitud no procede...' : 'Observaciones adicionales...'}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
          required={estadoFinal === 'no procede'}
        />
        {estadoFinal === 'no procede' && (
          <p className="mt-1 text-sm text-red-600">Debe explicar por qué la solicitud no procede</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Fotos de ejecución {estadoFinal === 'resuelta' && '*'}
        </label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 mt-1"
        >
          Adjuntar fotografía
        </button>
        <input
          type="file"
          accept="image/jpeg,image/png"
          multiple
          ref={fileInputRef}
          onChange={handleFotoChange}
          className="hidden"
        />
        <div className="flex space-x-2 mt-2">
          {fotos.map((file, idx) => (
            <div key={idx} className="relative">
              <img src={URL.createObjectURL(file)} alt={`Ejecución ${idx+1}`} className="h-20 w-20 object-cover rounded-md" />
              <button type="button" onClick={() => removeFoto(idx)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs">×</button>
            </div>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={!isValid}>Finalizar solicitud</Button>
    </form>
  )
} 