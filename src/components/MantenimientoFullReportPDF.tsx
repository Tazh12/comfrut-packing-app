import React from 'react'
import { Page, Text, View, StyleSheet, Font, Image, Document } from '@react-pdf/renderer'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// Registrar fuentes
Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf' },
    { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' },
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
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    color: '#005F9E'
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    color: '#4B5563'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 5
  },
  infoContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 4,
    marginBottom: 15
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
    flexWrap: 'wrap'
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    marginRight: 8,
    color: '#374151',
    width: '35%'
  },
  infoValue: {
    fontSize: 9,
    color: '#111827',
    flex: 1
  },
  textBlock: {
    fontSize: 9,
    color: '#111827',
    marginBottom: 10,
    lineHeight: 1.4
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    marginBottom: 10
  },
  photoContainer: {
    width: '48%',
    marginBottom: 10,
    marginRight: '2%'
  },
  photo: {
    width: '100%',
    height: 150,
    marginBottom: 5
  },
  photoCaption: {
    fontSize: 8,
    color: '#6B7280',
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
})

export interface MantenimientoFullReportPDFProps {
  solicitud: {
    ticket_id?: number
    fecha: string
    hora: string
    solicitante: string
    zona: string
    equipo_afectado?: string
    nivel_riesgo?: string
    descripcion?: string
    recomendacion?: string
    tecnico?: string
    fecha_ejecucion?: string
    accion_realizada?: string
    observaciones?: string
    fotos_urls?: string[]
    fotos_ejecucion?: string[]
  }
  asignacionInfo?: {
    tecnico: string
    prioridad: string
    fechaProgramada: string
    notas?: string
  }
  validacionInfo?: {
    supervisor: string
    fecha: string
    comentario?: string
  }
}

export const MantenimientoFullReportPDFDocument: React.FC<MantenimientoFullReportPDFProps> = ({ 
  solicitud, 
  asignacionInfo,
  validacionInfo 
}) => {
  const fotosOriginales = solicitud.fotos_urls && Array.isArray(solicitud.fotos_urls) 
    ? solicitud.fotos_urls.filter((url: string) => url && url.trim()) 
    : []
  const fotosEjecucion = solicitud.fotos_ejecucion && Array.isArray(solicitud.fotos_ejecucion)
    ? solicitud.fotos_ejecucion.filter((url: string) => url && url.trim())
    : []

  return (
    <Document>
      {/* Page 1: Solicitud Original */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Reporte Completo de Mantenimiento</Text>
        <Text style={styles.subtitle}>Ticket #{solicitud.ticket_id || 'N/A'}</Text>
        
        <Text style={styles.sectionTitle}>1. Solicitud Original</Text>
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fecha:</Text>
            <Text style={styles.infoValue}>{solicitud.fecha}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hora:</Text>
            <Text style={styles.infoValue}>{solicitud.hora}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Solicitante:</Text>
            <Text style={styles.infoValue}>{solicitud.solicitante}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Zona:</Text>
            <Text style={styles.infoValue}>{solicitud.zona}</Text>
          </View>
          {solicitud.equipo_afectado && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Equipo afectado:</Text>
              <Text style={styles.infoValue}>{solicitud.equipo_afectado}</Text>
            </View>
          )}
          {solicitud.nivel_riesgo && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nivel de riesgo:</Text>
              <Text style={styles.infoValue}>{solicitud.nivel_riesgo}</Text>
            </View>
          )}
        </View>

        {solicitud.descripcion && (
          <>
            <Text style={styles.sectionTitle}>Descripción del problema</Text>
            <Text style={styles.textBlock}>{solicitud.descripcion}</Text>
          </>
        )}

        {solicitud.recomendacion && (
          <>
            <Text style={styles.sectionTitle}>Recomendación del solicitante</Text>
            <Text style={styles.textBlock}>{solicitud.recomendacion}</Text>
          </>
        )}

        {fotosOriginales.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Fotos adjuntas iniciales</Text>
            <View style={styles.photoGrid}>
              {fotosOriginales.slice(0, 4).map((url: string, index: number) => (
                <View key={index} style={styles.photoContainer}>
                  <Image src={url} style={styles.photo} />
                  <Text style={styles.photoCaption}>Foto {index + 1}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.footer}>Este documento es parte del sistema de gestión de calidad de Comfrut</Text>
      </Page>

      {/* Page 2: Trabajo Realizado */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>2. Trabajo Realizado</Text>
        
        {asignacionInfo && (
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Técnico responsable:</Text>
              <Text style={styles.infoValue}>{asignacionInfo.tecnico}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Prioridad:</Text>
              <Text style={styles.infoValue}>{asignacionInfo.prioridad}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha programada:</Text>
              <Text style={styles.infoValue}>{asignacionInfo.fechaProgramada}</Text>
            </View>
            {asignacionInfo.notas && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Notas:</Text>
                <Text style={styles.infoValue}>{asignacionInfo.notas}</Text>
              </View>
            )}
          </View>
        )}

        {solicitud.fecha_ejecucion && (
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha de ejecución:</Text>
              <Text style={styles.infoValue}>
                {(() => {
                  try {
                    const fecha = parseISO(solicitud.fecha_ejecucion)
                    return format(fecha, 'dd-MM-yyyy', { locale: es })
                  } catch {
                    return solicitud.fecha_ejecucion
                  }
                })()}
              </Text>
            </View>
          </View>
        )}

        {solicitud.accion_realizada && (
          <>
            <Text style={styles.sectionTitle}>Acción realizada</Text>
            <Text style={styles.textBlock}>{solicitud.accion_realizada}</Text>
          </>
        )}

        {fotosEjecucion.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Fotos de ejecución</Text>
            <View style={styles.photoGrid}>
              {fotosEjecucion.slice(0, 4).map((url: string, index: number) => (
                <View key={index} style={styles.photoContainer}>
                  <Image src={url} style={styles.photo} />
                  <Text style={styles.photoCaption}>Ejecución {index + 1}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.footer}>Este documento es parte del sistema de gestión de calidad de Comfrut</Text>
      </Page>

      {/* Page 3: Validación (si existe) */}
      {validacionInfo && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>3. Validación</Text>
          
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Validado por:</Text>
              <Text style={styles.infoValue}>{validacionInfo.supervisor}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha de validación:</Text>
              <Text style={styles.infoValue}>{validacionInfo.fecha}</Text>
            </View>
            {validacionInfo.comentario && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Comentario:</Text>
                </View>
                <Text style={styles.textBlock}>{validacionInfo.comentario}</Text>
              </>
            )}
          </View>

          <Text style={styles.footer}>Este documento es parte del sistema de gestión de calidad de Comfrut</Text>
        </Page>
      )}

      {/* Additional pages for remaining photos */}
      {fotosOriginales.length > 4 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Fotos adjuntas adicionales</Text>
          <View style={styles.photoGrid}>
            {fotosOriginales.slice(4).map((url: string, index: number) => (
              <View key={index + 4} style={styles.photoContainer}>
                <Image src={url} style={styles.photo} />
                <Text style={styles.photoCaption}>Foto {index + 5}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.footer}>Este documento es parte del sistema de gestión de calidad de Comfrut</Text>
        </Page>
      )}

      {fotosEjecucion.length > 4 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Fotos de ejecución adicionales</Text>
          <View style={styles.photoGrid}>
            {fotosEjecucion.slice(4).map((url: string, index: number) => (
              <View key={index + 4} style={styles.photoContainer}>
                <Image src={url} style={styles.photo} />
                <Text style={styles.photoCaption}>Ejecución {index + 5}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.footer}>Este documento es parte del sistema de gestión de calidad de Comfrut</Text>
        </Page>
      )}
    </Document>
  )
}
