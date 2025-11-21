'use client'

import React from 'react'
import Link from 'next/link'

interface SolicitudCardProps {
  id: string
  ticketId?: number
  fecha: string
  hora: string
  solicitante: string
  zona: string
  estado: string
  nivelRiesgo?: string
  equipoAfectado?: string
}

const getRiskPillStyle = (nivelRiesgo?: string) => {
  if (!nivelRiesgo) return 'bg-gray-100 text-gray-700'
  
  if (nivelRiesgo.includes('Crítico')) {
    return 'bg-red-600 text-white'
  } else if (nivelRiesgo.includes('Alto')) {
    return 'bg-orange-500 text-white'
  } else if (nivelRiesgo.includes('Medio')) {
    return 'bg-yellow-400 text-gray-800'
  } else {
    return 'bg-green-100 text-green-800'
  }
}

const getRiskLabel = (nivelRiesgo?: string) => {
  if (!nivelRiesgo) return null
  
  if (nivelRiesgo.includes('Crítico')) return '🔴 Crítico'
  if (nivelRiesgo.includes('Alto')) return '🟠 Alto'
  if (nivelRiesgo.includes('Medio')) return '🟡 Medio'
  return '🟢 Bajo'
}

export const SolicitudCard: React.FC<SolicitudCardProps> = ({ 
  id, 
  ticketId, 
  fecha, 
  hora, 
  solicitante, 
  zona, 
  estado,
  nivelRiesgo,
  equipoAfectado
}) => {
  const isPending = estado === 'pendiente'
  const linkHref = isPending 
    ? `/area/mantencion/evaluacion_solicitudes/${id}/asignar`
    : `/area/mantencion/evaluacion_solicitudes/${id}`

  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1 space-y-2">
          {/* Header with Ticket ID and Risk Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {ticketId && (
                <span className="px-3 py-1 bg-blue-600 text-white rounded-md font-bold text-sm">
                  #{ticketId}
                </span>
              )}
              <span className="text-sm text-gray-500">{fecha} {hora}</span>
            </div>
            {nivelRiesgo && (
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${getRiskPillStyle(nivelRiesgo)}`}>
                {getRiskLabel(nivelRiesgo)}
              </span>
            )}
          </div>
          
          {/* Solicitante */}
          <p className="text-lg font-semibold text-gray-900">{solicitante}</p>
          
          {/* Zona and Equipment */}
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Zona:</span> {zona}
            </p>
            {equipoAfectado && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Equipo:</span> {equipoAfectado}
              </p>
            )}
          </div>
          
          {/* Estado */}
          <p className={`text-sm font-medium ${
            estado === 'pendiente' ? 'text-orange-600' :
            estado === 'programada' || estado === 'en_ejecucion' ? 'text-blue-600' :
            estado === 'finalizada' || estado === 'resuelta' ? 'text-green-600' :
            'text-gray-600'
          }`}>
            Estado: {estado}
          </p>
        </div>
        
        {/* Action Button */}
        <Link
          href={linkHref}
          className={`px-4 py-2 rounded transition ${
            isPending
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isPending ? 'Asignar' : 'Revisar'}
        </Link>
      </div>
    </div>
  )
} 