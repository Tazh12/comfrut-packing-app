import React from 'react'
import { Page, Text, View, StyleSheet, Image, Document } from '@react-pdf/renderer'
import { 
  PDFStyles, 
  PDFHeader2Row, 
  PDFMetaInfo, 
  PDFFooter, 
  PDFSectionTitle,
  PDFPhotoCard,
  PDFValidationBlock
} from '@/lib/pdf-layout'

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Roboto',
    backgroundColor: '#ffffff'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#005F9E'
  },
  subtitle: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 20,
    color: '#4B5563'
  },
  infoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 4,
    marginBottom: 20
  },
  infoGroup: {
    width: '50%',
    marginBottom: 8
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    marginRight: 4,
    color: '#374151'
  },
  infoValue: {
    fontSize: 8,
    color: '#111827'
  },
  photoSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    flexWrap: 'wrap'
  },
  photoFrame: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    padding: 5,
    backgroundColor: '#ffffff',
    marginBottom: 10
  },
  photo: {
    width: '100%',
    height: 300,
    objectFit: 'contain'
  },
  photoCaption: {
    fontSize: 9,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'normal',
    opacity: 0.8
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
  }
})

export interface ChecklistPDFMantenimientoProps {
  data: {
    fecha: string
    hora: string
    solicitante: string
    zona: string
    tipo_falla: string
    nivel_riesgo?: string
    equipo_afectado?: string
    descripcion_falla: string
    recomendacion: string
  }
  fotos: string[]
}

export const ChecklistPDFMantenimientoDocument: React.FC<ChecklistPDFMantenimientoProps> = ({ data, fotos }) => {
  const infoEntries: [string, string][] = [
    ['Fecha', data.fecha],
    ['Hora', data.hora],
    ['Solicitante', data.solicitante],
    ['Zona', data.zona],
    ['Tipo de falla', data.tipo_falla],
    ['Nivel de Riesgo', data.nivel_riesgo || '-'],
    ['Equipo / Activo Afectado', data.equipo_afectado || '-'],
    ['Descripción de la falla', data.descripcion_falla],
    ['Recomendación', data.recomendacion || '-']
  ]

  // Cada foto en su propia página
  const photoGroups = fotos.map(url => [url])

  // Split infoEntries into left and right columns
  const leftColumn = infoEntries.slice(0, Math.ceil(infoEntries.length / 2)).map(([label, value]) => ({
    label,
    value
  }))
  const rightColumn = infoEntries.slice(Math.ceil(infoEntries.length / 2)).map(([label, value]) => ({
    label,
    value
  }))

  const totalPages = 1 + photoGroups.length

  return (
    <Document>
      <Page size="A4" style={PDFStyles.page}>
        {/* Header Bar */}
        <PDFHeader2Row
          titleEn="Corrective Maintenance Request"
          titleEs="Solicitud de Mantenimiento Correctivo Programado"
          documentCode="CF-PC-MAN-001-RG006"
          version="V.01"
        />

        {/* Meta Info Block */}
        <PDFMetaInfo
          leftColumn={leftColumn}
          rightColumn={rightColumn}
        />

        {/* Footer */}
        <PDFFooter pageNumber={1} totalPages={totalPages} />
      </Page>

      {photoGroups.map((group, pageIndex) => (
        <Page size="A4" style={PDFStyles.page} key={pageIndex}>
          {/* Header Bar */}
          <PDFHeader2Row
            titleEn="Corrective Maintenance Request"
            titleEs="Solicitud de Mantenimiento Correctivo Programado"
            documentCode="CF-PC-MAN-001-RG006"
            version="V.01"
          />

          {/* Section Title */}
          <PDFSectionTitle
            titleEn="Section 2 – Evidence Photos"
            titleEs="Sección 2 – Fotos de evidencia"
          />

          {/* Photo */}
          <PDFPhotoCard
            photoUrl={group[0]}
            photoNumber={pageIndex + 1}
            caption="Vista general"
          />

          {/* Validation Section on last photo page */}
          {pageIndex === photoGroups.length - 1 && (
            <PDFValidationBlock
              data={{
                signature: undefined
              }}
            />
          )}

          {/* Footer */}
          <PDFFooter pageNumber={pageIndex + 2} totalPages={totalPages} />
        </Page>
      ))}
    </Document>
  )
} 