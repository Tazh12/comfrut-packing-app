-- =====================================================
-- Pre-Operational Review Processing Areas - Migration
-- =====================================================
-- Code: CF/PC-ASC-017-RG001
-- Migration: Add monitor_name and monitor_signature columns
-- =====================================================

-- Add monitor_name and monitor_signature columns to existing table
-- =====================================================
ALTER TABLE public.checklist_pre_operational_review
ADD COLUMN IF NOT EXISTS monitor_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS monitor_signature TEXT;

-- Update existing records to have default values (if any exist)
-- =====================================================
-- Note: If you have existing records, you may want to update them with default values
-- UPDATE public.checklist_pre_operational_review
-- SET monitor_name = 'N/A', monitor_signature = ''
-- WHERE monitor_name IS NULL;

-- Make columns NOT NULL after ensuring all records have values
-- =====================================================
-- First, ensure all existing records have values (uncomment if needed)
-- UPDATE public.checklist_pre_operational_review
-- SET monitor_name = COALESCE(monitor_name, 'N/A'),
--     monitor_signature = COALESCE(monitor_signature, '')
-- WHERE monitor_name IS NULL OR monitor_signature IS NULL;

-- Then make them NOT NULL (only if you've updated existing records)
-- ALTER TABLE public.checklist_pre_operational_review
-- ALTER COLUMN monitor_name SET NOT NULL,
-- ALTER COLUMN monitor_signature SET NOT NULL;

-- =====================================================
-- Verification Query
-- =====================================================
-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'checklist_pre_operational_review'
--   AND column_name IN ('monitor_name', 'monitor_signature')
-- ORDER BY ordinal_position;

