import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { 
  PDFStyles, 
  PDFHeader, 
  PDFMetaInfo, 
  PDFFooter, 
  PDFSectionTitle,
  PDFStatusBadge
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
  personContainer: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#FAFAFA'
  },
  personHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 4
  },
  personRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingVertical: 2
  },
  personLabel: {
    fontSize: 8,
    width: '30%',
    color: '#374151',
    fontWeight: 'bold'
  },
  personValue: {
    fontSize: 8,
    width: '70%',
    color: '#111827'
  },
  noFindingsBox: {
    marginTop: 10,
    marginBottom: 10,
    padding: 15,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 4
  },
  noFindingsText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#166534',
    textAlign: 'center'
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

interface ChecklistStaffGlassesAuditoryPDFProps {
  data: {
    section1: {
      date: string
      monitorName: string
      monitorSignature: string
    }
    section2: {
      noFindings: boolean
      persons: Array<{
        name: string
        area: string
        glassType: string
        conditionIn: string
        conditionOut: string
        observationIn: string
        observationOut: string
      }>
    }
  }
}

const PersonSection: React.FC<{
  person: ChecklistStaffGlassesAuditoryPDFProps['data']['section2']['persons'][0]
  index: number
}> = ({ person, index }) => {
  return (
    <View style={styles.personContainer}>
      <Text style={styles.personHeader}>
        Person #{index + 1}: {person.name} - Area: {person.area}
      </Text>
      
      <View style={styles.personRow}>
        <Text style={styles.personLabel}>Glass Type / Tipo de lente:</Text>
        <Text style={styles.personValue}>{person.glassType || '-'}</Text>
      </View>
      
      <View style={styles.personRow}>
        <Text style={styles.personLabel}>Condition In (when going into the process room):</Text>
        <PDFStatusBadge status={person.conditionIn === 'comply' ? 'comply' : 'notComply'} />
      </View>
      {person.conditionIn === 'not_comply' && person.observationIn && (
        <View style={styles.personRow}>
          <Text style={styles.personLabel}>Observation (Condition In):</Text>
          <Text style={styles.personValue}>{person.observationIn}</Text>
        </View>
      )}
      
      <View style={styles.personRow}>
        <Text style={styles.personLabel}>Condition Out (when leaving the process room):</Text>
        <PDFStatusBadge status={person.conditionOut === 'comply' ? 'comply' : 'notComply'} />
      </View>
      {person.conditionOut === 'not_comply' && person.observationOut && (
        <View style={styles.personRow}>
          <Text style={styles.personLabel}>Observation (Condition Out):</Text>
          <Text style={styles.personValue}>{person.observationOut}</Text>
        </View>
      )}
    </View>
  )
}

export const ChecklistStaffGlassesAuditoryPDFDocument: React.FC<ChecklistStaffGlassesAuditoryPDFProps> = ({ data }) => {
  const personsPerPage = 5 // Adjust based on content size
  const totalPages = data.section2.noFindings 
    ? 1 
    : Math.ceil(data.section2.persons.length / personsPerPage)

  const pages = []
  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const startIndex = pageIndex * personsPerPage
    const endIndex = Math.min(startIndex + personsPerPage, data.section2.persons.length)
    const pagePersons = data.section2.persons.slice(startIndex, endIndex)

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
        <PDFHeader
          titleEn="Process area staff glasses and auditory protector control"
          titleEs="Control de lentes y/o protector auditivo del personal que ingresa a areas de proceso"
          documentCode="CF/PC-PG-ASC-004-RG004"
          version="V.01"
          date={data.section1.date}
        />

        {/* Section 1: Basic Info - Only show on first page */}
        {pageIndex === 0 && (
          <View style={styles.section}>
            <PDFMetaInfo
              leftColumn={[
                { label: 'Date', value: data.section1.date }
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

        {/* Section 2: Persons */}
        <View style={styles.section}>
          {pageIndex === 0 && (
            <PDFSectionTitle 
              titleEn="Section 2 – Persons"
              titleEs="Sección 2 – Personas"
            />
          )}
          
          {data.section2.noFindings ? (
            <View style={styles.noFindingsBox}>
              <Text style={styles.noFindingsText}>
                Sin hallazgos / No Findings
              </Text>
            </View>
          ) : (
            <>
              {pagePersons.map((person, idx) => (
                <PersonSection
                  key={startIndex + idx}
                  person={person}
                  index={startIndex + idx}
                />
              ))}
            </>
          )}
        </View>

        <PDFFooter 
          pageNumber={pageIndex + 1} 
          totalPages={totalPages} 
          creationTimestamp={creationDate} 
        />
      </Page>
    )
  }

  return <Document>{pages}</Document>
}

