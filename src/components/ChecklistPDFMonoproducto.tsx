import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
  PDFDownloadLink
} from '@react-pdf/renderer'
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

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: 'Roboto', backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', marginBottom: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 20 },
  logo: { width: 120, marginRight: 40 },
  documentInfo: { position: 'absolute', top: 10, right: 30, fontSize: 8, color: '#6B7280' },
  title: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: '#005F9E' },
  subtitle: { fontSize: 10, textAlign: 'center', marginBottom: 20, color: '#4B5563' },
  infoContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20, backgroundColor: '#F3F4F6', padding: 10, borderRadius: 4 },
  infoGroup: { width: '45%', marginBottom: 8 },
  infoLabel: { fontWeight: 'bold', marginRight: 4, color: '#374151' },
  infoValue: { color: '#111827' },
  table: { width: '100%', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 4 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#F9FAFB', padding: 6 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', padding: 6, alignItems: 'center' },
  tableRowEven: { backgroundColor: '#FDFDFD' },
  colItemHeader: { width: '20%', fontSize: 8, fontWeight: 'bold' },
  colPallet: { width: '20%', fontSize: 8, textAlign: 'center' }
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

const logoBase64 = "data:image/png;base64,iVB..." // reuse your base64

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
  return (
    <Document>
      {palletGroups.map((group, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {/* Header y título */}
          <View style={styles.header}>
            <Image src={logoBase64} style={styles.logo} />
            <Text style={styles.documentInfo}>V.01</Text>
          </View>
          <Text style={styles.title}>
            Quality control of freezing fruit process / Control de calidad del proceso de congelado de frutas
          </Text>
          <Text style={styles.subtitle}>CF/PC-PG-ASC-006-RG001</Text>
          {/* Metadata solo en primera página */}
          {pageIndex === 0 && (
            <View style={styles.infoContainer}>
              {headerEntries.map(([label, val], i) => (
                <View style={styles.infoGroup} key={i}>
                  <Text>
                    <Text style={styles.infoLabel}>{label}:</Text>
                    <Text style={styles.infoValue}>{val}</Text>
                  </Text>
                </View>
              ))}
            </View>
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
                <Text style={styles.colItemHeader}>{field}</Text>
                {group.map((p, ci) => (
                  <Text style={styles.colPallet} key={ci}>
                    {p.values[field] || ''}
                  </Text>
                ))}
              </View>
            ))}
          </View>
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