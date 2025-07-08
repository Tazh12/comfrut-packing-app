#!/usr/bin/env ts-node
// @ts-nocheck
import dotenv from 'dotenv'
// Cargar variables de entorno desde .env.local
dotenv.config({ path: '.env.local' })
import { Client } from 'pg'

async function main() {
  // Verificar variables de entorno
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  console.log('NEXT_PUBLIC_SUPABASE_URL =', supabaseUrl)
  console.log('SUPABASE_SERVICE_ROLE_KEY =', serviceKey ? serviceKey.slice(0, 4) + '****' : serviceKey)
  if (!supabaseUrl || !serviceKey) {
    console.error('ERROR: ENV variables NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
    process.exit(1)
  }

  // Derivar host de la URL de Supabase
  const { hostname } = new URL(supabaseUrl)

  // Crear cliente Postgres
  const client = new Client({
    host: hostname,
    port: 5432,
    user: 'postgres',
    password: serviceKey,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log(`Connected to Supabase DB at ${hostname}`)

    const sql = `
CREATE OR REPLACE FUNCTION storage.set_auth_uid()
RETURNS trigger AS $$
BEGIN
  NEW.owner := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_auth_uid ON storage.objects;

CREATE TRIGGER set_auth_uid
BEFORE INSERT ON storage.objects
FOR EACH ROW EXECUTE PROCEDURE storage.set_auth_uid();
`

    console.log('Executing SQL to create storage.set_auth_uid function and trigger...')
    await client.query(sql)
    console.log('Function and trigger set_auth_uid created successfully.')
  } catch (error: any) {
    console.error('Error executing SQL for set_auth_uid:', error.message || error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('Database connection closed. Script completed.')
  }
}

// Ejecutar el script
main() 