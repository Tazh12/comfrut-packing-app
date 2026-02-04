-- =====================================================
-- Final Product Tasting / Degustación de producto terminado - Supabase Setup
-- =====================================================
-- Code: CF/PC-ASC-006-RG008
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. The storage bucket creation requires service_role permissions
--    If bucket creation fails, create it manually in Dashboard > Storage
-- =====================================================

-- 1. Create the checklist_final_product_tasting table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.checklist_final_product_tasting (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Section 1: Basic Info
    turno VARCHAR(255) NOT NULL,
    monitor VARCHAR(255) NOT NULL,
    formato VARCHAR(255) NOT NULL,
    bar_code VARCHAR(255) NOT NULL,
    best_before VARCHAR(255) NOT NULL,
    brix DECIMAL(5,2) NOT NULL,
    ph DECIMAL(4,2) NOT NULL,
    date DATE NOT NULL,
    product VARCHAR(500) NOT NULL,
    client VARCHAR(255) NOT NULL,
    process_date DATE NOT NULL,
    batch VARCHAR(255) NOT NULL,
    variety VARCHAR(500) NOT NULL,
    
    -- Section 2: Participants (stored as JSONB array)
    participants JSONB NOT NULL DEFAULT '[]'::jsonb,
    /*
    Participants structure:
    [
      {
        "id": 1234567890,
        "name": "Participant Name",
        "appearance": "5.5",
        "color": "5.0",
        "smell": "4.5",
        "texture": "5.0",
        "taste": "4.8"
      },
      ...
    ]
    Note: Grades are stored as strings (3.0-6.0 range)
    */
    
    -- Section 2: Mean grades (calculated)
    mean_appearance DECIMAL(4,2),
    mean_color DECIMAL(4,2),
    mean_smell DECIMAL(4,2),
    mean_texture DECIMAL(4,2),
    mean_taste DECIMAL(4,2),
    final_grade DECIMAL(4,2),
    
    -- Section 3: Results
    comments TEXT,
    result VARCHAR(20) NOT NULL, -- 'approved', 'rejected', 'hold'
    analyst_name VARCHAR(255) NOT NULL,
    analyst_signature TEXT NOT NULL, -- Base64 encoded signature image
    
    -- Section 3: Quality Area Verification (filled by QA Practitioner later)
    checker_name VARCHAR(255), -- Will be filled by QA Practitioner
    checker_signature TEXT, -- Base64 encoded signature image - Will be filled by QA Practitioner
    checker_date DATE, -- Will be filled by QA Practitioner
    
    -- PDF and metadata
    pdf_url TEXT,
    date_utc TIMESTAMPTZ DEFAULT NOW(), -- UTC timestamp for querying
    date_string VARCHAR(20), -- Format: MMM-DD-YYYY for display
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.1. Add verification columns if they don't exist (for existing tables)
-- =====================================================
DO $$ 
BEGIN
    -- Add checker_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'checklist_final_product_tasting' 
        AND column_name = 'checker_name'
    ) THEN
        ALTER TABLE public.checklist_final_product_tasting 
        ADD COLUMN checker_name VARCHAR(255);
    END IF;

    -- Add checker_signature column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'checklist_final_product_tasting' 
        AND column_name = 'checker_signature'
    ) THEN
        ALTER TABLE public.checklist_final_product_tasting 
        ADD COLUMN checker_signature TEXT;
    END IF;

    -- Add checker_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'checklist_final_product_tasting' 
        AND column_name = 'checker_date'
    ) THEN
        ALTER TABLE public.checklist_final_product_tasting 
        ADD COLUMN checker_date DATE;
    END IF;
END $$;

-- 2. Create indexes for better query performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_checklist_final_product_tasting_date_utc 
    ON public.checklist_final_product_tasting(date_utc DESC);

CREATE INDEX IF NOT EXISTS idx_checklist_final_product_tasting_date_string 
    ON public.checklist_final_product_tasting(date_string);

CREATE INDEX IF NOT EXISTS idx_checklist_final_product_tasting_date 
    ON public.checklist_final_product_tasting(date DESC);

CREATE INDEX IF NOT EXISTS idx_checklist_final_product_tasting_product 
    ON public.checklist_final_product_tasting(product);

CREATE INDEX IF NOT EXISTS idx_checklist_final_product_tasting_client 
    ON public.checklist_final_product_tasting(client);

CREATE INDEX IF NOT EXISTS idx_checklist_final_product_tasting_result 
    ON public.checklist_final_product_tasting(result);

-- 3. Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.checklist_final_product_tasting ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- =====================================================
-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to read checklist_final_product_tasting" ON public.checklist_final_product_tasting;
DROP POLICY IF EXISTS "Allow authenticated users to insert checklist_final_product_tasting" ON public.checklist_final_product_tasting;
DROP POLICY IF EXISTS "Allow authenticated users to update checklist_final_product_tasting" ON public.checklist_final_product_tasting;

-- Policy: Allow authenticated users to read all records
CREATE POLICY "Allow authenticated users to read checklist_final_product_tasting"
    ON public.checklist_final_product_tasting
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert records
CREATE POLICY "Allow authenticated users to insert checklist_final_product_tasting"
    ON public.checklist_final_product_tasting
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow authenticated users to update records
CREATE POLICY "Allow authenticated users to update checklist_final_product_tasting"
    ON public.checklist_final_product_tasting
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Create function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_checklist_final_product_tasting_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically update updated_at
-- =====================================================
-- Drop existing trigger if it exists (to avoid conflicts)
DROP TRIGGER IF EXISTS update_checklist_final_product_tasting_updated_at ON public.checklist_final_product_tasting;

CREATE TRIGGER update_checklist_final_product_tasting_updated_at
    BEFORE UPDATE ON public.checklist_final_product_tasting
    FOR EACH ROW
    EXECUTE FUNCTION update_checklist_final_product_tasting_updated_at();

-- 7. Create storage bucket for PDFs
-- =====================================================
-- Note: This requires service_role permissions
-- If this fails, create the bucket manually in Supabase Dashboard > Storage
-- Bucket settings:
--   - Name: checklist-final-product-tasting
--   - Public: true (MUST be public for getPublicUrl() to work)
--   - File size limit: 10MB
--   - Allowed MIME types: application/pdf

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'checklist-final-product-tasting',
    'checklist-final-product-tasting',
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
-- Drop existing storage policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to upload PDFs checklist_final_product_tasting" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read PDFs checklist_final_product_tasting" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update PDFs checklist_final_product_tasting" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete PDFs checklist_final_product_tasting" ON storage.objects;

-- Policy: Allow authenticated users to upload PDFs
CREATE POLICY "Allow authenticated users to upload PDFs checklist_final_product_tasting"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'checklist-final-product-tasting'
    );

-- Policy: Allow authenticated users to read PDFs
CREATE POLICY "Allow authenticated users to read PDFs checklist_final_product_tasting"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'checklist-final-product-tasting');

-- Policy: Allow authenticated users to update PDFs
CREATE POLICY "Allow authenticated users to update PDFs checklist_final_product_tasting"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'checklist-final-product-tasting')
    WITH CHECK (bucket_id = 'checklist-final-product-tasting');

-- Policy: Allow authenticated users to delete PDFs
CREATE POLICY "Allow authenticated users to delete PDFs checklist_final_product_tasting"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'checklist-final-product-tasting');

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
--   AND table_name = 'checklist_final_product_tasting'
-- ORDER BY ordinal_position;
-- 
-- Check indexes:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'checklist_final_product_tasting';
-- 
-- Check RLS policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'checklist_final_product_tasting';
-- 
-- Check storage bucket:
-- SELECT * FROM storage.buckets WHERE id = 'checklist-final-product-tasting';
-- 
-- Check storage policies:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%checklist_final_product_tasting%';
-- 
-- =====================================================
