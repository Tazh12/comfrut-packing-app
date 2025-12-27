// Create the file src/components/ChecklistLoadingMap.tsx
import React from 'react'
import { Camera, Check, Box } from 'lucide-react'

// Types
export interface SlotData {
  slot_id: number
  pallet_id?: string
  product_name?: string
  product_color?: string
  cases?: number
  status?: 'empty' | 'filled'
}

interface ChecklistLoadingMapProps {
  slots: SlotData[]
  onSlotClick: (slotId: number) => void
  onRowCameraClick: (rowIndex: number) => void
  onSlotDrop?: (fromSlotId: number, toSlotId: number) => void
  rowPhotos: Record<string, any> // rowIndex -> photo object
  onDeleteRowPhoto?: (rowIndex: number) => void
}

export function ChecklistLoadingMap({
  slots,
  onSlotClick,
  onRowCameraClick,
  onSlotDrop,
  rowPhotos,
  onDeleteRowPhoto
}: ChecklistLoadingMapProps) {
  const [draggedSlotId, setDraggedSlotId] = React.useState<number | null>(null)
  const [dragOverSlotId, setDragOverSlotId] = React.useState<number | null>(null)
  // 13 rows
  const rows = Array.from({ length: 13 }, (_, i) => i)

  return (
    <div className="w-full max-w-2xl mx-auto bg-gray-50 p-4 rounded-xl border border-gray-200">
      {/* Truck Header */}
      <div className="text-center mb-6">
        <div className="w-full h-12 bg-gray-800 rounded-t-3xl mb-1 mx-auto max-w-md flex items-center justify-center relative overflow-hidden">
          <div className="w-full h-1/2 bg-gray-700 absolute bottom-0"></div>
          <span className="relative text-white font-bold text-sm z-10">FRENTE / CABINA</span>
        </div>
        <div className="w-full h-4 bg-gray-300 mx-auto max-w-md"></div>
      </div>

      {/* Grid Container */}
      <div className="relative max-w-md mx-auto bg-white border-x-4 border-gray-300 min-h-[600px] p-2">
        <div className="absolute inset-y-0 left-1/2 w-0.5 bg-gray-200 -translate-x-1/2 border-dashed border-l border-gray-300"></div>

        <div className="grid gap-y-2 relative">
          {rows.map((rowIndex) => {
            const leftSlotId = rowIndex * 2 + 1
            const rightSlotId = rowIndex * 2 + 2
            const leftSlot = slots.find(s => s.slot_id === leftSlotId) || { slot_id: leftSlotId }
            const rightSlot = slots.find(s => s.slot_id === rightSlotId) || { slot_id: rightSlotId }
            
            const hasPhoto = rowPhotos[rowIndex]

            return (
              <div key={rowIndex} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center relative">
                {/* Left Slot */}
                <Slot 
                  data={leftSlot} 
                  onClick={() => onSlotClick(leftSlotId)}
                  onDragStart={() => leftSlot.pallet_id && setDraggedSlotId(leftSlotId)}
                  onDragEnd={() => {
                    if (draggedSlotId && dragOverSlotId && draggedSlotId !== dragOverSlotId && onSlotDrop) {
                      onSlotDrop(draggedSlotId, dragOverSlotId)
                    }
                    setDraggedSlotId(null)
                    setDragOverSlotId(null)
                  }}
                  onDrop={() => {
                    if (draggedSlotId && draggedSlotId !== leftSlotId && onSlotDrop) {
                      onSlotDrop(draggedSlotId, leftSlotId)
                      setDraggedSlotId(null)
                      setDragOverSlotId(null)
                    }
                  }}
                  onDragEnter={() => draggedSlotId && draggedSlotId !== leftSlotId && setDragOverSlotId(leftSlotId)}
                  onDragLeave={() => setDragOverSlotId(null)}
                  isDragging={draggedSlotId === leftSlotId}
                  isDragOver={dragOverSlotId === leftSlotId && draggedSlotId !== leftSlotId}
                />

                {/* Center / Camera */}
                <div className="relative z-10 flex flex-col justify-center items-center w-8 gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRowCameraClick(rowIndex)
                    }}
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm border
                      ${hasPhoto 
                        ? 'bg-blue-100 text-blue-600 border-blue-200 hover:bg-blue-200' 
                        : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200 hover:text-gray-600'
                      }
                    `}
                    title={`Foto fila ${rowIndex + 1}`}
                  >
                    {hasPhoto ? (
                      <div className="relative">
                        <Camera className="w-4 h-4" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white"></span>
                      </div>
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                  {hasPhoto && onDeleteRowPhoto && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteRowPhoto(rowIndex)
                      }}
                      className="w-6 h-6 rounded-full bg-red-100 text-red-600 border border-red-200 hover:bg-red-200 flex items-center justify-center text-xs"
                      title="Eliminar foto"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Right Slot */}
                <Slot 
                  data={rightSlot} 
                  onClick={() => onSlotClick(rightSlotId)}
                  onDragStart={() => rightSlot.pallet_id && setDraggedSlotId(rightSlotId)}
                  onDragEnd={() => {
                    if (draggedSlotId && dragOverSlotId && draggedSlotId !== dragOverSlotId && onSlotDrop) {
                      onSlotDrop(draggedSlotId, dragOverSlotId)
                    }
                    setDraggedSlotId(null)
                    setDragOverSlotId(null)
                  }}
                  onDrop={() => {
                    if (draggedSlotId && draggedSlotId !== rightSlotId && onSlotDrop) {
                      onSlotDrop(draggedSlotId, rightSlotId)
                      setDraggedSlotId(null)
                      setDragOverSlotId(null)
                    }
                  }}
                  onDragEnter={() => draggedSlotId && draggedSlotId !== rightSlotId && setDragOverSlotId(rightSlotId)}
                  onDragLeave={() => setDragOverSlotId(null)}
                  isDragging={draggedSlotId === rightSlotId}
                  isDragOver={dragOverSlotId === rightSlotId && draggedSlotId !== rightSlotId}
                />
                
                {/* Row Number Indicator (Optional) */}
                <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">
                  {rowIndex + 1}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Truck Footer */}
      <div className="text-center mt-6">
        <div className="w-full h-4 bg-gray-300 mx-auto max-w-md mb-1 relative">
           <div className="absolute top-0 left-0 w-1/3 h-full bg-gray-400"></div>
           <div className="absolute top-0 right-0 w-1/3 h-full bg-gray-400"></div>
        </div>
        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Puertas / Atrás</div>
      </div>
    </div>
  )
}

function Slot({ 
  data, 
  onClick, 
  onDragStart,
  onDragEnd,
  onDrop,
  onDragEnter,
  onDragLeave,
  isDragging,
  isDragOver
}: { 
  data: SlotData
  onClick: () => void
  onDragStart?: () => void
  onDragEnd?: () => void
  onDrop?: () => void
  onDragEnter?: () => void
  onDragLeave?: () => void
  isDragging?: boolean
  isDragOver?: boolean
}) {
  const isFilled = !!data.pallet_id
  
  return (
    <button
      onClick={onClick}
      draggable={isFilled}
      onDragStart={(e) => {
        if (isFilled && onDragStart) {
          onDragStart()
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', String(data.slot_id))
        } else {
          e.preventDefault()
        }
      }}
      onDragEnd={(e) => {
        if (onDragEnd) {
          onDragEnd()
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }}
      onDragEnter={(e) => {
        e.preventDefault()
        if (onDragEnter) {
          onDragEnter()
        }
      }}
      onDragLeave={(e) => {
        if (onDragLeave) {
          onDragLeave()
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        if (onDrop) {
          onDrop()
        }
      }}
      className={`
        relative h-24 rounded-lg border-2 transition-all flex flex-col items-center justify-center p-1 text-center overflow-hidden
        ${isDragging 
          ? 'opacity-50 scale-95 cursor-grabbing' 
          : isDragOver 
            ? 'border-green-500 bg-green-50 scale-105' 
            : isFilled 
              ? 'bg-white border-blue-500 shadow-sm hover:shadow-md cursor-grab' 
              : 'bg-gray-50 border-gray-200 border-dashed hover:border-gray-300 hover:bg-gray-100 cursor-pointer'
        }
      `}
    >
      {isFilled ? (
        <>
          <div className="w-full flex-1 flex flex-col justify-center items-center">
            <span className="text-xs font-bold text-gray-900 line-clamp-2 leading-tight">
              {data.product_name || 'Producto'}
            </span>
            {data.cases && (
              <span className="text-[10px] text-gray-500 font-medium mt-0.5">
                {data.cases} cajas
              </span>
            )}
            <span className="mt-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-mono">
              #{data.pallet_id?.slice(-4)}
            </span>
          </div>
          {/* Status stripe if needed */}
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
        </>
      ) : (
        <>
          <span className="text-2xl font-bold text-gray-200 mb-1">{data.slot_id}</span>
          <span className="text-[10px] text-gray-400">Vacío</span>
        </>
      )}
    </button>
  )
}
