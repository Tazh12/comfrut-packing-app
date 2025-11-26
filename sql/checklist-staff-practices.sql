-- =====================================================
-- Staff Good Practices Control Checklist - Supabase Setup
-- =====================================================
-- Code: CF/PC-ASC-004-RG003
-- =====================================================

-- 1. Create the checklist_staff_practices table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.checklist_staff_practices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Section 1: Basic Info
    date_string VARCHAR(20) NOT NULL, -- Format: MMM-DD-YYYY (e.g., "NOV-17-2025")
    shift VARCHAR(50) NOT NULL, -- Morning, Afternoon, Night
    monitor_name VARCHAR(255) NOT NULL,
    monitor_signature TEXT NOT NULL, -- Base64 encoded signature image
    
    -- Section 2: Staff Members (stored as JSONB array)
    staff_members JSONB NOT NULL DEFAULT '[]'::jsonb,
    /*
    Staff Members structure:
    [
      {
        "name": "John Doe",
        "area": "Production Line 1",
        "staffAppearance": "comply" or "not_comply",
        "completeUniform": "comply" or "not_comply",
        "accessoriesAbsence": "comply" or "not_comply",
        "workToolsUsage": "comply" or "not_comply",
        "cutCleanNotPolishedNails": "comply" or "not_comply",
        "noMakeupOn": "comply" or "not_comply",
        "staffBehavior": "comply" or "not_comply",
        "staffHealth": "comply" or "not_comply",
        "staffAppearanceCorrectiveAction": "Text if not_comply",
        "staffAppearanceObservation": "Text if not_comply",
        "completeUniformCorrectiveAction": "Text if not_comply",
        "completeUniformObservation": "Text if not_comply",
        "accessoriesAbsenceCorrectiveAction": "Text if not_comply",
        "accessoriesAbsenceObservation": "Text if not_comply",
        "workToolsUsageCorrectiveAction": "Text if not_comply",
        "workToolsUsageObservation": "Text if not_comply",
        "cutCleanNotPolishedNailsCorrectiveAction": "Text if not_comply",
        "cutCleanNotPolishedNailsObservation": "Text if not_comply",
        "noMakeupOnCorrectiveAction": "Text if not_comply",
        "noMakeupOnObservation": "Text if not_comply",
        "staffBehaviorCorrectiveAction": "Text if not_comply",
        "staffBehaviorObservation": "Text if not_comply",
        "staffHealthCorrectiveAction": "Text if not_comply",
        "staffHealthObservation": "Text if not_comply"
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
CREATE INDEX IF NOT EXISTS idx_checklist_staff_practices_date_utc 
    ON public.checklist_staff_practices(date_utc DESC);

CREATE INDEX IF NOT EXISTS idx_checklist_staff_practices_date_string 
    ON public.checklist_staff_practices(date_string);

CREATE INDEX IF NOT EXISTS idx_checklist_staff_practices_shift 
    ON public.checklist_staff_practices(shift);

CREATE INDEX IF NOT EXISTS idx_checklist_staff_practices_monitor_name 
    ON public.checklist_staff_practices(monitor_name);

-- 3. Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.checklist_staff_practices ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- =====================================================
-- Policy: Allow authenticated users to read all records
CREATE POLICY "Allow authenticated users to read checklist_staff_practices"
    ON public.checklist_staff_practices
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert records
CREATE POLICY "Allow authenticated users to insert checklist_staff_practices"
    ON public.checklist_staff_practices
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow authenticated users to update records
CREATE POLICY "Allow authenticated users to update checklist_staff_practices"
    ON public.checklist_staff_practices
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Allow authenticated users to delete records (optional - adjust based on requirements)
-- CREATE POLICY "Allow authenticated users to delete checklist_staff_practices"
--     ON public.checklist_staff_practices
--     FOR DELETE
--     TO authenticated
--     USING (true);

-- 5. Create function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_checklist_staff_practices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically update updated_at
-- =====================================================
CREATE TRIGGER update_checklist_staff_practices_updated_at
    BEFORE UPDATE ON public.checklist_staff_practices
    FOR EACH ROW
    EXECUTE FUNCTION update_checklist_staff_practices_updated_at();

-- 7. Create storage bucket for PDFs (run this in Supabase Dashboard > Storage)
-- =====================================================
-- Note: Storage buckets must be created via Supabase Dashboard or API
-- Bucket name: checklist-staff-practices
-- Public: true (MUST be public for getPublicUrl() to work)
-- File size limit: 10MB
-- Allowed MIME types: application/pdf

-- SQL to create bucket (if using Supabase SQL Editor):
-- Note: You need to run this with proper permissions (service_role key)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'checklist-staff-practices',
    'checklist-staff-practices',
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
CREATE POLICY "Allow authenticated users to upload PDFs"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'checklist-staff-practices'
    );

-- Policy: Allow authenticated users to read PDFs
CREATE POLICY "Allow authenticated users to read PDFs"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'checklist-staff-practices');

-- Policy: Allow authenticated users to update PDFs
CREATE POLICY "Allow authenticated users to update PDFs"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'checklist-staff-practices')
    WITH CHECK (bucket_id = 'checklist-staff-practices');

-- Policy: Allow authenticated users to delete PDFs
CREATE POLICY "Allow authenticated users to delete PDFs"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'checklist-staff-practices');

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'checklist_staff_practices'
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'checklist_staff_practices';

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'checklist_staff_practices';

-- =====================================================
-- Example Insert (for testing)
-- =====================================================
/*
INSERT INTO public.checklist_staff_practices (
    date_string,
    shift,
    monitor_name,
    monitor_signature,
    staff_members,
    pdf_url
) VALUES (
    'NOV-17-2025',
    'Morning',
    'John Doe',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    '[
        {
            "name": "Jane Smith",
            "area": "Production Line 1",
            "staffAppearance": "comply",
            "completeUniform": "comply",
            "accessoriesAbsence": "comply",
            "workToolsUsage": "comply",
            "cutCleanNotPolishedNails": "comply",
            "noMakeupOn": "comply",
            "staffBehavior": "comply",
            "staffHealth": "comply",
            "staffAppearanceCorrectiveAction": "",
            "staffAppearanceObservation": "",
            "completeUniformCorrectiveAction": "",
            "completeUniformObservation": "",
            "accessoriesAbsenceCorrectiveAction": "",
            "accessoriesAbsenceObservation": "",
            "workToolsUsageCorrectiveAction": "",
            "workToolsUsageObservation": "",
            "cutCleanNotPolishedNailsCorrectiveAction": "",
            "cutCleanNotPolishedNailsObservation": "",
            "noMakeupOnCorrectiveAction": "",
            "noMakeupOnObservation": "",
            "staffBehaviorCorrectiveAction": "",
            "staffBehaviorObservation": "",
            "staffHealthCorrectiveAction": "",
            "staffHealthObservation": ""
        }
    ]'::jsonb,
    'https://your-supabase-url.supabase.co/storage/v1/object/public/checklist-staff-practices/2025-NOVEMBER-17-Staff-Good-Practices-Control-01.pdf'
);
*/

