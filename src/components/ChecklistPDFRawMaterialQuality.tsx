import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { 
  PDFStyles, 
  PDFHeader2Row, 
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
  gridTable: {
    marginTop: 10,
    marginBottom: 15,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4
  },
  gridTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#005F9E',
    padding: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4
  },
  gridTableHeaderText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1
  },
  gridTableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 30
  },
  gridTableCell: {
    fontSize: 7,
    color: '#111827',
    flex: 1,
    paddingHorizontal: 4
  },
  gridTableRowEven: {
    backgroundColor: '#F9FAFB'
  }
})

export interface ChecklistRawMaterialQualityPDFProps {
  data: {
    section1: {
      supplier: string
      fruit: string
      sku: string | null
      formatPresentation: string | null
      originCountry: string
      receptionDateTime: string
      containerNumber: string | null
      poNumber: string | null
      lotNumber: string | null
      monitorName: string
      monitorSignature: string
      processingPlant: string
      inspectionDateTime: string
      coldStorageTemp: number | null
      ttr: string | null
      microPesticideSampleTaken: string
    }
    section2: {
      boxSamples: Array<{
        id: number
        boxNumber: string
        weightBox: string
        weightSample: string
        values: Record<string, string>
      }>
    }
  }
}

export const ChecklistRawMaterialQualityPDFDocument: React.FC<ChecklistRawMaterialQualityPDFProps> = ({ data }) => {
  const formatDateTime = (isoString: string): string => {
    try {
      const date = new Date(isoString)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return isoString
    }
  }

  // Calculate percentage from grams
  const calculatePercentage = (grams: string, weightSample: string): string => {
    if (!grams || !weightSample) return '-'
    const gramsNum = parseFloat(grams)
    const weightSampleNum = parseFloat(weightSample)
    if (isNaN(gramsNum) || isNaN(weightSampleNum) || weightSampleNum === 0) return '-'
    const percentage = (gramsNum / weightSampleNum) * 100
    return percentage.toFixed(2) + '%'
  }

  // Get all unique column names from box samples
  const getAllColumns = (): string[] => {
    const columnsSet = new Set<string>()
    data.section2.boxSamples.forEach(box => {
      Object.keys(box.values).forEach(key => {
        if (key !== 'Organoleptic') {
          columnsSet.add(key)
        }
      })
    })
    return Array.from(columnsSet).sort()
  }

  const allColumns = getAllColumns()
  const hasOrganoleptic = data.section2.boxSamples.some(box => box.values['Organoleptic'])
  
  // Check if a column name indicates it's a percentage column
  const isPercentageColumn = (colName: string): boolean => {
    return colName.includes('%') || colName.toLowerCase().includes('percent')
  }

  return (
    <Document>
      <Page size="A4" style={PDFStyles.page}>
        {/* Header */}
        <PDFHeader2Row
          titleEn="Raw Material Quality Report"
          titleEs="Reporte de calidad materia prima"
          documentCode="CF-ASC-011-RG001"
        />


        {/* Section 1: Basic Info */}
        <View style={styles.section}>
          <PDFSectionTitle
            titleEn="Section 1 – Basic Info"
            titleEs="Sección 1 – Información Básica"
          />

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              <Text style={{ fontWeight: 'bold' }}>Supplier / Proveedor:</Text> {data.section1.supplier}
            </Text>
            <Text style={styles.infoText}>
              <Text style={{ fontWeight: 'bold' }}>Fruit / Fruta:</Text> {data.section1.fruit}
            </Text>
            {data.section1.sku && (
              <Text style={styles.infoText}>
                <Text style={{ fontWeight: 'bold' }}>SKU:</Text> {data.section1.sku}
              </Text>
            )}
            {data.section1.formatPresentation && (
              <Text style={styles.infoText}>
                <Text style={{ fontWeight: 'bold' }}>Format / Presentation / Formato / Presentación:</Text> {data.section1.formatPresentation}
              </Text>
            )}
            <Text style={styles.infoText}>
              <Text style={{ fontWeight: 'bold' }}>Origin / Country / Origen / País:</Text> {data.section1.originCountry}
            </Text>
            <Text style={styles.infoText}>
              <Text style={{ fontWeight: 'bold' }}>Reception Date/Time / Fecha/Hora de Recepción:</Text> {formatDateTime(data.section1.receptionDateTime)}
            </Text>
            {data.section1.containerNumber && (
              <Text style={styles.infoText}>
                <Text style={{ fontWeight: 'bold' }}>Container # / Contenedor #:</Text> {data.section1.containerNumber}
              </Text>
            )}
            {data.section1.poNumber && (
              <Text style={styles.infoText}>
                <Text style={{ fontWeight: 'bold' }}>PO #:</Text> {data.section1.poNumber}
              </Text>
            )}
            {data.section1.lotNumber && (
              <Text style={styles.infoText}>
                <Text style={{ fontWeight: 'bold' }}>Lot # / Lote #:</Text> {data.section1.lotNumber}
              </Text>
            )}
            <Text style={styles.infoText}>
              <Text style={{ fontWeight: 'bold' }}>Monitor Name / Nombre del Monitor:</Text> {data.section1.monitorName}
            </Text>
            <Text style={styles.infoText}>
              <Text style={{ fontWeight: 'bold' }}>Processing Plant / Planta de Procesamiento:</Text> {data.section1.processingPlant}
            </Text>
            <Text style={styles.infoText}>
              <Text style={{ fontWeight: 'bold' }}>Inspection Date/Time / Fecha/Hora de Inspección:</Text> {formatDateTime(data.section1.inspectionDateTime)}
            </Text>
            {data.section1.coldStorageTemp !== null && (
              <Text style={styles.infoText}>
                <Text style={{ fontWeight: 'bold' }}>Cold Storage Receiving Temperature / Temperatura de Recepción en Frío:</Text> {data.section1.coldStorageTemp}°C
              </Text>
            )}
            {data.section1.ttr && (
              <Text style={styles.infoText}>
                <Text style={{ fontWeight: 'bold' }}>TTR:</Text> {data.section1.ttr}
              </Text>
            )}
            <Text style={styles.infoText}>
              <Text style={{ fontWeight: 'bold' }}>Micro/Pesticide Sample Taken / Muestra Micro/Pesticida Tomada:</Text> {data.section1.microPesticideSampleTaken === 'Y' ? 'Yes / Sí' : 'No'}
            </Text>
          </View>

          {/* Monitor Signature */}
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

        {/* Section 2: Box Samples */}
        {data.section2.boxSamples.length > 0 && (
          <View style={styles.section}>
            <PDFSectionTitle
              titleEn="Section 2 – Box Samples"
              titleEs="Sección 2 – Muestras de Caja"
            />

            {/* Dynamic Grid Table */}
            <View style={styles.gridTable}>
              {/* Table Header */}
              <View style={styles.gridTableHeader}>
                <Text style={[styles.gridTableHeaderText, { flex: 0.6 }]}>Box / Caja</Text>
                <Text style={[styles.gridTableHeaderText, { flex: 0.7 }]}>Weight Box / Peso Caja (grs)</Text>
                <Text style={[styles.gridTableHeaderText, { flex: 0.7 }]}>Weight Sample / Peso Muestra (grs)</Text>
                {allColumns.map((col, idx) => (
                  <Text key={idx} style={[styles.gridTableHeaderText, { flex: 1 }]}>
                    {col}
                  </Text>
                ))}
                {hasOrganoleptic && (
                  <Text style={[styles.gridTableHeaderText, { flex: 1 }]}>Organoleptic</Text>
                )}
              </View>

              {/* Table Rows */}
              {data.section2.boxSamples.map((box, boxIdx) => (
                <View
                  key={box.id}
                  style={[
                    styles.gridTableRow,
                    boxIdx % 2 === 0 && styles.gridTableRowEven
                  ]}
                >
                  <Text style={[styles.gridTableCell, { flex: 0.6, fontWeight: 'bold' }]}>
                    {box.boxNumber}
                  </Text>
                  <Text style={[styles.gridTableCell, { flex: 0.7 }]}>
                    {box.weightBox || '-'}
                  </Text>
                  <Text style={[styles.gridTableCell, { flex: 0.7 }]}>
                    {box.weightSample || '-'}
                  </Text>
                  {allColumns.map((col, colIdx) => {
                    const value = box.values[col] || '-'
                    // For percentage columns, calculate and show percentage
                    const displayValue = isPercentageColumn(col) && box.weightSample
                      ? calculatePercentage(value, box.weightSample)
                      : value
                    return (
                      <Text key={colIdx} style={[styles.gridTableCell, { flex: 1 }]}>
                        {displayValue}
                      </Text>
                    )
                  })}
                  {hasOrganoleptic && (
                    <Text style={[styles.gridTableCell, { flex: 1 }]}>
                      {box.values['Organoleptic'] || '-'}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <PDFFooter />
      </Page>
    </Document>
  )
}

