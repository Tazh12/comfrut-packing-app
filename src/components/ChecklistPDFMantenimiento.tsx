import React from 'react'
import { Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'

// Registrar fuentes
Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf' },
    { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' },
    { src: '/fonts/Roboto-Italic.ttf', fontStyle: 'italic' }, // nuevo
    // FALTA el archivo Roboto-Italic.ttf en public/fonts/ si no existe
  ]
})

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

  return (
    <>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Solicitud de Mantenimiento Correctivo Programado</Text>
        <Text style={styles.subtitle}>CF-PC-MAN-001-RG006</Text>
        <View style={styles.infoContainer}>
          {infoEntries.map(([label, value], idx) => (
            <View style={styles.infoGroup} key={idx}>
              <Text>
                <Text style={styles.infoLabel}>{label}:</Text>
                <Text style={styles.infoValue}>{value}</Text>
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.footer}>Este documento es parte del sistema de gestión de calidad de Comfrut</Text>
      </Page>

      {photoGroups.map((group, pageIndex) => (
        <Page size="A4" style={styles.page} key={pageIndex}>
          <View style={styles.photoSection}>
            <View style={styles.photoFrame}>
              <Image src={group[0]} style={styles.photo} />
              <Text style={styles.photoCaption}>{`Foto ${pageIndex + 1} - Vista general`}</Text>
            </View>
          </View>
          <Text style={styles.footer}>Este documento es parte del sistema de gestión de calidad de Comfrut</Text>
        </Page>
      ))}
    </>
  )
} 