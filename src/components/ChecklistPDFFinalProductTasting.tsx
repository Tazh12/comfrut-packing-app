import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { 
  PDFStyles, 
  PDFHeader2Row, 
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
  tableHeaderCellNumber: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tableHeaderCellName: {
    width: 120,
    paddingHorizontal: 4,
    alignItems: 'flex-start',
    justifyContent: 'center'
  },
  tableHeaderCellGrade: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center'
  },
  tableHeaderTextLeft: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'left'
  },
  tableHeaderTextEnglish: {
    fontSize: 7,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9
  },
  tableHeaderTextEnglishLeft: {
    fontSize: 7,
    color: '#FFFFFF',
    textAlign: 'left',
    opacity: 0.9
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
    flex: 1,
    textAlign: 'center'
  },
  tableCellNumber: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tableCellName: {
    width: 120,
    paddingHorizontal: 4,
    alignItems: 'flex-start',
    justifyContent: 'center'
  },
  tableCellGrade: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tableCellText: {
    fontSize: 8,
    color: '#111827',
    textAlign: 'center'
  },
  tableCellTextLeft: {
    fontSize: 8,
    color: '#111827',
    textAlign: 'left'
  },
  tableCellActions: {
    fontSize: 8,
    color: '#111827',
    width: 50,
    textAlign: 'center'
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
  meanRow: {
    backgroundColor: '#DBEAFE',
    fontWeight: 'bold'
  },
  finalRow: {
    backgroundColor: '#D1FAE5',
    fontWeight: 'bold'
  },
  gradingScale: {
    marginTop: 15,
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4
  },
  gradingScaleTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#111827'
  },
  gradingScaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3
  },
  gradingScaleItem: {
    fontSize: 8,
    color: '#374151'
  },
  commentsBox: {
    marginTop: 10,
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    minHeight: 60
  },
  commentsLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#111827'
  },
  commentsText: {
    fontSize: 8,
    color: '#374151',
    lineHeight: 1.4
  }
})

export interface ChecklistFinalProductTastingPDFProps {
  data: {
    section1: {
      turno: string
      monitor: string
      formato: string
      barCode: string
      bestBefore: string
      brix: string
      ph: string
      date: string
      product: string
      client: string
      processDate: string
      batch: string
      variety: string
    }
    section2: {
      participants: Array<{
        id: number
        name: string
        appearance: string
        color: string
        smell: string
        texture: string
        taste: string
      }>
      meanAppearance: number
      meanColor: number
      meanSmell: number
      meanTexture: number
      meanTaste: number
      finalGrade: number
    }
    section3: {
      comments: string
      result: 'approved' | 'rejected' | 'hold'
      analystName: string
      analystSignature: string
      checkerName?: string
      checkerSignature?: string
      checkerDate?: string
    }
  }
}

export const ChecklistFinalProductTastingPDFDocument: React.FC<ChecklistFinalProductTastingPDFProps> = ({ data }) => {
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return ''
    try {
      // Parse date string directly without timezone conversion
      // Expected format: YYYY-MM-DD
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        const [year, month, day] = parts
        const monthIndex = parseInt(month) - 1
        if (monthIndex >= 0 && monthIndex < 12) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          const monthName = monthNames[monthIndex]
          return `${monthName} ${day.padStart(2, '0')}, ${year}`
        }
      }
      return dateStr
    } catch {
      return dateStr
    }
  }

  const formatResult = (result: string): string => {
    switch (result) {
      case 'approved':
        return 'Aprobado / Approved'
      case 'rejected':
        return 'Rechazado / Rejected'
      case 'hold':
        return 'Hold'
      default:
        return result
    }
  }

  // Show up to 6 participants, or all if less than 6
  const displayParticipants = data.section2.participants.slice(0, 6)

  return (
    <Document>
      <Page size="A4" style={PDFStyles.page}>
        {/* Header */}
        <PDFHeader2Row
          titleEn="Final product tasting"
          titleEs="Degustación de producto terminado"
          documentCode="CF/PC-ASC-006-RG008"
          version="V.04"
        />

        {/* Section 1: Basic Info */}
        <View style={styles.section}>
          <PDFSectionTitle
            titleEn="Section 1 – Basic Info"
            titleEs="Sección 1 – Información Básica"
          />

          <View style={styles.infoBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {/* Left Column: Fecha, Producto, Cliente, Fecha proceso, Lote, Variedad */}
              <View style={{ width: '48%' }}>
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: 'bold' }}>Fecha/Date:</Text> {formatDate(data.section1.date)}
                </Text>
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: 'bold' }}>Producto/Product:</Text> {data.section1.product || '-'}
                </Text>
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: 'bold' }}>Cliente/Client:</Text> {data.section1.client || '-'}
                </Text>
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: 'bold' }}>Fecha proceso/Process date:</Text> {formatDate(data.section1.processDate)}
                </Text>
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: 'bold' }}>Lote/Batch:</Text> {data.section1.batch || '-'}
                </Text>
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: 'bold' }}>Variedad/Variety:</Text> {data.section1.variety || '-'}
                </Text>
              </View>
              {/* Right Column: Turno, Monitor (calidad), Formato, Codigo de barra, Best before, Brix and pH */}
              <View style={{ width: '48%' }}>
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: 'bold' }}>Turno/Shift:</Text> {data.section1.turno || '-'}
                </Text>
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: 'bold' }}>Monitor:</Text> {data.section1.monitor || '-'}
                </Text>
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: 'bold' }}>Formato/Format:</Text> {data.section1.formato || '-'}
                </Text>
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: 'bold' }}>Código barra/Bar code:</Text> {data.section1.barCode || '-'}
                </Text>
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: 'bold' }}>Best before/BBD:</Text> {data.section1.bestBefore || '-'}
                </Text>
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: 'bold' }}>ºBrix:</Text> {data.section1.brix || '-'}
                </Text>
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: 'bold' }}>pH:</Text> {data.section1.ph || '-'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section 2: Participants Table */}
        <View style={styles.section}>
          <PDFSectionTitle
            titleEn="Section 2 – Organoleptic Analysis"
            titleEs="Sección 2 – Análisis Organoléptico"
          />

          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <View style={styles.tableHeaderCellNumber}>
                <Text style={styles.tableHeaderText}>Nº</Text>
              </View>
              <View style={styles.tableHeaderCellName}>
                <Text style={styles.tableHeaderTextLeft}>NOMBRE PANELISTAS</Text>
                <Text style={styles.tableHeaderTextEnglishLeft}>Participants</Text>
              </View>
              <View style={styles.tableHeaderCellGrade}>
                <Text style={styles.tableHeaderText}>APARIENCIA</Text>
                <Text style={styles.tableHeaderTextEnglish}>Appearance</Text>
              </View>
              <View style={styles.tableHeaderCellGrade}>
                <Text style={styles.tableHeaderText}>COLOR</Text>
                <Text style={styles.tableHeaderTextEnglish}>Color</Text>
              </View>
              <View style={styles.tableHeaderCellGrade}>
                <Text style={styles.tableHeaderText}>OLOR</Text>
                <Text style={styles.tableHeaderTextEnglish}>Smell</Text>
              </View>
              <View style={styles.tableHeaderCellGrade}>
                <Text style={styles.tableHeaderText}>TEXTURA</Text>
                <Text style={styles.tableHeaderTextEnglish}>Texture</Text>
              </View>
              <View style={styles.tableHeaderCellGrade}>
                <Text style={styles.tableHeaderText}>SABOR</Text>
                <Text style={styles.tableHeaderTextEnglish}>Taste</Text>
              </View>
            </View>

            {/* Participant Rows */}
            {displayParticipants.map((participant, index) => (
              <View key={participant.id} style={[styles.tableRow, index % 2 === 0 ? {} : styles.tableRowEven]}>
                <View style={styles.tableCellNumber}>
                  <Text style={styles.tableCellText}>{index + 1}</Text>
                </View>
                <View style={styles.tableCellName}>
                  <Text style={styles.tableCellTextLeft}>{participant.name || '-'}</Text>
                </View>
                <View style={styles.tableCellGrade}>
                  <Text style={styles.tableCellText}>{participant.appearance || '-'}</Text>
                </View>
                <View style={styles.tableCellGrade}>
                  <Text style={styles.tableCellText}>{participant.color || '-'}</Text>
                </View>
                <View style={styles.tableCellGrade}>
                  <Text style={styles.tableCellText}>{participant.smell || '-'}</Text>
                </View>
                <View style={styles.tableCellGrade}>
                  <Text style={styles.tableCellText}>{participant.texture || '-'}</Text>
                </View>
                <View style={styles.tableCellGrade}>
                  <Text style={styles.tableCellText}>{participant.taste || '-'}</Text>
                </View>
              </View>
            ))}

            {/* Mean Grades Row */}
            <View style={[styles.tableRow, styles.meanRow]}>
              <View style={styles.tableCellNumber}>
                <Text style={styles.tableCellText}></Text>
              </View>
              <View style={styles.tableCellName}>
                <Text style={styles.tableCellTextLeft}>NOTA PROMEDIO / Mean grade</Text>
              </View>
              <View style={styles.tableCellGrade}>
                <Text style={styles.tableCellText}>
                  {data.section2.meanAppearance > 0 ? data.section2.meanAppearance.toFixed(1) : '-'}
                </Text>
              </View>
              <View style={styles.tableCellGrade}>
                <Text style={styles.tableCellText}>
                  {data.section2.meanColor > 0 ? data.section2.meanColor.toFixed(1) : '-'}
                </Text>
              </View>
              <View style={styles.tableCellGrade}>
                <Text style={styles.tableCellText}>
                  {data.section2.meanSmell > 0 ? data.section2.meanSmell.toFixed(1) : '-'}
                </Text>
              </View>
              <View style={styles.tableCellGrade}>
                <Text style={styles.tableCellText}>
                  {data.section2.meanTexture > 0 ? data.section2.meanTexture.toFixed(1) : '-'}
                </Text>
              </View>
              <View style={styles.tableCellGrade}>
                <Text style={styles.tableCellText}>
                  {data.section2.meanTaste > 0 ? data.section2.meanTaste.toFixed(1) : '-'}
                </Text>
              </View>
            </View>

            {/* Final Grade Row */}
            <View style={[styles.tableRow, styles.finalRow]}>
              <View style={styles.tableCellNumber}>
                <Text style={styles.tableCellText}></Text>
              </View>
              <View style={styles.tableCellName}>
                <Text style={styles.tableCellTextLeft}>NOTA PROMEDIO FINAL / Final grade</Text>
              </View>
              <View style={styles.tableCellGrade}>
                <Text style={[styles.tableCellText, { fontSize: 10, fontWeight: 'bold' }]}>
                  {data.section2.finalGrade > 0 ? data.section2.finalGrade.toFixed(1) : '-'}
                </Text>
              </View>
              <View style={styles.tableCellGrade}>
                <Text style={styles.tableCellText}></Text>
              </View>
              <View style={styles.tableCellGrade}>
                <Text style={styles.tableCellText}></Text>
              </View>
              <View style={styles.tableCellGrade}>
                <Text style={styles.tableCellText}></Text>
              </View>
              <View style={styles.tableCellGrade}>
                <Text style={styles.tableCellText}></Text>
              </View>
            </View>
          </View>

          {/* Grading Scale */}
          <View style={styles.gradingScale}>
            <Text style={styles.gradingScaleTitle}>ESCALA DE CALIFICACION / Grading scale</Text>
            <View style={styles.gradingScaleRow}>
              <Text style={styles.gradingScaleItem}>6.0 - Muy Bueno / Very good</Text>
            </View>
            <View style={styles.gradingScaleRow}>
              <Text style={styles.gradingScaleItem}>5.0 - Bueno / Good</Text>
            </View>
            <View style={styles.gradingScaleRow}>
              <Text style={styles.gradingScaleItem}>4.0 - Regular / Regular</Text>
            </View>
            <View style={styles.gradingScaleRow}>
              <Text style={styles.gradingScaleItem}>3.0 - Malo / Bad</Text>
            </View>
          </View>
        </View>

        {/* Section 3: Results */}
        <View style={styles.section}>
          <PDFSectionTitle
            titleEn="Section 3 – Results"
            titleEs="Sección 3 – Resultados"
          />

          {/* Comments */}
          {data.section3.comments && (
            <View style={styles.commentsBox}>
              <Text style={styles.commentsLabel}>
                COMENTARIOS U OBSERVACIONES SOBRE EL PRODUCTO (OPCIONAL) / Comments or observations about the product (optional)
              </Text>
              <Text style={styles.commentsText}>{data.section3.comments}</Text>
            </View>
          )}

          {/* Results */}
          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 5 }}>
              RESULTADO / Results: {formatResult(data.section3.result)}
            </Text>
          </View>

          {/* Analyst Section */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
            <View style={{ width: '48%' }}>
              <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 5 }}>
                Nombre analista / Analyst name
              </Text>
              <Text style={{ fontSize: 9, marginBottom: 10 }}>{data.section3.analystName || '-'}</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Firma / Signature</Text>
              {data.section3.analystSignature && (
                <Image
                  src={data.section3.analystSignature}
                  style={styles.signatureImage}
                />
              )}
            </View>
          </View>

          {/* Quality Area Verification */}
          <PDFValidationBlock
            data={{
              signature: data.section3.checkerSignature || ''
            }}
          />
        </View>

        {/* Footer */}
        <PDFFooter pageNumber={1} totalPages={1} />
      </Page>
    </Document>
  )
}
