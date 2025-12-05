-- =====================================================
-- Process area staff glasses and auditory protector control - Supabase Setup
-- =====================================================
-- Code: CF/PC-PG-ASC-004-RG004
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. The storage bucket creation requires service_role permissions
--    If bucket creation fails, create it manually in Dashboard > Storage
-- =====================================================

-- 1. Create the checklist_staff_glasses_auditory table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.checklist_staff_glasses_auditory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Section 1: Basic Info
    date_string VARCHAR(20) NOT NULL, -- Format: MMM-DD-YYYY (e.g., "NOV-17-2025")
    monitor_name VARCHAR(255) NOT NULL,
    monitor_signature TEXT NOT NULL, -- Base64 encoded signature image
    
    -- Section 2: Persons (stored as JSONB array)
    no_findings BOOLEAN NOT NULL DEFAULT false, -- True if "No Findings" option was selected
    persons JSONB NOT NULL DEFAULT '[]'::jsonb,
    /*
    Persons structure (when no_findings = false):
    [
      {
        "name": "John Doe",
        "area": "Production Line 1",
        "glassType": "Safety glasses / Gafas de seguridad",
        "conditionIn": "comply" or "not_comply",
        "conditionOut": "comply" or "not_comply",
        "observationIn": "Observation text if conditionIn is 'not_comply', empty string otherwise",
        "observationOut": "Observation text if conditionOut is 'not_comply', empty string otherwise"
      },
      ...
    ]
    
    Note: observationIn is required when conditionIn is "not_comply"
    Note: observationOut is required when conditionOut is "not_comply"
    
    When no_findings = true, persons array will be empty []
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
CREATE INDEX IF NOT EXISTS idx_checklist_staff_glasses_auditory_date_utc 
    ON public.checklist_staff_glasses_auditory(date_utc DESC);

CREATE INDEX IF NOT EXISTS idx_checklist_staff_glasses_auditory_date_string 
    ON public.checklist_staff_glasses_auditory(date_string);

CREATE INDEX IF NOT EXISTS idx_checklist_staff_glasses_auditory_monitor_name 
    ON public.checklist_staff_glasses_auditory(monitor_name);

CREATE INDEX IF NOT EXISTS idx_checklist_staff_glasses_auditory_no_findings 
    ON public.checklist_staff_glasses_auditory(no_findings);

-- 3. Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.checklist_staff_glasses_auditory ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- =====================================================
-- Policy: Allow authenticated users to read all records
CREATE POLICY "Allow authenticated users to read checklist_staff_glasses_auditory"
    ON public.checklist_staff_glasses_auditory
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert records
CREATE POLICY "Allow authenticated users to insert checklist_staff_glasses_auditory"
    ON public.checklist_staff_glasses_auditory
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow authenticated users to update records
CREATE POLICY "Allow authenticated users to update checklist_staff_glasses_auditory"
    ON public.checklist_staff_glasses_auditory
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Create function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_checklist_staff_glasses_auditory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically update updated_at
-- =====================================================
CREATE TRIGGER update_checklist_staff_glasses_auditory_updated_at
    BEFORE UPDATE ON public.checklist_staff_glasses_auditory
    FOR EACH ROW
    EXECUTE FUNCTION update_checklist_staff_glasses_auditory_updated_at();

-- 7. Create storage bucket for PDFs
-- =====================================================
-- Note: This requires service_role permissions
-- If this fails, create the bucket manually in Supabase Dashboard > Storage
-- Bucket settings:
--   - Name: checklist-staff-glasses-auditory
--   - Public: true (MUST be public for getPublicUrl() to work)
--   - File size limit: 10MB
--   - Allowed MIME types: application/pdf

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'checklist-staff-glasses-auditory',
    'checklist-staff-glasses-auditory',
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
CREATE POLICY "Allow authenticated users to upload PDFs checklist_staff_glasses_auditory"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'checklist-staff-glasses-auditory'
    );

-- Policy: Allow authenticated users to read PDFs
CREATE POLICY "Allow authenticated users to read PDFs checklist_staff_glasses_auditory"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'checklist-staff-glasses-auditory');

-- Policy: Allow authenticated users to update PDFs
CREATE POLICY "Allow authenticated users to update PDFs checklist_staff_glasses_auditory"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'checklist-staff-glasses-auditory')
    WITH CHECK (bucket_id = 'checklist-staff-glasses-auditory');

-- Policy: Allow authenticated users to delete PDFs
CREATE POLICY "Allow authenticated users to delete PDFs checklist_staff_glasses_auditory"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'checklist-staff-glasses-auditory');

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
--   AND table_name = 'checklist_staff_glasses_auditory'
-- ORDER BY ordinal_position;
-- 
-- Check indexes:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'checklist_staff_glasses_auditory';
-- 
-- Check RLS policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'checklist_staff_glasses_auditory';
-- 
-- Check storage bucket:
-- SELECT * FROM storage.buckets WHERE id = 'checklist-staff-glasses-auditory';
-- 
-- Check storage policies:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%checklist_staff_glasses_auditory%';
-- 
-- =====================================================

