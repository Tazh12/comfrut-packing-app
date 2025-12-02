-- =====================================================
-- Internal Control of Materials Used in Production Areas - Supabase Setup
-- =====================================================
-- Code: CF/PC-ASC-004-RG008
-- =====================================================

-- 1. Create the checklist_materials_control table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.checklist_materials_control (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Section 1: Basic Info
    date_string VARCHAR(20) NOT NULL, -- Format: MMM-DD-YYYY (e.g., "NOV-17-2025")
    productive_area VARCHAR(255) NOT NULL,
    line_manager_name VARCHAR(255) NOT NULL,
    monitor_name VARCHAR(255) NOT NULL,
    monitor_signature TEXT NOT NULL, -- Base64 encoded signature image
    
    -- Section 2: Personnel Materials (stored as JSONB array)
    personnel_materials JSONB NOT NULL DEFAULT '[]'::jsonb,
    /*
    Personnel Materials structure:
    [
      {
        "personName": "John Doe",
        "material": "Scoop/Cucharón",
        "quantity": 5,
        "materialStatus": "Good/Bueno" or "Bad/Malo",
        "observation": "Optional observation if status is good, mandatory if bad",
        "returnMotive": "End of shift",
        "quantityReceived": 5,
        "materialStatusReceived": "Good/Bueno" or "Bad/Malo",
        "observationReceived": "Optional observation if status is good, mandatory if bad"
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
CREATE INDEX IF NOT EXISTS idx_checklist_materials_control_date_utc 
    ON public.checklist_materials_control(date_utc DESC);

CREATE INDEX IF NOT EXISTS idx_checklist_materials_control_date_string 
    ON public.checklist_materials_control(date_string);

CREATE INDEX IF NOT EXISTS idx_checklist_materials_control_productive_area 
    ON public.checklist_materials_control(productive_area);

CREATE INDEX IF NOT EXISTS idx_checklist_materials_control_line_manager_name 
    ON public.checklist_materials_control(line_manager_name);

CREATE INDEX IF NOT EXISTS idx_checklist_materials_control_monitor_name 
    ON public.checklist_materials_control(monitor_name);

-- 3. Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.checklist_materials_control ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- =====================================================
-- Policy: Allow authenticated users to read all records
CREATE POLICY "Allow authenticated users to read checklist_materials_control"
    ON public.checklist_materials_control
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert records
CREATE POLICY "Allow authenticated users to insert checklist_materials_control"
    ON public.checklist_materials_control
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow authenticated users to update records
CREATE POLICY "Allow authenticated users to update checklist_materials_control"
    ON public.checklist_materials_control
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Allow authenticated users to delete records (optional - adjust based on requirements)
-- CREATE POLICY "Allow authenticated users to delete checklist_materials_control"
--     ON public.checklist_materials_control
--     FOR DELETE
--     TO authenticated
--     USING (true);

-- 5. Create function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_checklist_materials_control_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically update updated_at
-- =====================================================
CREATE TRIGGER update_checklist_materials_control_updated_at
    BEFORE UPDATE ON public.checklist_materials_control
    FOR EACH ROW
    EXECUTE FUNCTION update_checklist_materials_control_updated_at();

-- 7. Create storage bucket for PDFs
-- =====================================================
-- Note: Storage buckets must be created via Supabase Dashboard or API
-- Bucket name: checklist-materials-control
-- Public: true (MUST be public for getPublicUrl() to work)
-- File size limit: 10MB
-- Allowed MIME types: application/pdf

-- SQL to create bucket (if using Supabase SQL Editor):
-- Note: You need to run this with proper permissions (service_role key)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'checklist-materials-control',
    'checklist-materials-control',
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
CREATE POLICY "Allow authenticated users to upload materials control PDFs"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'checklist-materials-control'
    );

-- Policy: Allow authenticated users to read PDFs
CREATE POLICY "Allow authenticated users to read materials control PDFs"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'checklist-materials-control');

-- Policy: Allow authenticated users to update PDFs
CREATE POLICY "Allow authenticated users to update materials control PDFs"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'checklist-materials-control')
    WITH CHECK (bucket_id = 'checklist-materials-control');

-- Policy: Allow authenticated users to delete PDFs
CREATE POLICY "Allow authenticated users to delete materials control PDFs"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'checklist-materials-control');

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'checklist_materials_control'
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'checklist_materials_control';

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'checklist_materials_control';

-- Check storage bucket
-- SELECT id, name, public, file_size_limit, allowed_mime_types
-- FROM storage.buckets
-- WHERE id = 'checklist-materials-control';

-- =====================================================
-- Example Insert (for testing)
-- =====================================================
/*
INSERT INTO public.checklist_materials_control (
    date_string,
    productive_area,
    line_manager_name,
    monitor_name,
    monitor_signature,
    personnel_materials,
    pdf_url
) VALUES (
    'NOV-17-2025',
    'Production Line 1',
    'Jane Smith',
    'John Doe',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    '[
        {
            "personName": "Esteban Gutiérrez",
            "material": "Scoop/Cucharón",
            "quantity": 5,
            "materialStatus": "Good/Bueno",
            "observation": "",
            "returnMotive": "End of shift",
            "quantityReceived": 5,
            "materialStatusReceived": "Good/Bueno",
            "observationReceived": ""
        },
        {
            "personName": "Maria Rodriguez",
            "material": "Scissors/Tijeras",
            "quantity": 3,
            "materialStatus": "Bad/Malo",
            "observation": "One pair has broken handle",
            "returnMotive": "End of shift",
            "quantityReceived": 3,
            "materialStatusReceived": "Bad/Malo",
            "observationReceived": "All three pairs returned, one needs replacement"
        }
    ]'::jsonb,
    'https://your-supabase-url.supabase.co/storage/v1/object/public/checklist-materials-control/2025-NOVEMBER-17-Internal-Control-Materials-01.pdf'
);
*/

