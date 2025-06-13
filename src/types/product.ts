export interface ProductEntry {
  marca: string
  material: string
  sku: string
}

export interface ProductsData {
  [key: string]: ProductEntry[]
}

export interface ProductSelection {
  brand: string
  material: string
  sku: string
} 