'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AsignarSolicitudPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { showToast } = useToast()

  const [solicitud, setSolicitud] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  
  // Form state
  const [tecnico, setTecnico] = useState<string>('')
  const [prioridad, setPrioridad] = useState<string>('')
  const [fechaProgramada, setFechaProgramada] = useState<string>('')
  const [observaciones, setObservaciones] = useState<string>('')

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
          router.push('/area/mantencion/evaluacion_solicitudes')
          return
        }
        
        if (data.estado !== 'pendiente') {
          showToast('Esta solicitud ya ha sido asignada', 'success')
          setTimeout(() => {
            router.push(`/area/mantencion/evaluacion_solicitudes/${id}`)
          }, 1500)
          return
        }
        
        setSolicitud(data)
      } catch (err) {
        console.error('Error inesperado al cargar solicitud:', err)
        showToast('Error al cargar solicitud', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchSolicitud()
  }, [id, router, showToast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!tecnico.trim() || !prioridad || !fechaProgramada) {
      showToast('Por favor complete todos los campos obligatorios', 'error')
      return
    }

    setSubmitting(true)
    try {
      // Update only fields that exist in the database
      // Based on the finalization page, we know 'tecnico' and 'observaciones' exist
      // Store assignment info in observaciones field
      const assignmentNotes = `[Asignación] Técnico: ${tecnico} | Prioridad: ${prioridad} | Fecha programada: ${fechaProgramada}${observaciones ? ` | Notas: ${observaciones}` : ''}`
      
      const { error: updateError } = await supabase
        .from('solicitudes_mantenimiento')
        .update({
          estado: 'programada',
          tecnico: tecnico,
          observaciones: assignmentNotes
        })
        .eq('id', id)

      if (updateError) {
        console.error('Error al asignar solicitud:', JSON.stringify(updateError, null, 2))
        showToast('Error al asignar la solicitud', 'error')
        return
      }

      showToast('Solicitud asignada con éxito', 'success', 3000)
      setTimeout(() => {
        router.push('/area/mantencion/evaluacion_solicitudes')
      }, 1500)
    } catch (err) {
      console.error('Error inesperado al asignar solicitud:', err)
      showToast('Error inesperado al asignar solicitud', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!solicitud) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Solicitud no encontrada.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <button 
        onClick={() => router.back()} 
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Volver
      </button>

      <h1 className="text-2xl font-bold mb-6">
        Asignar Solicitud {solicitud.ticket_id && `#${solicitud.ticket_id}`}
      </h1>

      {/* Solicitud Details Card */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-2">
        <h2 className="text-lg font-semibold mb-4">Detalles de la Solicitud</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Fecha</p>
            <p className="font-medium">{solicitud.fecha} {solicitud.hora}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Solicitante</p>
            <p className="font-medium">{solicitud.solicitante}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Zona</p>
            <p className="font-medium">{solicitud.zona}</p>
          </div>
          {solicitud.equipo_afectado && (
            <div>
              <p className="text-sm text-gray-600">Equipo Afectado</p>
              <p className="font-medium">{solicitud.equipo_afectado}</p>
            </div>
          )}
          {solicitud.nivel_riesgo && (
            <div>
              <p className="text-sm text-gray-600">Nivel de Riesgo</p>
              <p className="font-medium">{solicitud.nivel_riesgo}</p>
            </div>
          )}
          <div className="col-span-2">
            <p className="text-sm text-gray-600">Descripción</p>
            <p className="font-medium">{solicitud.descripcion}</p>
          </div>
        </div>
      </div>

      {/* Assignment Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <h2 className="text-lg font-semibold mb-4">Asignación de Trabajo</h2>

        <div>
          <label htmlFor="tecnico" className="block text-sm font-medium text-gray-700 mb-1">
            Técnico Asignado (Nombre y Apellido) *
          </label>
          <input
            type="text"
            id="tecnico"
            value={tecnico}
            onChange={(e) => setTecnico(e.target.value)}
            placeholder="Ej: Juan Pérez"
            className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>

        <div>
          <label htmlFor="prioridad" className="block text-sm font-medium text-gray-700 mb-1">
            Prioridad *
          </label>
          <select
            id="prioridad"
            value={prioridad}
            onChange={(e) => setPrioridad(e.target.value)}
            className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          >
            <option value="">Seleccione una prioridad</option>
            <option value="urgente">Urgente</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
            <option value="rutina">Rutina</option>
          </select>
        </div>

        <div>
          <label htmlFor="fechaProgramada" className="block text-sm font-medium text-gray-700 mb-1">
            Fecha Programada *
          </label>
          <input
            type="date"
            id="fechaProgramada"
            value={fechaProgramada}
            onChange={(e) => setFechaProgramada(e.target.value)}
            className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div>
          <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">
            Observaciones / Instrucciones
          </label>
          <textarea
            id="observaciones"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={4}
            className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="Instrucciones adicionales para el técnico..."
          />
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Asignando...' : 'Programar Trabajo'}
          </Button>
          <Button
            type="button"
            onClick={() => router.back()}
            variant="outline"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}

