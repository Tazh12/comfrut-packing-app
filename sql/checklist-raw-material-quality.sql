-- =====================================================
-- Raw Material Quality Report / Reporte de calidad materia prima - Supabase Setup
-- =====================================================
-- Code: CF-ASC-011-RG001
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. The storage bucket creation requires service_role permissions
--    If bucket creation fails, create it manually in Dashboard > Storage
-- =====================================================

-- 1. Create the checklist_raw_material_quality table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.checklist_raw_material_quality (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Section 1: Basic Info
    supplier VARCHAR(255) NOT NULL,
    fruit VARCHAR(100) NOT NULL, -- Pineapple, Strawberries, Blackberries, Mango, Cherries, Peach, Blueberries, Grapes, Papaya, Banana
    sku VARCHAR(255), -- Optional
    format_presentation VARCHAR(255), -- IQF, chunks, slices, etc.
    origin_country VARCHAR(255) NOT NULL,
    reception_date_time TIMESTAMPTZ NOT NULL,
    container_number VARCHAR(255), -- Optional
    po_number VARCHAR(255), -- Optional
    lot_number VARCHAR(255), -- Optional
    monitor_name VARCHAR(255) NOT NULL,
    monitor_signature TEXT NOT NULL, -- Base64 encoded signature image
    processing_plant VARCHAR(255) NOT NULL,
    inspection_date_time TIMESTAMPTZ NOT NULL,
    cold_storage_receiving_temperature DECIMAL(5,2), -- Temperature in Celsius
    ttr VARCHAR(255), -- TTR value
    micro_pesticide_sample_taken VARCHAR(1) NOT NULL, -- Y or N
    
    -- Section 2: Box Samples (stored as JSONB array)
    box_samples JSONB NOT NULL DEFAULT '[]'::jsonb,
    /*
    Box Samples structure:
    [
      {
        "id": 1234567890,
        "boxNumber": "Box 1",
        "weightBox": "5000",  -- Weight of the box in grams
        "weightSample": "1000",  -- Weight of the sample in grams (used for percentage calculations)
        "values": {
          "Seeds %": "500",  -- Stored as grams, percentage calculated as (value / weightSample) * 100
          "Mold damage %": "200",
          "Crunchy %": "100",
          "Color variation %": "300",
          "Insect damage %": "0",
          "Small pieces %": "100",
          "Skin %": "200",
          "Spots %": "100",
          "Foreign matter %": "0",
          "Oxidation %": "0",
          "Blockade %": "0",
          "Vegetal residue %": "0",
          "Organoleptic": "Good"  -- Text value: Excellent, Good, Fair, or Poor
        }
      },
      ...
    ]
    Note: For percentage fields (fields with % in name), values are stored in grams.
    Percentages are calculated automatically: (grams / weightSample) * 100
    */
    
    -- Section 3: Organoleptico
    section3_color VARCHAR(255) NOT NULL DEFAULT '',
    section3_olor VARCHAR(255) NOT NULL DEFAULT '',
    section3_sabor VARCHAR(255) NOT NULL DEFAULT '',
    section3_textura VARCHAR(255) NOT NULL DEFAULT '',
    section3_packing_condition VARCHAR(10) NOT NULL DEFAULT 'Good', -- 'Good' or 'Bad'
    section3_raw_material_approved VARCHAR(10) NOT NULL DEFAULT 'No', -- 'Yes' or 'No'
    section3_results TEXT, -- Optional
    
    -- Verification (filled by QA Practitioner later)
    checker_name VARCHAR(255),
    checker_signature TEXT,
    checker_date DATE,
    
    -- PDF and metadata
    pdf_url TEXT,
    date_utc TIMESTAMPTZ DEFAULT NOW(), -- UTC timestamp for querying
    date_string VARCHAR(20), -- Format: MMM-DD-YYYY for display
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.1. Add Section 3 and verification columns if they don't exist (for existing tables)
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'checklist_raw_material_quality' AND column_name = 'section3_color') THEN
        ALTER TABLE public.checklist_raw_material_quality ADD COLUMN section3_color VARCHAR(255) NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'checklist_raw_material_quality' AND column_name = 'section3_olor') THEN
        ALTER TABLE public.checklist_raw_material_quality ADD COLUMN section3_olor VARCHAR(255) NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'checklist_raw_material_quality' AND column_name = 'section3_sabor') THEN
        ALTER TABLE public.checklist_raw_material_quality ADD COLUMN section3_sabor VARCHAR(255) NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'checklist_raw_material_quality' AND column_name = 'section3_textura') THEN
        ALTER TABLE public.checklist_raw_material_quality ADD COLUMN section3_textura VARCHAR(255) NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'checklist_raw_material_quality' AND column_name = 'section3_packing_condition') THEN
        ALTER TABLE public.checklist_raw_material_quality ADD COLUMN section3_packing_condition VARCHAR(10) NOT NULL DEFAULT 'Good';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'checklist_raw_material_quality' AND column_name = 'section3_raw_material_approved') THEN
        ALTER TABLE public.checklist_raw_material_quality ADD COLUMN section3_raw_material_approved VARCHAR(10) NOT NULL DEFAULT 'No';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'checklist_raw_material_quality' AND column_name = 'section3_results') THEN
        ALTER TABLE public.checklist_raw_material_quality ADD COLUMN section3_results TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'checklist_raw_material_quality' AND column_name = 'checker_name') THEN
        ALTER TABLE public.checklist_raw_material_quality ADD COLUMN checker_name VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'checklist_raw_material_quality' AND column_name = 'checker_signature') THEN
        ALTER TABLE public.checklist_raw_material_quality ADD COLUMN checker_signature TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'checklist_raw_material_quality' AND column_name = 'checker_date') THEN
        ALTER TABLE public.checklist_raw_material_quality ADD COLUMN checker_date DATE;
    END IF;
END $$;

-- 2. Create indexes for better query performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_checklist_raw_material_quality_date_utc 
    ON public.checklist_raw_material_quality(date_utc DESC);

CREATE INDEX IF NOT EXISTS idx_checklist_raw_material_quality_date_string 
    ON public.checklist_raw_material_quality(date_string);

CREATE INDEX IF NOT EXISTS idx_checklist_raw_material_quality_fruit 
    ON public.checklist_raw_material_quality(fruit);

CREATE INDEX IF NOT EXISTS idx_checklist_raw_material_quality_supplier 
    ON public.checklist_raw_material_quality(supplier);

CREATE INDEX IF NOT EXISTS idx_checklist_raw_material_quality_reception_date_time 
    ON public.checklist_raw_material_quality(reception_date_time DESC);

-- 3. Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.checklist_raw_material_quality ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- =====================================================
-- Drop existing policies first (makes script idempotent / re-runnable)
DROP POLICY IF EXISTS "Allow authenticated users to read checklist_raw_material_qualit" ON public.checklist_raw_material_quality;
DROP POLICY IF EXISTS "Allow authenticated users to read checklist_raw_material_quality" ON public.checklist_raw_material_quality;
DROP POLICY IF EXISTS "Allow authenticated users to insert checklist_raw_material_quality" ON public.checklist_raw_material_quality;
DROP POLICY IF EXISTS "Allow authenticated users to update checklist_raw_material_quality" ON public.checklist_raw_material_quality;

-- Policy: Allow authenticated users to read all records
CREATE POLICY "rmq_allow_select"
    ON public.checklist_raw_material_quality
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert records
CREATE POLICY "rmq_allow_insert"
    ON public.checklist_raw_material_quality
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow authenticated users to update records
CREATE POLICY "rmq_allow_update"
    ON public.checklist_raw_material_quality
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Create function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_checklist_raw_material_quality_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically update updated_at
-- =====================================================
DROP TRIGGER IF EXISTS update_checklist_raw_material_quality_updated_at ON public.checklist_raw_material_quality;
CREATE TRIGGER update_checklist_raw_material_quality_updated_at
    BEFORE UPDATE ON public.checklist_raw_material_quality
    FOR EACH ROW
    EXECUTE FUNCTION update_checklist_raw_material_quality_updated_at();

-- 7. Create storage bucket for PDFs
-- =====================================================
-- Note: This requires service_role permissions
-- If this fails, create the bucket manually in Supabase Dashboard > Storage
-- Bucket settings:
--   - Name: checklist-raw-material-quality
--   - Public: true (MUST be public for getPublicUrl() to work)
--   - File size limit: 10MB
--   - Allowed MIME types: application/pdf

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'checklist-raw-material-quality',
    'checklist-raw-material-quality',
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
-- Drop existing storage policies first (makes script idempotent / re-runnable)
DROP POLICY IF EXISTS "Allow authenticated users to upload PDFs checklist_raw_material_quality" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read PDFs checklist_raw_material_quality" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update PDFs checklist_raw_material_quality" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete PDFs checklist_raw_material_quality" ON storage.objects;

-- Policy: Allow authenticated users to upload PDFs
CREATE POLICY "rmq_storage_upload"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'checklist-raw-material-quality'
    );

-- Policy: Allow authenticated users to read PDFs
CREATE POLICY "rmq_storage_read"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'checklist-raw-material-quality');

-- Policy: Allow authenticated users to update PDFs
CREATE POLICY "rmq_storage_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'checklist-raw-material-quality')
    WITH CHECK (bucket_id = 'checklist-raw-material-quality');

-- Policy: Allow authenticated users to delete PDFs
CREATE POLICY "rmq_storage_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'checklist-raw-material-quality');

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
--   AND table_name = 'checklist_raw_material_quality'
-- ORDER BY ordinal_position;
-- 
-- Check indexes:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'checklist_raw_material_quality';
-- 
-- Check RLS policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'checklist_raw_material_quality';
-- 
-- Check storage bucket:
-- SELECT * FROM storage.buckets WHERE id = 'checklist-raw-material-quality';
-- 
-- Check storage policies:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%checklist_raw_material_quality%';
-- 
-- =====================================================

