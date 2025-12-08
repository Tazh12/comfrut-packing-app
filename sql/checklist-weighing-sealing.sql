-- =====================================================
-- Check Weighing and Sealing of Packaged Products - Supabase Setup
-- =====================================================
-- Code: CF/PC-ASC-006-RG005
-- =====================================================

-- 1. Create the checklist_weighing_sealing table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.checklist_weighing_sealing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Section 1: Basic Info
    date_string VARCHAR(20) NOT NULL, -- Format: MMM-DD-YYYY (e.g., "NOV-17-2025")
    shift VARCHAR(50) NOT NULL, -- Morning, Afternoon, Night
    process_room VARCHAR(255) NOT NULL,
    brand VARCHAR(255) NOT NULL,
    product VARCHAR(255) NOT NULL,
    monitor_name VARCHAR(255) NOT NULL,
    monitor_signature TEXT NOT NULL, -- Base64 encoded signature image
    
    -- Section 2: Bag Entries (stored as JSONB array)
    bag_entries JSONB NOT NULL DEFAULT '[]'::jsonb,
    /*
    Bag Entries structure:
    [
      {
        "id": 1234567890,
        "time": "11:24",
        "bagCode": "CF 34",
        "weights": ["12", "23", "34", "45", "57", "78", "1", "1", "1", "12"],
        "sealed": ["Comply", "Comply", "Comply", "not comply", "Comply", "Comply", "Comply", "Comply", "Comply", "Comply"],
        "otherCodification": "f",
        "declarationOfOrigin": "Comply"
      },
      ...
    ]
    */
    
    -- Section 3: Comments / Observaciones
    comments TEXT,
    
    -- PDF and metadata
    pdf_url TEXT,
    date_utc TIMESTAMPTZ DEFAULT NOW(), -- UTC timestamp for querying
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for better query performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_checklist_weighing_sealing_date_utc 
    ON public.checklist_weighing_sealing(date_utc DESC);

CREATE INDEX IF NOT EXISTS idx_checklist_weighing_sealing_date_string 
    ON public.checklist_weighing_sealing(date_string);

CREATE INDEX IF NOT EXISTS idx_checklist_weighing_sealing_shift 
    ON public.checklist_weighing_sealing(shift);

CREATE INDEX IF NOT EXISTS idx_checklist_weighing_sealing_process_room 
    ON public.checklist_weighing_sealing(process_room);

CREATE INDEX IF NOT EXISTS idx_checklist_weighing_sealing_brand 
    ON public.checklist_weighing_sealing(brand);

CREATE INDEX IF NOT EXISTS idx_checklist_weighing_sealing_product 
    ON public.checklist_weighing_sealing(product);

CREATE INDEX IF NOT EXISTS idx_checklist_weighing_sealing_monitor_name 
    ON public.checklist_weighing_sealing(monitor_name);

-- 3. Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.checklist_weighing_sealing ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- =====================================================
-- Policy: Allow authenticated users to read all records
CREATE POLICY "Allow authenticated users to read checklist_weighing_sealing"
    ON public.checklist_weighing_sealing
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert records
CREATE POLICY "Allow authenticated users to insert checklist_weighing_sealing"
    ON public.checklist_weighing_sealing
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow authenticated users to update records
CREATE POLICY "Allow authenticated users to update checklist_weighing_sealing"
    ON public.checklist_weighing_sealing
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Allow authenticated users to delete records (optional - adjust based on requirements)
-- CREATE POLICY "Allow authenticated users to delete checklist_weighing_sealing"
--     ON public.checklist_weighing_sealing
--     FOR DELETE
--     TO authenticated
--     USING (true);

-- 5. Create function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_checklist_weighing_sealing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically update updated_at
-- =====================================================
CREATE TRIGGER update_checklist_weighing_sealing_updated_at
    BEFORE UPDATE ON public.checklist_weighing_sealing
    FOR EACH ROW
    EXECUTE FUNCTION update_checklist_weighing_sealing_updated_at();

-- 7. Create storage bucket for PDFs
-- =====================================================
-- Note: Storage buckets must be created via Supabase Dashboard or API
-- Bucket name: checklist-weighing-sealing
-- Public: true (MUST be public for getPublicUrl() to work)
-- File size limit: 10MB
-- Allowed MIME types: application/pdf

-- SQL to create bucket (if using Supabase SQL Editor):
-- Note: You need to run this with proper permissions (service_role key)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'checklist-weighing-sealing',
    'checklist-weighing-sealing',
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
CREATE POLICY "Allow authenticated users to upload weighing sealing PDFs"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'checklist-weighing-sealing'
    );

-- Policy: Allow authenticated users to read PDFs
CREATE POLICY "Allow authenticated users to read weighing sealing PDFs"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'checklist-weighing-sealing');

-- Policy: Allow authenticated users to update PDFs
CREATE POLICY "Allow authenticated users to update weighing sealing PDFs"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'checklist-weighing-sealing')
    WITH CHECK (bucket_id = 'checklist-weighing-sealing');

-- Policy: Allow authenticated users to delete PDFs
CREATE POLICY "Allow authenticated users to delete weighing sealing PDFs"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'checklist-weighing-sealing');

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'checklist_weighing_sealing'
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'checklist_weighing_sealing';

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'checklist_weighing_sealing';

-- Check storage bucket
-- SELECT id, name, public, file_size_limit, allowed_mime_types
-- FROM storage.buckets
-- WHERE id = 'checklist-weighing-sealing';

-- =====================================================
-- Example Insert (for testing)
-- =====================================================
/*
INSERT INTO public.checklist_weighing_sealing (
    date_string,
    shift,
    process_room,
    brand,
    product,
    monitor_name,
    monitor_signature,
    bag_entries,
    pdf_url
) VALUES (
    'NOV-17-2025',
    'Morning',
    'Process Room A',
    'Chiquita',
    'PIÑ IQF CHUNKS CHIQ 8*16 OZ. C/CHQ-B/CHQ',
    'Esnirde Henriquez',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    '[
        {
            "id": 1234567890,
            "time": "11:24",
            "bagCode": "CF 34",
            "weights": ["12", "23", "34", "45", "57", "78", "1", "1", "1", "12"],
            "sealed": ["Comply", "Comply", "Comply", "Comply", "Comply", "Comply", "Comply", "Comply", "Comply", "Comply"],
            "otherCodification": "f",
            "declarationOfOrigin": "Comply"
        },
        {
            "id": 1234567891,
            "time": "12:30",
            "bagCode": "CF 35",
            "weights": ["15", "16", "17", "18", "19", "20", "21", "22", "23", "24"],
            "sealed": ["Comply", "not comply", "Comply", "Comply", "Comply", "Comply", "Comply", "Comply", "Comply", "Comply"],
            "otherCodification": "g",
            "declarationOfOrigin": "Comply"
        }
    ]'::jsonb,
    'https://your-supabase-url.supabase.co/storage/v1/object/public/checklist-weighing-sealing/2025-NOVEMBER-17-Check-Weighing-Sealing-01.pdf'
);
*/

