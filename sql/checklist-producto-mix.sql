-- =====================================================
-- Quality Control of Freezing Fruit Process (Mix) - Supabase Setup
-- =====================================================
-- Code: CF/PC-PG-ASC-006-RG001
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. The storage bucket creation requires service_role permissions
--    If bucket creation fails, create it manually in Dashboard > Storage
-- =====================================================

-- 1. Create the checklist_producto_mix table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.checklist_producto_mix (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Section 1: Basic Info
    date_string VARCHAR(20) NOT NULL, -- Format: MMM-DD-YYYY (e.g., "NOV-17-2025")
    orden_fabricacion VARCHAR(255) NOT NULL,
    jefe_linea VARCHAR(255) NOT NULL,
    control_calidad VARCHAR(255) NOT NULL,
    firma_monitor_calidad TEXT, -- Base64 encoded signature image
    cliente VARCHAR(255) NOT NULL,
    producto VARCHAR(500) NOT NULL,
    sku VARCHAR(255) NOT NULL,
    
    -- Section 2: Pallets (stored as JSONB array)
    pallets JSONB NOT NULL DEFAULT '[]'::jsonb,
    /*
    Pallets structure:
    [
      {
        "id": 1234567890,
        "collapsed": false,
        "fieldsByFruit": {
          "FRUTILLA": [
            { "campo": "Calibre Small < 22mm (%)", "unidad": "%" },
            ...
          ],
          "MANGO": [...]
        },
        "commonFields": [
          { "campo": "Hora", "unidad": "" },
          { "campo": "Peso Bolsa (gr)", "unidad": "GKG" },
          { "campo": "Temperatura Pulpa", "unidad": "°C" },
          { "campo": "pH", "unidad": "" },
          { "campo": "Brix", "unidad": "" },
          ...
        ],
        "expectedCompositions": {
          "FRUTILLA": 0.35,
          "MANGO": 0.15,
          ...
        },
        "values": {
          "Hora": "08:30",
          "Peso Bolsa (gr)": "1370",
          "Temperatura Pulpa": "34",
          "pH": "6",
          "Brix": "3",
          "Código Caja": "12345",
          "Código Barra Pallet": "67890",
          "Observaciones": "Test",
          "Peso Fruta FRUTILLA": "670",
          "FRUTILLA-Calibre Small < 22mm (%)": "10",
          ...
        }
      },
      ...
    ]
    */
    
    -- PDF and metadata
    pdf_url TEXT,
    date_utc TIMESTAMPTZ DEFAULT NOW(), -- UTC timestamp for querying
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for better query performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_checklist_producto_mix_date_utc 
    ON public.checklist_producto_mix(date_utc DESC);

CREATE INDEX IF NOT EXISTS idx_checklist_producto_mix_date_string 
    ON public.checklist_producto_mix(date_string);

CREATE INDEX IF NOT EXISTS idx_checklist_producto_mix_sku 
    ON public.checklist_producto_mix(sku);

CREATE INDEX IF NOT EXISTS idx_checklist_producto_mix_cliente 
    ON public.checklist_producto_mix(cliente);

CREATE INDEX IF NOT EXISTS idx_checklist_producto_mix_orden_fabricacion 
    ON public.checklist_producto_mix(orden_fabricacion);

-- 3. Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.checklist_producto_mix ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- =====================================================
-- Policy: Allow authenticated users to read all records
CREATE POLICY "Allow authenticated users to read checklist_producto_mix"
    ON public.checklist_producto_mix
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert records
CREATE POLICY "Allow authenticated users to insert checklist_producto_mix"
    ON public.checklist_producto_mix
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow authenticated users to update records
CREATE POLICY "Allow authenticated users to update checklist_producto_mix"
    ON public.checklist_producto_mix
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Create function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_checklist_producto_mix_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically update updated_at
-- =====================================================
CREATE TRIGGER update_checklist_producto_mix_updated_at
    BEFORE UPDATE ON public.checklist_producto_mix
    FOR EACH ROW
    EXECUTE FUNCTION update_checklist_producto_mix_updated_at();

-- 7. Create storage bucket for PDFs
-- =====================================================
-- Note: This requires service_role permissions
-- If this fails, create the bucket manually in Supabase Dashboard > Storage
-- Bucket settings:
--   - Name: checklist-producto-mix
--   - Public: true (MUST be public for getPublicUrl() to work)
--   - File size limit: 10MB
--   - Allowed MIME types: application/pdf

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'checklist-producto-mix',
    'checklist-producto-mix',
    true, -- Set to true (public) so getPublicUrl() works
    10485760, -- 10MB in bytes
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf'];

-- 8. Create storage policies for the bucket
-- =====================================================
-- Policy: Allow authenticated users to upload PDFs
CREATE POLICY "Allow authenticated users to upload PDFs checklist_producto_mix"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'checklist-producto-mix'
    );

-- Policy: Allow authenticated users to read PDFs
CREATE POLICY "Allow authenticated users to read PDFs checklist_producto_mix"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'checklist-producto-mix');

-- Policy: Allow authenticated users to update PDFs
CREATE POLICY "Allow authenticated users to update PDFs checklist_producto_mix"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'checklist-producto-mix')
    WITH CHECK (bucket_id = 'checklist-producto-mix');

-- Policy: Allow authenticated users to delete PDFs
CREATE POLICY "Allow authenticated users to delete PDFs checklist_producto_mix"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'checklist-producto-mix');

-- =====================================================
-- Setup Complete!
-- =====================================================
-- 
-- Verification Queries (uncomment to run):
-- 
-- Check table structure:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'checklist_producto_mix'
-- ORDER BY ordinal_position;
-- 
-- Check indexes:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'checklist_producto_mix';
-- 
-- Check RLS policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'checklist_producto_mix';
-- 
-- Check storage bucket:
-- SELECT * FROM storage.buckets WHERE id = 'checklist-producto-mix';
-- 
-- Check storage policies:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%checklist_producto_mix%';
-- 
-- =====================================================

