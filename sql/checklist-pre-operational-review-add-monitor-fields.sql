-- =====================================================
-- Pre-Operational Review Processing Areas - Add Monitor Fields
-- =====================================================
-- Migration: Add monitor_name and monitor_signature columns
-- Run this SQL if the table already exists without these columns
-- =====================================================

-- Step 1: Add monitor_name and monitor_signature columns (nullable first)
-- =====================================================
ALTER TABLE public.checklist_pre_operational_review
ADD COLUMN IF NOT EXISTS monitor_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS monitor_signature TEXT;

-- Step 2: Set default values for any existing records
-- =====================================================
UPDATE public.checklist_pre_operational_review
SET monitor_name = COALESCE(monitor_name, 'N/A'),
    monitor_signature = COALESCE(monitor_signature, '')
WHERE monitor_name IS NULL OR monitor_signature IS NULL;

-- Step 3: Make columns NOT NULL (only after setting defaults)
-- =====================================================
-- Note: This will fail if there are still NULL values
-- If you get an error, check for NULL values first:
-- SELECT COUNT(*) FROM public.checklist_pre_operational_review 
-- WHERE monitor_name IS NULL OR monitor_signature IS NULL;

ALTER TABLE public.checklist_pre_operational_review
ALTER COLUMN monitor_name SET NOT NULL,
ALTER COLUMN monitor_signature SET NOT NULL;

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify the columns were added correctly:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'checklist_pre_operational_review'
--   AND column_name IN ('monitor_name', 'monitor_signature')
-- ORDER BY ordinal_position;

