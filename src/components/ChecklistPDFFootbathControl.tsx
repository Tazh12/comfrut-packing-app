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
  table: {
    marginTop: 10,
    marginBottom: 15,
    width: '100%',
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
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 28
  },
  tableRowEven: {
    backgroundColor: '#F9FAFB'
  },
  tableCell: {
    fontSize: 8,
    color: '#111827',
    flex: 1
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 4,
    padding: 10,
    marginBottom: 15
  },
  infoTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1E40AF'
  },
  infoText: {
    fontSize: 8,
    color: '#1F2937',
    marginBottom: 3
  },
  colorChartContainer: {
    marginTop: 10,
    marginBottom: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    backgroundColor: '#FFFFFF'
  },
  colorChartTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#111827',
    textAlign: 'center'
  },
  colorChartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  colorBox: {
    flex: 1,
    height: 20,
    borderWidth: 0.5,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  colorBoxText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#000000'
  },
  colorBoxHighlighted: {
    borderWidth: 2,
    borderColor: '#22C55E',
    backgroundColor: '#0D9488'
  },
  colorBoxHighlightedText: {
    color: '#FFFFFF'
  },
  problemsTable: {
    marginTop: 10,
    marginBottom: 15,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4
  },
  problemsTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#005F9E',
    padding: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4
  },
  problemsTableHeaderText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1
  },
  problemsTableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 40
  },
  problemsTableCell: {
    fontSize: 7,
    color: '#111827',
    flex: 1,
    paddingHorizontal: 4
  },
  problemsTableRowEven: {
    backgroundColor: '#F9FAFB'
  }
})

export interface ChecklistFootbathControlPDFProps {
  data: {
    section1: {
      date: string
      shift: string
      monitorName: string
      monitorSignature: string
    }
    section2: {
      measurements: Array<{
        hour: string
        filter: string
        measurePpmValue: number
        correctiveAction: string | null
      }>
    }
  }
}

export const ChecklistFootbathControlPDFDocument: React.FC<ChecklistFootbathControlPDFProps> = ({ data }) => {
  return (
    <Document>
      <Page size="A4" style={PDFStyles.page}>
        {/* Header */}
        <PDFHeader
          titleEn="Footbath Control"
          titleEs="Control de Pediluvios"
          documentCode="CF/PC-SAN-001-RG007"
          version="V.01"
          date={data.section1.date}
        />

        {/* Section 1: Basic Info */}
        <PDFSectionTitle 
          titleEn="Section 1 – Basic Info"
          titleEs="Sección 1 – Información Básica"
        />
        <View style={styles.section}>
          {/* Basic Info Fields */}
          <View style={{ marginBottom: 15 }}>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <Text style={{ fontSize: 9, fontWeight: 'bold', width: '40%', color: '#374151' }}>
                Date / Fecha:
              </Text>
              <Text style={{ fontSize: 9, width: '60%', color: '#111827' }}>
                {data.section1.date}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <Text style={{ fontSize: 9, fontWeight: 'bold', width: '40%', color: '#374151' }}>
                Shift / Turno:
              </Text>
              <Text style={{ fontSize: 9, width: '60%', color: '#111827' }}>
                {data.section1.shift}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <Text style={{ fontSize: 9, fontWeight: 'bold', width: '40%', color: '#374151' }}>
                Monitor Name / Nombre del Monitor:
              </Text>
              <Text style={{ fontSize: 9, width: '60%', color: '#111827' }}>
                {data.section1.monitorName}
              </Text>
            </View>
          </View>
          
          {/* Signature */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Monitor Signature / Firma del Monitor</Text>
              {data.section1.monitorSignature && (
                <Image
                  src={data.section1.monitorSignature}
                  style={styles.signatureImage}
                />
              )}
            </View>
          </View>
        </View>

        {/* Section 2: Measurements */}
        <PDFSectionTitle 
          titleEn="Section 2 – Measurements"
          titleEs="Sección 2 – Mediciones"
        />
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: '10%' }]}>#</Text>
            <Text style={[styles.tableHeaderText, { width: '15%' }]}>Hour / Hora</Text>
            <Text style={[styles.tableHeaderText, { width: '20%' }]}>Filter / Filtro</Text>
            <Text style={[styles.tableHeaderText, { width: '15%' }]}>PPM Value</Text>
            <Text style={[styles.tableHeaderText, { width: '40%' }]}>Corrective Action / Acción Correctiva</Text>
          </View>
          {data.section2.measurements.map((measurement, index) => (
            <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
              <Text style={[styles.tableCell, { width: '10%' }]}>{index + 1}</Text>
              <Text style={[styles.tableCell, { width: '15%' }]}>{measurement.hour}</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>{measurement.filter}</Text>
              <Text style={[styles.tableCell, { width: '15%' }]}>{measurement.measurePpmValue}</Text>
              <Text style={[styles.tableCell, { width: '40%' }]}>
                {measurement.correctiveAction || (measurement.measurePpmValue >= 200 ? 'N/A' : '')}
              </Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <PDFFooter />
      </Page>
    </Document>
  )
}

