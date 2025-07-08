// @ts-nocheck
import dotenv from 'dotenv'
// Cargar variables desde .env.local
dotenv.config({ path: '.env.local' })
// Verificar carga de variables
console.log('NEXT_PUBLIC_SUPABASE_URL=', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('SUPABASE_SERVICE_ROLE_KEY=', process.env.SUPABASE_SERVICE_ROLE_KEY)

// @ts-nocheck
import { Client } from 'pg'

;(async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('ERROR: Las variables de entorno NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas.')
    process.exit(1)
  }

  // Derivar host de la URL de Supabase
  const { hostname } = new URL(supabaseUrl)

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
    console.log('Conectado a la base de datos de Supabase. Ejecutando SQL...')

    const sql = `
create or replace function storage.set_auth_uid()
returns trigger as $$
begin
  new.owner := auth.uid();
  return new;
end;
$$ language plpgsql security definer;

-- Eliminar trigger si ya existe
drop trigger if exists set_auth_uid on storage.objects;

-- Crear trigger que invoca la función antes de insertar
create trigger set_auth_uid
before insert on storage.objects
for each row execute procedure storage.set_auth_uid();
`

    await client.query(sql)
    console.log('La función y el trigger set_auth_uid se han creado correctamente.')
  } catch (error) {
    console.error('Error ejecutando SQL para set_auth_uid:', error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('Conexión cerrada. Script finalizado.')
  }
})() 