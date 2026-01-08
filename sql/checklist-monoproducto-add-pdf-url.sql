-- =====================================================
-- Update checklist_calidad_monoproducto table structure
-- =====================================================
-- This migration updates the table to match the new structure:
-- - Stores pallets as JSONB (like producto mix)
-- - Adds pdf_url column
-- - Adds date_string and date_utc for querying
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add date_string column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'checklist_calidad_monoproducto' 
        AND column_name = 'date_string'
    ) THEN
        ALTER TABLE public.checklist_calidad_monoproducto 
        ADD COLUMN date_string VARCHAR(20);
        
        RAISE NOTICE 'Column date_string added successfully';
    ELSE
        RAISE NOTICE 'Column date_string already exists';
    END IF;
END $$;

-- Add pallets JSONB column if it doesn't exist (for storing all pallets as JSONB)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'checklist_calidad_monoproducto' 
        AND column_name = 'pallets'
    ) THEN
        ALTER TABLE public.checklist_calidad_monoproducto 
        ADD COLUMN pallets JSONB DEFAULT '[]'::jsonb;
        
        RAISE NOTICE 'Column pallets added successfully';
    ELSE
        RAISE NOTICE 'Column pallets already exists';
    END IF;
END $$;

-- Add pdf_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'checklist_calidad_monoproducto' 
        AND column_name = 'pdf_url'
    ) THEN
        ALTER TABLE public.checklist_calidad_monoproducto 
        ADD COLUMN pdf_url TEXT;
        
        RAISE NOTICE 'Column pdf_url added successfully';
    ELSE
        RAISE NOTICE 'Column pdf_url already exists';
    END IF;
END $$;

-- Add date_utc column if it doesn't exist (for querying)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'checklist_calidad_monoproducto' 
        AND column_name = 'date_utc'
    ) THEN
        ALTER TABLE public.checklist_calidad_monoproducto 
        ADD COLUMN date_utc TIMESTAMPTZ DEFAULT NOW();
        
        RAISE NOTICE 'Column date_utc added successfully';
    ELSE
        RAISE NOTICE 'Column date_utc already exists';
    END IF;
END $$;

-- Optional: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_checklist_calidad_monoproducto_pdf_url 
    ON public.checklist_calidad_monoproducto(pdf_url) 
    WHERE pdf_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_checklist_calidad_monoproducto_date_utc 
    ON public.checklist_calidad_monoproducto(date_utc DESC);

CREATE INDEX IF NOT EXISTS idx_checklist_calidad_monoproducto_date_string 
    ON public.checklist_calidad_monoproducto(date_string);

CREATE INDEX IF NOT EXISTS idx_checklist_calidad_monoproducto_pallets 
    ON public.checklist_calidad_monoproducto USING GIN (pallets);

