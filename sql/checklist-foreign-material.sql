-- =====================================================
-- Foreign Material Findings Record - Supabase Setup
-- =====================================================
-- Code: CF/PC-PPR-002-RG002
-- =====================================================

-- 1. Create the checklist_foreign_material table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.checklist_foreign_material (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Section 1: Basic Info
    date_string VARCHAR(20) NOT NULL, -- Format: MMM-DD-YYYY (e.g., "NOV-17-2025")
    brand VARCHAR(255) NOT NULL,
    product VARCHAR(500) NOT NULL, -- Material name can be long
    shift VARCHAR(50) NOT NULL, -- Morning, Afternoon, Night
    monitor_name VARCHAR(255) NOT NULL,
    monitor_signature TEXT NOT NULL, -- Base64 encoded signature image
    
    -- Section 2: Findings
    no_findings BOOLEAN NOT NULL DEFAULT false, -- True if "No Findings" option was selected
    findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    /*
    Findings structure (when no_findings = false):
    [
      {
        "hourFrom": "08:00",
        "hourTo": "09:00",
        "findingDescription": "Description of the finding",
        "palletNumberIngredient": "PAL-12345",
        "productCode": "PROD-001",
        "elementType": "hair" | "insects" | "vegetal_matter" | "paper" | "hard_plastic" | 
                       "pit" | "metal_piece" | "product_mixed" | "wood" | "dirt" | 
                       "stone" | "cardboard" | "tape" | "textile_fibres" | "spiders" | 
                       "feathers" | "worms_larvae" | "slug_snail" | "soft_plastic" | "other",
        "otherElementType": "Custom element type if elementType is 'other'",
        "totalAmount": "5"
      },
      ...
    ]
    
    When no_findings = true, findings array will be empty []
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
CREATE INDEX IF NOT EXISTS idx_checklist_foreign_material_date_utc 
    ON public.checklist_foreign_material(date_utc DESC);

CREATE INDEX IF NOT EXISTS idx_checklist_foreign_material_date_string 
    ON public.checklist_foreign_material(date_string);

CREATE INDEX IF NOT EXISTS idx_checklist_foreign_material_brand 
    ON public.checklist_foreign_material(brand);

CREATE INDEX IF NOT EXISTS idx_checklist_foreign_material_product 
    ON public.checklist_foreign_material(product);

CREATE INDEX IF NOT EXISTS idx_checklist_foreign_material_shift 
    ON public.checklist_foreign_material(shift);

CREATE INDEX IF NOT EXISTS idx_checklist_foreign_material_no_findings 
    ON public.checklist_foreign_material(no_findings);

-- 3. Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.checklist_foreign_material ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- =====================================================
-- Policy: Allow authenticated users to read all records
CREATE POLICY "Allow authenticated users to read checklist_foreign_material"
    ON public.checklist_foreign_material
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert records
CREATE POLICY "Allow authenticated users to insert checklist_foreign_material"
    ON public.checklist_foreign_material
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow authenticated users to update records
CREATE POLICY "Allow authenticated users to update checklist_foreign_material"
    ON public.checklist_foreign_material
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Allow authenticated users to delete records (optional - adjust based on requirements)
-- CREATE POLICY "Allow authenticated users to delete checklist_foreign_material"
--     ON public.checklist_foreign_material
--     FOR DELETE
--     TO authenticated
--     USING (true);

-- 5. Create function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_checklist_foreign_material_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically update updated_at
-- =====================================================
CREATE TRIGGER update_checklist_foreign_material_updated_at
    BEFORE UPDATE ON public.checklist_foreign_material
    FOR EACH ROW
    EXECUTE FUNCTION update_checklist_foreign_material_updated_at();

-- 7. Create storage bucket for PDFs (run this in Supabase Dashboard > Storage)
-- =====================================================
-- Note: Storage buckets must be created via Supabase Dashboard or API
-- Bucket name: checklist-foreign-material
-- Public: false (private bucket)
-- File size limit: 10MB
-- Allowed MIME types: application/pdf

-- SQL to create bucket (if using Supabase SQL Editor):
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'checklist-foreign-material',
    'checklist-foreign-material',
    false,
    10485760, -- 10MB in bytes
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 8. Create storage policies for the bucket
-- =====================================================
-- Policy: Allow authenticated users to upload PDFs
CREATE POLICY "Allow authenticated users to upload foreign material PDFs"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'checklist-foreign-material'
    );

-- Policy: Allow authenticated users to read PDFs
CREATE POLICY "Allow authenticated users to read foreign material PDFs"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'checklist-foreign-material');

-- Policy: Allow authenticated users to update PDFs
CREATE POLICY "Allow authenticated users to update foreign material PDFs"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'checklist-foreign-material')
    WITH CHECK (bucket_id = 'checklist-foreign-material');

-- Policy: Allow authenticated users to delete PDFs
CREATE POLICY "Allow authenticated users to delete foreign material PDFs"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'checklist-foreign-material');

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'checklist_foreign_material'
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'checklist_foreign_material';

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'checklist_foreign_material';

-- =====================================================
-- Example Inserts (for testing)
-- =====================================================

-- Example 1: With findings
/*
INSERT INTO public.checklist_foreign_material (
    date_string,
    brand,
    product,
    shift,
    monitor_name,
    monitor_signature,
    no_findings,
    findings,
    pdf_url
) VALUES (
    'NOV-17-2025',
    'Chiquita',
    'PIÑ IQF CHUNKS CHIQ 8*2.5 LB C/CHQ-B/CHQ',
    'Morning',
    'John Doe',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    false,
    '[
        {
            "hourFrom": "08:00",
            "hourTo": "09:00",
            "findingDescription": "Found hair in product sample",
            "palletNumberIngredient": "PAL-12345",
            "productCode": "PROD-001",
            "elementType": "hair",
            "otherElementType": "",
            "totalAmount": "2"
        },
        {
            "hourFrom": "10:30",
            "hourTo": "11:00",
            "findingDescription": "Found plastic fragment",
            "palletNumberIngredient": "PAL-12346",
            "productCode": "PROD-002",
            "elementType": "hard_plastic",
            "otherElementType": "",
            "totalAmount": "1"
        }
    ]'::jsonb,
    'https://your-supabase-url.supabase.co/storage/v1/object/public/checklist-foreign-material/2025-NOV-17-Morning-Foreign-Material.pdf'
);
*/

-- Example 2: No findings
/*
INSERT INTO public.checklist_foreign_material (
    date_string,
    brand,
    product,
    shift,
    monitor_name,
    monitor_signature,
    no_findings,
    findings,
    pdf_url
) VALUES (
    'NOV-17-2025',
    'Chiquita',
    'PIÑ IQF CHUNKS CHIQ 8*2.5 LB C/CHQ-B/CHQ',
    'Afternoon',
    'Jane Smith',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    true,
    '[]'::jsonb,
    'https://your-supabase-url.supabase.co/storage/v1/object/public/checklist-foreign-material/2025-NOV-17-Afternoon-Foreign-Material-NoFindings.pdf'
);
*/

-- =====================================================
-- Useful Queries
-- =====================================================

-- Get all records with findings
-- SELECT * FROM public.checklist_foreign_material 
-- WHERE no_findings = false 
-- ORDER BY date_utc DESC;

-- Get all records with no findings
-- SELECT * FROM public.checklist_foreign_material 
-- WHERE no_findings = true 
-- ORDER BY date_utc DESC;

-- Get findings by brand
-- SELECT * FROM public.checklist_foreign_material 
-- WHERE brand = 'Chiquita' 
-- ORDER BY date_utc DESC;

-- Get findings by shift
-- SELECT * FROM public.checklist_foreign_material 
-- WHERE shift = 'Morning' 
-- ORDER BY date_utc DESC;

-- Count findings by element type
-- SELECT 
--     jsonb_array_elements(findings)->>'elementType' as element_type,
--     COUNT(*) as count
-- FROM public.checklist_foreign_material
-- WHERE no_findings = false
-- GROUP BY element_type
-- ORDER BY count DESC;

