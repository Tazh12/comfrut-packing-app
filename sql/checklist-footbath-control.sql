-- =====================================================
-- Footbath Control - Supabase Setup
-- =====================================================
-- Code: CF/PC-SAN-001-RG007
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. The storage bucket creation requires service_role permissions
--    If bucket creation fails, create it manually in Dashboard > Storage
-- =====================================================

-- 1. Create the checklist_footbath_control table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.checklist_footbath_control (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Section 1: Basic Info
    date_string VARCHAR(20) NOT NULL, -- Format: MMM-DD-YYYY (e.g., "NOV-17-2025")
    shift VARCHAR(50) NOT NULL, -- Morning, Afternoon, Night
    monitor_name VARCHAR(255) NOT NULL,
    monitor_signature TEXT NOT NULL, -- Base64 encoded signature image
    
    -- Section 2: Measurements (stored as JSONB array)
    measurements JSONB NOT NULL DEFAULT '[]'::jsonb,
    /*
    Measurements structure:
    [
      {
        "hour": "08:00", -- Format: HH:MM
        "filter": "Filter name or identifier",
        "measurePpmValue": 250, -- Number
        "correctiveAction": "Corrective action text if measurePpmValue < 200, empty string otherwise"
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
CREATE INDEX IF NOT EXISTS idx_checklist_footbath_control_date_utc 
    ON public.checklist_footbath_control(date_utc DESC);

CREATE INDEX IF NOT EXISTS idx_checklist_footbath_control_date_string 
    ON public.checklist_footbath_control(date_string);

CREATE INDEX IF NOT EXISTS idx_checklist_footbath_control_monitor_name 
    ON public.checklist_footbath_control(monitor_name);

CREATE INDEX IF NOT EXISTS idx_checklist_footbath_control_shift 
    ON public.checklist_footbath_control(shift);

-- 3. Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.checklist_footbath_control ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- =====================================================
-- Policy: Allow authenticated users to read all records
CREATE POLICY "Allow authenticated users to read checklist_footbath_control"
    ON public.checklist_footbath_control
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert records
CREATE POLICY "Allow authenticated users to insert checklist_footbath_control"
    ON public.checklist_footbath_control
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow authenticated users to update records
CREATE POLICY "Allow authenticated users to update checklist_footbath_control"
    ON public.checklist_footbath_control
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Create function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_checklist_footbath_control_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically update updated_at
-- =====================================================
CREATE TRIGGER update_checklist_footbath_control_updated_at
    BEFORE UPDATE ON public.checklist_footbath_control
    FOR EACH ROW
    EXECUTE FUNCTION update_checklist_footbath_control_updated_at();

-- 7. Create storage bucket for PDFs
-- =====================================================
-- Note: This requires service_role permissions
-- If this fails, create the bucket manually in Supabase Dashboard > Storage
-- Bucket settings:
--   - Name: checklist-footbath-control
--   - Public: true (MUST be public for getPublicUrl() to work)
--   - File size limit: 10MB
--   - Allowed MIME types: application/pdf

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'checklist-footbath-control',
    'checklist-footbath-control',
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
CREATE POLICY "Allow authenticated users to upload PDFs checklist_footbath_control"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'checklist-footbath-control'
    );

-- Policy: Allow authenticated users to read PDFs
CREATE POLICY "Allow authenticated users to read PDFs checklist_footbath_control"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'checklist-footbath-control');

-- Policy: Allow authenticated users to update PDFs
CREATE POLICY "Allow authenticated users to update PDFs checklist_footbath_control"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'checklist-footbath-control')
    WITH CHECK (bucket_id = 'checklist-footbath-control');

-- Policy: Allow authenticated users to delete PDFs
CREATE POLICY "Allow authenticated users to delete PDFs checklist_footbath_control"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'checklist-footbath-control');

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
--   AND table_name = 'checklist_footbath_control'
-- ORDER BY ordinal_position;
-- 
-- Check indexes:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'checklist_footbath_control';
-- 
-- Check RLS policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'checklist_footbath_control';
-- 
-- Check storage bucket:
-- SELECT * FROM storage.buckets WHERE id = 'checklist-footbath-control';
-- 
-- Check storage policies:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%checklist_footbath_control%';
-- 
-- =====================================================

