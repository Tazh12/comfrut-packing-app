import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  PDFDownloadLink
} from '@react-pdf/renderer'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  PDFStyles, 
  PDFHeader, 
  PDFMetaInfo, 
  PDFFooter
} from '@/lib/pdf-layout'

const styles = StyleSheet.create({
  table: { width: '100%', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 4, marginBottom: 15 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#005F9E', padding: 8, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', padding: 6, alignItems: 'center' },
  tableRowEven: { backgroundColor: '#F9FAFB' },
  colItemHeader: { width: '20%', fontSize: 8, fontWeight: 'bold', color: '#FFFFFF' },
  colPallet: { width: '20%', fontSize: 8, textAlign: 'center', color: '#FFFFFF' },
  colPalletValue: { width: '20%', fontSize: 8, textAlign: 'center', color: '#111827' }
})

interface ChecklistPDFMonoproductoProps {
  pallets: { id: number; values: Record<string, string> }[]
  metadata: {
    date: string
    ordenFabricacion: string
    lineManager: string
    controlQuality: string
    cliente: string
    producto: string
    sku: string
  }
}


// Ajustar formato de fecha para evitar desfase de zona horaria
const formatDate = (date: string): string => {
  try {
    // Forzar hora a medianoche local
    return format(new Date(date + 'T00:00:00'), 'dd / MMM / yyyy', { locale: es })
  } catch {
    return date
  }
}

// Función para sanear textos en nombres de archivo
const sanitize = (text: string) => text.replace(/[^a-zA-Z0-9_-]/g, '_')

export const ChecklistPDFMonoproductoDocument = ({ pallets, metadata }: ChecklistPDFMonoproductoProps) => {
  if (!pallets || pallets.length === 0) return null

  const formattedDate = formatDate(metadata.date)
  // Campos del header
  const headerEntries = [
    ['Fecha', formattedDate],
    ['Orden de fabricación', metadata.ordenFabricacion],
    ['Jefe de línea', metadata.lineManager],
    ['Control de calidad', metadata.controlQuality],
    ['Cliente', metadata.cliente],
    ['Producto', metadata.producto],
    ['SKU', metadata.sku]
  ]
  // Campos de pallet (un solo conjunto de posibles campos)
  const allFields = Array.from(new Set(pallets.flatMap(p => Object.keys(p.values))))
  // Ordenar colocando 'codigo_barra' y 'codigo_caja' al frente si existen
  const orderedFields = [] as string[]
  ['codigo_barra', 'codigo_caja'].forEach(f => { if (allFields.includes(f)) orderedFields.push(f) })
  allFields.forEach(f => { if (!orderedFields.includes(f)) orderedFields.push(f) })

  // Agrupar pallets de 3 en 3 para paginación
  const palletGroups = Array.from(
    { length: Math.ceil(pallets.length / 3) },
    (_, i) => pallets.slice(i * 3, i * 3 + 3)
  )
  const creationDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <Document>
      {palletGroups.map((group, pageIndex) => (
        <Page key={pageIndex} size="A4" style={PDFStyles.page}>
          {/* Header Bar */}
          <PDFHeader
            titleEn="Quality Control of Freezing Fruit Process"
            titleEs="Control de calidad del proceso de congelado de frutas"
            documentCode="CF/PC-PG-ASC-006-RG001"
            version="V.01"
            date={metadata.date}
          />

          {/* Metadata solo en primera página */}
          {pageIndex === 0 && (
            <PDFMetaInfo
              leftColumn={[
                { label: 'Fecha', value: formattedDate },
                { label: 'Orden de fabricación', value: metadata.ordenFabricacion },
                { label: 'Jefe de línea', value: metadata.lineManager }
              ]}
              rightColumn={[
                { label: 'Control de calidad', value: metadata.controlQuality },
                { label: 'Cliente', value: metadata.cliente },
                { label: 'Producto', value: metadata.producto },
                { label: 'SKU', value: metadata.sku }
              ]}
            />
          )}

          {/* Tabla de pallets para este grupo */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colItemHeader}></Text>
              {group.map((_, idx) => (
                <Text style={styles.colPallet} key={idx}>
                  Pallet #{pageIndex * 3 + idx + 1}
                </Text>
              ))}
            </View>
            {orderedFields.map((field, ri) => (
              <View
                key={field}
                style={[styles.tableRow, ri % 2 === 0 ? styles.tableRowEven : {}]}
              >
                <Text style={[styles.colItemHeader, { color: '#111827', fontWeight: 'bold' }]}>{field}</Text>
                {group.map((p, ci) => (
                  <Text style={styles.colPalletValue} key={ci}>
                    {p.values[field] || ''}
                  </Text>
                ))}
              </View>
            ))}
          </View>

          <PDFFooter 
            pageNumber={pageIndex + 1} 
            totalPages={palletGroups.length} 
            creationTimestamp={creationDate} 
          />
        </Page>
      ))}
    </Document>
  )
}

export const ChecklistPDFMonoproductoLink = ({ pallets, metadata }: ChecklistPDFMonoproductoProps) => (
  <PDFDownloadLink
    document={<ChecklistPDFMonoproductoDocument pallets={pallets} metadata={metadata} />}
    fileName={`${sanitize(metadata.date)}-${sanitize(metadata.producto)}-${sanitize(metadata.ordenFabricacion)}.pdf`}
    style={{ textDecoration: 'none', padding: 10, backgroundColor: '#005F9E', color: '#FFF', borderRadius: 4 }}
  >
    {({ loading }) => (loading ? 'Generando PDF...' : 'Descargar PDF')}
  </PDFDownloadLink>
) 