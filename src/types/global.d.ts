declare module 'xlsx' {
  export function read(data: any, opts?: any): any
  export const utils: {
    book_new(): any
    book_append_sheet(wb: any, ws: any, name?: string): void
    aoa_to_sheet(data: any[][]): any
  }
  export function write(wb: any, opts?: any): any
}

declare module 'jszip' {
  export default class JSZip {
    file(name: string, data: any, options?: any): JSZip
    generateAsync(options?: any): Promise<any>
  }
}

declare module 'pdf-lib' {
  export class PDFDocument {
    static load(data: Uint8Array): Promise<PDFDocument>
    save(): Promise<Uint8Array>
    getPages(): PDFPage[]
    addPage(): PDFPage
  }

  export class PDFPage {
    drawText(text: string, options?: any): void
    drawRectangle(options?: any): void
    drawLine(options?: any): void
    setFont(font: PDFFont): void
    setFontSize(size: number): void
  }

  export class PDFFont {
    static embed(document: PDFDocument, fontData: Uint8Array): Promise<PDFFont>
  }
} 