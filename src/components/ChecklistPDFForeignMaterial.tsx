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
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#D1D5DB'
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#111827'
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 30
  },
  tableCell: {
    fontSize: 8,
    color: '#111827',
    paddingHorizontal: 2
  },
  cellHour: { width: 60 },
  cellDescription: { width: 150, flex: 1 },
  cellPallet: { width: 80 },
  cellProductCode: { width: 80 },
  cellElementType: { width: 100 },
  cellAmount: { width: 60 },
  noFindingsBox: {
    backgroundColor: '#DBEAFE',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 4,
    padding: 15,
    marginTop: 10,
    marginBottom: 15
  },
  noFindingsText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1E40AF',
    marginBottom: 5
  },
  noFindingsSubtext: {
    fontSize: 9,
    textAlign: 'center',
    color: '#1E3A8A'
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    fontSize: 8,
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 20
  }
})

// Element type labels mapping
const ELEMENT_TYPE_LABELS: Record<string, string> = {
  hair: 'Hair / Pelos',
  insects: 'Insects / Insectos',
  vegetal_matter: 'Vegetal matter / Material vegetal',
  paper: 'Paper / Papel',
  hard_plastic: 'Hard Plastic / Plástico duro',
  pit: 'Pit / Cuesco',
  metal_piece: 'Metal piece / Pieza de metal',
  product_mixed: 'Product mixed / Mezcla producto',
  wood: 'Wood / Madera',
  dirt: 'Dirt / Tierra',
  stone: 'Stone / Piedra',
  cardboard: 'Cardboard / Cartón',
  tape: 'Tape / Fibra de cinta',
  textile_fibres: 'Textile fibres / Fibra textil',
  spiders: 'Spiders / Arañas',
  feathers: 'Feathers / Plumas',
  worms_larvae: 'Worms-larvae / Gusanos-larvas',
  slug_snail: 'Babosas-caracol / Slug-snail',
  soft_plastic: 'Soft plastic / Plástico blando',
  other: 'Other / Otro'
}

export interface ChecklistForeignMaterialPDFProps {
  data: {
    section1: {
      date: string
      brand: string
      product: string
      shift: string
      monitorName: string
      monitorSignature: string
    }
    section2: {
      noFindings: boolean
      findings: Array<{
        hourFrom: string
        hourTo: string
        findingDescription: string
        palletNumberIngredient: string
        productCode: string
        elementType: string
        otherElementType: string
        totalAmount: string
      }>
    }
  }
}

export const ChecklistForeignMaterialPDFDocument: React.FC<ChecklistForeignMaterialPDFProps> = ({ data }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          Foreign material findings record / Record de hallazgos de materia extraña
        </Text>
        <Text style={styles.subtitle}>Code: CF/PC-PPR-002-RG002</Text>

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
                <Text style={styles.infoLabel}>Brand / Marca:</Text>
                <Text style={styles.infoValue}>{data.section1.brand}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Product / Producto:</Text>
                <Text style={styles.infoValue}>{data.section1.product}</Text>
              </View>
            </View>

            {/* Right Column */}
            <View style={[styles.column, { marginRight: 0 }]}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Shift / Turno:</Text>
                <Text style={styles.infoValue}>{data.section1.shift}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Monitor Name / Nombre del Monitor:</Text>
                <Text style={styles.infoValue}>{data.section1.monitorName}</Text>
              </View>
            </View>
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

        {/* Section 2: Findings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Section 2 – Findings / Hallazgos</Text>
          
          {data.section2.noFindings ? (
            <View style={styles.noFindingsBox}>
              <Text style={styles.noFindingsText}>No Findings / Sin Hallazgos</Text>
              <Text style={styles.noFindingsSubtext}>
                No foreign material findings were detected during this inspection.
              </Text>
              <Text style={styles.noFindingsSubtext}>
                No se detectaron hallazgos de materia extraña durante esta inspección.
              </Text>
            </View>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.cellHour]}>Hour From/To</Text>
                <Text style={[styles.tableHeaderText, styles.cellDescription]}>Description</Text>
                <Text style={[styles.tableHeaderText, styles.cellPallet]}>Pallet #</Text>
                <Text style={[styles.tableHeaderText, styles.cellProductCode]}>Product Code</Text>
                <Text style={[styles.tableHeaderText, styles.cellElementType]}>Element Type</Text>
                <Text style={[styles.tableHeaderText, styles.cellAmount]}>Amount</Text>
              </View>
              {data.section2.findings.map((finding, index) => {
                const elementTypeLabel = finding.elementType === 'other' 
                  ? finding.otherElementType || 'Other'
                  : ELEMENT_TYPE_LABELS[finding.elementType] || finding.elementType
                
                return (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.cellHour]}>
                      {finding.hourFrom || '-'} - {finding.hourTo || '-'}
                    </Text>
                    <Text style={[styles.tableCell, styles.cellDescription]}>
                      {finding.findingDescription || '-'}
                    </Text>
                    <Text style={[styles.tableCell, styles.cellPallet]}>
                      {finding.palletNumberIngredient || '-'}
                    </Text>
                    <Text style={[styles.tableCell, styles.cellProductCode]}>
                      {finding.productCode || '-'}
                    </Text>
                    <Text style={[styles.tableCell, styles.cellElementType]}>
                      {elementTypeLabel}
                    </Text>
                    <Text style={[styles.tableCell, styles.cellAmount]}>
                      {finding.totalAmount || '-'}
                    </Text>
                  </View>
                )
              })}
            </View>
          )}
        </View>

        <Text style={styles.footer}>
          This document is part of Comfrut's quality management system.
        </Text>
      </Page>
    </Document>
  )
}

