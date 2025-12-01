-- =====================================================
-- Pre-Operational Review Processing Areas - Supabase Setup
-- =====================================================
-- Code: CF/PC-ASC-017-RG001
-- =====================================================

-- 1. Create the checklist_pre_operational_review table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.checklist_pre_operational_review (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Section 1: Basic Info
    date_string VARCHAR(20) NOT NULL, -- Format: MMM-DD-YYYY (e.g., "NOV-17-2025")
    hour_string VARCHAR(10) NOT NULL, -- Format: HH:MM (e.g., "08:30")
    brand VARCHAR(255) NOT NULL,
    product VARCHAR(500) NOT NULL, -- Material name can be long
    monitor_name VARCHAR(255) NOT NULL,
    monitor_signature TEXT NOT NULL, -- Base64 encoded signature image
    
    -- Section 2: Checklist Items
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    /*
    Items structure:
    [
      {
        "id": "item_1",
        "name": "Footbath with correct amount of sanitizer",
        "comply": true | false | null, // null = not answered
        "observation": "Observation text if not comply",
        "correctiveAction": "Corrective action text",
        "correctiveActionComply": true | false | null, // null = not answered
        "correctiveActionObservation": "Observation if corrective action not comply"
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
CREATE INDEX IF NOT EXISTS idx_checklist_pre_operational_review_date_utc 
    ON public.checklist_pre_operational_review(date_utc DESC);

CREATE INDEX IF NOT EXISTS idx_checklist_pre_operational_review_date_string 
    ON public.checklist_pre_operational_review(date_string);

CREATE INDEX IF NOT EXISTS idx_checklist_pre_operational_review_brand 
    ON public.checklist_pre_operational_review(brand);

CREATE INDEX IF NOT EXISTS idx_checklist_pre_operational_review_product 
    ON public.checklist_pre_operational_review(product);

-- 3. Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.checklist_pre_operational_review ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- =====================================================
-- Policy: Allow authenticated users to read all records
CREATE POLICY "Allow authenticated users to read checklist_pre_operational_review"
    ON public.checklist_pre_operational_review
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert records
CREATE POLICY "Allow authenticated users to insert checklist_pre_operational_review"
    ON public.checklist_pre_operational_review
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow authenticated users to update records
CREATE POLICY "Allow authenticated users to update checklist_pre_operational_review"
    ON public.checklist_pre_operational_review
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Create function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_checklist_pre_operational_review_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically update updated_at
-- =====================================================
CREATE TRIGGER update_checklist_pre_operational_review_updated_at
    BEFORE UPDATE ON public.checklist_pre_operational_review
    FOR EACH ROW
    EXECUTE FUNCTION update_checklist_pre_operational_review_updated_at();

-- 7. Create storage bucket for PDFs (run this in Supabase Dashboard > Storage)
-- =====================================================
-- Note: Storage buckets must be created via Supabase Dashboard or API
-- Bucket name: checklist-pre-operational-review
-- Public: false (private bucket)
-- File size limit: 10MB
-- Allowed MIME types: application/pdf

-- SQL to create bucket (if using Supabase SQL Editor):
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'checklist-pre-operational-review',
    'checklist-pre-operational-review',
    false,
    10485760, -- 10MB in bytes
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 8. Create storage policies for the bucket
-- =====================================================
-- Policy: Allow authenticated users to upload PDFs
CREATE POLICY "Allow authenticated users to upload pre operational review PDFs"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'checklist-pre-operational-review'
    );

-- Policy: Allow authenticated users to read PDFs
CREATE POLICY "Allow authenticated users to read pre operational review PDFs"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'checklist-pre-operational-review');

-- Policy: Allow authenticated users to update PDFs
CREATE POLICY "Allow authenticated users to update pre operational review PDFs"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'checklist-pre-operational-review')
    WITH CHECK (bucket_id = 'checklist-pre-operational-review');

-- Policy: Allow authenticated users to delete PDFs
CREATE POLICY "Allow authenticated users to delete pre operational review PDFs"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'checklist-pre-operational-review');

