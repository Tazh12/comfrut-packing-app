import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { 
  PDFStyles, 
  PDFHeader, 
  PDFMetaInfo, 
  PDFFooter, 
  PDFSectionTitle
} from '@/lib/pdf-layout'

const styles = StyleSheet.create({
  section: {
    marginBottom: 20
  },
  signatureBox: {
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    padding: 10,
    minHeight: 70,
    backgroundColor: '#FAFAFA',
    width: '48%'
  },
  signatureLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#4B5563'
  },
  signatureImage: {
    width: '100%',
    maxHeight: 50,
    objectFit: 'contain'
  },
  bagEntryContainer: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#FAFAFA'
  },
  bagEntryHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 4
  },
  table: {
    width: '100%',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  tableHeader: {
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 8,
    padding: 6,
    textAlign: 'center'
  },
  tableCell: {
    fontSize: 7,
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    textAlign: 'center'
  },
  tableCellLabel: {
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 7,
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB'
  },
  statusComply: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    fontWeight: 'bold'
  },
  statusNotComply: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    fontWeight: 'bold'
  },
  statusEmpty: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280'
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingVertical: 2
  },
  infoLabel: {
    fontSize: 8,
    width: '40%',
    color: '#374151',
    fontWeight: 'bold'
  },
  infoValue: {
    fontSize: 8,
    width: '60%',
    color: '#111827'
  }
})

interface ChecklistWeighingSealingPDFProps {
  data: {
    section1: {
      date: string
      shift: string
      processRoom: string
      brand: string
      product: string
      monitorName: string
      monitorSignature: string
    }
    section2: {
      bagEntries: Array<{
        id: number
        time: string
        bagCode: string
        weights: string[]
        sealed: string[]
        otherCodification: string
        declarationOfOrigin: string
      }>
    }
    comments?: string
  }
}

const BagEntrySection: React.FC<{
  entry: ChecklistWeighingSealingPDFProps['data']['section2']['bagEntries'][0]
  index: number
}> = ({ entry, index }) => {
  // Calculate average weight - only use filled weights
  const weights = entry.weights.filter(w => w && w.trim()).map(w => parseFloat(w)).filter(w => !isNaN(w))
  const averageWeight = weights.length > 0 
    ? (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(2)
    : 'N/A'

  return (
    <View style={styles.bagEntryContainer}>
      <Text style={styles.bagEntryHeader}>Bag Entry #{index + 1} - {entry.bagCode}</Text>
      
      {/* Time and Bag Code Info */}
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Time:</Text>
        <Text style={styles.infoValue}>{entry.time}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Bag Code:</Text>
        <Text style={styles.infoValue}>{entry.bagCode}</Text>
      </View>

      {/* Weight Table */}
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={[styles.tableCellLabel, { width: '20%' }]}>
            <Text style={{ color: '#FFFFFF' }}>WEIGHT</Text>
          </View>
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={`weight-header-${i}`} style={[styles.tableCell, { width: '7%' }]}>
              <Text>{i + 1}</Text>
            </View>
          ))}
          <View style={[styles.tableCell, { width: '10%', fontWeight: 'bold' }]}>
            <Text>AVG</Text>
          </View>
        </View>
        <View style={styles.tableRow}>
          <View style={[styles.tableCellLabel, { width: '20%' }]}>
            <Text style={{ color: '#FFFFFF' }}>WEIGHT / Peso</Text>
          </View>
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={`weight-${i}`} style={[styles.tableCell, { width: '7%' }]}>
              <Text>{entry.weights[i] || '-'}</Text>
            </View>
          ))}
          <View style={[styles.tableCell, { width: '10%', fontWeight: 'bold' }]}>
            <Text>{averageWeight}</Text>
          </View>
        </View>
        <View style={styles.tableRow}>
          <View style={[styles.tableCellLabel, { width: '20%' }]}>
            <Text style={{ color: '#FFFFFF' }}>SEALED / Sellado</Text>
          </View>
          {Array.from({ length: 10 }).map((_, i) => {
            const sealedValue = entry.sealed[i] || ''
            const cellStyle = sealedValue === 'Comply' 
              ? styles.statusComply 
              : sealedValue === 'not comply' 
              ? styles.statusNotComply 
              : styles.statusEmpty
            return (
              <View key={`sealed-${i}`} style={[styles.tableCell, cellStyle, { width: '7%' }]}>
                <Text>{sealedValue || '-'}</Text>
              </View>
            )
          })}
          <View style={[styles.tableCell, { width: '10%' }]}>
            <Text>-</Text>
          </View>
        </View>
      </View>

      {/* Other Codification and Declaration */}
      <View style={{ marginTop: 10 }}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Other Codification:</Text>
          <Text style={styles.infoValue}>{entry.otherCodification || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Declaration of Origin:</Text>
          <View style={{
            backgroundColor: entry.declarationOfOrigin === 'Comply' 
              ? '#D1FAE5' 
              : entry.declarationOfOrigin === 'not comply' 
              ? '#FEE2E2' 
              : '#F3F4F6',
            padding: 4,
            borderRadius: 2,
            width: '60%'
          }}>
            <Text style={{
              color: entry.declarationOfOrigin === 'Comply' 
                ? '#065F46' 
                : entry.declarationOfOrigin === 'not comply' 
                ? '#991B1B' 
                : '#6B7280',
              fontWeight: 'bold',
              fontSize: 8
            }}>
              {entry.declarationOfOrigin || 'Not selected'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export const ChecklistWeighingSealingPDFDocument: React.FC<ChecklistWeighingSealingPDFProps> = ({ data }) => {
  const entriesPerPage = 2 // Adjust based on content size
  const totalPages = Math.ceil(data.section2.bagEntries.length / entriesPerPage)

  const pages = []
  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const startIndex = pageIndex * entriesPerPage
    const endIndex = Math.min(startIndex + entriesPerPage, data.section2.bagEntries.length)
    const pageEntries = data.section2.bagEntries.slice(startIndex, endIndex)

    const creationDate = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })

    pages.push(
      <Page key={pageIndex} size="A4" style={PDFStyles.page}>
        {/* Header Bar */}
        <PDFHeader
          titleEn="Check weighing and sealing of packaged products"
          titleEs="Chequeo de pesaje y sellado de los productos envasados"
          documentCode="CF/PC-ASC-006-RG005"
          version="V.01"
          date={data.section1.date}
        />

        {/* Section 1: Basic Info - Only show on first page */}
        {pageIndex === 0 && (
          <View style={styles.section}>
            <PDFMetaInfo
              leftColumn={[
                { label: 'Date', value: data.section1.date },
                { label: 'Shift', value: data.section1.shift },
                { label: 'Process Room', value: data.section1.processRoom }
              ]}
              rightColumn={[
                { label: 'Brand', value: data.section1.brand },
                { label: 'Product', value: data.section1.product },
                { label: 'Monitor Name', value: data.section1.monitorName }
              ]}
            />
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Monitor Signature</Text>
              {data.section1.monitorSignature ? (
                <Image src={data.section1.monitorSignature} style={styles.signatureImage} />
              ) : (
                <Text style={{ fontSize: 8, color: '#9CA3AF' }}>No signature provided</Text>
              )}
            </View>
          </View>
        )}

        {/* Section 2: Bag Entries */}
        <View style={styles.section}>
          {pageIndex === 0 && (
            <PDFSectionTitle 
              titleEn="Section 2 – Bag Entries"
              titleEs="Sección 2 – Entradas de bolsas"
            />
          )}
          {pageEntries.map((entry, idx) => (
            <BagEntrySection
              key={startIndex + idx}
              entry={entry}
              index={startIndex + idx}
            />
          ))}
        </View>

        {/* Section 3: Comments - Only show on last page if comments exist */}
        {pageIndex === totalPages - 1 && data.comments && (
          <View style={styles.section}>
            <PDFSectionTitle 
              titleEn="Section 3 – Comments / Observaciones"
              titleEs="Sección 3 – Comentarios / Observaciones"
            />
            <View style={{
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 4,
              padding: 10,
              backgroundColor: '#FAFAFA',
              minHeight: 60
            }}>
              <Text style={{
                fontSize: 9,
                color: '#111827',
                lineHeight: 1.5
              }}>
                {data.comments}
              </Text>
            </View>
          </View>
        )}

        <PDFFooter 
          pageNumber={pageIndex + 1} 
          totalPages={totalPages} 
          creationTimestamp={creationDate} 
        />
      </Page>
    )
  }

  return <Document>{pages}</Document>
}

