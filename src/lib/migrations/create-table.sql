-- Función para crear la tabla checklist_packing
create or replace function create_checklist_packing_table()
returns void
language plpgsql
as $$
begin
  -- Crear la tabla si no existe
  create table if not exists checklist_packing (
    id uuid primary key default uuid_generate_v4(),
    fecha date not null,
    jefe_linea text not null,
    operador_maquina text not null,
    marca text not null,
    material text not null,
    sku text not null,
    items jsonb not null,
    pdf_url text not null,
    created_at timestamptz not null default now()
  );

  -- Crear índices
  create index if not exists checklist_packing_fecha_idx on checklist_packing(fecha);
  create index if not exists checklist_packing_marca_idx on checklist_packing(marca);
  create index if not exists checklist_packing_material_idx on checklist_packing(material);
  create index if not exists checklist_packing_sku_idx on checklist_packing(sku);
end;
$$; 