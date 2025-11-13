'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { SolicitudCard } from '@/components/SolicitudCard'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function EvaluacionSolicitudesPage() {
  const { showToast } = useToast()
  const [estado, setEstado] = useState<string>('')
  const [solicitante, setSolicitante] = useState<string>('')
  const [zona, setZona] = useState<string>('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  const handleBuscar = async () => {
    setLoading(true)
    try {
      let query = supabase.from('solicitudes_mantenimiento').select('id, fecha, hora, solicitante, zona, estado')
      if (estado) query = query.eq('estado', estado)
      if (solicitante) query = query.ilike('solicitante', `%${solicitante}%`)
      if (zona) query = query.ilike('zona', `%${zona}%`)
      const { data, error } = await query
      if (error) {
        console.error('Error al buscar solicitudes:', error)
        showToast('Error al buscar solicitudes', 'error')
        setResults([])
      } else {
        setResults(data || [])
      }
    } catch (err) {
      console.error('Error inesperado al buscar solicitudes:', err)
      showToast('Error inesperado al buscar solicitudes', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Link href="/area/mantencion" className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4">
        <ArrowLeft className="h-5 w-5 mr-2" />
        Volver
      </Link>
      <h1 className="text-2xl font-bold mb-6">Evaluación de Solicitudes de Mantenimiento</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div>
          <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select
            id="estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
          >
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="programada">Programada</option>
            <option value="finalizada">Finalizada</option>
            <option value="resuelta">Resuelta</option>
            <option value="derivada">Derivada</option>
            <option value="no procede">No procede</option>
          </select>
        </div>
        <div>
          <label htmlFor="solicitante" className="block text-sm font-medium text-gray-700 mb-1">Solicitante</label>
          <input
            type="text"
            id="solicitante"
            value={solicitante}
            onChange={(e) => setSolicitante(e.target.value)}
            placeholder="Solicitante"
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        <div>
          <label htmlFor="zona" className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
          <input
            type="text"
            id="zona"
            value={zona}
            onChange={(e) => setZona(e.target.value)}
            placeholder="Zona"
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
      </div>
      <div className="mb-6">
        <button
          onClick={handleBuscar}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Buscar
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : results.length === 0 ? (
        <p className="text-center text-gray-600">No se encontraron solicitudes con estos filtros.</p>
      ) : (
        <div className="space-y-4">
          {results.map((sol) => (
            <SolicitudCard
              key={sol.id}
              id={sol.id}
              fecha={sol.fecha}
              hora={sol.hora}
              solicitante={sol.solicitante}
              zona={sol.zona}
              estado={sol.estado}
            />
          ))}
        </div>
      )}
    </div>
  )
} 