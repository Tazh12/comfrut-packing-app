'use client'

import React, { useState, useEffect } from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  Image,
  Font,
  pdf,
  PDFViewer
} from '@react-pdf/renderer'
import { ChecklistItem, PhotoUpload } from '@/context/ChecklistContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Registrar fuentes
Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf' },
    { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' }
  ]
})

// Estilos
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Roboto',
    backgroundColor: '#ffffff'
  },
  header: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 20
  },
  logo: {
    width: 120,
    marginRight: 40
  },
  documentInfo: {
    position: 'absolute',
    top: 10,
    right: 30,
    fontSize: 8,
    color: '#6B7280'
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#005F9E'
  },
  subtitle: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 20,
    color: '#4B5563'
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 4
  },
  infoGroup: {
    marginBottom: 8,
    minWidth: '45%'
  },
  infoLabel: {
    fontWeight: 'bold',
    marginRight: 5,
    color: '#374151'
  },
  infoValue: {
    color: '#111827'
  },
  table: {
    width: '100%',
    marginBottom: 20,
    fontSize: 7
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#005F9E',
    padding: 6,
    fontSize: 7,
    color: '#ffffff',
    fontWeight: 'bold',
    alignItems: 'center'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 28,
    padding: 4,
    alignItems: 'center'
  },
  tableRowEven: {
    backgroundColor: '#F9FAFB'
  },
  colNum: {
    width: '6%',
    paddingHorizontal: 2,
    textAlign: 'center'
  },
  colItem: {
    width: '34%',
    paddingHorizontal: 4
  },
  colStatus: {
    width: '15%',
    paddingHorizontal: 2,
    textAlign: 'center'
  },
  colComment: {
    width: '22%',
    paddingHorizontal: 4
  },
  colAction: {
    width: '23%',
    paddingHorizontal: 4
  },
  statusText: {
    textAlign: 'center',
    color: '#111827',
    fontSize: 7
  },
  statusCumple: {
    color: '#059669' // Verde
  },
  statusNoCumple: {
    color: '#DC2626' // Rojo
  },
  photosPage: {
    padding: 30,
    backgroundColor: '#ffffff'
  },
  photoSection: {
    marginBottom: 25
  },
  photoHeader: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    marginBottom: 10,
    borderRadius: 4
  },
  photoTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#005F9E',
    marginBottom: 4
  },
  photoSubtitle: {
    fontSize: 9,
    color: '#6B7280'
  },
  photoFrame: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#E5E7EB',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#ffffff'
  },
  photo: {
    width: '100%',
    height: 180,
    objectFit: 'contain'
  },
  photoCaption: {
    fontSize: 9,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10
  }
})

const formatDate = (date: Date | null | undefined): string => {
  if (!date) return format(new Date(), 'dd / MMM / yyyy', { locale: es })
  return format(date, 'dd / MMM / yyyy', { locale: es })
}

interface ChecklistPDFProps {
  formData: ChecklistItem[]
  photos: {
    photo1: PhotoUpload
    photo2: PhotoUpload
    photo3: PhotoUpload
  }
  metadata?: {
    date?: Date | null
    time?: string
    lot?: string
    operator?: string
    lineManager?: string
    machineOperator?: string
    brand?: string
    material?: string
    sku?: string
  }
}

const ChecklistPDFDocument = ({ formData, photos, metadata }: ChecklistPDFProps) => {
  const currentDate = formatDate(metadata?.date)

  // Función para convertir data URL a URL de blob
  const dataUrlToBlob = (dataUrl: string) => {
    try {
      return URL.createObjectURL(
        new Blob(
          [Buffer.from(dataUrl.split(',')[1], 'base64')],
          { type: 'image/jpeg' }
        )
      )
    } catch (error) {
      console.error('Error converting data URL to blob:', error)
      return ''
    }
  }

  // Función para convertir el estado a texto
  const getStatusText = (status: string) => {
    switch (status) {
      case 'cumple':
        return 'Cumple'
      case 'no_cumple':
        return 'No cumple'
      default:
        return 'No aplica'
    }
  }

  // Función para obtener el estilo del estado
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'cumple':
        return styles.statusCumple
      case 'no_cumple':
        return styles.statusNoCumple
      default:
        return {}
    }
  }

  return (
    <Document>
      {/* Primera página: Checklist */}
      <Page size="A4" style={styles.page}>
        {/* Información del documento */}
        <Text style={styles.documentInfo}>
          CF.PC-PG-PRO-001-RG001 PACKAGING CHECKLIST V.03
        </Text>

        {/* Encabezado */}
        <View style={styles.header}>
          <Image
            src="/logo-placeholder.png"
            style={styles.logo}
          />
        </View>

        {/* Título y subtítulo */}
        <Text style={styles.title}>
          CHECKLIST DE PACKAGING – PRODUCCIÓN
        </Text>
        <Text style={styles.subtitle}>
          Control de calidad y verificación de proceso de packaging
        </Text>

        {/* Información del personal */}
        <View style={styles.infoContainer}>
          <View style={styles.infoGroup}>
            <Text>
              <Text style={styles.infoLabel}>Fecha:</Text>
              <Text style={styles.infoValue}>{currentDate}</Text>
            </Text>
          </View>
          <View style={styles.infoGroup}>
            <Text>
              <Text style={styles.infoLabel}>Hora:</Text>
              <Text style={styles.infoValue}>{metadata?.time || ''}</Text>
            </Text>
          </View>
          <View style={styles.infoGroup}>
            <Text>
              <Text style={styles.infoLabel}>Jefe de Línea:</Text>
              <Text style={styles.infoValue}>{metadata?.lineManager || ''}</Text>
            </Text>
          </View>
          <View style={styles.infoGroup}>
            <Text>
              <Text style={styles.infoLabel}>Operador de Máquina:</Text>
              <Text style={styles.infoValue}>{metadata?.machineOperator || ''}</Text>
            </Text>
          </View>
          <View style={styles.infoGroup}>
            <Text>
              <Text style={styles.infoLabel}>Marca:</Text>
              <Text style={styles.infoValue}>{metadata?.brand || ''}</Text>
            </Text>
          </View>
          <View style={styles.infoGroup}>
            <Text>
              <Text style={styles.infoLabel}>Material:</Text>
              <Text style={styles.infoValue}>{metadata?.material || ''}</Text>
            </Text>
          </View>
          <View style={styles.infoGroup}>
            <Text>
              <Text style={styles.infoLabel}>SKU:</Text>
              <Text style={styles.infoValue}>{metadata?.sku || ''}</Text>
            </Text>
          </View>
          <View style={styles.infoGroup}>
            <Text>
              <Text style={styles.infoLabel}>Lote:</Text>
              <Text style={styles.infoValue}>{metadata?.lot || ''}</Text>
            </Text>
          </View>
        </View>

        {/* Tabla de checklist */}
        <View style={styles.table}>
          {/* Encabezado de la tabla */}
          <View style={styles.tableHeader}>
            <Text style={styles.colNum}>N°</Text>
            <Text style={styles.colItem}>Ítem</Text>
            <Text style={styles.colStatus}>Estado</Text>
            <Text style={styles.colComment}>Comentario</Text>
            <Text style={styles.colAction}>Acción correctiva</Text>
          </View>

          {/* Filas de la tabla */}
          {formData.map((item, index) => (
            <View 
              key={item.id}
              style={[
                styles.tableRow,
                index % 2 === 1 ? styles.tableRowEven : {}
              ]}
            >
              <Text style={styles.colNum}>{item.id}</Text>
              <Text style={styles.colItem}>{item.name}</Text>
              <Text style={[styles.colStatus, getStatusStyle(item.status)]}>
                {getStatusText(item.status)}
              </Text>
              <Text style={styles.colComment}>{item.comment || '-'}</Text>
              <Text style={styles.colAction}>{item.correctiveAction || '-'}</Text>
            </View>
          ))}
        </View>

        {/* Pie de página */}
        <Text style={styles.footer}>
          Este documento es parte del sistema de gestión de calidad de Comfrut
        </Text>
      </Page>

      {/* Segunda página: Fotos */}
      <Page size="A4" style={styles.photosPage}>
        {/* Foto 1: Codificación de bolsa */}
        {photos.photo1.preview && (
          <View style={styles.photoSection}>
            <View style={styles.photoHeader}>
              <Text style={styles.photoTitle}>Fotografía 1: Codificación de bolsa</Text>
              <Text style={styles.photoSubtitle}>
                Captura clara de la codificación en la bolsa del producto
              </Text>
            </View>
            <View style={styles.photoFrame}>
              <Image
                src={photos.photo1.preview}
                style={styles.photo}
              />
              <Text style={styles.photoCaption}>
                Verificación de codificación en bolsa - {currentDate}
              </Text>
            </View>
          </View>
        )}

        {/* Foto 2: Codificación de caja */}
        {photos.photo2.preview && (
          <View style={styles.photoSection}>
            <View style={styles.photoHeader}>
              <Text style={styles.photoTitle}>Fotografía 2: Codificación de caja</Text>
              <Text style={styles.photoSubtitle}>
                Captura de la codificación en la caja
              </Text>
            </View>
            <View style={styles.photoFrame}>
              <Image
                src={photos.photo2.preview}
                style={styles.photo}
              />
              <Text style={styles.photoCaption}>
                Verificación de codificación en caja - {currentDate}
              </Text>
            </View>
          </View>
        )}

        {/* Foto 3: Etiqueta adicional */}
        {photos.photo3.preview && (
          <View style={styles.photoSection}>
            <View style={styles.photoHeader}>
              <Text style={styles.photoTitle}>Fotografía 3: Etiqueta adicional</Text>
              <Text style={styles.photoSubtitle}>
                Captura de etiqueta adicional
              </Text>
            </View>
            <View style={styles.photoFrame}>
              <Image
                src={photos.photo3.preview}
                style={styles.photo}
              />
              <Text style={styles.photoCaption}>
                Verificación de etiqueta adicional - {currentDate}
              </Text>
            </View>
          </View>
        )}

        {/* Pie de página */}
        <Text style={styles.footer}>
          Registro fotográfico del proceso de packaging - Página 2/2
        </Text>
      </Page>
    </Document>
  )
}

export const ChecklistPDFLink = ({ formData, photos, metadata }: ChecklistPDFProps) => {
  const [isClient, setIsClient] = useState(false)

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <button
        type="button"
        disabled
        className="w-full sm:w-auto px-6 py-3 bg-green-300 text-white rounded-md 
          text-base font-medium text-center opacity-75 cursor-not-allowed"
      >
        <div className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Preparando PDF...</span>
        </div>
      </button>
    )
  }

  return (
    <PDFDownloadLink
      document={
        <ChecklistPDFDocument 
          formData={formData}
          photos={photos}
          metadata={metadata}
        />
      }
      fileName={`checklist-packaging-${metadata?.date || new Date().toLocaleDateString()}.pdf`}
      className="w-full sm:w-auto px-6 py-3 bg-green-400 text-white rounded-md 
        hover:bg-green-500 transition-colors text-base font-medium text-center
        shadow-md hover:shadow-lg focus:ring-2 focus:ring-green-300 
        focus:ring-offset-2"
    >
      {({ loading, error }) => 
        loading ? (
          <div className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Generando PDF...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center gap-2 text-red-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Error al generar PDF</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Descargar PDF</span>
          </div>
        )
      }
    </PDFDownloadLink>
  )
}

export default ChecklistPDFDocument 