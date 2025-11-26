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
      <View style={[styles.statusBadge, isComply ? styles.statusComply : styles.statusNotComply]}>
        <Text style={{ fontSize: 7, textAlign: 'center', color: isComply ? '#065F46' : '#991B1B' }}>
          {isComply ? 'Comply' : 'Not Comply'}
        </Text>
      </View>
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

    pages.push(
      <Page key={pageIndex} size="A4" style={styles.page}>
        <Text style={styles.title}>Staff Good Practices Control</Text>
        <Text style={styles.subtitle}>Control de buenas prácticas del personal</Text>
        <Text style={styles.subtitle}>Code: CF/PC-ASC-004-RG003</Text>

        {/* Section 1: Basic Info - Only show on first page */}
        {pageIndex === 0 && (
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
        )}

        {/* Section 2: Staff Members */}
        <View style={styles.section}>
          {pageIndex === 0 && (
            <Text style={styles.sectionTitle}>Section 2 – Staff Members</Text>
          )}
          {pageMembers.map((member, idx) => (
            <StaffMemberSection
              key={startIndex + idx}
              member={member}
              index={startIndex + idx}
            />
          ))}
        </View>

        <Text style={styles.footer}>
          This document is part of Comfrut's quality management system.
          {totalPages > 1 && ` Page ${pageIndex + 1} of ${totalPages}`}
        </Text>
      </Page>
    )
  }

  return <Document>{pages}</Document>
}

