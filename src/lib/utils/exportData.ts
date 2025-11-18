import * as XLSX from 'xlsx'

/**
 * Export data to Excel or CSV format
 * @param data - Array of objects or array of arrays (rows)
 * @param fileName - Base filename without extension
 * @param format - 'excel' or 'csv'
 * @param sheetName - Name for the Excel sheet (ignored for CSV)
 */
export function exportToFile(
  data: any[] | any[][],
  fileName: string,
  format: 'excel' | 'csv' = 'excel',
  sheetName: string = 'Data'
) {
  try {
    let ws: XLSX.WorkSheet
    let wb: XLSX.WorkBook | null = null

    // Convert data to array of arrays format
    let rows: any[][] = []
    
    if (data.length === 0) {
      throw new Error('No data to export')
    }

    // Check if data is array of objects or array of arrays
    if (Array.isArray(data[0]) && typeof data[0][0] !== 'object') {
      // Already in array format
      rows = data as any[][]
    } else {
      // Array of objects - convert to array format
      const objects = data as any[]
      const headers = Object.keys(objects[0])
      rows = [headers]
      
      objects.forEach(obj => {
        const row = headers.map(key => {
          const value = obj[key]
          // Handle nested objects and arrays
          if (value === null || value === undefined) return ''
          if (typeof value === 'object') {
            return JSON.stringify(value)
          }
          return value
        })
        rows.push(row)
      })
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csvContent = rows.map(row => {
        return row.map(cell => {
          const cellValue = cell === null || cell === undefined ? '' : String(cell)
          // Escape quotes and wrap in quotes if contains comma, newline, or quote
          if (cellValue.includes(',') || cellValue.includes('\n') || cellValue.includes('"')) {
            return `"${cellValue.replace(/"/g, '""')}"`
          }
          return cellValue
        }).join(',')
      }).join('\n')

      // Add BOM for UTF-8 to help Excel open it correctly
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${fileName}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } else {
      // Excel format
      ws = XLSX.utils.aoa_to_sheet(rows)
      wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
      XLSX.writeFile(wb, `${fileName}.xlsx`)
    }
  } catch (error) {
    console.error('Error exporting data:', error)
    throw error
  }
}

/**
 * Export a single record (object) to Excel or CSV
 * @param record - Single object to export
 * @param fileName - Base filename without extension
 * @param format - 'excel' or 'csv'
 */
export function exportRecord(
  record: any,
  fileName: string,
  format: 'excel' | 'csv' = 'excel'
) {
  const headers = Object.keys(record)
  const values = Object.values(record).map((v: any) => {
    if (v === null || v === undefined) return ''
    if (typeof v === 'object') return JSON.stringify(v)
    return v
  })
  
  exportToFile([headers, values], fileName, format, 'Checklist')
}

