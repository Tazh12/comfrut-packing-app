'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useChecklist } from '@/context/ChecklistContext'
import ReactDatePicker, { registerLocale } from 'react-datepicker'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import "react-datepicker/dist/react-datepicker.css"
import productsData from '@/data/products_db.json'
import { ProductEntry, ProductsData } from '@/types/product'
import { supabase } from '@/lib/supabase-browser'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { initialChecklistItems } from '@/lib/checklist'
import * as XLSX from 'xlsx'

// Validar y tipar los datos del JSON
const products: ProductsData = productsData as ProductsData

// Registrar el locale español
registerLocale('es', es)

// Tipos
interface ChecklistItem {
  id: number
  name: string
  status: 'cumple' | 'no_cumple' | 'no_aplica'
  comment?: string
  correctiveAction?: string
}

// Lista de ítems del checklist
const checklistItems: Omit<ChecklistItem, 'status' | 'comment' | 'correctiveAction'>[] = [
  { id: 1, name: 'Air pressure' },
  { id: 2, name: 'Multihead hopper position' },
  { id: 3, name: 'Upper capachos state' },
  { id: 4, name: 'Intermediate capachos state' },
  { id: 5, name: 'Lower capachos state' },
  { id: 6, name: 'Elevator ignition' },
  { id: 7, name: 'Multihead atoche sensors' },
  { id: 8, name: 'Videojet power' },
  { id: 9, name: 'Videojet message or label (Box)' },
  { id: 10, name: '% of ink and disolvent (Box)' },
  { id: 11, name: 'Videojet message or label (Bag)' },
  { id: 12, name: '% of ink and disolvent (Bag)' },
  { id: 13, name: 'Equipment ignition' },
  { id: 14, name: 'Bag feed clamp' },
  { id: 15, name: 'Suction and singularization of bags' },
  { id: 16, name: 'Conveyor clamp' },
  { id: 17, name: 'Bag encoder' },
  { id: 18, name: 'Initial bag opening' },
  { id: 19, name: 'Air pulse' },
  { id: 20, name: 'Bag opening' },
  { id: 21, name: 'Bag filling' },
  { id: 22, name: 'Sealing bar 1' },
  { id: 23, name: 'Sealing bar 2' },
  { id: 24, name: 'Heater on (T°)' },
  { id: 25, name: 'Bag unloading' }
]

export default function ChecklistPackagingPage() {
  const router = useRouter()
  const { 
    formData, 
    setFormData, 
    lineManager, 
    setLineManager, 
    machineOperator, 
    setMachineOperator,
    checklistDate,
    setChecklistDate,
    selectedBrand,
    setSelectedBrand,
    selectedMaterial,
    setSelectedMaterial,
    selectedSku,
    setSelectedSku,
    ordenFabricacion,
    setOrdenFabricacion
  } = useChecklist()
  const [globalError, setGlobalError] = useState('')
  const [invalidItems, setInvalidItems] = useState<number[]>([])
  const [error, setError] = useState('')

  // Obtener marcas únicas del JSON
  const uniqueBrands = useMemo(() => {
    const brandSet = new Set(products.map(p => p.brand))
    return Array.from(brandSet).sort()
  }, [])

  // Obtener materiales filtrados por marca
  const filteredMaterials = useMemo(() => {
    if (!selectedBrand) return []
    return products
      .filter(p => p.brand === selectedBrand)
      .map(p => p.material)
      .sort()
  }, [selectedBrand])

  // Efecto para actualizar el SKU cuando cambia el material
  useEffect(() => {
    if (selectedBrand && selectedMaterial) {
      const product = products.find(
        p => p.brand === selectedBrand && p.material === selectedMaterial
      )
      if (product) {
        setSelectedSku(product.sku)
      } else {
        setSelectedSku('')
        setError('No se encontró un SKU válido para la combinación seleccionada')
      }
    }
  }, [selectedBrand, selectedMaterial, setSelectedSku])

  const handleStatusChange = (id: number, value: 'cumple' | 'no_cumple') => {
    setFormData(
      formData.map(item =>
        item.id === id ? { ...item, status: item.status === value ? 'no_aplica' : value } : item
      )
    )
    // Limpiar errores al cambiar un estado
    setInvalidItems(prev => prev.filter(itemId => itemId !== id))
    if (globalError) setGlobalError('')
  }

  const handleCommentChange = (id: number, value: string) => {
    setFormData(
      formData.map(item =>
        item.id === id ? { ...item, comment: value } : item
      )
    )
  }

  const handleCorrectiveActionChange = (id: number, value: string) => {
    setFormData(
      formData.map(item =>
        item.id === id ? { ...item, correctiveAction: value } : item
      )
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isFormValid()) {
      router.push('/area/produccion/checklist-packaging/fotos')
    }
  }

  // Manejar cambio de marca
  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const brand = e.target.value
    setSelectedBrand(brand)
    setSelectedMaterial('')
    setSelectedSku('')
    setError('')
  }

  // Manejar cambio de material
  const handleMaterialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const material = e.target.value
    setSelectedMaterial(material)
    setError('')
  }

  // Validar si los campos obligatorios están completos
  const isFormValid = () => {
    let errors: string[] = []
    
    // Validar campos básicos
    if (!lineManager.trim()) {
      errors.push('El campo Jefe de Línea es requerido')
    }
    
    if (!machineOperator.trim()) {
      errors.push('El campo Operador de Máquina es requerido')
    }

    if (!checklistDate) {
      errors.push('La fecha del checklist es requerida')
    }

    if (!ordenFabricacion.trim()) {
      errors.push('El campo Orden de Fabricación es requerido')
    }

    if (!selectedBrand) {
      errors.push('Debe seleccionar una marca')
    }

    if (!selectedMaterial) {
      errors.push('Debe seleccionar un material')
    }

    if (!selectedSku) {
      errors.push('No se encontró un SKU válido para la combinación seleccionada')
    }

    // Verificar que la combinación existe en el JSON
    if (selectedBrand && selectedMaterial && selectedSku) {
      const isValidCombination = products.some(
        p => p.brand === selectedBrand && 
            p.material === selectedMaterial && 
            p.sku === selectedSku
      )

      if (!isValidCombination) {
        errors.push('La combinación de marca y material seleccionada no es válida')
      }
    }
    
    // Verificar que todos los ítems tengan un estado definido
    const itemsWithoutStatus = formData.filter(item => !item.status || item.status === 'no_aplica')
    if (itemsWithoutStatus.length > 0) {
      errors.push(`Debes responder todos los ítems del checklist (faltan ${itemsWithoutStatus.length} ítems)`)
      setInvalidItems(itemsWithoutStatus.map(item => item.id))
    }

    // Verificar que los ítems marcados como "no_cumple" tengan acción correctiva
    const itemsWithoutCorrectiveAction = formData.filter(
      item => item.status === 'no_cumple' && (!item.correctiveAction || !item.correctiveAction.trim())
    )
    if (itemsWithoutCorrectiveAction.length > 0) {
      errors.push(`Debes completar la acción correctiva para ${itemsWithoutCorrectiveAction.length} ${
        itemsWithoutCorrectiveAction.length === 1 ? 'ítem que no cumple' : 'ítems que no cumplen'
      }`)
      // Agregar estos ítems a la lista de inválidos también
      setInvalidItems(prev => [...new Set([...prev, ...itemsWithoutCorrectiveAction.map(item => item.id)])])
    }

    if (errors.length > 0) {
      setError(errors.join('\n'))
      // Si hay ítems inválidos, hacer scroll al primero
      const firstInvalidItem = document.getElementById(`item-${invalidItems[0]}`)
      if (firstInvalidItem) {
        firstInvalidItem.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return false
    }

    setError('')
    setInvalidItems([])
    return true
  }

  const handleNext = () => {
    if (!isFormValid()) return
    router.push('/area/produccion/checklist-packaging/fotos')
  }

  const handleDateChange = (date: Date | null) => {
    setChecklistDate(date)
  }

  // Función para verificar si un ítem requiere acción correctiva
  const requiresCorrectiveAction = (item: ChecklistItem) => {
    return item.status === 'no_cumple'
  }

  // Función para verificar si un ítem tiene error de validación
  const hasValidationError = (item: ChecklistItem) => {
    return (
      invalidItems.includes(item.id) ||
      (requiresCorrectiveAction(item) && (!item.correctiveAction || !item.correctiveAction.trim()))
    )
  }

  const errors = {
    marca: '',
    material: '',
    sku: '',
    orden_fabricacion: '',
    jefe_linea: '',
    operador_maquina: '',
    items: ''
  }

  return (
    <div className="min-h-screen bg-background py-6 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/area/produccion"
            className="inline-flex items-center text-blue-400 hover:text-blue-500 transition-colors mb-4"
          >
            <span className="mr-2">←</span>
            <span>Volver</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-blue-400 mt-4">
            Checklist de Packaging – Producción
          </h1>
        </div>

        {/* Campos de personal y fecha */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Información del Registro
          </h2>
          
          {/* Primera fila: Jefe de Línea y Operador */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label 
                htmlFor="lineManager"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Jefe de Línea *
              </label>
              <input
                type="text"
                id="lineManager"
                value={lineManager}
                onChange={(e) => setLineManager(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md 
                  shadow-sm focus:ring-blue-500 focus:border-blue-500
                  placeholder-gray-400"
                placeholder="Ingrese el nombre del Jefe de Línea"
                required
              />
            </div>
            <div>
              <label 
                htmlFor="machineOperator"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Operador de Máquina *
              </label>
              <input
                type="text"
                id="machineOperator"
                value={machineOperator}
                onChange={(e) => setMachineOperator(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md 
                  shadow-sm focus:ring-blue-500 focus:border-blue-500
                  placeholder-gray-400"
                placeholder="Ingrese el nombre del Operador"
                required
              />
            </div>
          </div>

          {/* Segunda fila: Fecha y Orden de Fabricación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label 
                htmlFor="checklistDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Fecha del Checklist *
              </label>
              <ReactDatePicker
                id="checklistDate"
                selected={checklistDate}
                onChange={handleDateChange}
                dateFormat="dd / MMM / yyyy"
                locale="es"
                maxDate={new Date()}
                placeholderText="Seleccione una fecha"
                className="w-full px-3 py-2 border border-gray-300 rounded-md 
                  shadow-sm focus:ring-blue-500 focus:border-blue-500
                  placeholder-gray-400"
                required
              />
            </div>
            <div>
              <label 
                htmlFor="ordenFabricacion"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Orden de Fabricación *
              </label>
              <input
                type="text"
                id="ordenFabricacion"
                value={ordenFabricacion}
                onChange={(e) => setOrdenFabricacion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md 
                  shadow-sm focus:ring-blue-500 focus:border-blue-500
                  placeholder-gray-400"
                placeholder="Ingrese la orden de fabricación"
                required
              />
            </div>
          </div>

          {/* Tercera fila: Marca y Material */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label 
                htmlFor="brand"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Marca / Brand *
              </label>
              <select
                id="brand"
                value={selectedBrand}
                onChange={handleBrandChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md 
                  shadow-sm focus:ring-blue-500 focus:border-blue-500
                  text-gray-700 disabled:bg-gray-100"
                required
              >
                <option value="">Seleccione una marca</option>
                {uniqueBrands.map(brand => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label 
                htmlFor="material"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Producto / Material *
              </label>
              <select
                id="material"
                value={selectedMaterial}
                onChange={handleMaterialChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md 
                  shadow-sm focus:ring-blue-500 focus:border-blue-500
                  text-gray-700 disabled:bg-gray-100"
                required
                disabled={!selectedBrand}
              >
                <option value="">
                  {selectedBrand 
                    ? 'Seleccione un material'
                    : 'Primero seleccione una marca'
                  }
                </option>
                {filteredMaterials.map(material => (
                  <option key={material} value={material}>
                    {material}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cuarta fila: SKU */}
          <div>
            <label 
              htmlFor="sku"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              SKU (COD SAP) *
            </label>
            <input
              type="text"
              id="sku"
              value={selectedSku}
              className="w-full px-3 py-2 border border-gray-300 rounded-md 
                shadow-sm bg-gray-50 text-gray-700"
              readOnly
              placeholder="Se completará automáticamente al seleccionar marca y material"
            />
          </div>
        </div>

        {/* Mensaje de error global */}
        {globalError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600 text-sm font-medium">{globalError}</p>
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-500 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Grupos de 5 items */}
          {Array.from({ length: Math.ceil(formData.length / 5) }).map((_, groupIndex) => (
            <div
              key={groupIndex}
              className="bg-white rounded-lg shadow-md p-4 sm:p-6 space-y-6"
            >
              {formData.slice(groupIndex * 5, (groupIndex + 1) * 5).map((item) => (
                <div 
                  key={item.id} 
                  id={`item-${item.id}`}
                  className={`border-b border-gray-200 pb-6 last:border-0 last:pb-0 ${
                    invalidItems.includes(item.id) ? 'bg-red-50 rounded-md p-4 -mx-4' : ''
                  }`}
                >
                  {/* Contenedor principal del item */}
                  <div className="space-y-4">
                    {/* Título y selector */}
                    <div className="space-y-3">
                      {/* Nombre del ítem */}
                      <div className="bg-background rounded-md p-3">
                        <label className="block text-base font-medium text-gray-700">
                          {item.id}. {item.name}
                        </label>
                      </div>
                      
                      {/* Selector de estado */}
                      <div className="w-full max-w-md">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'cumple')}
                            aria-pressed={item.status === 'cumple'}
                            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all
                              ${item.status === 'cumple'
                                ? 'bg-blue-400 text-white shadow-md ring-2 ring-blue-300 ring-offset-2'
                                : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                              }`}
                          >
                            Cumple
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'no_cumple')}
                            aria-pressed={item.status === 'no_cumple'}
                            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all
                              ${item.status === 'no_cumple'
                                ? 'bg-red-400 text-white shadow-md ring-2 ring-red-300 ring-offset-2'
                                : 'bg-white text-gray-700 border border-gray-300 hover:border-red-400 hover:bg-red-50'
                              }`}
                          >
                            No cumple
                          </button>
                        </div>
                        {invalidItems.includes(item.id) && (
                          <p className="mt-2 text-sm text-red-500">
                            Por favor selecciona un estado para este ítem
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Campos de texto */}
                    <div className="pl-0 sm:pl-4 mt-4 space-y-4">
                      {/* Comentario */}
                      <div className="bg-background rounded-md p-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-600">
                            Comentario
                          </label>
                          <input
                            type="text"
                            value={item.comment}
                            onChange={(e) => handleCommentChange(item.id, e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm 
                              focus:border-blue-400 focus:ring-blue-400 text-sm
                              bg-white"
                            placeholder="Agregar comentario (opcional)"
                          />
                        </div>
                      </div>

                      {/* Acción correctiva */}
                      <div className="bg-background rounded-md p-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-600">
                            Acción correctiva inmediata
                            {requiresCorrectiveAction(item) && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </label>
                          <input
                            type="text"
                            value={item.correctiveAction || ''}
                            onChange={(e) => handleCorrectiveActionChange(item.id, e.target.value)}
                            className={`block w-full rounded-md shadow-sm 
                              focus:border-blue-400 focus:ring-blue-400 text-sm
                              bg-white ${
                                hasValidationError(item) && requiresCorrectiveAction(item)
                                ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                                : 'border-gray-300'
                              }`}
                            placeholder={
                              requiresCorrectiveAction(item)
                                ? "Ingrese la acción correctiva (requerido)"
                                : "Agregar acción correctiva (opcional)"
                            }
                          />
                          {hasValidationError(item) && requiresCorrectiveAction(item) && (
                            <p className="mt-1 text-sm text-red-500">
                              Este campo es requerido cuando el estado es "No cumple"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Mensaje de error global */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              {error.split('\n').map((line, index) => (
                <p key={index} className="text-red-600 text-sm font-medium">{line}</p>
              ))}
            </div>
          )}

          {/* Botón Siguiente */}
          <div className="flex justify-center sm:justify-end mt-8">
            <button
              type="submit"
              className="w-full sm:w-auto bg-blue-400 text-white px-6 py-3 rounded-md 
                hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 
                focus:ring-offset-2 transition-colors text-base font-medium shadow-md
                hover:shadow-lg"
            >
              Siguiente
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 