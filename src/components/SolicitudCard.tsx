'use client'

import React from 'react'
import Link from 'next/link'

interface SolicitudCardProps {
  id: string
  fecha: string
  hora: string
  solicitante: string
  zona: string
  estado: string
}

export const SolicitudCard: React.FC<SolicitudCardProps> = ({ id, fecha, hora, solicitante, zona, estado }) => {
  let estadoColor = 'text-gray-600'
  switch (estado) {
    case 'pendiente':
      estadoColor = 'text-orange-600'
      break
    case 'programada':
      estadoColor = 'text-blue-600'
      break
    case 'resuelta':
      estadoColor = 'text-green-600'
      break
    case 'derivada':
      estadoColor = 'text-purple-600'
      break
    case 'no procede':
      estadoColor = 'text-gray-600'
      break
    default:
      estadoColor = 'text-gray-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 flex justify-between items-center">
      <div className="space-y-1">
        <p className="text-sm text-gray-500">{fecha} {hora}</p>
        <p className="text-lg font-semibold text-gray-900">{solicitante}</p>
        <p className="text-sm text-gray-600">Zona: {zona}</p>
        <p className={`text-sm font-medium ${estadoColor}`}>Estado: {estado}</p>
      </div>
      <Link
        href={`/area/mantencion/evaluacion_solicitudes/${id}`}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Revisar
      </Link>
    </div>
  )
} 