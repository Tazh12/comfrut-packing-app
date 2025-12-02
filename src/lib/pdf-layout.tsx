import React from 'react'
import { View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'

// Register fonts
Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf' },
    { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' }
  ]
})

const logoBase64 = "data:image/png;base64,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"

// Typography constants
export const PDFTypography = {
  title: { fontSize: 17, fontWeight: 'bold' }, // 16-18pt
  sectionTitle: { fontSize: 11.5, fontWeight: 'bold' }, // 11-12pt
  body: { fontSize: 9.5 }, // 9-10pt
  small: { fontSize: 8 }, // 8pt for footers
  subtitle: { fontSize: 9, color: '#6B7280' } // Lighter gray for Spanish subtitles
}

// Color system for status coding
export const PDFStatusColors = {
  comply: {
    backgroundColor: '#D1FAE5', // Soft green background
    color: '#065F46', // Dark green text
    text: 'Comply'
  },
  notComply: {
    backgroundColor: '#FEE2E2', // Light red background
    color: '#991B1B', // Strong red text
    text: 'Not Comply'
  },
  withinRange: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    text: 'Within Range'
  },
  overLimit: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    text: 'Over Limit'
  },
  underLimit: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    text: 'Under Limit'
  },
  observation: {
    backgroundColor: '#FEF3C7', // Amber/orange background
    color: '#92400E', // Dark amber text
    text: 'Observation'
  },
  pending: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    text: 'Pending'
  }
}

// Shared PDF styles
export const PDFStyles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: PDFTypography.body.fontSize,
    fontFamily: 'Roboto',
    backgroundColor: '#ffffff'
  },
  // Header bar (top 2-3cm)
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 60 // ~2cm
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  logo: {
    width: 80,
    height: 40,
    marginRight: 12,
    objectFit: 'contain'
  },
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827'
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  documentTitle: {
    ...PDFTypography.title,
    textAlign: 'center',
    color: '#005F9E',
    marginBottom: 3
  },
  documentSubtitle: {
    ...PDFTypography.subtitle,
    textAlign: 'center'
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'flex-start'
  },
  documentCode: {
    fontSize: 8,
    color: '#6B7280',
    marginBottom: 2
  },
  documentVersion: {
    fontSize: 8,
    color: '#9CA3AF'
  },
  // Meta / Basic info block (shaded card)
  metaInfoCard: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  metaInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metaInfoColumn: {
    width: '48%'
  },
  metaInfoRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingVertical: 2
  },
  metaInfoLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    width: '45%',
    paddingRight: 4
  },
  metaInfoValue: {
    fontSize: 9,
    color: '#111827',
    flex: 1
  },
  // Section titles
  sectionTitle: {
    ...PDFTypography.sectionTitle,
    color: '#111827',
    marginTop: 15,
    marginBottom: 10
  },
  sectionTitleSpanish: {
    ...PDFTypography.subtitle,
    marginTop: 2,
    marginBottom: 10
  },
  // Table styles
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
    minHeight: 28
  },
  tableRowEven: {
    backgroundColor: '#F9FAFB'
  },
  tableCell: {
    fontSize: 9,
    color: '#111827'
  },
  // Status badges
  statusBadge: {
    padding: 4,
    borderRadius: 3,
    textAlign: 'center',
    minWidth: 80
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  footerLeft: {
    fontSize: 8,
    color: '#6B7280'
  },
  footerRight: {
    fontSize: 8,
    color: '#9CA3AF'
  }
})

// Header Component
interface PDFHeaderProps {
  titleEn: string
  titleEs?: string
  documentCode: string
  version?: string
  date?: string
}

export const PDFHeader: React.FC<PDFHeaderProps> = ({
  titleEn,
  titleEs,
  documentCode,
  version = 'V.01',
  date
}) => {
  return (
    <View style={PDFStyles.headerBar}>
      {/* Left: Logo + Company Name */}
      <View style={PDFStyles.headerLeft}>
        <Image src={logoBase64} style={PDFStyles.logo} />
        <Text style={PDFStyles.companyName}>Comfrut</Text>
      </View>

      {/* Center: Document Title */}
      <View style={PDFStyles.headerCenter}>
        <Text style={PDFStyles.documentTitle}>{titleEn}</Text>
        {titleEs && (
          <Text style={PDFStyles.documentSubtitle}>{titleEs}</Text>
        )}
      </View>

      {/* Right: Document Code + Version/Date */}
      <View style={PDFStyles.headerRight}>
        <Text style={PDFStyles.documentCode}>{documentCode}</Text>
        <Text style={PDFStyles.documentVersion}>
          {version} {date ? `• ${date}` : ''}
        </Text>
      </View>
    </View>
  )
}

// Meta Info Block Component
interface MetaInfoItem {
  label: string
  value: string
}

interface PDFMetaInfoProps {
  leftColumn: MetaInfoItem[]
  rightColumn: MetaInfoItem[]
}

export const PDFMetaInfo: React.FC<PDFMetaInfoProps> = ({ leftColumn, rightColumn }) => {
  return (
    <View style={PDFStyles.metaInfoCard}>
      <View style={PDFStyles.metaInfoGrid}>
        {/* Left Column */}
        <View style={PDFStyles.metaInfoColumn}>
          {leftColumn.map((item, index) => (
            <View key={index} style={PDFStyles.metaInfoRow}>
              <Text style={PDFStyles.metaInfoLabel}>{item.label}:</Text>
              <Text style={PDFStyles.metaInfoValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Right Column */}
        <View style={PDFStyles.metaInfoColumn}>
          {rightColumn.map((item, index) => (
            <View key={index} style={PDFStyles.metaInfoRow}>
              <Text style={PDFStyles.metaInfoLabel}>{item.label}:</Text>
              <Text style={PDFStyles.metaInfoValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

// Footer Component
interface PDFFooterProps {
  pageNumber?: number
  totalPages?: number
  creationTimestamp?: string
}

export const PDFFooter: React.FC<PDFFooterProps> = ({
  pageNumber,
  totalPages,
  creationTimestamp
}) => {
  const timestamp = creationTimestamp || new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <View style={PDFStyles.footer}>
      <Text style={PDFStyles.footerLeft}>
        This document is part of Comfrut's quality management system.
      </Text>
      <Text style={PDFStyles.footerRight}>
        {pageNumber && totalPages ? `Page ${pageNumber} of ${totalPages}` : ''}
        {pageNumber && totalPages && creationTimestamp ? ' • ' : ''}
        {creationTimestamp ? timestamp : ''}
      </Text>
    </View>
  )
}

// Section Title Component (with bilingual support)
interface PDFSectionTitleProps {
  titleEn: string
  titleEs?: string
}

export const PDFSectionTitle: React.FC<PDFSectionTitleProps> = ({ titleEn, titleEs }) => {
  return (
    <View>
      <Text style={PDFStyles.sectionTitle}>{titleEn}</Text>
      {titleEs && (
        <Text style={PDFStyles.sectionTitleSpanish}>{titleEs}</Text>
      )}
    </View>
  )
}

// Status Badge Component
interface PDFStatusBadgeProps {
  status: 'comply' | 'notComply' | 'withinRange' | 'overLimit' | 'underLimit' | 'observation' | 'pending'
  customText?: string
}

export const PDFStatusBadge: React.FC<PDFStatusBadgeProps> = ({ status, customText }) => {
  const statusConfig = PDFStatusColors[status]
  
  return (
    <View style={[PDFStyles.statusBadge, { backgroundColor: statusConfig.backgroundColor }]}>
      <Text style={{ color: statusConfig.color, fontSize: 8, fontWeight: 'bold', textAlign: 'center' }}>
        {customText || statusConfig.text}
      </Text>
    </View>
  )
}

// Export logo for use in other components
export { logoBase64 }

