-- Storage Bucket Setup for Mantenimiento PDFs
-- =====================================================
-- This file sets up the storage bucket and RLS policies for mantenimiento PDF uploads
-- Run this in Supabase SQL Editor

-- 1. Create storage bucket for PDFs
-- =====================================================
-- Note: This requires service_role permissions
-- If this fails, create the bucket manually in Supabase Dashboard > Storage
-- Bucket settings:
--   - Name: mtto-pdf-solicitudes
--   - Public: true (MUST be public for getPublicUrl() to work)
--   - File size limit: 10MB
--   - Allowed MIME types: application/pdf

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'mtto-pdf-solicitudes',
    'mtto-pdf-solicitudes',
    true, -- Set to true (public) so getPublicUrl() works
    10485760, -- 10MB in bytes
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf'];

-- 2. Create storage policies for the bucket
-- =====================================================
-- Policy: Allow authenticated users to upload PDFs
CREATE POLICY "Allow authenticated users to upload mantenimiento PDFs"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'mtto-pdf-solicitudes'
    );

-- Policy: Allow authenticated users to read PDFs
CREATE POLICY "Allow authenticated users to read mantenimiento PDFs"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'mtto-pdf-solicitudes');

-- Policy: Allow authenticated users to update PDFs
CREATE POLICY "Allow authenticated users to update mantenimiento PDFs"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'mtto-pdf-solicitudes')
    WITH CHECK (bucket_id = 'mtto-pdf-solicitudes');

-- Policy: Allow authenticated users to delete PDFs
CREATE POLICY "Allow authenticated users to delete mantenimiento PDFs"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'mtto-pdf-solicitudes');

-- =====================================================
-- Setup Complete!
-- After running this, the storage bucket will be configured
-- and authenticated users will be able to upload/read/update/delete PDFs

