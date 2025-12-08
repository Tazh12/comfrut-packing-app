-- =====================================================
-- Cleanliness Control Packing - Supabase Setup
-- =====================================================
-- Code: CF/PC-PG-SAN-001-RG005
-- =====================================================

-- 1. Create the checklist_cleanliness_control_packing table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.checklist_cleanliness_control_packing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Section 1: Basic Info
    date_string VARCHAR(20) NOT NULL, -- Format: MMM-DD-YYYY (e.g., "NOV-17-2025")
    monitor_name VARCHAR(255) NOT NULL,
    monitor_signature TEXT NOT NULL, -- Base64 encoded signature image
    
    -- Section 2: Areas and Parts Inspected (stored as JSONB)
    areas JSONB NOT NULL DEFAULT '[]'::jsonb,
    /*
    Areas structure:
    [
      {
        "areaName": "Packing Machine #1",
        "parts": [
          {
            "partName": "Elevator 1",
            "comply": true, // or false
            "observation": "", // required if comply is false
            "correctiveAction": "", // required if comply is false
            "correctiveActionComply": true // or false, required if comply is false
          },
          ...
        ]
      },
      ...
    ]
    */
    
    -- Section 3: Critical Limits Result of Bioluminescence (stored as JSONB array)
    bioluminescence_results JSONB NOT NULL DEFAULT '[]'::jsonb,
    /*
    Bioluminescence results structure:
    [
      {
        "partName": "Part 1",
        "rlu": "15"
      },
      {
        "partName": "Part 2",
        "rlu": "25"
      },
      ...
    ]
    Maximum 5 entries (5 columns, 2 rows = 10 total, but we'll use 5 pairs)
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
CREATE INDEX IF NOT EXISTS idx_checklist_cleanliness_control_packing_date_utc 
    ON public.checklist_cleanliness_control_packing(date_utc DESC);

CREATE INDEX IF NOT EXISTS idx_checklist_cleanliness_control_packing_date_string 
    ON public.checklist_cleanliness_control_packing(date_string);

CREATE INDEX IF NOT EXISTS idx_checklist_cleanliness_control_packing_monitor_name 
    ON public.checklist_cleanliness_control_packing(monitor_name);

-- 3. Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.checklist_cleanliness_control_packing ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- =====================================================
-- Policy: Allow authenticated users to read all records
CREATE POLICY "Allow authenticated users to read checklist_cleanliness_control_packing"
    ON public.checklist_cleanliness_control_packing
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert records
CREATE POLICY "Allow authenticated users to insert checklist_cleanliness_control_packing"
    ON public.checklist_cleanliness_control_packing
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow authenticated users to update records
CREATE POLICY "Allow authenticated users to update checklist_cleanliness_control_packing"
    ON public.checklist_cleanliness_control_packing
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Create function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_checklist_cleanliness_control_packing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically update updated_at
-- =====================================================
CREATE TRIGGER update_checklist_cleanliness_control_packing_updated_at
    BEFORE UPDATE ON public.checklist_cleanliness_control_packing
    FOR EACH ROW
    EXECUTE FUNCTION update_checklist_cleanliness_control_packing_updated_at();

-- 7. Create storage bucket for PDFs
-- =====================================================
-- Note: Storage buckets must be created via Supabase Dashboard or API
-- Bucket name: checklist-cleanliness-control-packing
-- Public: true (MUST be public for getPublicUrl() to work)
-- File size limit: 10MB
-- Allowed MIME types: application/pdf

-- SQL to create bucket (if using Supabase SQL Editor):
-- Note: You need to run this with proper permissions (service_role key)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'checklist-cleanliness-control-packing',
    'checklist-cleanliness-control-packing',
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
CREATE POLICY "Allow authenticated users to upload cleanliness control packing PDFs"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'checklist-cleanliness-control-packing'
    );

-- Policy: Allow authenticated users to read PDFs
CREATE POLICY "Allow authenticated users to read cleanliness control packing PDFs"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'checklist-cleanliness-control-packing');

-- Policy: Allow authenticated users to update PDFs
CREATE POLICY "Allow authenticated users to update cleanliness control packing PDFs"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'checklist-cleanliness-control-packing')
    WITH CHECK (bucket_id = 'checklist-cleanliness-control-packing');

-- Policy: Allow authenticated users to delete PDFs
CREATE POLICY "Allow authenticated users to delete cleanliness control packing PDFs"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'checklist-cleanliness-control-packing');

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'checklist_cleanliness_control_packing'
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'checklist_cleanliness_control_packing';

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'checklist_cleanliness_control_packing';

-- Check storage bucket
-- SELECT id, name, public, file_size_limit, allowed_mime_types
-- FROM storage.buckets
-- WHERE id = 'checklist-cleanliness-control-packing';
