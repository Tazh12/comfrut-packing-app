import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { 
  PDFStyles, 
  PDFHeader2Row, 
  PDFMetaInfo, 
  PDFFooter, 
  PDFSectionTitle,
  PDFValidationBlock
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
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 30
  },
  tableRowEven: {
    backgroundColor: '#F9FAFB'
  },
  tableCell: {
    fontSize: 8,
    color: '#111827',
    paddingHorizontal: 2
  },
  cellHour: { width: '12%' },
  cellDescription: { width: '25%', flex: 1 },
  cellPallet: { width: '12%' },
  cellProductCode: { width: '12%' },
  cellElementType: { width: '20%' },
  cellAmount: { width: '10%' },
  noFindingsBox: {
    backgroundColor: '#D1FAE5',
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 4,
    padding: 15,
    marginTop: 10,
    marginBottom: 15
  },
  noFindingsText: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#065F46',
    marginBottom: 5
  },
  noFindingsSubtext: {
    fontSize: 9,
    textAlign: 'center',
    color: '#047857'
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
        <PDFHeader2Row
          titleEn="Foreign Material Findings Record"
          titleEs="Record de hallazgos de materia extraña"
          documentCode="CF/PC-PPR-002-RG002"
          version="V.01"
        />

        {/* Meta Info Block */}
        <PDFMetaInfo
          leftColumn={[
            { label: 'Date', value: data.section1.date },
            { label: 'Brand', value: data.section1.brand },
            { label: 'Product', value: data.section1.product }
          ]}
          rightColumn={[
            { label: 'Shift', value: data.section1.shift },
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

        {/* Section 2: Findings */}
        <View style={styles.section}>
          <PDFSectionTitle 
            titleEn="Section 2 – Findings"
            titleEs="Sección 2 – Hallazgos"
          />
          
          {data.section2.noFindings ? (
            <View style={styles.noFindingsBox}>
              <Text style={styles.noFindingsText}>No Findings</Text>
              <Text style={styles.noFindingsSubtext}>
                No foreign material findings were detected during this inspection.
              </Text>
              <Text style={[styles.noFindingsSubtext, { fontSize: 8, color: '#6B7280', marginTop: 4 }]}>
                No se detectaron hallazgos de materia extraña durante esta inspección.
              </Text>
            </View>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.cellHour]}>Hour</Text>
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
                  <View key={index} style={[
                    styles.tableRow,
                    index % 2 === 0 ? styles.tableRowEven : {}
                  ]}>
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

        {/* Validation Section */}
        <PDFValidationBlock
          data={{
            signature: undefined
          }}
        />

        {/* Footer */}
        <PDFFooter />
      </Page>
    </Document>
  )
}

