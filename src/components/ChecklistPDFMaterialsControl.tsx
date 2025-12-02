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
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#111827',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 4
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingVertical: 3
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    width: '40%',
    color: '#374151'
  },
  infoValue: {
    fontSize: 9,
    width: '60%',
    color: '#111827'
  },
  signatureBox: {
    width: '45%',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    padding: 5,
    minHeight: 80
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
  personnelContainer: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#FAFAFA'
  },
  handedOutSection: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 4
  },
  returnedSection: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 4
  },
  sectionHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#1E40AF'
  },
  returnedSectionHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#166534'
  },
  personnelHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 4
  },
  materialRow: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingVertical: 2
  },
  materialLabel: {
    fontSize: 8,
    width: '30%',
    color: '#374151',
    fontWeight: 'bold'
  },
  materialValue: {
    fontSize: 8,
    width: '70%',
    color: '#111827'
  },
  statusBadge: {
    padding: 2,
    borderRadius: 2,
    width: 70,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusGood: {
    backgroundColor: '#D1FAE5',
    color: '#065F46'
  },
  statusBad: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B'
  },
  observationBox: {
    marginTop: 4,
    padding: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  observationText: {
    fontSize: 7,
    color: '#6B7280'
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
    marginBottom: 8,
    paddingTop: 8
  },
  afterShiftTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#374151'
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
  pageBreak: {
    marginTop: 20,
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  }
})

interface ChecklistMaterialsControlPDFProps {
  data: {
    section1: {
      date: string
      productiveArea: string
      lineManagerName: string
      monitorName: string
      monitorSignature: string
    }
    section2: {
      personnelMaterials: Array<{
        personName: string
        material: string
        quantity: number
        materialStatus: string
        observation: string
        returnMotive: string
        quantityReceived: number
        materialStatusReceived: string
        observationReceived: string
      }>
    }
  }
}

const PersonnelMaterialSection: React.FC<{
  personnel: ChecklistMaterialsControlPDFProps['data']['section2']['personnelMaterials'][0]
  index: number
}> = ({ personnel, index }) => {
  const isGoodStatus = personnel.materialStatus === 'Good/Bueno'
  const isGoodStatusReceived = personnel.materialStatusReceived === 'Good/Bueno'

  return (
    <View style={styles.personnelContainer}>
      <Text style={styles.personnelHeader}>
        Personnel #{index + 1}: {personnel.personName}
      </Text>
      
      {/* Material Handed Out Section */}
      <View style={styles.handedOutSection}>
        <Text style={styles.sectionHeader}>📤 Material Handed Out / Material Entregado</Text>
        
        <View style={styles.materialRow}>
          <Text style={styles.materialLabel}>Material:</Text>
          <Text style={styles.materialValue}>{personnel.material}</Text>
        </View>
        
        <View style={styles.materialRow}>
          <Text style={styles.materialLabel}>Quantity:</Text>
          <Text style={styles.materialValue}>{personnel.quantity}</Text>
        </View>
        
        <View style={styles.materialRow}>
          <Text style={styles.materialLabel}>Material Status:</Text>
          <View style={[styles.statusBadge, isGoodStatus ? styles.statusGood : styles.statusBad]}>
            <Text style={{ fontSize: 7, textAlign: 'center', color: isGoodStatus ? '#065F46' : '#991B1B' }}>
              {personnel.materialStatus}
            </Text>
          </View>
        </View>
        
        {/* Observation if exists */}
        {personnel.observation && (
          <View style={styles.observationBox}>
            <Text style={styles.observationText}>
              <Text style={{ fontWeight: 'bold' }}>Observation: </Text>
              {personnel.observation}
            </Text>
          </View>
        )}
      </View>

      {/* Material Returned Section */}
      <View style={styles.returnedSection}>
        <Text style={styles.returnedSectionHeader}>📥 Material Returned / Material Devuelto</Text>
        
        <View style={styles.materialRow}>
          <Text style={styles.materialLabel}>Return Motive:</Text>
          <Text style={styles.materialValue}>{personnel.returnMotive}</Text>
        </View>
        
        <View style={styles.materialRow}>
          <Text style={styles.materialLabel}>Quantity Received:</Text>
          <Text style={styles.materialValue}>{personnel.quantityReceived}</Text>
        </View>
        
        <View style={styles.materialRow}>
          <Text style={styles.materialLabel}>Material Status Received:</Text>
          <View style={[styles.statusBadge, isGoodStatusReceived ? styles.statusGood : styles.statusBad]}>
            <Text style={{ fontSize: 7, textAlign: 'center', color: isGoodStatusReceived ? '#065F46' : '#991B1B' }}>
              {personnel.materialStatusReceived}
            </Text>
          </View>
        </View>
        
        {/* Observation Received if exists */}
        {personnel.observationReceived && (
          <View style={styles.observationBox}>
            <Text style={styles.observationText}>
              <Text style={{ fontWeight: 'bold' }}>Observation Received: </Text>
              {personnel.observationReceived}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

export const ChecklistMaterialsControlPDFDocument: React.FC<ChecklistMaterialsControlPDFProps> = ({ data }) => {
  const personnelPerPage = 3 // Adjust based on content size
  const totalPages = Math.ceil(data.section2.personnelMaterials.length / personnelPerPage)

  const pages = []
  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const startIndex = pageIndex * personnelPerPage
    const endIndex = Math.min(startIndex + personnelPerPage, data.section2.personnelMaterials.length)
    const pagePersonnel = data.section2.personnelMaterials.slice(startIndex, endIndex)

    pages.push(
      <Page key={pageIndex} size="A4" style={styles.page}>
        <Text style={styles.title}>Internal control of materials used in production areas</Text>
        <Text style={styles.subtitle}>Control interno de materiales usados en áreas productivas</Text>
        <Text style={styles.subtitle}>Code: CF/PC-ASC-004-RG008</Text>

        {/* Section 1: Basic Info - Only show on first page */}
        {pageIndex === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Section 1 – Basic Info</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>{data.section1.date}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Productive Area:</Text>
              <Text style={styles.infoValue}>{data.section1.productiveArea}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Line Manager Name:</Text>
              <Text style={styles.infoValue}>{data.section1.lineManagerName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Monitor Name:</Text>
              <Text style={styles.infoValue}>{data.section1.monitorName}</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Monitor Signature:</Text>
              {data.section1.monitorSignature ? (
                <Image src={data.section1.monitorSignature} style={styles.signatureImage} />
              ) : (
                <Text style={{ fontSize: 8, color: '#9CA3AF' }}>No signature provided</Text>
              )}
            </View>
          </View>
        )}

        {/* Section 2: Personnel Materials */}
        <View style={styles.section}>
          {pageIndex === 0 && (
            <Text style={styles.sectionTitle}>Section 2 – Personnel Materials</Text>
          )}
          {pagePersonnel.map((personnel, idx) => (
            <PersonnelMaterialSection
              key={startIndex + idx}
              personnel={personnel}
              index={startIndex + idx}
            />
          ))}
        </View>

        <Text style={styles.footer}>
          This document is part of Comfrut's quality management system.
          {totalPages > 1 && ` Page ${pageIndex + 1} of ${totalPages}`}
        </Text>
      </Page>
    )
  }

  return <Document>{pages}</Document>
}

