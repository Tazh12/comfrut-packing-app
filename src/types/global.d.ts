declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react'
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: string | number
    absoluteStrokeWidth?: boolean
  }
  export const Check: ComponentType<IconProps>
  export const X: ComponentType<IconProps>
  export const AlertCircle: ComponentType<IconProps>
  export const Download: ComponentType<IconProps>
  export const FileText: ComponentType<IconProps>
  export const Search: ComponentType<IconProps>
  export const Filter: ComponentType<IconProps>
  export const ChevronDown: ComponentType<IconProps>
  export const ChevronUp: ComponentType<IconProps>
  export const ChevronLeft: ComponentType<IconProps>
  export const ChevronRight: ComponentType<IconProps>
  export const Plus: ComponentType<IconProps>
  export const Minus: ComponentType<IconProps>
  export const Trash2: ComponentType<IconProps>
  export const Edit: ComponentType<IconProps>
  export const Save: ComponentType<IconProps>
  export const Loader2: ComponentType<IconProps>
  export const Package: ComponentType<IconProps>
  export const Truck: ComponentType<IconProps>
  export const Settings: ComponentType<IconProps>
  export const LogOut: ComponentType<IconProps>
}

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