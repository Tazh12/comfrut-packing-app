import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer'
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
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 4,
    padding: 10,
    marginBottom: 15
  },
  infoText: {
    fontSize: 9,
    color: '#1F2937',
    marginBottom: 5
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
    color: '#FFFFFF',
    flex: 1
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
  gridContainer: {
    marginTop: 10,
    marginBottom: 15
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 2
  },
  gridCell: {
    width: '50%',
    padding: 4,
    fontSize: 7,
    borderWidth: 0.5,
    borderColor: '#E5E7EB'
  },
  gridCellHeader: {
    backgroundColor: '#005F9E',
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  statusBadge: {
    padding: 3,
    borderRadius: 3,
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  statusApproved: {
    backgroundColor: '#D1FAE5',
    color: '#065F46'
  },
  statusRejected: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B'
  },
  truckContainer: {
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center'
  },
  truckCab: {
    width: '60%',
    height: 30,
    backgroundColor: '#374151',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5
  },
  truckCabText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold'
  },
  truckBody: {
    width: '60%',
    borderWidth: 2,
    borderColor: '#6B7280',
    borderStyle: 'solid',
    padding: 8
  },
  truckRow: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 4
  },
  truckSlot: {
    flex: 1,
    height: 25,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    borderStyle: 'solid',
    borderRadius: 3,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB'
  },
  truckSlotFilled: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6'
  },
  truckSlotText: {
    fontSize: 7,
    color: '#111827',
    fontWeight: 'bold'
  },
  truckFooter: {
    width: '60%',
    height: 20,
    backgroundColor: '#9CA3AF',
    marginTop: 5,
    justifyContent: 'center',
    alignItems: 'center'
  },
  truckFooterText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: 'bold'
  },
  checkComply: {
    color: '#059669',
    fontWeight: 'bold',
    fontSize: 7
  },
  checkNoComply: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 7
  },
  photoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 8
  },
  photoItem: {
    width: '30%',
    marginBottom: 10
  },
  photoImage: {
    width: '100%',
    height: 40,
    objectFit: 'cover',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 4
  },
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 15
  },
  infoGridColumn: {
    flex: 1
  },
  infoGridRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  infoGridLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    width: '45%'
  },
  infoGridValue: {
    fontSize: 9,
    color: '#111827',
    flex: 1
  },
  photoLink: {
    fontSize: 7,
    color: '#2563EB',
    textDecoration: 'underline'
  },
  photoLabel: {
    fontSize: 7,
    color: '#6B7280',
    marginBottom: 2
  }
})

export interface ChecklistFrozenProductDispatchPDFProps {
  data: {
    header: {
      po_number: string
      client: string
      date: string
      start_time: string
      container_number: string
      driver: string
      origin: string
      destination: string
      ttr: string
      inspector_name: string
    }
    dispatchPlan: Array<{
      id: string
      brand: string
      material: string
      name: string
      expected_pallets?: number
      cases_per_pallet?: number
    }>
    inspection: Record<string, { status: 'G' | 'NG', comment: string }>
    inspectionTemps: string
    inspectionResult: 'Approve' | 'Reject'
    loadingMap: Array<{
      slot_id: number
      pallet_id: string
      product_id: string
      cases: number
      checks: {
        case_condition: boolean
        pallet_condition: boolean
        wrap_condition: boolean
        coding_box: boolean
        label: boolean
        additional_label: boolean
      }
    }>
    sealNumber: string
    endTime: string
    inspectionPhotos?: Array<{ url: string, label?: string }>
    rowPhotos?: Array<{ url: string, row: number }>
    sealPhotos?: Array<{ url: string, label?: string }>
    inspectorSignature?: string
  }
}

export const ChecklistFrozenProductDispatchPDFDocument: React.FC<ChecklistFrozenProductDispatchPDFProps> = ({ data }) => {
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  const getProductName = (productId: string): string => {
    // Find product by matching id in dispatchPlan
    const product = data.dispatchPlan.find((p: any) => p.id === productId)
    return product?.name || 'Unknown'
  }

  const getStatusText = (status: 'G' | 'NG'): string => {
    return status === 'G' ? 'Approved / Aprobado' : 'Rejected / Rechazado'
  }

  // Helper function to parse temperature and determine indicator
  const getTemperatureIndicator = (tempStr: string): { type: 'green' | 'yellow' | 'red' | null, value: number | null } => {
    if (!tempStr) return { type: null, value: null }
    
    // Extract number from string (handles formats like "-18°C", "-18", "-18.5", etc.)
    const match = tempStr.match(/-?\d+\.?\d*/)
    if (!match) return { type: null, value: null }
    
    const value = parseFloat(match[0])
    
    // <= -18: green circle
    if (value <= -18) {
      return { type: 'green', value }
    }
    // > -18 and <= -10: yellow caution sign
    else if (value > -18 && value <= -10) {
      return { type: 'yellow', value }
    }
    // > -10: red circle
    else if (value > -10) {
      return { type: 'red', value }
    }
    
    return { type: null, value }
  }

  const inspectionPoints = [
    { key: 'left_side', label: 'Left Side / Lado Izquierdo' },
    { key: 'doors', label: 'Inside & Outside Doors / Puertas' },
    { key: 'floor', label: 'Floor (Inside) / Piso Interior' },
    { key: 'undercarriage', label: 'Outside & Undercarriage / Chasis y Exterior' },
    { key: 'front_wall', label: 'Front Wall / Pared Frontal' },
    { key: 'right_side', label: 'Right Side / Lado Derecho' },
    { key: 'ceiling_roof', label: 'Ceiling & Roof / Techo' },
  ]

  // Group slots by row (13 rows, 2 columns)
  const slotsByRow: Record<number, typeof data.loadingMap> = {}
  data.loadingMap.forEach(slot => {
    const row = Math.ceil(slot.slot_id / 2)
    if (!slotsByRow[row]) slotsByRow[row] = []
    slotsByRow[row].push(slot)
  })

  return (
    <Document>
      <Page size="A4" style={PDFStyles.page}>
        {/* Header */}
        <PDFHeader2Row
          titleEn="Inspection of Frozen Product in Dispatch"
          titleEs="Inspección de Producto Congelado en Despacho"
          documentCode="CF.PC-ASC-012-RG004"
        />

        {/* Section 1: Shipment Info */}
        <View style={styles.section}>
          <PDFSectionTitle
            titleEn="Section 1 – Shipment + Dispatch Plan"
            titleEs="Sección 1 – Envío + Plan de Despacho"
          />
          <View style={styles.infoBox}>
            <View style={styles.infoGrid}>
              {/* Left Column */}
              <View style={styles.infoGridColumn}>
                <View style={styles.infoGridRow}>
                  <Text style={styles.infoGridLabel}>Client / Cliente:</Text>
                  <Text style={styles.infoGridValue}>{data.header.client}</Text>
                </View>
                <View style={styles.infoGridRow}>
                  <Text style={styles.infoGridLabel}>Date / Fecha:</Text>
                  <Text style={styles.infoGridValue}>{formatDate(data.header.date)}</Text>
                </View>
                <View style={styles.infoGridRow}>
                  <Text style={styles.infoGridLabel}>Container / Contenedor:</Text>
                  <Text style={styles.infoGridValue}>{data.header.container_number || 'N/A'}</Text>
                </View>
                <View style={styles.infoGridRow}>
                  <Text style={styles.infoGridLabel}>Origin / Origen:</Text>
                  <Text style={styles.infoGridValue}>{data.header.origin || 'N/A'}</Text>
                </View>
                <View style={styles.infoGridRow}>
                  <Text style={styles.infoGridLabel}>TTR:</Text>
                  <Text style={styles.infoGridValue}>{data.header.ttr || 'N/A'}</Text>
                </View>
              </View>
              
              {/* Right Column */}
              <View style={styles.infoGridColumn}>
                <View style={styles.infoGridRow}>
                  <Text style={styles.infoGridLabel}>PO Number / Orden de Compra:</Text>
                  <Text style={styles.infoGridValue}>{data.header.po_number}</Text>
                </View>
                <View style={styles.infoGridRow}>
                  <Text style={styles.infoGridLabel}>Start Time / Hora de Inicio:</Text>
                  <Text style={styles.infoGridValue}>{data.header.start_time || 'N/A'}</Text>
                </View>
                <View style={styles.infoGridRow}>
                  <Text style={styles.infoGridLabel}>Driver / Conductor:</Text>
                  <Text style={styles.infoGridValue}>{data.header.driver || 'N/A'}</Text>
                </View>
                <View style={styles.infoGridRow}>
                  <Text style={styles.infoGridLabel}>Destination / Destino:</Text>
                  <Text style={styles.infoGridValue}>{data.header.destination || 'N/A'}</Text>
                </View>
                <View style={styles.infoGridRow}>
                  <Text style={styles.infoGridLabel}>Inspector / Inspector:</Text>
                  <Text style={styles.infoGridValue}>{data.header.inspector_name}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Dispatch Plan */}
          {data.dispatchPlan.length > 0 && (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { width: '50%' }]}>Product / Producto</Text>
                <Text style={[styles.tableHeaderText, { width: '25%', textAlign: 'center' }]}>Pallets</Text>
                <Text style={[styles.tableHeaderText, { width: '25%', textAlign: 'center' }]}>Cases per Pallet / Cajas por Pallet</Text>
              </View>
              {data.dispatchPlan.map((product, idx) => (
                <View key={idx} style={[styles.tableRow, ...(idx % 2 === 1 ? [styles.tableRowEven] : [])]}>
                  <Text style={[styles.tableCell, { width: '50%', textAlign: 'left' }]}>{product.name}</Text>
                  <Text style={[styles.tableCell, { width: '25%', textAlign: 'center' }]}>{product.expected_pallets || '-'}</Text>
                  <Text style={[styles.tableCell, { width: '25%', textAlign: 'center' }]}>{product.cases_per_pallet || '-'}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Section 2: Container Inspection */}
        <View style={styles.section}>
          <PDFSectionTitle
            titleEn="Section 2 – Container Inspection Gate"
            titleEs="Sección 2 – Inspección del Contenedor"
          />
          <View style={styles.infoBox}>
            {data.inspectionTemps && (() => {
              const tempIndicator = getTemperatureIndicator(data.inspectionTemps)
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                  <Text style={styles.infoText}>
                    <Text style={{ fontWeight: 'bold' }}>Temperature / Temperatura:</Text> {data.inspectionTemps}
                  </Text>
                  {tempIndicator.type === 'green' && (
                    <View style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: '#10B981',
                      marginLeft: 8
                    }} />
                  )}
                  {tempIndicator.type === 'yellow' && (
                    <View style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      backgroundColor: '#F59E0B',
                      marginLeft: 8,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 8, fontWeight: 'bold' }}>!</Text>
                    </View>
                  )}
                  {tempIndicator.type === 'red' && (
                    <View style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: '#EF4444',
                      marginLeft: 8
                    }} />
                  )}
                </View>
              )
            })()}
            <Text style={styles.infoText}>
              <Text style={{ fontWeight: 'bold' }}>Result / Resultado:</Text>{' '}
              <Text style={data.inspectionResult === 'Approve' ? styles.statusApproved : styles.statusRejected}>
                {data.inspectionResult === 'Approve' ? 'APPROVED / APROBADO' : 'REJECTED / RECHAZADO'}
              </Text>
            </Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { width: '50%' }]}>Inspection Point / Punto de Inspección</Text>
              <Text style={[styles.tableHeaderText, { width: '25%' }]}>Status / Estado</Text>
              <Text style={[styles.tableHeaderText, { width: '25%' }]}>Comment / Comentario</Text>
            </View>
            {inspectionPoints.map((point, idx) => {
              const inspection = data.inspection[point.key]
              return (
                <View key={point.key} style={[styles.tableRow, ...(idx % 2 === 1 ? [styles.tableRowEven] : [])]}>
                  <Text style={[styles.tableCell, { width: '50%' }]}>{point.label}</Text>
                  <Text style={[styles.tableCell, { width: '25%' }]}>
                    {inspection ? getStatusText(inspection.status) : '-'}
                  </Text>
                  <Text style={[styles.tableCell, { width: '25%' }]}>
                    {inspection?.comment || '-'}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Inspection Photos - Right after Section 2 */}
        {(data.inspectionPhotos?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <PDFSectionTitle
              titleEn="Inspection Photos / Fotos de Inspección"
              titleEs="Fotos de Inspección"
            />
            <View style={styles.photoContainer}>
              {data.inspectionPhotos?.map((photo, idx) => (
                <View key={`insp-${idx}`} style={styles.photoItem}>
                  <Text style={styles.photoLabel}>Inspection / Inspección {idx + 1}</Text>
                  {photo.url && (
                    <>
                      <Image src={photo.url} style={styles.photoImage} />
                      <Link src={photo.url} style={styles.photoLink}>
                        Open Full Size / Abrir Tamaño Completo
                      </Link>
                    </>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        <PDFFooter />
      </Page>

      {/* Page 2: Truck Visualization */}
      <Page size="A4" style={PDFStyles.page}>
        <PDFHeader2Row
          titleEn="Section 3 – Loading Map (Visual)"
          titleEs="Sección 3 – Mapa de Carga (Visual)"
          documentCode="CF.PC-ASC-012-RG004"
        />
        
        <View style={styles.truckContainer}>
          {/* Truck Cab */}
          <View style={styles.truckCab}>
            <Text style={styles.truckCabText}>FRENTE / CABINA</Text>
          </View>
          
          {/* Truck Body with Slots */}
          <View style={styles.truckBody}>
            {Array.from({ length: 13 }, (_, rowIndex) => {
              const row = rowIndex + 1
              const leftSlotId = row * 2 - 1
              const rightSlotId = row * 2
              const leftSlot = data.loadingMap.find(s => s.slot_id === leftSlotId)
              const rightSlot = data.loadingMap.find(s => s.slot_id === rightSlotId)
              
              return (
                <View key={row} style={styles.truckRow}>
                  <View style={[styles.truckSlot, ...(leftSlot ? [styles.truckSlotFilled] : [])]}>
                    <Text style={styles.truckSlotText}>
                      {leftSlot ? `#${leftSlot.pallet_id}` : leftSlotId}
                    </Text>
                  </View>
                  <View style={[styles.truckSlot, ...(rightSlot ? [styles.truckSlotFilled] : [])]}>
                    <Text style={styles.truckSlotText}>
                      {rightSlot ? `#${rightSlot.pallet_id}` : rightSlotId}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
          
          {/* Truck Footer */}
          <View style={styles.truckFooter}>
            <Text style={styles.truckFooterText}>PUERTAS / ATRÁS</Text>
          </View>
        </View>

        <PDFFooter />
      </Page>

      {/* Page 3: Pallet Details Table (Landscape) */}
      <Page size="A4" orientation="landscape" style={PDFStyles.page}>
        <PDFHeader2Row
          titleEn="Section 3 – Pallet Details"
          titleEs="Sección 3 – Detalles de Pallets"
          documentCode="CF.PC-ASC-012-RG004"
        />
        
        {data.loadingMap.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { width: '8%', fontSize: 7, textAlign: 'center' }]}>Slot</Text>
              <Text style={[styles.tableHeaderText, { width: '10%', fontSize: 7 }]}>Pallet ID</Text>
              <Text style={[styles.tableHeaderText, { width: '20%', fontSize: 7 }]}>Product / Producto</Text>
              <Text style={[styles.tableHeaderText, { width: '7%', fontSize: 7, textAlign: 'center' }]}>Cases</Text>
              <Text style={[styles.tableHeaderText, { width: '9%', fontSize: 7, textAlign: 'center' }]}>Case Cond.</Text>
              <Text style={[styles.tableHeaderText, { width: '9%', fontSize: 7, textAlign: 'center' }]}>Pallet Cond.</Text>
              <Text style={[styles.tableHeaderText, { width: '8%', fontSize: 7, textAlign: 'center' }]}>Wrap</Text>
              <Text style={[styles.tableHeaderText, { width: '9%', fontSize: 7, textAlign: 'center' }]}>Coding</Text>
              <Text style={[styles.tableHeaderText, { width: '9%', fontSize: 7, textAlign: 'center' }]}>Label</Text>
              <Text style={[styles.tableHeaderText, { width: '9%', fontSize: 7, textAlign: 'center' }]}>Add. Label</Text>
            </View>
            {[...data.loadingMap].sort((a, b) => a.slot_id - b.slot_id).map((slot, idx) => (
              <View key={slot.slot_id} style={[styles.tableRow, ...(idx % 2 === 1 ? [styles.tableRowEven] : [])]}>
                <Text style={[styles.tableCell, { width: '8%', fontSize: 7, textAlign: 'center' }]}>{slot.slot_id}</Text>
                <Text style={[styles.tableCell, { width: '10%', fontSize: 7 }]}>{slot.pallet_id}</Text>
                <Text style={[styles.tableCell, { width: '20%', fontSize: 6, textAlign: 'left' }]}>{getProductName(slot.product_id)}</Text>
                <Text style={[styles.tableCell, { width: '7%', fontSize: 7, textAlign: 'center' }]}>{slot.cases}</Text>
                <Text style={[styles.tableCell, { width: '9%', fontSize: 6, textAlign: 'center' }]}>
                  <Text style={slot.checks.case_condition ? styles.checkComply : styles.checkNoComply}>
                    {slot.checks.case_condition ? 'CUMPLE' : 'NO CUMPLE'}
                  </Text>
                </Text>
                <Text style={[styles.tableCell, { width: '9%', fontSize: 6, textAlign: 'center' }]}>
                  <Text style={slot.checks.pallet_condition ? styles.checkComply : styles.checkNoComply}>
                    {slot.checks.pallet_condition ? 'CUMPLE' : 'NO CUMPLE'}
                  </Text>
                </Text>
                <Text style={[styles.tableCell, { width: '8%', fontSize: 6, textAlign: 'center' }]}>
                  <Text style={slot.checks.wrap_condition ? styles.checkComply : styles.checkNoComply}>
                    {slot.checks.wrap_condition ? 'CUMPLE' : 'NO CUMPLE'}
                  </Text>
                </Text>
                <Text style={[styles.tableCell, { width: '9%', fontSize: 6, textAlign: 'center' }]}>
                  <Text style={slot.checks.coding_box ? styles.checkComply : styles.checkNoComply}>
                    {slot.checks.coding_box ? 'CUMPLE' : 'NO CUMPLE'}
                  </Text>
                </Text>
                <Text style={[styles.tableCell, { width: '9%', fontSize: 6, textAlign: 'center' }]}>
                  <Text style={slot.checks.label ? styles.checkComply : styles.checkNoComply}>
                    {slot.checks.label ? 'CUMPLE' : 'NO CUMPLE'}
                  </Text>
                </Text>
                <Text style={[styles.tableCell, { width: '9%', fontSize: 6, textAlign: 'center' }]}>
                  <Text style={slot.checks.additional_label ? styles.checkComply : styles.checkNoComply}>
                    {slot.checks.additional_label ? 'CUMPLE' : 'NO CUMPLE'}
                  </Text>
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.infoText}>No pallets loaded / No hay pallets cargados</Text>
        )}

        {/* Row Photos Section */}
        {(data.rowPhotos?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <PDFSectionTitle
              titleEn="Row Photos / Fotos de Filas"
              titleEs="Fotos de Filas"
            />
            <View style={styles.photoContainer}>
              {data.rowPhotos?.map((photo, idx) => (
                <View key={`row-${idx}`} style={styles.photoItem}>
                  <Text style={styles.photoLabel}>Row {photo.row} / Fila {photo.row}</Text>
                  {photo.url && (
                    <>
                      <Image src={photo.url} style={styles.photoImage} />
                      <Link src={photo.url} style={styles.photoLink}>
                        Open Full Size / Abrir Tamaño Completo
                      </Link>
                    </>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        <PDFFooter />
      </Page>

      {/* Page 4: Closeout */}
      <Page size="A4" style={PDFStyles.page}>
        <PDFHeader2Row
          titleEn="Section 4 – Closeout"
          titleEs="Sección 4 – Cierre"
          documentCode="CF.PC-ASC-012-RG004"
        />

        <View style={styles.section}>
          <PDFSectionTitle
            titleEn="Section 4 – Closeout"
            titleEs="Sección 4 – Cierre"
          />
          
          {/* Seal Number with Photo */}
          <View style={{ flexDirection: 'row', marginBottom: 15, gap: 15 }}>
            <View style={{ flex: 1 }}>
              <View style={styles.infoBox}>
                {data.sealNumber && (
                  <Text style={styles.infoText}>
                    <Text style={{ fontWeight: 'bold' }}>Seal Number / Número de Sello:</Text> {data.sealNumber}
                  </Text>
                )}
                {data.endTime && (
                  <Text style={styles.infoText}>
                    <Text style={{ fontWeight: 'bold' }}>End Time / Hora de Finalización:</Text> {data.endTime}
                  </Text>
                )}
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: 'bold' }}>Total Pallets:</Text> {data.loadingMap.length}
                </Text>
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: 'bold' }}>Total Cases / Total Cajas:</Text>{' '}
                  {data.loadingMap.reduce((sum, s) => sum + s.cases, 0)}
                </Text>
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: 'bold' }}>Inspector / Inspector:</Text> {data.header.inspector_name}
                </Text>
              </View>
            </View>
            
            {/* Seal Photo on the right */}
            {data.sealPhotos && data.sealPhotos.length > 0 && data.sealPhotos[0]?.url && (
              <View style={{ width: 150, alignItems: 'center' }}>
                <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 5 }}>
                  Seal Photo / Foto de Sello:
                </Text>
                <Image src={data.sealPhotos[0].url} style={{ width: 150, height: 100, objectFit: 'contain', borderWidth: 1, borderColor: '#E5E7EB' }} />
              </View>
            )}
          </View>

          {/* Product Breakdown */}
          <View style={{ marginTop: 15 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 10 }}>
              Summary by Product / Resumen por Producto:
            </Text>
            {data.dispatchPlan.map((product, idx) => {
              const productPallets = data.loadingMap.filter(s => s.product_id === product.id).length
              const productCases = data.loadingMap
                .filter(s => s.product_id === product.id)
                .reduce((sum, s) => sum + s.cases, 0)
              
              return (
                <View key={product.id} style={{ marginBottom: 8, padding: 8, backgroundColor: '#F9FAFB', borderRadius: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 4 }}>
                    {idx + 1}. {product.name}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 20 }}>
                    <Text style={{ fontSize: 8 }}>
                      <Text style={{ fontWeight: 'bold' }}>Pallets:</Text> {productPallets}
                    </Text>
                    <Text style={{ fontSize: 8 }}>
                      <Text style={{ fontWeight: 'bold' }}>Cases / Cajas:</Text> {productCases}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
          
          {/* Inspector Signature */}
          {data.inspectorSignature && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 5 }}>
                Inspector Signature / Firma del Inspector:
              </Text>
              <Image src={data.inspectorSignature} style={{ width: 200, height: 60, objectFit: 'contain' }} />
            </View>
          )}
        </View>

        <PDFFooter />
      </Page>
    </Document>
  )
}

