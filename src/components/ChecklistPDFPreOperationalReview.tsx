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
  itemContainer: {
    marginBottom: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    backgroundColor: '#FAFAFA'
  },
  itemHeader: {
    flexDirection: 'row',
    marginBottom: 6
  },
  itemNumber: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#111827',
    marginRight: 6,
    width: 20
  },
  itemName: {
    fontSize: 9,
    color: '#111827',
    flex: 1
  },
  itemStatus: {
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginLeft: 8
  },
  statusComply: {
    backgroundColor: '#10B981',
    color: '#FFFFFF'
  },
  statusNotComply: {
    backgroundColor: '#EF4444',
    color: '#FFFFFF'
  },
  itemDetails: {
    marginTop: 6,
    paddingLeft: 26,
    paddingTop: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#EF4444'
  },
  detailRow: {
    marginBottom: 6
  },
  detailLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2
  },
  detailValue: {
    fontSize: 8,
    color: '#111827',
    lineHeight: 1.4
  },
  correctiveActionStatus: {
    marginTop: 6,
    paddingLeft: 8,
    paddingTop: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#F59E0B'
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
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 8,
    color: '#6B7280',
    textAlign: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  }
})

export interface ChecklistPreOperationalReviewPDFProps {
  data: {
    section1: {
      date: string
      hour: string
      brand: string
      product: string
      monitorName: string
      monitorSignature: string
    }
    section2: {
      items: Array<{
        id: string
        nameEn: string
        nameEs: string
        comply: boolean | null
        observation?: string
        correctiveAction?: string
        correctiveActionComply?: boolean | null
        correctiveActionObservation?: string
      }>
    }
  }
}

export const ChecklistPreOperationalReviewPDFDocument: React.FC<ChecklistPreOperationalReviewPDFProps> = ({ data }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          Pre-Operational Review Processing Areas / Áreas de procesamiento de revisión preoperacional
        </Text>
        <Text style={styles.subtitle}>Code: CF/PC-ASC-017-RG001</Text>

        {/* Section 1: Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Section 1 – Basic Info / Información Básica</Text>
          
          {/* Two Column Layout */}
          <View style={styles.twoColumnContainer}>
            {/* Left Column */}
            <View style={styles.column}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date / Fecha:</Text>
                <Text style={styles.infoValue}>{data.section1.date}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Hour / Hora:</Text>
                <Text style={styles.infoValue}>{data.section1.hour}</Text>
              </View>
            </View>

            {/* Right Column */}
            <View style={[styles.column, { marginRight: 0 }]}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Brand / Marca:</Text>
                <Text style={styles.infoValue}>{data.section1.brand}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Product / Producto:</Text>
                <Text style={styles.infoValue}>{data.section1.product}</Text>
              </View>
            </View>
          </View>

          {/* Monitor Name */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Monitor Name / Nombre del Monitor:</Text>
            <Text style={styles.infoValue}>{data.section1.monitorName}</Text>
          </View>

          {/* Signature - Full Width */}
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Monitor Signature / Firma del Monitor:</Text>
            {data.section1.monitorSignature ? (
              <Image src={data.section1.monitorSignature} style={styles.signatureImage} />
            ) : (
              <Text style={{ fontSize: 8, color: '#9CA3AF' }}>No signature provided</Text>
            )}
          </View>
        </View>

        {/* Section 2: Checklist Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Section 2 – Checklist Items / Elementos del Checklist</Text>
          
          {data.section2.items.map((item, index) => (
            <View key={item.id} style={styles.itemContainer}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNumber}>{index + 1}.</Text>
                <Text style={styles.itemName}>
                  {item.nameEn} / {item.nameEs}
                </Text>
                <View style={[
                  styles.itemStatus,
                  item.comply === true ? styles.statusComply : 
                  item.comply === false ? styles.statusNotComply : 
                  { backgroundColor: '#9CA3AF', color: '#FFFFFF' }
                ]}>
                  <Text>
                    {item.comply === true ? 'Comply' : 
                     item.comply === false ? 'Not Comply' : 'N/A'}
                  </Text>
                </View>
              </View>

              {item.comply === false && (
                <View style={styles.itemDetails}>
                  {item.observation && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Observation / Observación:</Text>
                      <Text style={styles.detailValue}>{item.observation}</Text>
                    </View>
                  )}

                  {item.correctiveAction && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Corrective Action / Acción Correctiva:</Text>
                      <Text style={styles.detailValue}>{item.correctiveAction}</Text>
                    </View>
                  )}

                  {item.correctiveActionComply !== null && item.correctiveActionComply !== undefined && (
                    <View style={styles.correctiveActionStatus}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>
                          Corrective Action Status / Estado de Acción Correctiva:
                        </Text>
                        <View style={[
                          styles.itemStatus,
                          item.correctiveActionComply === true ? styles.statusComply : styles.statusNotComply,
                          { marginTop: 4, alignSelf: 'flex-start' }
                        ]}>
                          <Text>
                            {item.correctiveActionComply === true ? 'Comply' : 'Not Comply'}
                          </Text>
                        </View>
                      </View>

                      {item.correctiveActionComply === false && item.correctiveActionObservation && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>
                            Corrective Action Observation / Observación de Acción Correctiva:
                          </Text>
                          <Text style={styles.detailValue}>{item.correctiveActionObservation}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          This document is part of Comfrut's quality management system.
        </Text>
      </Page>
    </Document>
  )
}

