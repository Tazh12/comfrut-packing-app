'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  addDays,
  setYear,
  getYear,
  startOfYear,
  endOfYear,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isSameMonth,
  isWithinInterval
} from 'date-fns'
import { es } from 'date-fns/locale'
import ReactDatePicker, { registerLocale } from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import Link from 'next/link'
import * as ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { useToast } from '@/context/ToastContext'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useChecklist } from '@/context/ChecklistContext'
import { initialChecklistItems } from '@/lib/checklist'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

// Registrar el locale español
registerLocale('es', es)

interface ChecklistItem {
  id: number
  nombre: string
}

interface ChecklistRecord {
  id: string
  fecha: string
  marca: string
  material: string
  sku: string
  jefe_linea: string
  operador_maquina: string
  orden_fabricacion: string
  pdf_url: string
  items: Array<{
    id: number
    nombre: string
    estado: 'cumple' | 'no_cumple'
  }>
}

interface Filters {
  startDate: Date | null
  endDate: Date | null
  marca: string
  material: string
  orden_fabricacion: string
}

// Interfaces para los selectores de semana y mes
interface WeekOption {
  label: string
  startDate: Date
  endDate: Date
}

interface MonthOption {
  label: string
  startDate: Date
  endDate: Date
}

// Definir las áreas y sus checklists correspondientes
const areasYChecklists = {
  'Producción': ['Checklist Packing', 'Checklist Envasado'],
  'Calidad': ['Checklist Auditoría', 'Checklist Sensorial'],
  'Logística': ['Checklist Recepción'],
  'Administración': ['Checklist Turno']
} as const

type Area = keyof typeof areasYChecklists

export default function HistorialPage() {
  const [registros, setRegistros] = useState<ChecklistRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [selectedArea, setSelectedArea] = useState<Area>('Producción')
  const [availableChecklists, setAvailableChecklists] = useState<string[]>(['Checklist Packing', 'Checklist Envasado'])
  const [exportStatus, setExportStatus] = useState<{
    show: boolean
    type: 'success' | 'error'
    message: string
  }>({ show: false, type: 'success', message: '' })
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedWeek, setSelectedWeek] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [filters, setFilters] = useState<Filters>({
    startDate: null,
    endDate: null,
    marca: '',
    material: '',
    orden_fabricacion: ''
  })
  const [marcas, setMarcas] = useState<string[]>([])
  const [materiales, setMateriales] = useState<string[]>([])

  const { showToast } = useToast()

  // Manejar cambio de área
  const handleAreaChange = (area: Area) => {
    setSelectedArea(area)
    setAvailableChecklists([...areasYChecklists[area]])
  }

  // Función para formatear la fecha
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-')
    const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    const monthIndex = parseInt(month, 10) - 1
    return `${day}-${monthNames[monthIndex]}-${year}`
  }

  // Función para generar el nombre del archivo
  const generateFileName = (extension: string) => {
    const now = new Date()
    const timestamp = format(now, 'yyyyMMdd_HHmmss')
    return `checklist_packing_${timestamp}.${extension}`
  }

  // Función para generar años disponibles
  const generateYearOptions = (): number[] => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => currentYear - i).sort((a, b) => b - a)
  }

  // Función para generar opciones de semanas
  const generateWeekOptions = (): WeekOption[] => {
    const yearStart = startOfYear(setYear(new Date(), selectedYear))
    const yearEnd = endOfYear(yearStart)
    
    let weeks = eachWeekOfInterval(
      { start: yearStart, end: yearEnd },
      { locale: es }
    ).map((weekStart, index) => {
      const weekEnd = endOfWeek(weekStart, { locale: es })
      return {
        label: `Semana ${format(weekStart, 'w')} (${format(weekStart, 'd MMM', { locale: es })} al ${format(weekEnd, 'd MMM', { locale: es })})`,
        startDate: weekStart,
        endDate: weekEnd
      }
    })

    // Filtrar semanas por mes si hay un mes seleccionado
    if (selectedMonth) {
      const monthOption = generateMonthOptions().find(m => m.label === selectedMonth)
      if (monthOption) {
        weeks = weeks.filter(week => 
          isSameMonth(week.startDate, monthOption.startDate) || 
          isSameMonth(week.endDate, monthOption.startDate)
        )
      }
    }

    return weeks
  }

  // Función para generar opciones de meses
  const generateMonthOptions = (): MonthOption[] => {
    const yearStart = startOfYear(setYear(new Date(), selectedYear))
    const yearEnd = endOfYear(yearStart)
    
    return eachMonthOfInterval(
      { start: yearStart, end: yearEnd }
    ).map(monthStart => ({
      label: format(monthStart, 'MMMM yyyy', { locale: es }),
      startDate: startOfMonth(monthStart),
      endDate: endOfMonth(monthStart)
    }))
  }

  // Manejar cambio de año
  const handleYearChange = (year: number) => {
    setSelectedYear(year)
    setSelectedWeek('')
    setSelectedMonth('')
    setFilters(prev => ({
      ...prev,
      startDate: null,
      endDate: null
    }))
  }

  // Manejar cambio de semana
  const handleWeekChange = (weekLabel: string) => {
    setSelectedWeek(weekLabel)
    
    if (weekLabel) {
      const selectedWeekOption = generateWeekOptions().find(w => w.label === weekLabel)
      if (selectedWeekOption) {
        setFilters(prev => ({
          ...prev,
          startDate: selectedWeekOption.startDate,
          endDate: selectedWeekOption.endDate
        }))
      }
    }
  }

  // Manejar cambio de mes
  const handleMonthChange = (monthLabel: string) => {
    setSelectedWeek('') // Limpiar selección de semana
    setSelectedMonth(monthLabel)
    
    if (monthLabel) {
      const selectedMonthOption = generateMonthOptions().find(m => m.label === monthLabel)
      if (selectedMonthOption) {
        setFilters(prev => ({
          ...prev,
          startDate: selectedMonthOption.startDate,
          endDate: selectedMonthOption.endDate
        }))
      }
    }
  }

  // Modificar la función de limpiar filtros
  const handleClearFilters = () => {
    setSelectedYear(new Date().getFullYear())
    setSelectedWeek('')
    setSelectedMonth('')
    setFilters({
      startDate: null,
      endDate: null,
      marca: '',
      material: '',
      orden_fabricacion: ''
    })
  }

  // Función para exportar a Excel
  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Registros')

      // Configurar encabezados principales
      const mainColumns = [
        { header: 'Fecha', key: 'fecha', width: 15 },
        { header: 'Orden de Fabricación', key: 'orden_fabricacion', width: 20 },
        { header: 'Marca', key: 'marca', width: 20 },
        { header: 'Producto', key: 'material', width: 20 },
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Jefe de Línea', key: 'jefe_linea', width: 20 },
        { header: 'Operador', key: 'operador_maquina', width: 20 },
        { header: 'PDF', key: 'pdf_url', width: 50 }
      ]

      // Configurar encabezados de los ítems del checklist
      const itemColumns = initialChecklistItems.map(item => ({
        header: `${item.id}. ${item.nombre}`,
        key: `item_${item.id}`,
        width: 15
      }))

      // Combinar columnas principales y de ítems
      worksheet.columns = [...mainColumns, ...itemColumns].map(col => ({
        ...col,
        style: { alignment: { horizontal: 'left' } }
      }))

      // Agregar datos
      registros.forEach(registro => {
        const itemsMap = new Map(registro.items.map(item => [item.id, item.estado]))
        
        const rowData: Record<string, string> = {
          fecha: formatDate(registro.fecha),
          orden_fabricacion: registro.orden_fabricacion,
          marca: registro.marca,
          material: registro.material,
          sku: registro.sku,
          jefe_linea: registro.jefe_linea,
          operador_maquina: registro.operador_maquina,
          pdf_url: registro.pdf_url,
          ...Object.fromEntries(
            initialChecklistItems.map(item => [
              `item_${item.id}`,
              itemsMap.get(item.id) === 'cumple' ? 'Cumple' : 'No cumple'
            ])
          )
        }

        worksheet.addRow(rowData)
      })

      // Estilo para encabezados
      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      }

      // Alinear columnas de ítems al centro
      itemColumns.forEach(col => {
        if (col.key) {
          const column = worksheet.getColumn(col.key)
          column.alignment = { horizontal: 'center' }
        }
      })

      // Generar archivo
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = generateFileName('xlsx')
      a.click()
      window.URL.revokeObjectURL(url)

      setShowExportModal(false)
      showNotification('success', 'Archivo Excel exportado exitosamente')
    } catch (error) {
      console.error('Error al exportar a Excel:', error)
      showNotification('error', 'Error al exportar a Excel')
    }
  }

  // Función para exportar a CSV
  const exportToCSV = () => {
    try {
      // Encabezados principales
      const mainHeaders = [
        'Fecha',
        'Orden de Fabricación',
        'Marca',
        'Producto',
        'SKU',
        'Jefe de Línea',
        'Operador',
        'PDF'
      ]
      
      // Encabezados de los ítems
      const itemHeaders = initialChecklistItems.map(item => `${item.id}. ${item.nombre}`)
      
      // Combinar todos los encabezados
      const headers = [...mainHeaders, ...itemHeaders]

      const csvContent = [
        headers.join(','),
        ...registros.map(registro => {
          const itemsMap = new Map(registro.items.map(item => [item.id, item.estado]))
          
          const mainFields = [
            formatDate(registro.fecha),
            registro.orden_fabricacion,
            registro.marca,
            registro.material,
            registro.sku,
            registro.jefe_linea,
            registro.operador_maquina,
            registro.pdf_url
          ]

          const itemFields = initialChecklistItems.map(item => 
            itemsMap.get(item.id) === 'cumple' ? 'Cumple' : 'No cumple'
          )

          return [...mainFields, ...itemFields].map(field => `"${field}"`).join(',')
        })
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = generateFileName('csv')
      a.click()
      window.URL.revokeObjectURL(url)

      setShowExportModal(false)
      showNotification('success', 'Archivo CSV exportado exitosamente')
    } catch (error) {
      console.error('Error al exportar a CSV:', error)
      showNotification('error', 'Error al exportar a CSV')
    }
  }

  // Función para mostrar notificaciones
  const showNotification = (type: 'success' | 'error', message: string) => {
    setExportStatus({ show: true, type, message })
    setTimeout(() => {
      setExportStatus(prev => ({ ...prev, show: false }))
    }, 3000)
  }

  // Función para cargar los registros
  const loadRegistros = async () => {
    try {
      console.log('startDate:', filters.startDate, 'typeof:', typeof filters.startDate)
      console.log('endDate:', filters.endDate, 'typeof:', typeof filters.endDate)
      setLoading(true)

      let query = supabase
        .from('checklist_packing')
        .select('*')
        .order('fecha', { ascending: false })

      if (filters.startDate) {
        const startDateObj = new Date(filters.startDate)
        startDateObj.setHours(0, 0, 0, 0)
        const start = startDateObj.toISOString()
        query = query.gte('fecha', start)

        // Si solo hay fecha inicial, buscar registros de ese día completo
        if (!filters.endDate) {
          const endOfDay = new Date(startDateObj)
          endOfDay.setHours(23, 59, 59, 999)
          query = query.lt('fecha', endOfDay.toISOString())
        }
      }
      if (filters.endDate) {
        const endDateObj = new Date(filters.endDate)
        endDateObj.setHours(23, 59, 59, 999)
        query = query.lt('fecha', endDateObj.toISOString())
      }

      if (filters.marca) {
        query = query.eq('marca', filters.marca)
      }
      if (filters.material) {
        query = query.eq('material', filters.material)
      }
      if (filters.orden_fabricacion) {
        query = query.ilike('orden_fabricacion', `%${filters.orden_fabricacion}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error detallado de Supabase:', JSON.stringify(error, null, 2))
        throw error
      }

      console.log("Resultado del query:", data)
      setRegistros(data || [])
      
      // Cargar marcas y materiales únicos para los dropdowns
      const uniqueMarcas = [...new Set(data?.map(r => r.marca) || [])]
      const uniqueMateriales = [...new Set(data?.map(r => r.material) || [])]
      setMarcas(uniqueMarcas.sort())
      setMateriales(uniqueMateriales.sort())

    } catch (error) {
      console.error('Error detallado al cargar registros:', JSON.stringify(error, null, 2))
      setError('Error al cargar los registros. Revisa la consola para más detalles.')
    } finally {
      setLoading(false)
    }
  }

  // Función para manejar la búsqueda
  const handleBuscarClick = () => {
    loadRegistros()
  }

  // Agregar la función downloadPDFs después de la función generateFileName
  const downloadPDFs = async (registros: ChecklistRecord[]) => {
    try {
      const registrosConPDF = registros.filter(registro => registro.pdf_url)
      
      if (registrosConPDF.length === 0) {
        alert('No hay archivos PDF disponibles para descargar')
        return
      }

      const zip = new JSZip()
      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss')
      const usedNames = new Set<string>()
      
      try {
        // Intentar descargar y comprimir los PDFs
        const pdfPromises = registrosConPDF.map(async (registro) => {
          try {
            const response = await fetch(registro.pdf_url)
            if (!response.ok) throw new Error(`Error al descargar PDF: ${response.statusText}`)
            const blob = await response.blob()
            const baseFileName = `checklist_${format(new Date(`${registro.fecha}T00:00:00`), 'yyyyMMdd')}_${registro.marca}_${registro.material}`
            const safeFileName = sanitizeFileName(`${baseFileName}.pdf`)
            zip.file(safeFileName, blob)
            return true
          } catch (error) {
            console.error(`Error al descargar PDF de ${registro.pdf_url}:`, error)
            return false
          }
        })

        const results = await Promise.all(pdfPromises)
        const successCount = results.filter(Boolean).length

        if (successCount === 0) {
          throw new Error('No se pudo descargar ningún PDF')
        }

        const zipBlob = await zip.generateAsync({ type: "blob" })
        const zipUrl = URL.createObjectURL(zipBlob)
        const a = document.createElement('a')
        a.href = zipUrl
        a.download = `checklists_pdfs_${timestamp}.zip`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(zipUrl)

        if (successCount < registrosConPDF.length) {
          alert(`Se descargaron ${successCount} de ${registrosConPDF.length} PDFs`)
        }
      } catch (error) {
        console.error('Error al crear ZIP, intentando descarga individual:', error)
        
        // Si falla la compresión, descargar uno por uno
        const usedNamesIndividual = new Set<string>()
        
        for (const registro of registrosConPDF) {
          try {
            // Formatear fecha directamente desde registro.fecha
            const [year, month, day] = registro.fecha.split('-')
            const formattedDate = `${year}${month}${day}`
            
            // Generar nombre base del archivo
            const baseFileName = `checklist_${formattedDate}_${registro.marca}_${registro.material}`
            
            // Manejar nombres duplicados
            let fileName = `${baseFileName}.pdf`
            let counter = 1
            
            while (usedNamesIndividual.has(fileName)) {
              fileName = `${baseFileName} (${counter}).pdf`
              counter++
            }
            
            usedNamesIndividual.add(fileName)
            
            const a = document.createElement('a')
            a.href = registro.pdf_url
            a.download = fileName
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            await new Promise(resolve => setTimeout(resolve, 1000)) // Esperar 1 segundo entre descargas
          } catch (error) {
            console.error(`Error al descargar PDF individual:`, error)
          }
        }
      }
    } catch (error) {
      console.error('Error en la descarga de PDFs:', error)
      alert('Error al descargar los PDFs. Por favor, inténtelo de nuevo.')
    }
  }

  const handleViewPDF = (pdfUrl: string) => {
    if (!pdfUrl) {
      showToast('No hay PDF disponible', 'error')
      return
    }
    window.open(pdfUrl, '_blank', 'noopener,noreferrer')
  }

  const sanitizeFileName = (fileName: string) => {
    return fileName.replace(/[\/\\:*?"<>|\s]/g, '_')
  }

  const handleDownloadPDF = async (pdfUrl: string, registro: ChecklistRecord) => {
    if (!pdfUrl) {
      showToast('No hay PDF disponible', 'error')
      return
    }

    try {
      const response = await fetch(pdfUrl)
      if (!response.ok) throw new Error('Error al descargar el PDF')
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const fileName = sanitizeFileName(`checklist_${format(new Date(`${registro.fecha}T00:00:00`), 'yyyyMMdd')}_${registro.marca}_${registro.material}.pdf`)
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al descargar el PDF:', error)
      showToast('Error al descargar el PDF', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-blue-400 hover:text-blue-500 transition-colors mb-4"
          >
            <span className="mr-2">←</span>
            <span>Volver al Dashboard</span>
          </Link>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Historial de Registros
            </h1>
            <div className="flex gap-2 flex-col sm:flex-row">
              {/* Botón de exportar */}
              <button
                onClick={() => setShowExportModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-400 text-white rounded-md
                  hover:bg-blue-500 transition-colors text-sm font-medium shadow-sm
                  hover:shadow-md focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar registros
              </button>

              {/* Nuevo botón para descargar PDFs */}
              <button
                onClick={() => downloadPDFs(registros)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md
                  hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm
                  hover:shadow-md focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar PDF
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Consulta y exporta los registros históricos de los checklists
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Selector de Área */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Área
              </label>
              <select
                value={selectedArea}
                onChange={(e) => handleAreaChange(e.target.value as Area)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md 
                  shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.keys(areasYChecklists).map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Tipo de Checklist */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Checklist
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md 
                  shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {availableChecklists.map((checklist) => (
                  <option key={checklist} value={checklist}>
                    {checklist}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de año */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Año
              </label>
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md 
                  shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {generateYearOptions().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de mes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mes
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md 
                  shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar mes</option>
                {generateMonthOptions().map((month) => (
                  <option key={month.label} value={month.label}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de semana */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Semana
              </label>
              <select
                value={selectedWeek}
                onChange={(e) => handleWeekChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md 
                  shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar semana</option>
                {generateWeekOptions().map((week) => (
                  <option key={week.label} value={week.label}>
                    {week.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Rango de fechas manual */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Fechas específicas
              </label>
              <div className="flex gap-2">
                <ReactDatePicker
                  selected={filters.startDate}
                  onChange={(date: Date | null) => {
                    if (date) {
                      setSelectedWeek('')
                      setSelectedMonth('')
                    }
                    setFilters(prev => ({ ...prev, startDate: date }))
                  }}
                  selectsStart
                  startDate={filters.startDate}
                  endDate={filters.endDate}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Fecha inicial"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  disabled={!!(selectedWeek || selectedMonth)}
                />
                <ReactDatePicker
                  selected={filters.endDate}
                  onChange={(date: Date | null) => {
                    if (date) {
                      setSelectedWeek('')
                      setSelectedMonth('')
                    }
                    setFilters(prev => ({ ...prev, endDate: date }))
                  }}
                  selectsEnd
                  startDate={filters.startDate}
                  endDate={filters.endDate}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Fecha final"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  disabled={!!(selectedWeek || selectedMonth)}
                />
              </div>
            </div>

            {/* Selector de Marca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marca
              </label>
              <select
                value={filters.marca}
                onChange={(e) => setFilters({ ...filters, marca: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md 
                  shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas las marcas</option>
                {marcas.map(marca => (
                  <option key={marca} value={marca}>{marca}</option>
                ))}
              </select>
            </div>

            {/* Selector de Producto/Material */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Producto
              </label>
              <select
                value={filters.material}
                onChange={(e) => setFilters({ ...filters, material: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md 
                  shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos los productos</option>
                {materiales.map(material => (
                  <option key={material} value={material}>{material}</option>
                ))}
              </select>
            </div>

            {/* Filtro de Orden de Fabricación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Orden de Fabricación
              </label>
              <input
                type="text"
                value={filters.orden_fabricacion}
                onChange={(e) => setFilters({ ...filters, orden_fabricacion: e.target.value })}
                placeholder="Buscar por orden..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md 
                  shadow-sm focus:ring-blue-500 focus:border-blue-500
                  placeholder-gray-400"
              />
            </div>

            {/* Botones de acción */}
            <div className="flex items-end gap-2">
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md 
                  hover:bg-gray-200 transition-colors"
              >
                Limpiar filtros
              </button>
              
              <button
                onClick={handleBuscarClick}
                className="px-4 py-2 bg-blue-500 text-white rounded-md 
                  hover:bg-blue-600 transition-colors font-medium flex-1"
              >
                Buscar registros
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de registros */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Cargando registros...</span>
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : registros.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No se encontraron registros
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orden de Fabricación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Marca
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones PDF
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {registros.map((registro) => (
                    <tr key={registro.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(registro.fecha)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {registro.orden_fabricacion}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {registro.marca}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {registro.material}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {registro.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <div className="flex justify-end gap-2">
                          {registro.pdf_url ? (
                            <>
                              <button
                                onClick={() => handleViewPDF(registro.pdf_url)}
                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded
                                  text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                                  transition-colors"
                                aria-label="Ver PDF en nueva pestaña"
                                title="Ver PDF"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span>Ver</span>
                              </button>
                              <button
                                onClick={() => handleDownloadPDF(registro.pdf_url, registro)}
                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded
                                  text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                                  transition-colors"
                                aria-label="Descargar PDF"
                                title="Descargar PDF"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span>Descargar</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-gray-400 text-xs italic" title="No hay PDF disponible">
                              Sin PDF
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de exportación */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Exportar registros
              </h3>
              <div className="space-y-4">
                <button
                  onClick={exportToExcel}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-md
                    hover:bg-green-600 transition-colors text-sm font-medium"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar como Excel (.xlsx)
                </button>
                <button
                  onClick={exportToCSV}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md
                    hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar como CSV (.csv)
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md
                    hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notificación de estado */}
        {exportStatus.show && (
          <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-md shadow-lg z-50 flex items-center
            ${exportStatus.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}
          >
            {exportStatus.type === 'success' ? (
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {exportStatus.message}
          </div>
        )}
      </div>
    </div>
  )
} 