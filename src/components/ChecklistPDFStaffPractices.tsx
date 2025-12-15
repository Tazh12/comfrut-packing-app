import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { 
  PDFStyles, 
  PDFHeader2Row, 
  PDFMetaInfo, 
  PDFFooter, 
  PDFSectionTitle,
  PDFStatusBadge,
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
  staffMemberContainer: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#FAFAFA'
  },
  staffMemberHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 4
  },
  complianceRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingVertical: 2
  },
  complianceLabel: {
    fontSize: 8,
    width: '35%',
    color: '#374151',
    fontWeight: 'bold'
  },
  complianceValue: {
    fontSize: 8,
    width: '15%',
    color: '#111827'
  },
  complianceAction: {
    fontSize: 7,
    width: '25%',
    color: '#6B7280'
  },
  complianceObservation: {
    fontSize: 7,
    width: '25%',
    color: '#6B7280'
  },
  statusBadge: {
    padding: 2,
    borderRadius: 2,
    width: 70,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusComply: {
    backgroundColor: '#D1FAE5',
    color: '#065F46'
  },
  statusNotComply: {
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
  pageBreak: {
    marginTop: 20,
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  }
})

interface ChecklistStaffPracticesPDFProps {
  data: {
    section1: {
      date: string
      shift: string
      monitorName: string
      monitorSignature: string
    }
    section2: {
      staffMembers: Array<{
        name: string
        area: string
        staffAppearance: string
        completeUniform: string
        accessoriesAbsence: string
        workToolsUsage: string
        cutCleanNotPolishedNails: string
        noMakeupOn: string
        staffBehavior: string
        staffHealth: string
        staffAppearanceCorrectiveAction: string
        staffAppearanceObservation: string
        completeUniformCorrectiveAction: string
        completeUniformObservation: string
        accessoriesAbsenceCorrectiveAction: string
        accessoriesAbsenceObservation: string
        workToolsUsageCorrectiveAction: string
        workToolsUsageObservation: string
        cutCleanNotPolishedNailsCorrectiveAction: string
        cutCleanNotPolishedNailsObservation: string
        noMakeupOnCorrectiveAction: string
        noMakeupOnObservation: string
        staffBehaviorCorrectiveAction: string
        staffBehaviorObservation: string
        staffHealthCorrectiveAction: string
        staffHealthObservation: string
      }>
    }
  }
}

const ComplianceFieldRow: React.FC<{
  label: string
  value: string
  correctiveAction: string
  observation: string
}> = ({ label, value, correctiveAction, observation }) => {
  const isComply = value === 'comply'
  
  return (
    <View style={styles.complianceRow}>
      <Text style={styles.complianceLabel}>{label}:</Text>
      <PDFStatusBadge status={isComply ? 'comply' : 'notComply'} />
      {!isComply && (
        <>
          <Text style={styles.complianceAction}>
            CA: {correctiveAction || '-'}
          </Text>
          <Text style={styles.complianceObservation}>
            Obs: {observation || '-'}
          </Text>
        </>
      )}
      {isComply && (
        <>
          <Text style={styles.complianceAction}>-</Text>
          <Text style={styles.complianceObservation}>-</Text>
        </>
      )}
    </View>
  )
}

const StaffMemberSection: React.FC<{
  member: ChecklistStaffPracticesPDFProps['data']['section2']['staffMembers'][0]
  index: number
}> = ({ member, index }) => {
  return (
    <View style={styles.staffMemberContainer}>
      <Text style={styles.staffMemberHeader}>
        Staff Member #{index + 1}: {member.name} - Area: {member.area}
      </Text>
      
      <ComplianceFieldRow
        label="Staff Appearance"
        value={member.staffAppearance}
        correctiveAction={member.staffAppearanceCorrectiveAction}
        observation={member.staffAppearanceObservation}
      />
      
      <ComplianceFieldRow
        label="Complete Uniform"
        value={member.completeUniform}
        correctiveAction={member.completeUniformCorrectiveAction}
        observation={member.completeUniformObservation}
      />
      
      <ComplianceFieldRow
        label="Accessories Absence"
        value={member.accessoriesAbsence}
        correctiveAction={member.accessoriesAbsenceCorrectiveAction}
        observation={member.accessoriesAbsenceObservation}
      />
      
      <ComplianceFieldRow
        label="Work Tools Usage"
        value={member.workToolsUsage}
        correctiveAction={member.workToolsUsageCorrectiveAction}
        observation={member.workToolsUsageObservation}
      />
      
      <ComplianceFieldRow
        label="Cut, Clean, Not Polished Nails"
        value={member.cutCleanNotPolishedNails}
        correctiveAction={member.cutCleanNotPolishedNailsCorrectiveAction}
        observation={member.cutCleanNotPolishedNailsObservation}
      />
      
      <ComplianceFieldRow
        label="No Makeup On"
        value={member.noMakeupOn}
        correctiveAction={member.noMakeupOnCorrectiveAction}
        observation={member.noMakeupOnObservation}
      />
      
      <ComplianceFieldRow
        label="Staff Behavior"
        value={member.staffBehavior}
        correctiveAction={member.staffBehaviorCorrectiveAction}
        observation={member.staffBehaviorObservation}
      />
      
      <ComplianceFieldRow
        label="Staff Health"
        value={member.staffHealth}
        correctiveAction={member.staffHealthCorrectiveAction}
        observation={member.staffHealthObservation}
      />
    </View>
  )
}

export const ChecklistStaffPracticesPDFDocument: React.FC<ChecklistStaffPracticesPDFProps> = ({ data }) => {
  const staffMembersPerPage = 3 // Adjust based on content size
  const totalPages = Math.ceil(data.section2.staffMembers.length / staffMembersPerPage)

  const pages = []
  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const startIndex = pageIndex * staffMembersPerPage
    const endIndex = Math.min(startIndex + staffMembersPerPage, data.section2.staffMembers.length)
    const pageMembers = data.section2.staffMembers.slice(startIndex, endIndex)

    const creationDate = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })

    pages.push(
      <Page key={pageIndex} size="A4" style={PDFStyles.page}>
        {/* Header Bar */}
        <PDFHeader2Row
          titleEn="Staff Good Practices Control"
          titleEs="Control de buenas prácticas del personal"
          documentCode="CF/PC-ASC-004-RG003"
          version="V.01"
        />

        {/* Section 1: Basic Info - Only show on first page */}
        {pageIndex === 0 && (
          <View style={styles.section}>
            <PDFMetaInfo
              leftColumn={[
                { label: 'Date', value: data.section1.date },
                { label: 'Shift', value: data.section1.shift }
              ]}
              rightColumn={[
                { label: 'Monitor Name', value: data.section1.monitorName }
              ]}
            />
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Monitor Signature</Text>
              {data.section1.monitorSignature ? (
                <Image src={data.section1.monitorSignature} style={styles.signatureImage} />
              ) : (
                <Text style={{ fontSize: 8, color: '#9CA3AF' }}>No signature provided</Text>
              )}
            </View>
          </View>
        )}

        {/* Section 2: Staff Members */}
        <View style={styles.section}>
          {pageIndex === 0 && (
            <PDFSectionTitle 
              titleEn="Section 2 – Staff Members"
              titleEs="Sección 2 – Miembros del personal"
            />
          )}
          {pageMembers.map((member, idx) => (
            <StaffMemberSection
              key={startIndex + idx}
              member={member}
              index={startIndex + idx}
            />
          ))}
        </View>

        {/* Validation Section - Only on last page */}
        {pageIndex === totalPages - 1 && (
          <PDFValidationBlock
            data={{
              signature: undefined
            }}
          />
        )}

        <PDFFooter 
          pageNumber={pageIndex + 1} 
          totalPages={totalPages}
        />
      </Page>
    )
  }

  return <Document>{pages}</Document>
}

