-- =====================================================
-- Metal Detector (PCC #1) Checklist - Supabase Setup
-- =====================================================
-- Code: CF/PC-PL-HACCP-001-RG001
-- =====================================================

-- 1. Create the checklist_metal_detector table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.checklist_metal_detector (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Section 1: Basic Info
    date_string VARCHAR(20) NOT NULL, -- Format: MMM-DD-YYYY (e.g., "NOV-17-2025")
    process_line VARCHAR(255) NOT NULL,
    metal_detector_id VARCHAR(255) NOT NULL,
    metal_detector_start_time VARCHAR(10) NOT NULL, -- Format: HH:mm (e.g., "08:30")
    metal_detector_finish_time VARCHAR(10) NOT NULL, -- Format: HH:mm (e.g., "17:00")
    orden VARCHAR(255) NOT NULL,
    brand VARCHAR(255) NOT NULL,
    product VARCHAR(500) NOT NULL, -- Material name can be long
    monitor_name VARCHAR(255) NOT NULL,
    monitor_signature TEXT NOT NULL, -- Base64 encoded signature image
    
    -- Section 2: Readings (stored as JSONB array)
    readings JSONB NOT NULL DEFAULT '[]'::jsonb,
    /*
    Readings structure:
    [
      {
        "hour": "08:30",
        "bf": "D" or "ND",
        "bnf": "D" or "ND",
        "bss": "D" or "ND",
        "sensitivity": "Ok" or "No comply",
        "noiseAlarm": "Ok" or "No comply",
        "rejectingArm": "Ok" or "No comply",
        "observation": "Text description if deviation",
        "correctiveActions": "Text description if deviation"
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
CREATE INDEX IF NOT EXISTS idx_checklist_metal_detector_date_utc 
    ON public.checklist_metal_detector(date_utc DESC);

CREATE INDEX IF NOT EXISTS idx_checklist_metal_detector_date_string 
    ON public.checklist_metal_detector(date_string);

CREATE INDEX IF NOT EXISTS idx_checklist_metal_detector_brand 
    ON public.checklist_metal_detector(brand);

CREATE INDEX IF NOT EXISTS idx_checklist_metal_detector_product 
    ON public.checklist_metal_detector(product);

CREATE INDEX IF NOT EXISTS idx_checklist_metal_detector_orden 
    ON public.checklist_metal_detector(orden);

-- 3. Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.checklist_metal_detector ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- =====================================================
-- Policy: Allow authenticated users to read all records
CREATE POLICY "Allow authenticated users to read checklist_metal_detector"
    ON public.checklist_metal_detector
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert records
CREATE POLICY "Allow authenticated users to insert checklist_metal_detector"
    ON public.checklist_metal_detector
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow authenticated users to update records
CREATE POLICY "Allow authenticated users to update checklist_metal_detector"
    ON public.checklist_metal_detector
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Allow authenticated users to delete records (optional - adjust based on requirements)
-- CREATE POLICY "Allow authenticated users to delete checklist_metal_detector"
--     ON public.checklist_metal_detector
--     FOR DELETE
--     TO authenticated
--     USING (true);

-- 5. Create function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_checklist_metal_detector_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically update updated_at
-- =====================================================
CREATE TRIGGER update_checklist_metal_detector_updated_at
    BEFORE UPDATE ON public.checklist_metal_detector
    FOR EACH ROW
    EXECUTE FUNCTION update_checklist_metal_detector_updated_at();

-- 7. Create storage bucket for PDFs (run this in Supabase Dashboard > Storage)
-- =====================================================
-- Note: Storage buckets must be created via Supabase Dashboard or API
-- Bucket name: checklist-metal-detector
-- Public: false (private bucket)
-- File size limit: 10MB
-- Allowed MIME types: application/pdf

-- SQL to create bucket (if using Supabase SQL Editor):
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--     'checklist-metal-detector',
--     'checklist-metal-detector',
--     false,
--     10485760, -- 10MB in bytes
--     ARRAY['application/pdf']
-- );

-- 8. Create storage policies for the bucket
-- =====================================================
-- Policy: Allow authenticated users to upload PDFs
-- CREATE POLICY "Allow authenticated users to upload PDFs"
--     ON storage.objects
--     FOR INSERT
--     TO authenticated
--     WITH CHECK (
--         bucket_id = 'checklist-metal-detector' AND
--         (storage.foldername(name))[1] = 'checklist-metal-detector'
--     );

-- Policy: Allow authenticated users to read PDFs
-- CREATE POLICY "Allow authenticated users to read PDFs"
--     ON storage.objects
--     FOR SELECT
--     TO authenticated
--     USING (bucket_id = 'checklist-metal-detector');

-- Policy: Allow authenticated users to update PDFs
-- CREATE POLICY "Allow authenticated users to update PDFs"
--     ON storage.objects
--     FOR UPDATE
--     TO authenticated
--     USING (bucket_id = 'checklist-metal-detector')
--     WITH CHECK (bucket_id = 'checklist-metal-detector');

-- Policy: Allow authenticated users to delete PDFs
-- CREATE POLICY "Allow authenticated users to delete PDFs"
--     ON storage.objects
--     FOR DELETE
--     TO authenticated
--     USING (bucket_id = 'checklist-metal-detector');

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'checklist_metal_detector'
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'checklist_metal_detector';

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'checklist_metal_detector';

-- =====================================================
-- Example Insert (for testing)
-- =====================================================
/*
INSERT INTO public.checklist_metal_detector (
    date_string,
    process_line,
    metal_detector_id,
    metal_detector_start_time,
    metal_detector_finish_time,
    orden,
    brand,
    product,
    monitor_name,
    monitor_signature,
    readings,
    pdf_url
) VALUES (
    'NOV-17-2025',
    'Line 1',
    'MD-001',
    '08:00',
    '17:00',
    'ORD-12345',
    'Chiquita',
    'PIÑ IQF CHUNKS CHIQ 8*2.5 LB C/CHQ-B/CHQ',
    'John Doe',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    '[
        {
            "hour": "08:30",
            "bf": "D",
            "bnf": "D",
            "bss": "D",
            "sensitivity": "Ok",
            "noiseAlarm": "Ok",
            "rejectingArm": "Ok",
            "observation": "",
            "correctiveActions": ""
        },
        {
            "hour": "09:30",
            "bf": "ND",
            "bnf": "D",
            "bss": "D",
            "sensitivity": "Ok",
            "noiseAlarm": "Ok",
            "rejectingArm": "Ok",
            "observation": "BF bar not detected during routine check",
            "correctiveActions": "Isolated product, rechecked detector, recalibrated"
        }
    ]'::jsonb,
    'https://your-supabase-url.supabase.co/storage/v1/object/public/checklist-metal-detector/2025-NOV-17-083000-Metal-Detector-PCC1.pdf'
);
*/

