import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { 
  PDFStyles, 
  PDFHeader, 
  PDFMetaInfo, 
  PDFFooter, 
  PDFSectionTitle,
  PDFStatusBadge,
  PDFStatusColors
} from '@/lib/pdf-layout'

const styles = StyleSheet.create({
  section: {
    marginBottom: 20
  },
  areaSection: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    padding: 8
  },
  areaTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8
  },
  partRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 4,
    minHeight: 20,
    alignItems: 'flex-start'
  },
  partName: {
    width: '40%',
    fontSize: 9,
    paddingHorizontal: 4
  },
  partStatus: {
    width: '15%',
    paddingHorizontal: 2,
    textAlign: 'center'
  },
  partDetails: {
    width: '45%',
    paddingHorizontal: 4,
    fontSize: 8
  },
  detailRow: {
    marginBottom: 2
  },
  detailLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#374151'
  },
  detailValue: {
    fontSize: 8,
    color: '#111827',
    lineHeight: 1.3
  },
  bioluminescenceTable: {
    width: '100%',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4
  },
  bioluminescenceHeader: {
    flexDirection: 'row',
    backgroundColor: '#005F9E',
    padding: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4
  },
  bioluminescenceHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    width: '20%'
  },
  bioluminescenceRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 4,
    minHeight: 25
  },
  bioluminescenceCell: {
    width: '20%',
    paddingHorizontal: 4,
    fontSize: 9,
    textAlign: 'center'
  },
  rluCell: {
    width: '20%',
    paddingHorizontal: 4,
    fontSize: 9,
    textAlign: 'center',
    fontWeight: 'bold'
  },
  rluAccept: {
    backgroundColor: '#D1FAE5',
    color: '#065F46'
  },
  rluCaution: {
    backgroundColor: '#FEF3C7',
    color: '#92400E'
  },
  rluReject: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B'
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

export interface ChecklistCleanlinessControlPackingPDFProps {
  data: {
    section1: {
      date: string
      monitorName: string
      monitorSignature: string
    }
    section2: {
      areas: Array<{
        areaName: string
        parts: Array<{
          partName: string
          comply: boolean | null
          observation?: string
          correctiveAction?: string
          correctiveActionComply?: boolean | null
        }>
      }>
    }
    section3: {
      bioluminescenceResults: Array<{
        partName: string
        rlu: string
        retestRlu?: string
      }>
    }
  }
}

// ACCEPT: <20 (RLU) - 0 to 19
// CAUTION: 21-59 (RLU) - but treating 20 as CAUTION per user requirement, so 20-60
// REJECTS: >60 (RLU) - 61 and above
const getRLUStatus = (rlu: string): 'accept' | 'caution' | 'reject' | 'empty' => {
  if (!rlu || rlu.trim() === '') return 'empty'
  const rluNum = parseFloat(rlu)
  if (isNaN(rluNum)) return 'empty'
  if (rluNum < 20) return 'accept'
  if (rluNum >= 20 && rluNum <= 60) return 'caution'
  return 'reject'
}

const getRLUStyle = (rlu: string) => {
  const status = getRLUStatus(rlu)
  switch (status) {
    case 'accept':
      return styles.rluAccept
    case 'caution':
      return styles.rluCaution
    case 'reject':
      return styles.rluReject
    default:
      return {}
  }
}

const getRLUText = (rlu: string): string => {
  const status = getRLUStatus(rlu)
  switch (status) {
    case 'accept':
      return 'ACCEPT'
    case 'caution':
      return 'CAUTION'
    case 'reject':
      return 'REJECTS'
    default:
      return ''
  }
}

export const ChecklistCleanlinessControlPackingPDFDocument: React.FC<ChecklistCleanlinessControlPackingPDFProps> = ({ data }) => {
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
          titleEn="Cleanliness Control Packing"
          titleEs="Control de limpieza de empaque"
          documentCode="CF/PC-PG-SAN-001-RG005"
          version="V.01"
          date={data.section1.date}
        />

        {/* Meta Info Block */}
        <PDFMetaInfo
          leftColumn={[
            { label: 'Date', value: data.section1.date }
          ]}
          rightColumn={[
            { label: 'Monitor Name', value: data.section1.monitorName }
          ]}
        />

        {/* Section 1: Basic Info */}
        <View style={styles.section}>
          <PDFSectionTitle titleEn="Section 1 – Basic Info" />
          
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

        {/* Section 2: Areas and Parts Inspected */}
        <View style={styles.section}>
          <PDFSectionTitle titleEn="Section 2 – Areas and Parts Inspected" />
          
          {data.section2.areas.map((area, areaIndex) => (
            <View key={areaIndex} style={styles.areaSection}>
              <Text style={styles.areaTitle}>{area.areaName}</Text>
              
              {area.parts.map((part, partIndex) => (
                <View key={partIndex} style={styles.partRow}>
                  <Text style={styles.partName}>{part.partName}</Text>
                  <View style={styles.partStatus}>
                    {part.comply !== null && (
                      <PDFStatusBadge status={part.comply ? 'comply' : 'notComply'} />
                    )}
                  </View>
                  <View style={styles.partDetails}>
                    {part.comply === false && (
                      <>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Observation:</Text>
                          <Text style={styles.detailValue}>{part.observation || '-'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Corrective Action:</Text>
                          <Text style={styles.detailValue}>{part.correctiveAction || '-'}</Text>
                        </View>
                        {part.correctiveActionComply !== null && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>CA Status:</Text>
                            <PDFStatusBadge status={part.correctiveActionComply ? 'comply' : 'notComply'} />
                          </View>
                        )}
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Section 3: Critical Limits Result of Bioluminescence */}
        <View style={styles.section}>
          <PDFSectionTitle titleEn="Section 3 – Critical Limits Result of Bioluminescence" />
          
          <View style={styles.bioluminescenceTable}>
            <View style={styles.bioluminescenceHeader}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Text key={i} style={styles.bioluminescenceHeaderText}>
                  Column {i + 1}
                </Text>
              ))}
            </View>
            
            {/* Row 1: Part Names */}
            <View style={styles.bioluminescenceRow}>
              {Array.from({ length: 5 }).map((_, i) => {
                const result = data.section3.bioluminescenceResults[i] || { partName: '', rlu: '' }
                return (
                  <Text key={i} style={styles.bioluminescenceCell}>
                    {result.partName || '-'}
                  </Text>
                )
              })}
            </View>
            
            {/* Row 2: RLU Values */}
            <View style={styles.bioluminescenceRow}>
              {Array.from({ length: 5 }).map((_, i) => {
                const result = data.section3.bioluminescenceResults[i] || { partName: '', rlu: '' }
                const rluStyle = getRLUStyle(result.rlu)
                return (
                  <View key={i} style={[styles.rluCell, rluStyle]}>
                    <Text>{result.rlu || '-'}</Text>
                    {result.rlu && (
                      <Text style={{ fontSize: 7, marginTop: 2 }}>
                        {getRLUText(result.rlu)}
                      </Text>
                    )}
                  </View>
                )
              })}
            </View>
            {/* Row 3: Retest RLU (only for CAUTION or REJECTS) */}
            {(data.section3.bioluminescenceResults.some((result) => {
              const status = getRLUStatus(result.rlu)
              return (status === 'caution' || status === 'reject')
            })) && (
              <View style={styles.bioluminescenceRow}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const result = data.section3.bioluminescenceResults[i] || { partName: '', rlu: '' }
                  const status = getRLUStatus(result.rlu)
                  const needsRetest = status === 'caution' || status === 'reject'
                  
                  if (!needsRetest) {
                    return <View key={i} style={styles.rluCell}></View>
                  }
                  
                  const retestRlu = result.retestRlu || ''
                  const retestStyle = getRLUStyle(retestRlu)
                  
                  return (
                    <View key={i} style={[styles.rluCell, retestStyle]}>
                      <Text style={{ fontSize: 7, marginBottom: 2, fontWeight: 'bold' }}>Retest:</Text>
                      <Text>{retestRlu || '-'}</Text>
                      {retestRlu && (
                        <Text style={{ fontSize: 7, marginTop: 2 }}>
                          {getRLUText(retestRlu)}
                        </Text>
                      )}
                    </View>
                  )
                })}
              </View>
            )}
          </View>

          <View style={{ marginTop: 10, padding: 8, backgroundColor: '#EFF6FF', borderRadius: 4 }}>
            <Text style={{ fontSize: 8, color: '#1E40AF' }}>
              <Text style={{ fontWeight: 'bold' }}>Limits:</Text> ACCEPT: &lt;20 (RLU) - Green | CAUTION: 21-59 (RLU) - Yellow | REJECTS: &gt;60 (RLU) - Red
            </Text>
          </View>
        </View>

        {/* Footer */}
        <PDFFooter creationTimestamp={creationDate} />
      </Page>
    </Document>
  )
}
