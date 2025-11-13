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
  table: {
    marginTop: 10,
    marginBottom: 15
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#111827'
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  tableCell: {
    fontSize: 8,
    color: '#111827',
    flex: 1
  },
  statusBadge: {
    padding: 3,
    borderRadius: 2,
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  statusWithinRange: {
    backgroundColor: '#D1FAE5',
    color: '#065F46'
  },
  statusOutOfRange: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B'
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
  graphContainer: {
    marginTop: 15,
    marginBottom: 15,
    padding: 10,
    paddingHorizontal: 0,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    backgroundColor: '#FAFAFA',
    width: '100%'
  },
  graphTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111827',
    textAlign: 'center'
  },
  graphArea: {
    position: 'relative',
    height: 200,
    marginTop: 15,
    marginBottom: 35,
    marginLeft: 35,
    marginRight: 15,
    width: 'auto'
  },
  graphAxis: {
    position: 'absolute',
    backgroundColor: '#374151'
  },
  graphAxisX: {
    bottom: 0,
    left: 0,
    right: 0,
    height: 1
  },
  graphAxisY: {
    bottom: 0,
    left: 0,
    top: 0,
    width: 1
  },
  graphLine: {
    position: 'absolute',
    backgroundColor: '#3B82F6',
    height: 2
  },
  graphLimitLine: {
    position: 'absolute',
    height: 1,
    width: '100%',
    left: 0
  },
  graphLimitLineUpper: {
    backgroundColor: '#EF4444',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#EF4444'
  },
  graphLimitLineLower: {
    backgroundColor: '#EF4444',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#EF4444'
  },
  graphPoint: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    borderWidth: 1,
    borderColor: '#1E40AF'
  },
  graphLabel: {
    position: 'absolute',
    fontSize: 7,
    color: '#6B7280'
  },
  graphLabelX: {
    bottom: -15
  },
  graphLabelY: {
    left: -25,
    width: 20,
    textAlign: 'right'
  },
  graphLimitLabel: {
    position: 'absolute',
    fontSize: 7,
    color: '#991B1B',
    fontWeight: 'bold',
    right: -35,
    width: 30,
    textAlign: 'left'
  },
  graphLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 15
  },
  graphLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  graphLegendLine: {
    width: 20,
    height: 2,
    backgroundColor: '#3B82F6'
  },
  graphLegendLimitLine: {
    width: 20,
    height: 1,
    backgroundColor: '#EF4444',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#EF4444'
  },
  graphLegendText: {
    fontSize: 7,
    color: '#374151'
  }
})

export interface ChecklistEnvTempPDFProps {
  data: {
    section1: {
      date: string
      shift: string
      monitorName: string
      monitorSignature: string
    }
    section2: {
      readings: Array<{
        time: string
        digitalThermometer: number
        wallThermometer: number
        averageTemp: number
        status: string
        observation: string | null
      }>
    }
    section3: {
      checkerName: string
      checkerSignature: string
      verificationDate: string
    }
  }
}

// Graph Component for Temperature Readings
const TemperatureGraph: React.FC<{ readings: Array<{ time: string; averageTemp: number }> }> = ({ readings }) => {
  if (!readings || readings.length === 0) {
    return null
  }

  // Page width is A4 (595pt) minus page padding (30pt * 2) = 535pt
  // Graph area margins: left 35pt, right 15pt = 50pt total
  // Available width: 535pt - 50pt = 485pt
  const availableWidth = 485
  const graphWidth = availableWidth - 50 // Leave space for Y-axis labels
  const graphHeight = 150
  const paddingLeft = 40 // Space for Y-axis labels
  const paddingRight = 10
  const paddingTop = 20
  const paddingBottom = 30

  const upperLimit = 50
  const lowerLimit = 42
  
  // Dynamically calculate min/max temperature from readings
  const temps = readings.map(r => r.averageTemp)
  const dataMinTemp = Math.min(...temps)
  const dataMaxTemp = Math.max(...temps)
  
  // Add padding (10% of range or minimum 5°F) to show data clearly
  const tempRange = dataMaxTemp - dataMinTemp
  const padding = Math.max(tempRange * 0.1, 5)
  
  // Ensure we show the limit lines (42°F and 50°F) even if data is outside
  const minTemp = Math.min(dataMinTemp - padding, lowerLimit - 5)
  const maxTemp = Math.max(dataMaxTemp + padding, upperLimit + 5)
  
  // Round to nice numbers for display
  const finalMinTemp = Math.floor(minTemp / 5) * 5
  const finalMaxTemp = Math.ceil(maxTemp / 5) * 5
  const finalTempRange = finalMaxTemp - finalMinTemp

  // Convert time string (HH:mm) to numeric value for X-axis
  const timeToX = (timeStr: string, index: number, total: number) => {
    if (total === 1) return paddingLeft + graphWidth / 2
    return paddingLeft + (index / (total - 1)) * graphWidth
  }

  // Convert temperature to Y position (inverted because Y=0 is at top)
  const tempToY = (temp: number) => {
    const normalized = (temp - finalMinTemp) / finalTempRange
    return paddingTop + graphHeight - (normalized * graphHeight)
  }

  // Calculate limit line positions
  const upperLimitY = tempToY(upperLimit)
  const lowerLimitY = tempToY(lowerLimit)

  // Generate points for the line graph
  const points = readings.map((reading, index) => ({
    x: timeToX(reading.time, index, readings.length),
    y: tempToY(reading.averageTemp),
    time: reading.time,
    temp: reading.averageTemp
  }))

  return (
    <View style={styles.graphContainer}>
      <Text style={styles.graphTitle}>Temperature Trend Over Time</Text>
      <View style={styles.graphArea}>
        {/* Y-axis - vertical line */}
        <View style={{
          position: 'absolute',
          left: paddingLeft,
          top: paddingTop,
          width: 1,
          height: graphHeight,
          backgroundColor: '#374151'
        }} />
        
        {/* X-axis - horizontal line */}
        <View style={{
          position: 'absolute',
          left: paddingLeft,
          top: paddingTop + graphHeight,
          width: graphWidth,
          height: 1,
          backgroundColor: '#374151'
        }} />

        {/* Grid lines for Y-axis - using small dashed segments */}
        {(() => {
          // Generate grid lines every 5°F, excluding limit lines (they have their own style)
          const gridTemps: number[] = []
          const step = 5
          for (let temp = finalMinTemp; temp <= finalMaxTemp; temp += step) {
            if (temp !== lowerLimit && temp !== upperLimit) {
              gridTemps.push(temp)
            }
          }
          
          return gridTemps.map((temp) => {
            const y = tempToY(temp)
            return (
              <View key={`grid-${temp}`} style={{ position: 'absolute', left: paddingLeft - 5, top: y, width: graphWidth + 5 }}>
                {Array.from({ length: Math.floor(graphWidth / 4) }).map((_, i) => (
                  <View
                    key={`grid-dash-${temp}-${i}`}
                    style={{
                      position: 'absolute',
                      left: i * 4,
                      top: 0,
                      width: 2,
                      height: 0.5,
                      backgroundColor: '#D1D5DB'
                    }}
                  />
                ))}
              </View>
            )
          })
        })()}

        {/* Upper limit line - dashed pattern */}
        <View style={{ position: 'absolute', left: paddingLeft, top: upperLimitY, width: graphWidth }}>
          {Array.from({ length: Math.floor(graphWidth / 6) }).map((_, i) => (
            <View
              key={`upper-dash-${i}`}
              style={{
                position: 'absolute',
                left: i * 6,
                top: 0,
                width: 4,
                height: 1.5,
                backgroundColor: '#EF4444'
              }}
            />
          ))}
        </View>

        {/* Lower limit line - dashed pattern */}
        <View style={{ position: 'absolute', left: paddingLeft, top: lowerLimitY, width: graphWidth }}>
          {Array.from({ length: Math.floor(graphWidth / 6) }).map((_, i) => (
            <View
              key={`lower-dash-${i}`}
              style={{
                position: 'absolute',
                left: i * 6,
                top: 0,
                width: 4,
                height: 1.5,
                backgroundColor: '#EF4444'
              }}
            />
          ))}
        </View>

        {/* Temperature line connecting points - using continuous rectangles for smooth line */}
        {points.map((point, index) => {
          if (index === 0) return null
          const prevPoint = points[index - 1]
          const dx = point.x - prevPoint.x
          const dy = point.y - prevPoint.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          const angle = Math.atan2(dy, dx)
          
          // Draw line as a rotated rectangle (more efficient than many small segments)
          // For horizontal/vertical lines, use simple rectangles
          if (Math.abs(dy) < 0.5) {
            // Nearly horizontal line
            return (
              <View
                key={`line-h-${index}`}
                style={{
                  position: 'absolute',
                  left: Math.min(prevPoint.x, point.x),
                  top: prevPoint.y - 1,
                  width: Math.abs(dx),
                  height: 2,
                  backgroundColor: '#3B82F6'
                }}
              />
            )
          } else if (Math.abs(dx) < 0.5) {
            // Nearly vertical line
            return (
              <View
                key={`line-v-${index}`}
                style={{
                  position: 'absolute',
                  left: prevPoint.x - 1,
                  top: Math.min(prevPoint.y, point.y),
                  width: 2,
                  height: Math.abs(dy),
                  backgroundColor: '#3B82F6'
                }}
              />
            )
          } else {
            // Diagonal line - use many small overlapping segments for smooth appearance
            const steps = Math.max(Math.floor(distance / 0.8), 30)
            return Array.from({ length: steps }).map((_, stepIndex) => {
              const t = stepIndex / steps
              const x = prevPoint.x + dx * t
              const y = prevPoint.y + dy * t
              
              return (
                <View
                  key={`line-segment-${index}-${stepIndex}`}
                  style={{
                    position: 'absolute',
                    left: x - 1,
                    top: y - 1,
                    width: 2,
                    height: 2,
                    backgroundColor: '#3B82F6'
                  }}
                />
              )
            })
          }
        })}

        {/* Data points - using View components */}
        {points.map((point, index) => (
          <View
            key={`point-${index}`}
            style={{
              position: 'absolute',
              left: point.x - 3,
              top: point.y - 3,
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: '#3B82F6',
              borderWidth: 1,
              borderColor: '#1E40AF'
            }}
          />
        ))}

        {/* Y-axis labels - dynamically generate based on range */}
        {(() => {
          // Generate labels every 5°F, ensuring we include limits and range boundaries
          const labels: number[] = []
          const step = 5
          for (let temp = finalMinTemp; temp <= finalMaxTemp; temp += step) {
            labels.push(temp)
          }
          // Ensure limit lines are included
          if (!labels.includes(lowerLimit)) labels.push(lowerLimit)
          if (!labels.includes(upperLimit)) labels.push(upperLimit)
          labels.sort((a, b) => a - b)
          
          return labels.map((temp) => {
            const y = tempToY(temp)
            return (
              <View key={`y-label-${temp}`} style={{ position: 'absolute', top: y - 5, left: 0 }}>
                <Text style={[styles.graphLabel, styles.graphLabelY]}>{temp}°F</Text>
              </View>
            )
          })
        })()}

        {/* Upper limit label */}
        <Text style={[
          styles.graphLimitLabel,
          { top: upperLimitY - 5 }
        ]}>Upper Limit (50°F)</Text>

        {/* Lower limit label */}
        <Text style={[
          styles.graphLimitLabel,
          { top: lowerLimitY - 5 }
        ]}>Lower Limit (42°F)</Text>

        {/* X-axis labels (time) */}
        {points.map((point, index) => (
          <View
            key={`x-label-${index}`}
            style={{
              position: 'absolute',
              left: point.x - 15,
              bottom: -25,
              width: 30
            }}
          >
            <Text style={[styles.graphLabel, styles.graphLabelX, { textAlign: 'center' }]}>
              {point.time}
            </Text>
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.graphLegend}>
        <View style={styles.graphLegendItem}>
          <View style={styles.graphLegendLine} />
          <Text style={styles.graphLegendText}>Average Temperature</Text>
        </View>
        <View style={styles.graphLegendItem}>
          <View style={styles.graphLegendLimitLine} />
          <Text style={styles.graphLegendText}>Limits (42-50°F)</Text>
        </View>
      </View>
    </View>
  )
}

export const ChecklistEnvTempPDFDocument: React.FC<ChecklistEnvTempPDFProps> = ({ data }) => {
  // Handle empty section3 data (will be filled by QA Practitioner later)
  const section3Data = data.section3 || {
    checkerName: '',
    checkerSignature: '',
    verificationDate: ''
  }

  return (
    <Document>
      {/* First Page: Section 1 and Section 2 with Graph */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Process Environmental Temperature Control</Text>
        <Text style={styles.subtitle}>Code: CF/PC-ASC-009-RG001</Text>

        {/* Section 1: Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Section 1 – Basic Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{data.section1.date}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Shift:</Text>
            <Text style={styles.infoValue}>{data.section1.shift}</Text>
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

        {/* Section 2: Temperature Readings - Keep together with graph */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Section 2 – Dynamic Temperature Readings</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Time</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Digital (°F)</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Wall (°F)</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Average (°F)</Text>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>Status</Text>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>Observation</Text>
            </View>
            {data.section2.readings.map((reading, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{reading.time}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{reading.digitalThermometer}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{reading.wallThermometer}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{reading.averageTemp.toFixed(1)}</Text>
                <View style={[styles.tableCell, { flex: 2, flexShrink: 0 }]}>
                  <View style={[
                    styles.statusBadge,
                    reading.status === 'Within Range' ? styles.statusWithinRange : styles.statusOutOfRange
                  ]}>
                    <Text 
                      style={[
                        { fontSize: 7, textAlign: 'center' },
                        reading.status === 'Within Range' ? { color: '#065F46' } : { color: '#991B1B' }
                      ]}
                      wrap={false}
                    >
                      {reading.status === 'Within Range' ? 'Within Range' : reading.status === 'Over Limit' ? 'Over Limit' : 'Under Limit'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.tableCell, { flex: 2 }]}>
                  {reading.observation || '-'}
                </Text>
              </View>
            ))}
          </View>

          {/* Temperature Graph - Keep together with Section 2 */}
          {data.section2.readings.length > 0 && (
            <TemperatureGraph readings={data.section2.readings} />
          )}
        </View>

        <Text style={styles.footer}>
          This document is part of Comfrut's quality management system.
        </Text>
      </Page>

      {/* Second Page: Section 3 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Process Environmental Temperature Control</Text>
        <Text style={styles.subtitle}>Code: CF/PC-ASC-009-RG001</Text>

        {/* Section 3: Final Verification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Section 3 – Final Verification</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Checker Name:</Text>
            <Text style={styles.infoValue}>{section3Data.checkerName || ''}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Verification Date:</Text>
            <Text style={styles.infoValue}>{section3Data.verificationDate || ''}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Checker Signature:</Text>
            {section3Data.checkerSignature ? (
              <Image src={section3Data.checkerSignature} style={styles.signatureImage} />
            ) : (
              <Text style={{ fontSize: 8, color: '#9CA3AF' }}></Text>
            )}
          </View>
        </View>

        <Text style={styles.footer}>
          This document is part of Comfrut's quality management system.
        </Text>
      </Page>
    </Document>
  )
}

