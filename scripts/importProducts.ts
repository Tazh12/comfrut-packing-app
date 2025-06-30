import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { config } from 'dotenv'

// Cargar variables de entorno
config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function importProducts() {
  try {
    // Leer el archivo Excel
    const workbook = XLSX.readFile('BBDD_brand_sku.xlsx')
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convertir a JSON
    const data = XLSX.utils.sheet_to_json(worksheet)
    
    // Formatear datos para Supabase
    const products = data.map((row: any) => ({
      brand: row.brand || '',
      material: row.material || '',
      sku: row.sku || ''
    }))

    // Insertar en Supabase
    const { data: insertedData, error } = await supabase
      .from('productos')
      .insert(products)
      .select()

    if (error) {
      console.error('Error inserting products:', error)
      return
    }

    console.log(`Successfully imported ${insertedData.length} products`)
  } catch (error) {
    console.error('Error importing products:', error)
  }
}

// Ejecutar la importación
importProducts() 