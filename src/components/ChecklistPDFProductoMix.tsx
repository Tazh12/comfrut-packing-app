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
  PDFFooter,
  PDFValidationBlock
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
  commonFieldsContainer: {
    flexDirection: 'row',
    marginBottom: 10
  },
  commonFieldsColumn: {
    flex: 1,
    paddingRight: 8
  },
  commonFieldsColumnRight: {
    flex: 1,
    paddingLeft: 8
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingVertical: 2
  },
  fieldLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    width: '50%',
    color: '#4B5563'
  },
  fieldValue: {
    fontSize: 8,
    width: '50%',
    color: '#111827'
  },
  fruitTable: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden'
  },
  fruitTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#005F9E',
    padding: 6
  },
  fruitTableHeaderItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2
  },
  fruitTableHeaderItemFirst: {
    width: '30%',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 4,
    paddingVertical: 2
  },
  fruitTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 5,
    minHeight: 18
  },
  fruitTableRowEven: {
    backgroundColor: '#F9FAFB'
  },
  fruitTableCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2
  },
  fruitTableCellFirst: {
    fontSize: 7,
    color: '#111827',
    width: '30%',
    textAlign: 'left',
    fontWeight: 'bold',
    paddingLeft: 4
  },
  fruitTableCellNA: {
    fontSize: 7,
    color: '#9CA3AF'
  },
  pesoFrutaCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  pesoFrutaValue: {
    fontSize: 7,
    color: '#111827',
    fontWeight: 'bold'
  },
  pesoFrutaPercentage: {
    fontSize: 6,
    fontWeight: 'bold',
    marginTop: 2
  },
  percentageGreen: {
    color: '#059669'
  },
  percentageRed: {
    color: '#DC2626'
  },
  percentageGray: {
    color: '#6B7280'
  },
  expectedBadge: {
    fontSize: 7,
    color: '#6B7280',
    marginLeft: 4
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

// Helper to identify common field category
const getCommonFieldCategory = (campo: string): 'left' | 'right' | null => {
  const campoLower = campo.toLowerCase()
  if (campoLower.includes('hora')) return 'left'
  if (campoLower.includes('temperatura pulpa') || campoLower.includes('temp de la pulpa')) return 'left'
  if (campoLower.includes('brix')) return 'left'
  if (campoLower.includes('codigo pallet') || campoLower.includes('código pallet') || campoLower.includes('código barra pallet')) return 'left'
  if (campoLower.includes('observaciones')) return 'left'
  if (campoLower.includes('peso bolsa') || campoLower.includes('peso caja')) return 'right'
  if (campoLower === 'ph' || campoLower.includes('ph')) return 'right'
  if (campoLower.includes('codigo caja') || campoLower.includes('código caja')) return 'right'
  return null
}

// Helper to get order priority for common fields
const getCommonFieldOrder = (campo: string, category: 'left' | 'right'): number => {
  const campoLower = campo.toLowerCase()
  if (category === 'left') {
    if (campoLower.includes('hora')) return 1
    if (campoLower.includes('temperatura pulpa') || campoLower.includes('temp de la pulpa')) return 2
    if (campoLower.includes('brix')) return 3
    if (campoLower.includes('codigo pallet') || campoLower.includes('código pallet') || campoLower.includes('código barra pallet')) return 4
    if (campoLower.includes('observaciones')) return 5
  } else if (category === 'right') {
    if (campoLower.includes('peso bolsa') || campoLower.includes('peso caja')) return 1
    if (campoLower === 'ph' || campoLower.includes('ph')) return 2
    if (campoLower.includes('codigo caja') || campoLower.includes('código caja')) return 3
  }
  return 999 // Unknown fields go to the end
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
              
              // Separate common fields into left and right columns and sort them
              const leftCommonFields = pallet.commonFields
                .filter((f: any) => !f.campo.includes('Temperatura Sala') && getCommonFieldCategory(f.campo) === 'left')
                .sort((a: any, b: any) => {
                  const orderA = getCommonFieldOrder(a.campo, 'left')
                  const orderB = getCommonFieldOrder(b.campo, 'left')
                  return orderA - orderB
                })
              const rightCommonFields = pallet.commonFields
                .filter((f: any) => !f.campo.includes('Temperatura Sala') && getCommonFieldCategory(f.campo) === 'right')
                .sort((a: any, b: any) => {
                  const orderA = getCommonFieldOrder(a.campo, 'right')
                  const orderB = getCommonFieldOrder(b.campo, 'right')
                  return orderA - orderB
                })
              
              // Get all fruits (up to 5)
              const fruits = Object.keys(pallet.fieldsByFruit).slice(0, 5)
              
              // Collect all unique items/defects across all fruits
              const allItems = new Set<string>()
              fruits.forEach(fruit => {
                const fields = pallet.fieldsByFruit[fruit] || []
                fields.forEach((f: any) => {
                  allItems.add(f.campo)
                })
              })
              const sortedItems = Array.from(allItems).sort()
              
              // Calculate percentages for each fruit
              const pesoBolsa = pallet.values['Peso Bolsa (gr)'] || pallet.values['Peso Bolsa']
              const fruitPercentages: Record<string, { percentage: number | null; isValid: boolean | null; expected: number | null }> = {}
              
              fruits.forEach(fruit => {
                const expectedPercentage = pallet.expectedCompositions?.[fruit]
                const pesoFrutaKey = `Peso Fruta ${fruit}`
                const pesoFruta = pallet.values[pesoFrutaKey]
                
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
                  const expectedPct = expectedPercentage * 100
                  isValid = Math.abs(percentage - expectedPct) <= 5
                }
                
                fruitPercentages[fruit] = {
                  percentage,
                  isValid,
                  expected: expectedPercentage !== null && expectedPercentage !== undefined ? expectedPercentage * 100 : null
                }
              })
              
              return (
                <View key={pallet.id} style={styles.palletSection}>
                  <Text style={styles.palletTitle}>Pallet #{globalPalletIndex + 1}</Text>
                  
                  {/* Common Fields - Two Columns */}
                  {(leftCommonFields.length > 0 || rightCommonFields.length > 0) && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={styles.commonFieldsTitle}>Campos Comunes</Text>
                      <View style={styles.commonFieldsContainer}>
                        {/* Left Column */}
                        <View style={styles.commonFieldsColumn}>
                          {leftCommonFields.map((f: any, i: number) => {
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
                        
                        {/* Right Column */}
                        <View style={styles.commonFieldsColumnRight}>
                          {rightCommonFields.map((f: any, i: number) => {
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
                      </View>
                    </View>
                  )}

                  {/* Fruits Table */}
                  {fruits.length > 0 && (
                    <View style={styles.fruitTable}>
                      {/* Table Header */}
                      <View style={styles.fruitTableHeader}>
                        <View style={styles.fruitTableHeaderItemFirst}>
                          <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#FFFFFF' }}>Item</Text>
                        </View>
                        {fruits.map((fruit, idx) => (
                          <View key={idx} style={styles.fruitTableHeaderItem}>
                            <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' }}>
                              {fruit}
                            </Text>
                            {fruitPercentages[fruit]?.expected !== null && (
                              <Text style={{ fontSize: 6, fontWeight: 'normal', color: '#FFFFFF', textAlign: 'center', marginTop: 2 }}>
                                (Esp: {fruitPercentages[fruit]?.expected?.toFixed(1)}%)
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                      
                      {/* Peso Fruta Row */}
                      <View style={[styles.fruitTableRow, styles.fruitTableRowEven]}>
                        <Text style={styles.fruitTableCellFirst}>Peso Fruta (gr)</Text>
                        {fruits.map((fruit, idx) => {
                          const pesoFrutaKey = `Peso Fruta ${fruit}`
                          const pesoFruta = pallet.values[pesoFrutaKey]
                          const pctInfo = fruitPercentages[fruit]
                          
                          return (
                            <View key={idx} style={styles.fruitTableCell}>
                              {pesoFruta ? (
                                <View style={styles.pesoFrutaCell}>
                                  <Text style={styles.pesoFrutaValue}>{pesoFruta}</Text>
                                  {pctInfo?.percentage !== null && (
                                    <Text
                                      style={[
                                        styles.pesoFrutaPercentage,
                                        pctInfo.isValid === null
                                          ? styles.percentageGray
                                          : pctInfo.isValid
                                            ? styles.percentageGreen
                                            : styles.percentageRed
                                      ]}
                                    >
                                      {pctInfo.percentage.toFixed(1)}%
                                    </Text>
                                  )}
                                </View>
                              ) : (
                                <Text style={styles.fruitTableCellNA}>N/A</Text>
                              )}
                            </View>
                          )
                        })}
                      </View>
                      
                      {/* Other Items Rows */}
                      {sortedItems.map((item, itemIdx) => {
                        const isEven = itemIdx % 2 === 0
                        return (
                          <View key={item} style={[styles.fruitTableRow, isEven ? styles.fruitTableRowEven : {}]}>
                            <Text style={styles.fruitTableCellFirst}>
                              {formatFieldLabel(item, '')}
                            </Text>
                            {fruits.map((fruit, fruitIdx) => {
                              const fieldKey = `${fruit}-${item}`
                              const value = pallet.values[fieldKey] || ''
                              return (
                                <View key={fruitIdx} style={styles.fruitTableCell}>
                                  {value ? (
                                    <Text style={{ fontSize: 7, color: '#111827' }}>{value}</Text>
                                  ) : (
                                    <Text style={styles.fruitTableCellNA}>N/A</Text>
                                  )}
                                </View>
                              )
                            })}
                          </View>
                        )
                      })}
                    </View>
                  )}
                </View>
              )
            })}
          </View>

          {/* Validation Section - Only on last page */}
          {pageIndex === palletGroups.length - 1 && (
            <PDFValidationBlock
              data={{
                signature: undefined
              }}
            />
          )}

          <PDFFooter 
            pageNumber={pageIndex + 1} 
            totalPages={palletGroups.length}
          />
        </Page>
      ))}
    </Document>
  )
}

