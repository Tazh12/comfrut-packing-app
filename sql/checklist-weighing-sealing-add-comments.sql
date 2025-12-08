-- =====================================================
-- Add Comments Column to checklist_weighing_sealing Table
-- =====================================================
-- This migration adds a comments field to store Section 3 comments/observaciones
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Add comments column (nullable, as existing records won't have comments)
ALTER TABLE public.checklist_weighing_sealing
ADD COLUMN IF NOT EXISTS comments TEXT;

-- Verify the column was added
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'checklist_weighing_sealing'
--   AND column_name = 'comments';

-- =====================================================
-- Note: The comments field is optional (nullable)
-- Existing records will have NULL for comments
-- New records can include comments in the insert
-- =====================================================
