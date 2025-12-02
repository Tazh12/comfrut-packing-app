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
    backgroundColor: '#FAFAFA'
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
    fontSize: 7,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center'
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 26
  },
  tableRowEven: {
    backgroundColor: '#F9FAFB'
  },
  tableCell: {
    fontSize: 7,
    color: '#111827',
    textAlign: 'center'
  },
  // Fixed widths for table columns to prevent overlap
  // Total available width: 535px (A4 width 595 - padding 60)
  // Column widths must add up to ~535px
  cellHour: {
    width: 60,
    fontSize: 7
  },
  cellBF: {
    width: 40,
    fontSize: 7
  },
  cellBNF: {
    width: 45,
    fontSize: 7
  },
  cellBSS: {
    width: 45,
    fontSize: 7
  },
  cellSensitivity: {
    width: 80,
    fontSize: 7
  },
  cellNoiseAlarm: {
    width: 85,
    fontSize: 7
  },
  cellRejectingArm: {
    width: 90,
    fontSize: 7
  },
  deviationRow: {
    backgroundColor: '#FEE2E2',
    flexDirection: 'column',
    padding: 12,
    marginTop: 0,
    marginBottom: 0,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    width: 535,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  deviationSection: {
    marginBottom: 10,
    width: 510
  },
  deviationLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#991B1B',
    marginBottom: 5
  },
  deviationText: {
    fontSize: 8,
    color: '#111827',
    lineHeight: 1.5
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

export interface ChecklistMetalDetectorPDFProps {
  data: {
    section1: {
      date: string
      processLine: string
      metalDetectorId: string
      metalDetectorStartTime: string
      metalDetectorFinishTime: string
      orden: string
      brand: string
      product: string
      monitorName: string
      monitorSignature: string
    }
    section2: {
      readings: Array<{
        hour: string
        bf: string
        bnf: string
        bss: string
        sensitivity: string
        noiseAlarm: string
        rejectingArm: string
        observation: string
        correctiveActions: string
      }>
    }
  }
}

export const ChecklistMetalDetectorPDFDocument: React.FC<ChecklistMetalDetectorPDFProps> = ({ data }) => {
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
          titleEn="Metal Detector PCC#1 Control"
          titleEs="Control PCC#1 detector de metales"
          documentCode="CF/PC-PL-HACCP-001-RG001"
          version="V.01"
          date={data.section1.date}
        />

        {/* Meta Info Block */}
        <PDFMetaInfo
          leftColumn={[
            { label: 'Date', value: data.section1.date },
            { label: 'Process Line', value: data.section1.processLine },
            { label: 'Metal Detector ID', value: data.section1.metalDetectorId },
            { label: 'Start Time', value: data.section1.metalDetectorStartTime },
            { label: 'Finish Time', value: data.section1.metalDetectorFinishTime }
          ]}
          rightColumn={[
            { label: 'Orden', value: data.section1.orden },
            { label: 'Brand', value: data.section1.brand },
            { label: 'Product', value: data.section1.product },
            { label: 'Monitor Name', value: data.section1.monitorName }
          ]}
        />

        {/* Signature */}
        <View style={styles.signatureBox}>
          <Text style={styles.signatureLabel}>Monitor Signature</Text>
          {data.section1.monitorSignature ? (
            <Image src={data.section1.monitorSignature} style={styles.signatureImage} />
          ) : (
            <Text style={{ fontSize: 8, color: '#9CA3AF' }}>No signature provided</Text>
          )}
        </View>

        {/* Section 2: Metal Detector Readings */}
        <View style={styles.section}>
          <PDFSectionTitle 
            titleEn="Section 2 – Metal Detector Readings"
            titleEs="Sección 2 – Lecturas del detector de metales"
          />
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.cellHour]}>Hour</Text>
              <Text style={[styles.tableHeaderText, styles.cellBF]}>BF</Text>
              <Text style={[styles.tableHeaderText, styles.cellBNF]}>B.NF</Text>
              <Text style={[styles.tableHeaderText, styles.cellBSS]}>B.S.S</Text>
              <Text style={[styles.tableHeaderText, styles.cellSensitivity]}>Sensitivity</Text>
              <Text style={[styles.tableHeaderText, styles.cellNoiseAlarm]}>Noise Alarm</Text>
              <Text style={[styles.tableHeaderText, styles.cellRejectingArm]}>Rejecting Arm</Text>
            </View>
            {data.section2.readings.map((reading, index) => {
              const hasDeviation = reading.bf === 'ND' || reading.bnf === 'ND' || reading.bss === 'ND' || 
                                   reading.sensitivity === 'No comply' || reading.noiseAlarm === 'No comply' || 
                                   reading.rejectingArm === 'No comply'
              
              return (
                <React.Fragment key={index}>
                  <View style={[
                    styles.tableRow,
                    index % 2 === 0 ? styles.tableRowEven : {}
                  ]}>
                    <Text style={[styles.tableCell, styles.cellHour]}>{reading.hour || '-'}</Text>
                    <Text style={[styles.tableCell, styles.cellBF]}>{reading.bf || '-'}</Text>
                    <Text style={[styles.tableCell, styles.cellBNF]}>{reading.bnf || '-'}</Text>
                    <Text style={[styles.tableCell, styles.cellBSS]}>{reading.bss || '-'}</Text>
                    <Text style={[styles.tableCell, styles.cellSensitivity]}>{reading.sensitivity || '-'}</Text>
                    <Text style={[styles.tableCell, styles.cellNoiseAlarm]}>{reading.noiseAlarm || '-'}</Text>
                    <Text style={[styles.tableCell, styles.cellRejectingArm]}>{reading.rejectingArm || '-'}</Text>
                  </View>
                  {hasDeviation && (reading.observation || reading.correctiveActions) && (
                    <View style={styles.deviationRow}>
                      <View style={styles.deviationSection}>
                        <Text style={styles.deviationLabel}>Observation:</Text>
                        <Text style={styles.deviationText}>
                          {reading.observation || '-'}
                        </Text>
                      </View>
                      <View style={styles.deviationSection}>
                        <Text style={styles.deviationLabel}>Corrective Actions:</Text>
                        <Text style={styles.deviationText}>
                          {reading.correctiveActions || '-'}
                        </Text>
                      </View>
                    </View>
                  )}
                </React.Fragment>
              )
            })}
          </View>
        </View>

        {/* Footer */}
        <PDFFooter creationTimestamp={creationDate} />
      </Page>
    </Document>
  )
}

