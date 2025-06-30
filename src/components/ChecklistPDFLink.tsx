import { jsPDF } from 'jspdf'
import { ChecklistItem, ProductEntry } from '@/types/checklist'

interface ChecklistPDFLinkProps {
  items: ChecklistItem[]
  lineManager: string
  machineOperator: string
  checklistDate: string
  product: ProductEntry
  photos: File[]
}

export async function ChecklistPDFLink({
  items,
  lineManager,
  machineOperator,
  checklistDate,
  product,
  photos
}: ChecklistPDFLinkProps): Promise<Blob> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = margin
  const lineHeight = 7

  // Add header
  doc.setFontSize(20)
  doc.text('Checklist de Empaque', margin, y)
  y += lineHeight * 2

  // Add form information
  doc.setFontSize(12)
  doc.text(`Jefe de Línea: ${lineManager}`, margin, y)
  y += lineHeight
  doc.text(`Operador de Máquina: ${machineOperator}`, margin, y)
  y += lineHeight
  doc.text(`Fecha: ${checklistDate}`, margin, y)
  y += lineHeight
  doc.text(`Producto: ${product.nombre}`, margin, y)
  y += lineHeight
  doc.text(`SKU: ${product.sku}`, margin, y)
  y += lineHeight * 2

  // Add checklist items
  doc.setFontSize(14)
  doc.text('Items del Checklist:', margin, y)
  y += lineHeight * 1.5

  doc.setFontSize(12)
  items.forEach((item, index) => {
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      y = margin
    }

    doc.text(`${index + 1}. ${item.nombre}`, margin, y)
    y += lineHeight
    doc.text(`Estado: ${item.status}`, margin + 10, y)
    y += lineHeight

    if (item.comment) {
      doc.text(`Comentario: ${item.comment}`, margin + 10, y)
      y += lineHeight
    }

    if (item.correctiveAction) {
      doc.text(`Acción Correctiva: ${item.correctiveAction}`, margin + 10, y)
      y += lineHeight
    }

    y += lineHeight
  })

  // Add photos if any
  if (photos.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      y = margin
    }

    doc.setFontSize(14)
    doc.text('Fotos:', margin, y)
    y += lineHeight * 1.5

    for (const photo of photos) {
      try {
        const arrayBuffer = await photo.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const imgData = `data:image/jpeg;base64,${base64}`
        
        if (y > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage()
          y = margin
        }

        doc.addImage(imgData, 'JPEG', margin, y, 100, 75)
        y += 80
      } catch (error) {
        console.error('Error embedding photo:', error)
      }
    }
  }

  const pdfBlob = doc.output('blob')
  return pdfBlob
} 