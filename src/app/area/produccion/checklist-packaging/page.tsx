'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useRouter } from 'next/navigation'
import { supabase, uploadPDF, saveChecklistRecord } from '@/lib/supabase'
import { ChecklistItem, ProductEntry, ProductsData } from '@/types/checklist'
import { PhotoUpload, ChecklistPhotos } from '@/context/ChecklistContext'
import PhotoUploadSection from '@/components/PhotoUploadSection'
import { ChecklistPDFLink } from '@/components/ChecklistPDFLink'
import Link from 'next/link'
import { useChecklistPersistence } from '@/lib/hooks/useChecklistPersistence'
import { DeleteDraftButton } from '@/components/DeleteDraftButton'

// Items del checklist
const initialChecklistItems: ChecklistItem[] = [
  { id: 1, nombre: 'Air pressure / Presión de aire', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' },
  { id: 2, nombre: 'Multihead hopper position / Posición del hopper de la multihead', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' },
  { id: 3, nombre: 'Upper capachos state / Estado de los capachos superiores', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' },
  { id: 4, nombre: 'Intermediate capachos state / Estado de los capachos intermedios', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' },
  { id: 5, nombre: 'Lower capachos state / Estado de los capachos inferiores', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' },
  { id: 6, nombre: 'Elevator ignition / Encendido del elevador', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' },
  { id: 7, nombre: 'Multihead atoche sensors / Sensores atoche de la multihead', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' },
  { id: 8, nombre: 'Videojet power / Encendido de Videojet', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' },
  { id: 9, nombre: 'Ignition of the equipment (packaging machine and Yamato) / Encendido de los equipos (envasadora y Yamato)', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' },
  { id: 10, nombre: 'Packaging bag feed clamp / Pinza alimentadora de bolsa', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' },
  { id: 11, nombre: 'Suction and singularization of bags / Succión y singularización de bolsas', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' },
  { id: 12, nombre: 'Conveyor clamp / Pinza de transporte', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' },
  { id: 13, nombre: 'Bag encoder / Encoder de bolsa', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' },
  { id: 14, nombre: 'Initial opening of the bag / Apertura inicial de la bolsa', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' },
  { id: 15, nombre: 'Air pulse / Pulso de aire', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' },
  { id: 16, nombre: 'Bag opening / Apertura de bolsa', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' },
  { id: 17, nombre: 'Bag filling / Llenado de bolsa', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' },
  { id: 18, nombre: 'Sealing bar 1 / Barra de sellado 1', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' },
  { id: 19, nombre: 'Sealing bar 2 / Barra de sellado 2', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' },
  { id: 20, nombre: 'Heater on (T° at production) / Calentador encendido (T° en producción)', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' },
  { id: 21, nombre: 'Bag unloading / Descarga de bolsa', estado: 'pendiente', status: undefined, comment: '', correctiveAction: '' }
]

// Definir los campos requeridos
const REQUIRED_FIELDS = [
  { id: 'lineManager', label: 'Jefe de Línea' },
  { id: 'machineOperator', label: 'Operador de Máquina' },
  { id: 'checklistDate', label: 'Fecha del Checklist' },
  { id: 'ordenFabricacion', label: 'Orden de Fabricación' },
  { id: 'brand', label: 'Marca' },
  { id: 'material', label: 'Material' }
]

export default function ChecklistPackagingPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()
  
  // Estados para la selección dependiente
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [selectedMaterial, setSelectedMaterial] = useState<string>('')
  const [selectedProduct, setSelectedProduct] = useState<ProductEntry | null>(null)
  
  // Estados para las listas de opciones
  const [brands, setBrands] = useState<string[]>([])
  const [materials, setMaterials] = useState<string[]>([])
  const [products, setProducts] = useState<ProductEntry[]>([])
  
  // Estados para el formulario
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [items, setItems] = useState<ChecklistItem[]>(initialChecklistItems)
  const [lineManager, setLineManager] = useState('')
  const [machineOperator, setMachineOperator] = useState('')
  const [checklistDate, setChecklistDate] = useState('')
  const [ordenFabricacion, setOrdenFabricacion] = useState('')
  const [photos, setPhotos] = useState<ChecklistPhotos>({
    photo1: { file: null, preview: null } as PhotoUpload,
    photo2: { file: null, preview: null } as PhotoUpload,
    photo3: { file: null, preview: null } as PhotoUpload
  })

  // Cargar productos al montar el componente
  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setIsLoading(true)
      setError('')

      console.log('Iniciando carga de productos desde Supabase...')
      
      const { data, error } = await supabase
        .from('productos')
        .select('brand, material, sku')

      // Log completo de la respuesta
      console.log('Respuesta de Supabase:', { data, error })

      if (error) {
        console.error('Error al cargar productos:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        setError(`Error al cargar productos: ${error.message}`)
        return
      }

      if (!data || data.length === 0) {
        console.log('No se encontraron productos en la base de datos')
        setError('No hay productos disponibles')
        setBrands([])
        setProducts([])
        return
      }

      // Log de los datos recibidos
      console.log('Productos recibidos de Supabase:', data)

      // Formatear productos según el formato requerido
      const formattedProducts: ProductEntry[] = data.map((item, index) => ({
        id: item.sku || `product-${index}`,
        sku: item.sku || '',
        nombre: item.material || '', // Usar material como nombre temporal
        brand: item.brand || '',
        material: item.material || '',
        estado: 'pendiente' as const
      }))

      // Log de los productos formateados
      console.log('Productos formateados:', formattedProducts)

      // Extraer y validar lista de marcas únicas
      const uniqueBrands = Array.from(new Set(
        formattedProducts
          .map(p => p.brand)
          .filter(brand => brand && brand.trim() !== '')
      )).sort((a, b) => a.localeCompare(b))

      console.log('Marcas únicas encontradas:', uniqueBrands)

      if (uniqueBrands.length === 0) {
        console.warn('No se encontraron marcas válidas en los productos')
        setError('No se encontraron marcas válidas')
        setBrands([])
        setProducts([])
        return
      }

      // Actualizar el estado solo si tenemos datos válidos
      setBrands(uniqueBrands)
      setProducts(formattedProducts)
      setError('')

      console.log('Estado actualizado exitosamente:', {
        totalProducts: formattedProducts.length,
        uniqueBrands: uniqueBrands.length,
        firstProduct: formattedProducts[0],
        firstBrand: uniqueBrands[0]
      })

    } catch (error) {
      console.error('Error inesperado al cargar productos:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setError(`Error al cargar los productos: ${errorMessage}`)
      setBrands([])
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }

  // Manejador para cuando se selecciona una marca
  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand)
    setSelectedMaterial('')
    setSelectedProduct(null)
    
    // Filtrar materiales disponibles para esta marca
    const materialsForBrand = Array.from(
      new Set(
        products
          .filter(p => p.brand === brand)
          .map(p => p.material)
      )
    )
    setMaterials(materialsForBrand)
  }

  // Manejador para cuando se selecciona un material
  const handleMaterialChange = (material: string) => {
    setSelectedMaterial(material)
    setSelectedProduct(null)
    
    // Encontrar el primer producto que coincida con la marca y material
    const matchingProduct = products.find(
      p => p.brand === selectedBrand && p.material === material
    )
    
    if (matchingProduct) {
      setSelectedProduct(matchingProduct)
    }
  }

  const handleItemStatusChange = (itemId: number, status: 'cumple' | 'no_cumple' | 'no_aplica') => {
    setItems(items.map(item =>
      item.id === itemId ? { ...item, status } : item
    ))
  }

  const handleItemCommentChange = (itemId: number, comment: string) => {
    setItems(items.map(item =>
      item.id === itemId ? { ...item, comment } : item
    ))
  }

  const handleItemCorrectiveActionChange = (itemId: number, correctiveAction: string) => {
    setItems(items.map(item =>
      item.id === itemId ? { ...item, correctiveAction } : item
    ))
  }

  const validateForm = () => {
    let firstInvalidField = null

    // Limpiar clases de error previas
    REQUIRED_FIELDS.forEach(({ id }) => {
      const field = document.getElementById(id)
      if (field) {
        field.classList.remove('missing-field')
      }
    })

    // Validar campos del formulario
    const formFields = {
      lineManager,
      machineOperator,
      checklistDate,
      ordenFabricacion,
      brand: selectedBrand,
      material: selectedMaterial
    }

    for (const [fieldId, value] of Object.entries(formFields)) {
      if (!value) {
        const field = document.getElementById(fieldId)
        if (field) {
          field.classList.add('missing-field')
          if (!firstInvalidField) {
            firstInvalidField = field
          }
        }
      }
    }

    if (firstInvalidField) {
      firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' })
      showToast('Por favor complete todos los campos obligatorios', 'error')
      return false
    }

    // Validar que todos los items tengan un status seleccionado
    const incompleteItems = items.filter(item => !item.status)
    if (incompleteItems.length > 0) {
      const firstIncompleteItem = document.getElementById(`item-${incompleteItems[0].id}`)
      if (firstIncompleteItem) {
        firstIncompleteItem.scrollIntoView({ behavior: 'smooth', block: 'center' })
        firstIncompleteItem.classList.add('missing-field')
      }
      showToast('Por favor seleccione "Cumple" o "No cumple" para todos los items', 'error')
      return false
    }

    // Validar que los items "No cumple" tengan comentario y acción correctiva
    const invalidItems = items.filter(
      item => item.status === 'no_cumple' && (!item.comment || !item.correctiveAction)
    )
    if (invalidItems.length > 0) {
      const firstInvalidItem = document.getElementById(`item-${invalidItems[0].id}`)
      if (firstInvalidItem) {
        firstInvalidItem.scrollIntoView({ behavior: 'smooth', block: 'center' })
        firstInvalidItem.classList.add('missing-field')
      }
      showToast('Los items marcados como "No cumple" deben tener comentario y acción correctiva', 'error')
      return false
    }

    return true
  }

  // Limpiar clase de error al cambiar valor
  const handleFieldChange = (fieldId: string, value: string, setter: (value: string) => void) => {
    const field = document.getElementById(fieldId)
    if (field) {
      field.classList.remove('missing-field')
    }
    setter(value)
  }

  const [isSubmitted, setIsSubmitted] = useState(false)

  // Reset form function
  const resetForm = () => {
    setLineManager('')
    setMachineOperator('')
    setChecklistDate('')
    setOrdenFabricacion('')
    setSelectedBrand('')
    setSelectedMaterial('')
    setSelectedProduct(null)
    setItems(initialChecklistItems.map(item => ({
      ...item,
      estado: 'pendiente' as const,
      status: undefined,
      comment: '',
      correctiveAction: ''
    })))
    setPhotos({
      photo1: { file: null, preview: null } as PhotoUpload,
      photo2: { file: null, preview: null } as PhotoUpload,
      photo3: { file: null, preview: null } as PhotoUpload
    })
  }

  // Persistence hook
  const { clearDraft } = useChecklistPersistence(
    'checklist-packaging-draft',
    {
      lineManager,
      machineOperator,
      checklistDate,
      ordenFabricacion,
      selectedBrand,
      selectedMaterial,
      selectedSku: selectedProduct?.sku || '',
      items
    },
    isSubmitted,
    (data) => {
      if (data.lineManager) setLineManager(data.lineManager)
      if (data.machineOperator) setMachineOperator(data.machineOperator)
      if (data.checklistDate) setChecklistDate(data.checklistDate)
      if (data.ordenFabricacion) setOrdenFabricacion(data.ordenFabricacion)
      if (data.selectedBrand) setSelectedBrand(data.selectedBrand)
      if (data.selectedMaterial) setSelectedMaterial(data.selectedMaterial)
      if (data.items && Array.isArray(data.items)) setItems(data.items)
    }
  )

  const handleNext = () => {
    if (!validateForm()) return
    
    // Navegar a la página de fotos
    router.push('/area/produccion/checklist-packaging/fotos');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            {/* Botón Volver y Delete */}
            <div className="flex justify-between items-start mb-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver
              </Link>
              <DeleteDraftButton 
                storageKey="checklist-packaging-draft"
                checklistName="Checklist de Packaging"
                onReset={resetForm}
              />
            </div>

            {/* Título y subtítulo */}
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Checklist packing machine / Checklist envasadora
            </h1>
            <p className="text-sm text-gray-500 mb-6">CD/PC-PG-PRO-001-RG001</p>
            
            {/* Formulario de registro */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lineManager" className="block text-sm font-medium text-gray-700">
                    Jefe de Línea *
                  </label>
                  <input
                    type="text"
                    id="lineManager"
                    value={lineManager}
                    onChange={(e) => handleFieldChange('lineManager', e.target.value, setLineManager)}
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="machineOperator" className="block text-sm font-medium text-gray-700">
                    Operador de Máquina *
                  </label>
                  <input
                    type="text"
                    id="machineOperator"
                    value={machineOperator}
                    onChange={(e) => handleFieldChange('machineOperator', e.target.value, setMachineOperator)}
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checklistDate" className="block text-sm font-medium text-gray-700">
                    Fecha del Checklist *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      id="checklistDate"
                      value={checklistDate ?? ''}
                      onChange={(e) => handleFieldChange('checklistDate', e.target.value, setChecklistDate)}
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="ordenFabricacion" className="block text-sm font-medium text-gray-700">
                    Orden de Fabricación *
                  </label>
                  <input
                    type="text"
                    id="ordenFabricacion"
                    value={ordenFabricacion}
                    onChange={(e) => handleFieldChange('ordenFabricacion', e.target.value, setOrdenFabricacion)}
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Selector de Marca y Material */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
                    Marca *
                  </label>
                  <select
                    id="brand"
                    value={selectedBrand}
                    onChange={(e) => {
                      handleFieldChange('brand', e.target.value, () => handleBrandChange(e.target.value))
                    }}
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Seleccione una marca</option>
                    {brands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="material" className="block text-sm font-medium text-gray-700">
                    Material *
                  </label>
                  <select
                    id="material"
                    value={selectedMaterial}
                    onChange={(e) => {
                      handleFieldChange('material', e.target.value, () => handleMaterialChange(e.target.value))
                    }}
                    required
                    disabled={!selectedBrand}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Seleccione un material</option>
                    {materials.map((material) => (
                      <option key={material} value={material}>
                        {material}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedProduct && (
                <div>
                  <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
                    SKU (Código SAP)
                  </label>
                  <input
                    type="text"
                    id="sku"
                    value={selectedProduct.sku}
                    readOnly
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm"
                  />
                </div>
              )}
            </div>

            {/* Checklist Items */}
            <div className="space-y-4 mb-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  id={`item-${item.id}`}
                  className="bg-gray-50 rounded-xl p-4 shadow-sm border border-gray-200"
                >
                  <p className="text-sm font-semibold text-gray-800 mb-3">
                    {item.id}. {item.nombre}
                  </p>

                  <div className="flex items-center space-x-4 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        handleItemStatusChange(item.id, 'cumple')
                        const itemElement = document.getElementById(`item-${item.id}`)
                        if (itemElement) {
                          itemElement.classList.remove('missing-field')
                        }
                      }}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        item.status === 'cumple'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Cumple
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleItemStatusChange(item.id, 'no_cumple')
                        const itemElement = document.getElementById(`item-${item.id}`)
                        if (itemElement) {
                          itemElement.classList.remove('missing-field')
                        }
                      }}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        item.status === 'no_cumple'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      No cumple
                    </button>
                  </div>

                  {item.status === 'no_cumple' && (
                    <>
                      <div className="mb-2">
                        <textarea
                          required
                          value={item.comment || ''}
                          onChange={(e) => {
                            handleItemCommentChange(item.id, e.target.value)
                            const itemElement = document.getElementById(`item-${item.id}`)
                            if (itemElement) {
                              itemElement.classList.remove('missing-field')
                            }
                          }}
                          placeholder="Comentario"
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          rows={2}
                        />
                      </div>
                      <div>
                        <textarea
                          required
                          value={item.correctiveAction || ''}
                          onChange={(e) => {
                            handleItemCorrectiveActionChange(item.id, e.target.value)
                            const itemElement = document.getElementById(`item-${item.id}`)
                            if (itemElement) {
                              itemElement.classList.remove('missing-field')
                            }
                          }}
                          placeholder="Acción correctiva inmediata"
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          rows={2}
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Botón Siguiente */}
            <div className="flex justify-end">
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .missing-field {
          border: 2px solid #f66 !important;
          background-color: #ffe5e5 !important;
          transition: background-color 0.3s, border 0.3s;
        }
      `}</style>
    </div>
  )
} 