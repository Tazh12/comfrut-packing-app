import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'

// Registrar fuentes
Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf' },
    { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' }
  ]
})

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Roboto',
    backgroundColor: '#ffffff',
    fontSize: 10
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    color: '#005F9E'
  },
  subtitle: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 20,
    color: '#4B5563'
  },
  section: {
    marginBottom: 25
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#111827',
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 4
  },
  twoColumnContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    width: 535
  },
  column: {
    width: 257,
    marginRight: 21
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingVertical: 4,
    minHeight: 20
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    width: 110,
    color: '#374151',
    paddingRight: 8
  },
  infoValue: {
    fontSize: 9,
    width: 150,
    color: '#111827'
  },
  signatureBox: {
    width: 535,
    marginTop: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    padding: 10,
    minHeight: 90
  },
  signatureLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#4B5563'
  },
  signatureImage: {
    width: '100%',
    maxHeight: 60,
    objectFit: 'contain'
  },
  table: {
    marginTop: 10,
    marginBottom: 15,
    width: 535
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    width: 535
  },
  tableHeaderText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center'
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 26,
    width: 535
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
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Metal detector PCC#1 control / Control PCC#1 detector de metales</Text>
        <Text style={styles.subtitle}>Code: CF/PC-PL-HACCP-001-RG001</Text>

        {/* Section 1: Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Section 1 – Basic Info</Text>
          
          {/* Two Column Layout */}
          <View style={styles.twoColumnContainer}>
            {/* Left Column */}
            <View style={styles.column}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date:</Text>
                <Text style={styles.infoValue}>{data.section1.date}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Process Line:</Text>
                <Text style={styles.infoValue}>{data.section1.processLine}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Metal Detector ID:</Text>
                <Text style={styles.infoValue}>{data.section1.metalDetectorId}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Start Time:</Text>
                <Text style={styles.infoValue}>{data.section1.metalDetectorStartTime}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Finish Time:</Text>
                <Text style={styles.infoValue}>{data.section1.metalDetectorFinishTime}</Text>
              </View>
            </View>

            {/* Right Column */}
            <View style={[styles.column, { marginRight: 0 }]}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Orden:</Text>
                <Text style={styles.infoValue}>{data.section1.orden}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Brand:</Text>
                <Text style={styles.infoValue}>{data.section1.brand}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Product:</Text>
                <Text style={styles.infoValue}>{data.section1.product}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Monitor Name:</Text>
                <Text style={styles.infoValue}>{data.section1.monitorName}</Text>
              </View>
            </View>
          </View>

          {/* Signature - Full Width */}
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Monitor Signature:</Text>
            {data.section1.monitorSignature ? (
              <Image src={data.section1.monitorSignature} style={styles.signatureImage} />
            ) : (
              <Text style={{ fontSize: 8, color: '#9CA3AF' }}>No signature provided</Text>
            )}
          </View>
        </View>

        {/* Section 2: Metal Detector Readings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Section 2 – Metal Detector Readings</Text>
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
                  <View style={styles.tableRow}>
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

        <Text style={styles.footer}>
          This document is part of Comfrut's quality management system.
        </Text>
      </Page>
    </Document>
  )
}

