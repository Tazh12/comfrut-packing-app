-- =====================================================
-- Add avatar_color column to profiles table
-- =====================================================
-- Allows users to customize their avatar background color
-- =====================================================

-- Add avatar_color column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(7) DEFAULT '#1D6FE3';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.avatar_color IS 'Hex color code for user avatar background (e.g., #1D6FE3)';

