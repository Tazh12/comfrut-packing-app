'use client'

import React, { useState, useRef, ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'

interface FormularioResolucionProps {
  solicitudId: string
  onFinalize: (data: {
    tecnico: string
    fechaEjecucion: string
    accion: string
    observaciones: string
    estadoFinal: string
    fotos: File[]
  }) => void
}

export const FormularioResolucion: React.FC<FormularioResolucionProps> = ({ solicitudId, onFinalize }) => {
  const [tecnico, setTecnico] = useState<string>('')
  const [fechaEjecucion, setFechaEjecucion] = useState<string>(new Date().toISOString().slice(0,16))
  const [accion, setAccion] = useState<string>('')
  const [observaciones, setObservaciones] = useState<string>('')
  const [estadoFinal, setEstadoFinal] = useState<string>('resuelta')
  const [fotos, setFotos] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const filesArray = Array.from(e.target.files)
    const allowed = filesArray.slice(0, 3 - fotos.length).filter(file => file.size <= 5 * 1024 * 1024)
    setFotos(prev => [...prev, ...allowed])
  }

  const removeFoto = (index: number) => {
    setFotos(prev => prev.filter((_, i) => i !== index))
  }

  // Validación condicional de fotos: obligatorias solo si estadoFinal es 'resuelta'
  const fotosValid = estadoFinal === 'resuelta' ? fotos.length > 0 : true
  const isValid = tecnico.trim() !== '' && fechaEjecucion !== '' && accion.trim() !== '' && estadoFinal !== '' && fotosValid

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
        <input
          type="text"
          value={tecnico}
          onChange={e => setTecnico(e.target.value)}
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
        <label className="block text-sm font-medium text-gray-700">Observaciones Adicionales</label>
        <textarea
          value={observaciones}
          onChange={e => setObservaciones(e.target.value)}
          rows={3}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
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
          <option value="resuelta">Resuelta</option>
          <option value="no procede">No procede</option>
          <option value="derivada">Derivada</option>
          <option value="programada">Programada</option>
        </select>
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