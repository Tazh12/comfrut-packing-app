import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { 
  PDFStyles, 
  PDFHeader2Row, 
  PDFMetaInfo, 
  PDFFooter, 
  PDFSectionTitle,
  PDFStatusBadge,
  PDFStatusColors,
  PDFValidationBlock
} from '@/lib/pdf-layout'

const styles = StyleSheet.create({
  section: {
    marginBottom: 20
  },
  table: {
    width: '100%',
    marginBottom: 15,
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 6,
    minHeight: 28,
    alignItems: 'flex-start'
  },
  tableRowEven: {
    backgroundColor: '#F9FAFB'
  },
  colNum: {
    width: '6%',
    paddingHorizontal: 2,
    textAlign: 'center',
    fontSize: 9
  },
  colDescription: {
    width: '34%',
    paddingHorizontal: 4,
    fontSize: 9
  },
  colStatus: {
    width: '12%',
    paddingHorizontal: 2,
    textAlign: 'center',
    fontSize: 9
  },
  colObs: {
    width: '24%',
    paddingHorizontal: 4,
    fontSize: 9,
    flexWrap: 'wrap'
  },
  colCA: {
    width: '18%',
    paddingHorizontal: 4,
    fontSize: 9,
    flexWrap: 'wrap'
  },
  colCAStatus: {
    width: '10%',
    paddingHorizontal: 2,
    textAlign: 'center',
    fontSize: 9
  },
  itemNameEn: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2
  },
  itemNameEs: {
    fontSize: 8,
    color: '#6B7280'
  },
  itemDetails: {
    marginTop: 4,
    paddingLeft: 8,
    paddingTop: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#EF4444'
  },
  detailRow: {
    marginBottom: 4
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
    marginTop: 4,
    paddingLeft: 8,
    paddingTop: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#F59E0B'
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
          titleEn="Pre-Operational Review Processing Areas"
          titleEs="Áreas de procesamiento de revisión preoperacional"
          documentCode="CF/PC-ASC-017-RG001"
          version="V.01"
        />

        {/* Meta Info Block */}
        <PDFMetaInfo
          leftColumn={[
            { label: 'Date', value: data.section1.date },
            { label: 'Hour', value: data.section1.hour }
          ]}
          rightColumn={[
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

        {/* Section 2: Checklist Items */}
        <View style={styles.section}>
          <PDFSectionTitle 
            titleEn="Section 2 – Checklist Items"
            titleEs="Sección 2 – Elementos del Checklist"
          />
          
          {/* Table with checklist items */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colNum]}>#</Text>
              <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
              <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
              <Text style={[styles.tableHeaderText, styles.colObs]}>Obs</Text>
              <Text style={[styles.tableHeaderText, styles.colCA]}>Corrective Action</Text>
              <Text style={[styles.tableHeaderText, styles.colCAStatus]}>CA Status</Text>
            </View>

            {data.section2.items.map((item, index) => (
              <View key={item.id} style={[
                styles.tableRow,
                index % 2 === 0 ? styles.tableRowEven : {}
              ]}>
                <Text style={styles.colNum}>{index + 1}</Text>
                <View style={styles.colDescription}>
                  <Text style={styles.itemNameEn}>{item.nameEn}</Text>
                  <Text style={styles.itemNameEs}>{item.nameEs}</Text>
                </View>
                <View style={styles.colStatus}>
                  {item.comply !== null ? (
                    <PDFStatusBadge 
                      status={item.comply ? 'comply' : 'notComply'} 
                    />
                  ) : (
                    <Text style={{ fontSize: 8, color: '#9CA3AF' }}>N/A</Text>
                  )}
                </View>
                <Text style={styles.colObs}>{item.observation || '-'}</Text>
                <Text style={styles.colCA}>{item.correctiveAction || '-'}</Text>
                <View style={styles.colCAStatus}>
                  {item.correctiveActionComply !== null && item.correctiveActionComply !== undefined ? (
                    <PDFStatusBadge 
                      status={item.correctiveActionComply ? 'comply' : 'notComply'} 
                    />
                  ) : (
                    <Text style={{ fontSize: 8, color: '#9CA3AF' }}>-</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
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

