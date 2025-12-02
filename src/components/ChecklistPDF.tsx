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
  pdf,
  PDFViewer
} from '@react-pdf/renderer'
import { ChecklistItem, PhotoUpload } from '@/context/ChecklistContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChecklistRecord } from '@/lib/checklist'
import { 
  PDFStyles, 
  PDFHeader, 
  PDFMetaInfo, 
  PDFFooter, 
  PDFStatusBadge
} from '@/lib/pdf-layout'

// Estilos
const styles = StyleSheet.create({
  table: {
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#005F9E',
    padding: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 28,
    padding: 6,
    alignItems: 'flex-start'
  },
  tableRowEven: {
    backgroundColor: '#F9FAFB'
  },
  colNum: {
    width: '6%',
    paddingHorizontal: 2,
    textAlign: 'center',
    fontSize: 9
  },
  colItem: {
    width: '34%',
    paddingHorizontal: 4,
    fontSize: 9
  },
  colStatus: {
    width: '12%',
    paddingHorizontal: 2,
    textAlign: 'center'
  },
  colComment: {
    width: '24%',
    paddingHorizontal: 4,
    flexWrap: 'wrap',
    fontSize: 9
  },
  colAction: {
    width: '24%',
    paddingHorizontal: 4,
    flexWrap: 'wrap',
    fontSize: 9
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
    fontSize: 11.5,
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

  const creationDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <Document>
      <Page size="A4" style={PDFStyles.page}>
        {/* Header Bar */}
        <PDFHeader
          titleEn="Checklist Packing Machine"
          titleEs="Checklist envasadora"
          documentCode="CD/PC-PG-PRO-001-RG001"
          version="V.03"
          date={formattedDate}
        />

        {/* Meta Info Block */}
        <PDFMetaInfo
          leftColumn={[
            { label: 'Fecha', value: formattedDate },
            { label: 'Jefe de Línea', value: safeMetadata.lineManager },
            { label: 'Operador', value: safeMetadata.operator },
            { label: 'Orden de Fabricación', value: safeMetadata.ordenFabricacion }
          ]}
          rightColumn={[
            { label: 'Marca', value: safeMetadata.brand },
            { label: 'Material', value: safeMetadata.material },
            { label: 'SKU', value: safeMetadata.sku }
          ]}
        />

        {/* Tabla de checklist */}
        <View style={styles.table}>
          {/* Encabezado de la tabla */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colNum]}>#</Text>
            <Text style={[styles.tableHeaderText, styles.colItem]}>Item</Text>
            <Text style={[styles.tableHeaderText, styles.colStatus]}>Estado</Text>
            <Text style={[styles.tableHeaderText, styles.colComment]}>Comentario</Text>
            <Text style={[styles.tableHeaderText, styles.colAction]}>Acción correctiva</Text>
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
              <View style={styles.colStatus}>
                {item.status ? (
                  <PDFStatusBadge 
                    status={item.status === 'cumple' ? 'comply' : 'notComply'}
                    customText={getStatusText(item.status)}
                  />
                ) : (
                  <Text style={{ fontSize: 8, color: '#9CA3AF' }}>-</Text>
                )}
              </View>
              <Text style={styles.colComment}>{item.comment || ''}</Text>
              <Text style={styles.colAction}>{item.correctiveAction || ''}</Text>
            </View>
          ))}
        </View>

        {/* Pie de página */}
        <PDFFooter creationTimestamp={creationDate} />
      </Page>

      {/* Segunda página: Fotos */}
      <Page size="A4" style={PDFStyles.page}>
        {/* Header Bar */}
        <PDFHeader
          titleEn="Checklist Packing Machine"
          titleEs="Checklist envasadora"
          documentCode="CD/PC-PG-PRO-001-RG001"
          version="V.03"
          date={formattedDate}
        />

        {/* Foto 1: Codificación de bolsa */}
        <View style={styles.photoSection}>
          <View style={styles.photoHeader}>
            <Text style={styles.photoTitle}>Photo 1</Text>
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
            <Text style={styles.photoTitle}>Photo 2</Text>
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
            <Text style={styles.photoTitle}>Photo 3</Text>
            <Text style={styles.photoSubtitle}>Detalle adicional</Text>
          </View>
          <View style={styles.photoFrame}>
            {safePhotos?.photo3?.preview && (
              <Image src={safePhotos.photo3.preview} style={styles.photo} />
            )}
          </View>
        </View>

        {/* Pie de página */}
        <PDFFooter pageNumber={2} totalPages={2} creationTimestamp={creationDate} />
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