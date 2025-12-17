import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image
} from '@react-pdf/renderer'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  PDFStyles, 
  PDFHeader2Row, 
  PDFMetaInfo, 
  PDFFooter
} from '@/lib/pdf-layout'

const styles = StyleSheet.create({
  section: {
    marginBottom: 15
  },
  palletSection: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#FAFAFA'
  },
  palletTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#005F9E'
  },
  commonFieldsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 8,
    color: '#374151',
    textTransform: 'uppercase'
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingVertical: 2
  },
  fieldLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    width: '40%',
    color: '#4B5563'
  },
  fieldValue: {
    fontSize: 8,
    width: '60%',
    color: '#111827'
  },
  fruitSection: {
    marginTop: 10,
    marginBottom: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    backgroundColor: '#FFFFFF'
  },
  fruitTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 4
  },
  fruitFieldRow: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingVertical: 1
  },
  fruitFieldLabel: {
    fontSize: 7,
    width: '50%',
    color: '#6B7280'
  },
  fruitFieldValue: {
    fontSize: 7,
    width: '50%',
    color: '#111827',
    fontWeight: 'bold'
  },
  expectedBadge: {
    fontSize: 7,
    color: '#6B7280',
    marginLeft: 4
  },
  percentageBadge: {
    fontSize: 7,
    fontWeight: 'bold',
    marginLeft: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 15
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
    color: '#FFFFFF',
    flex: 1
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 6,
    minHeight: 20
  },
  tableRowEven: {
    backgroundColor: '#F9FAFB'
  },
  tableCell: {
    fontSize: 7,
    color: '#111827',
    flex: 1
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
  }
})

interface ChecklistPDFProductoMixProps {
  pallets: Array<{
    id: number
    fieldsByFruit: Record<string, Array<{ campo: string; unidad: string }>>
    commonFields: Array<{ campo: string; unidad: string }>
    expectedCompositions: Record<string, number>
    values: Record<string, string>
  }>
  metadata: {
    date: string
    ordenFabricacion: string
    lineManager: string
    controlQuality: string
    monitorSignature: string
    cliente: string
    producto: string
    sku: string
  }
}

// Format date helper
const formatDate = (date: string): string => {
  try {
    const parts = date.split('-')
    if (parts.length === 3) {
      const [year, month, day] = parts
      const dateObj = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)))
      return format(dateObj, 'dd / MMM / yyyy', { locale: es })
    }
    return date
  } catch {
    return date
  }
}

// Helper to format field label
const formatFieldLabel = (campo: string, unidad: string): string => {
  let displayCampo = campo
  let displayUnidad = unidad
  
  if (campo.includes('Temperatura Pulpa') || campo.includes('Temp de la pulpa')) {
    displayCampo = campo.replace('(F)', '').trim()
    if (unidad && (unidad.includes('°F') || unidad.includes('F'))) {
      displayUnidad = unidad.replace('°F', '°C').replace('F', 'C')
    } else if (!unidad || unidad === '') {
      displayUnidad = '°C'
    }
    return displayUnidad ? `${displayCampo} (${displayUnidad})` : displayCampo
  }
  
  return displayUnidad ? `${displayCampo} (${displayUnidad})` : displayCampo
}

export const ChecklistPDFProductoMixDocument = ({ pallets, metadata }: ChecklistPDFProductoMixProps) => {
  if (!pallets || pallets.length === 0) return null

  const formattedDate = formatDate(metadata.date)
  
  // Group pallets - 2 per page to ensure readability
  const palletsPerPage = 2
  const palletGroups = Array.from(
    { length: Math.ceil(pallets.length / palletsPerPage) },
    (_, i) => pallets.slice(i * palletsPerPage, i * palletsPerPage + palletsPerPage)
  )

  const creationDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <Document>
      {palletGroups.map((group, pageIndex) => (
        <Page key={pageIndex} size="A4" style={PDFStyles.page}>
          {/* Header Bar */}
          <PDFHeader2Row
            titleEn="Quality Control of Freezing Fruit Process (Mix)"
            titleEs="Control de calidad del proceso de congelado de frutas (mix)"
            documentCode="CF/PC-PG-ASC-006-RG001"
            version="V.01"
          />

          {/* Metadata only on first page */}
          {pageIndex === 0 && (
            <>
              <PDFMetaInfo
                leftColumn={[
                  { label: 'Fecha', value: formattedDate },
                  { label: 'Orden de fabricación', value: metadata.ordenFabricacion },
                  { label: 'Jefe de línea', value: metadata.lineManager }
                ]}
                rightColumn={[
                  { label: 'Monitor de calidad', value: metadata.controlQuality },
                  { label: 'Cliente', value: metadata.cliente },
                  { label: 'Producto', value: metadata.producto },
                  { label: 'SKU', value: metadata.sku }
                ]}
              />
              {/* Signature */}
              <View style={styles.signatureBox}>
                <Text style={styles.signatureLabel}>Firma monitor de calidad</Text>
                {metadata.monitorSignature ? (
                  <Image src={metadata.monitorSignature} style={styles.signatureImage} />
                ) : (
                  <Text style={{ fontSize: 8, color: '#9CA3AF' }}>No signature provided</Text>
                )}
              </View>
            </>
          )}

          {/* Pallets for this page */}
          <View style={styles.section}>
            {group.map((pallet, palletIndex) => {
              const globalPalletIndex = pageIndex * palletsPerPage + palletIndex
              
              return (
                <View key={pallet.id} style={styles.palletSection}>
                  <Text style={styles.palletTitle}>Pallet #{globalPalletIndex + 1}</Text>
                  
                  {/* Common Fields */}
                  {pallet.commonFields && pallet.commonFields.length > 0 && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={styles.commonFieldsTitle}>Campos Comunes</Text>
                      {pallet.commonFields
                        .filter((f: any) => !f.campo.includes('Temperatura Sala'))
                        .map((f: any, i: number) => {
                          const value = pallet.values[f.campo] || ''
                          const label = formatFieldLabel(f.campo, f.unidad || '')
                          return (
                            <View key={i} style={styles.fieldRow}>
                              <Text style={styles.fieldLabel}>{label}:</Text>
                              <Text style={styles.fieldValue}>{value}</Text>
                            </View>
                          )
                        })}
                    </View>
                  )}

                  {/* Fruit Sections */}
                  {Object.entries(pallet.fieldsByFruit).map(([agrupacion, fields]) => {
                    const expectedPercentage = pallet.expectedCompositions?.[agrupacion]
                    const pesoFrutaKey = `Peso Fruta ${agrupacion}`
                    const pesoFruta = pallet.values[pesoFrutaKey]
                    const pesoBolsa = pallet.values['Peso Bolsa (gr)'] || pallet.values['Peso Bolsa']
                    
                    // Calculate percentage
                    let percentage: number | null = null
                    let isValid: boolean | null = null
                    if (pesoBolsa && pesoFruta) {
                      const pesoBolsaNum = parseFloat(pesoBolsa.toString().replace(/[^\d.]/g, ''))
                      const pesoFrutaNum = parseFloat(pesoFruta.toString().replace(/[^\d.]/g, ''))
                      if (!isNaN(pesoBolsaNum) && !isNaN(pesoFrutaNum) && pesoBolsaNum > 0) {
                        percentage = (pesoFrutaNum / pesoBolsaNum) * 100
                      }
                    }
                    if (percentage !== null && expectedPercentage !== null && expectedPercentage !== undefined) {
                      // expectedPercentage comes as decimal (e.g., 0.35)
                      const expectedPct = expectedPercentage * 100
                      isValid = Math.abs(percentage - expectedPct) <= 5
                    }

                    return (
                      <View key={agrupacion} style={styles.fruitSection}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                          <Text style={styles.fruitTitle}>{agrupacion}</Text>
                          {expectedPercentage !== null && (
                            <Text style={styles.expectedBadge}>
                              (Esperado: {(expectedPercentage * 100).toFixed(1)}%)
                            </Text>
                          )}
                        </View>
                        
                        {/* Peso Fruta */}
                        {pesoFruta && (
                          <View style={styles.fruitFieldRow}>
                            <Text style={styles.fruitFieldLabel}>Peso Fruta (gr):</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={styles.fruitFieldValue}>{pesoFruta}</Text>
                              {percentage !== null && (
                                <Text
                                  style={[
                                    styles.percentageBadge,
                                    {
                                      color:
                                        isValid === null
                                          ? '#6B7280' // gray when no expected %
                                          : isValid
                                            ? '#059669' // green
                                            : '#DC2626' // red
                                    }
                                  ]}
                                >
                                  {percentage.toFixed(1)}%
                                </Text>
                              )}
                            </View>
                          </View>
                        )}
                        
                        {/* Other fruit fields */}
                        {(fields as any[]).map((f: any, i: number) => {
                          const fieldKey = `${agrupacion}-${f.campo}`
                          const value = pallet.values[fieldKey] || ''
                          const label = formatFieldLabel(f.campo, f.unidad || '')
                          return (
                            <View key={i} style={styles.fruitFieldRow}>
                              <Text style={styles.fruitFieldLabel}>{label}:</Text>
                              <Text style={styles.fruitFieldValue}>{value}</Text>
                            </View>
                          )
                        })}
                      </View>
                    )
                  })}
                </View>
              )
            })}
          </View>

          <PDFFooter 
            pageNumber={pageIndex + 1} 
            totalPages={palletGroups.length}
          />
        </Page>
      ))}
    </Document>
  )
}

