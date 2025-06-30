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
import { ChecklistRecord } from '@/lib/checklist'

// Registrar fuentes
Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf' },
    { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' }
  ]
})

const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAABaCAYAAAD3fJq9AAABHmlDQ1BJQ0MgUHJvZmlsZQAAeJx9kT1Iw0AcxV/TKhZRK1KioCgUFPYICiqFChVQsgoPgpC4qXPohNH0ELFy1cHEQfHh1dXAVB8AfFx1c3NS0EQ/Il3S0UQFQ9PTEni8VFiKCbYc5833/f2HUIFqRprjYArpmhGlsKC4jyRFEkDHPwQr0jU98R1fYWBkfe34++7l4l1fMf+gFqZ5jgOcIbpk2dCz4nHGsMKz3i+e8UTzzCLOZFvE58YVIZrHd4nHLM4yxzrHMkJYpvEldRFXOseK4lWpKRih0U2qrFPFXuRJd0Rz9xgVNxlO+ZWRgkscAIlBFBik3cgKQjhS0iIYlBWKmclEXr/IDv9X9sxk0IlLFMDGkEEGCpKVPn/g9u7O7zZ6t0hMYzz+XW9gD7czqK9gYz7eI2CwOgA1fYfC+tgZj0AdB2Cbj5xnFYE9R8ATr7BJABKZghqQkWTcCAHcdAxrfYXce7/17TrGf4HwvnL3hHy0SgAAAAlwSFlzAAAuIwAALiMBeKU/dgAAAAd0SU1FB+cGChAKIG1U5vQ="

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
    alignItems: 'flex-start'
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
    width: '12%',
    paddingHorizontal: 2,
    textAlign: 'center'
  },
  colComment: {
    width: '24%',
    paddingHorizontal: 4,
    flexWrap: 'wrap'
  },
  colAction: {
    width: '24%',
    paddingHorizontal: 4,
    flexWrap: 'wrap'
  },
  statusText: {
    textAlign: 'center',
    color: '#111827',
    fontSize: 7,
    width: '100%'
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
  },
  image: {
    width: '100%',
    height: 180,
    objectFit: 'contain'
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
  metadata: {
    date: string  // YYYY-MM-DD format
    ordenFabricacion: string
    operator: string
    lineManager: string
    machineOperator: string
    brand: string
    material: string
    sku: string
  }
}

const ChecklistPDFDocument = ({ formData, photos, metadata }: ChecklistPDFProps) => {
  // Guard inicial - no renderizar si no hay datos válidos
  if (!Array.isArray(formData) || formData.length === 0) {
    return null;
  }

  // Valores seguros para props que podrían ser null
  const safeMetadata = metadata ?? {
    date: '',
    lineManager: '',
    machineOperator: '',
    brand: '',
    material: '',
    sku: '',
    ordenFabricacion: '',
    operator: ''
  };

  const safePhotos = photos ?? {
    photo1: { preview: '' },
    photo2: { preview: '' },
    photo3: { preview: '' }
  };

  // Formatear la fecha para mostrar en el PDF usando la cadena 'YYYY-MM-DD'
  const formattedDate = safeMetadata.date
    ? (() => {
        const parts = safeMetadata.date.split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts;
          return `${day}/${month}/${year}`;
        }
        return safeMetadata.date;
      })()
    : '';

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
  const getStatusText = (status: string | undefined) => {
    switch (status) {
      case 'cumple':
        return 'Cumple'
      case 'no_cumple':
        return 'No cumple'
      default:
        return ''
    }
  }

  // Función para obtener el estilo del estado
  const getStatusStyle = (status: string | undefined) => {
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
      <Page size="A4" style={styles.page}>
        {/* Información del documento */}
        <View style={styles.header}>
          <Image
            src={logoBase64}
            style={styles.logo}
          />
          <Text style={styles.documentInfo}>V.03</Text>
        </View>

        {/* Título y subtítulo */}
        <Text style={styles.title}>
          Checklist packing machine / Checklist envasadora
        </Text>
        <Text style={styles.subtitle}>
          CD/PC-PG-PRO-001-RG001
        </Text>

        {/* Información del personal y detalles */}
        <View style={styles.infoContainer}>
          <View style={styles.infoGroup}>
            <Text>
              <Text style={styles.infoLabel}>Fecha:</Text>
              <Text style={styles.infoValue}>{formattedDate}</Text>
            </Text>
          </View>
          <View style={styles.infoGroup}>
            <Text>
              <Text style={styles.infoLabel}>Jefe de Línea:</Text>
              <Text style={styles.infoValue}>{safeMetadata.lineManager}</Text>
            </Text>
          </View>
          <View style={styles.infoGroup}>
            <Text>
              <Text style={styles.infoLabel}>Operador:</Text>
              <Text style={styles.infoValue}>{safeMetadata.operator}</Text>
            </Text>
          </View>
          <View style={styles.infoGroup}>
            <Text>
              <Text style={styles.infoLabel}>Orden de Fabricación:</Text>
              <Text style={styles.infoValue}>{safeMetadata.ordenFabricacion}</Text>
            </Text>
          </View>
          <View style={styles.infoGroup}>
            <Text>
              <Text style={styles.infoLabel}>Marca:</Text>
              <Text style={styles.infoValue}>{safeMetadata.brand}</Text>
            </Text>
          </View>
          <View style={styles.infoGroup}>
            <Text>
              <Text style={styles.infoLabel}>Material:</Text>
              <Text style={styles.infoValue}>{safeMetadata.material}</Text>
            </Text>
          </View>
          <View style={styles.infoGroup}>
            <Text>
              <Text style={styles.infoLabel}>SKU:</Text>
              <Text style={styles.infoValue}>{safeMetadata.sku}</Text>
            </Text>
          </View>
        </View>

        {/* Tabla de checklist */}
        <View style={styles.table}>
          {/* Encabezado de la tabla */}
          <View style={styles.tableHeader}>
            <Text style={styles.colNum}>#</Text>
            <Text style={styles.colItem}>Item</Text>
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
                index % 2 === 0 ? styles.tableRowEven : {}
              ]}
            >
              <Text style={styles.colNum}>{item.id}</Text>
              <Text style={styles.colItem}>{item.nombre}</Text>
              <Text style={[styles.statusText, getStatusStyle(item.status)]}>
                {getStatusText(item.status)}
              </Text>
              <Text style={styles.colComment}>{item.comment || ''}</Text>
              <Text style={styles.colAction}>{item.correctiveAction || ''}</Text>
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
        <View style={styles.photoSection}>
          <View style={styles.photoHeader}>
            <Text style={styles.photoTitle}>Foto 1</Text>
            <Text style={styles.photoSubtitle}>Vista general del equipo</Text>
          </View>
          <View style={styles.photoFrame}>
            {safePhotos?.photo1?.preview && (
              <Image src={safePhotos.photo1.preview} style={styles.photo} />
            )}
          </View>
        </View>

        {/* Foto 2: Codificación de caja */}
        <View style={styles.photoSection}>
          <View style={styles.photoHeader}>
            <Text style={styles.photoTitle}>Foto 2</Text>
            <Text style={styles.photoSubtitle}>Detalle específico</Text>
          </View>
          <View style={styles.photoFrame}>
            {safePhotos?.photo2?.preview && (
              <Image src={safePhotos.photo2.preview} style={styles.photo} />
            )}
          </View>
        </View>

        {/* Foto 3: Etiqueta adicional */}
        <View style={styles.photoSection}>
          <View style={styles.photoHeader}>
            <Text style={styles.photoTitle}>Foto 3</Text>
            <Text style={styles.photoSubtitle}>Detalle adicional</Text>
          </View>
          <View style={styles.photoFrame}>
            {safePhotos?.photo3?.preview && (
              <Image src={safePhotos.photo3.preview} style={styles.photo} />
            )}
          </View>
        </View>

        {/* Pie de página */}
        <Text style={styles.footer}>
          Registro fotográfico del proceso de packaging - Página 2/2
        </Text>
      </Page>
    </Document>
  );
}

export const ChecklistPDFLink = ({ formData, photos, metadata }: ChecklistPDFProps) => {
  if (!Array.isArray(formData) || formData.length === 0) {
    return null;
  }

  // Usar metadata.date para el nombre del archivo, con fallback a la fecha actual
  const fileDate = metadata.date || format(new Date(), 'yyyy-MM-dd');

  return (
    <PDFDownloadLink
      document={<ChecklistPDFDocument formData={formData} photos={photos} metadata={metadata} />}
      fileName={`checklist-${fileDate}.pdf`}
      className="px-6 py-3 rounded-md font-medium transition-colors focus:ring-2 focus:ring-offset-2 bg-blue-400 hover:bg-blue-500 text-white shadow-md hover:shadow-lg focus:ring-blue-300 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
    >
      {({ loading }) => (
        loading ? 'Generando PDF...' : 'Descargar PDF'
      )}
    </PDFDownloadLink>
  );
}

export default ChecklistPDFDocument 