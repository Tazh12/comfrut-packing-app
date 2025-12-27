-- =====================================================
-- Inspection of Frozen Product in Dispatch - Supabase Setup
-- =====================================================
-- Code: CF.PC-ASC-012-RG004
-- =====================================================

-- 1. Create the checklist_frozen_product_dispatch table
CREATE TABLE IF NOT EXISTS public.checklist_frozen_product_dispatch (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Section 1: Shipment + Dispatch Plan
    po_number VARCHAR(255),
    client VARCHAR(255),
    date TIMESTAMPTZ DEFAULT NOW(),
    container_number VARCHAR(255),
    driver VARCHAR(255),
    origin VARCHAR(255),
    destination VARCHAR(255),
    ttr VARCHAR(255),
    inspector_name VARCHAR(255),
    
    -- Dispatch Plan (JSONB array)
    -- [{ "id": "uuid", "name": "Product A", "expected_pallets": 10, "expected_cases": 100 }]
    dispatch_plan JSONB DEFAULT '[]'::jsonb,
    
    -- Section 2: Container Inspection Gate
    -- 7-point inspection stored as JSONB
    -- { "left_side": { "status": "G", "comment": "" }, ... }
    container_inspection JSONB DEFAULT '{}'::jsonb,
    inspection_temps VARCHAR(255),
    inspection_photos JSONB DEFAULT '[]'::jsonb, -- Array of photo URLs
    inspection_result VARCHAR(50), -- 'Approve' or 'Reject'
    inspection_signature TEXT,
    
    -- Section 3: Loading Map
    -- Array of 26 slots (13 rows x 2 cols)
    -- [{ "slot_id": 1, "pallet_id": "...", "product": "...", "cases": 10, "checks": {...} }]
    loading_map JSONB DEFAULT '[]'::jsonb,
    
    -- Row photos (13 rows)
    -- { "row_1": "url", "row_2": "url" ... }
    row_photos JSONB DEFAULT '{}'::jsonb,
    
    -- Section 4: Closeout
    seal_number VARCHAR(255),
    seal_photos JSONB DEFAULT '[]'::jsonb,
    closeout_signature TEXT,
    closeout_status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'completed'
    
    -- PDF
    pdf_url TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add pdf_url column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'checklist_frozen_product_dispatch' 
        AND column_name = 'pdf_url'
    ) THEN
        ALTER TABLE public.checklist_frozen_product_dispatch ADD COLUMN pdf_url TEXT;
    END IF;
END $$;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_checklist_frozen_dispatch_date ON public.checklist_frozen_product_dispatch(date DESC);
CREATE INDEX IF NOT EXISTS idx_checklist_frozen_dispatch_po ON public.checklist_frozen_product_dispatch(po_number);

-- 4. RLS
ALTER TABLE public.checklist_frozen_product_dispatch ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create them
DROP POLICY IF EXISTS "Allow authenticated users to read checklist_frozen_product_dispatch" ON public.checklist_frozen_product_dispatch;
CREATE POLICY "Allow authenticated users to read checklist_frozen_product_dispatch"
    ON public.checklist_frozen_product_dispatch FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert checklist_frozen_product_dispatch" ON public.checklist_frozen_product_dispatch;
CREATE POLICY "Allow authenticated users to insert checklist_frozen_product_dispatch"
    ON public.checklist_frozen_product_dispatch FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update checklist_frozen_product_dispatch" ON public.checklist_frozen_product_dispatch;
CREATE POLICY "Allow authenticated users to update checklist_frozen_product_dispatch"
    ON public.checklist_frozen_product_dispatch FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 5. Trigger for updated_at
DROP TRIGGER IF EXISTS update_checklist_frozen_product_dispatch_updated_at ON public.checklist_frozen_product_dispatch;
CREATE TRIGGER update_checklist_frozen_product_dispatch_updated_at
    BEFORE UPDATE ON public.checklist_frozen_product_dispatch
    FOR EACH ROW
    EXECUTE FUNCTION update_checklist_raw_material_quality_updated_at(); -- Reusing existing function

-- 6. Storage Bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'checklist-frozen-product-dispatch',
    'checklist-frozen-product-dispatch',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- 7. Storage Policies
-- Drop existing storage policies if they exist, then create them
DROP POLICY IF EXISTS "Allow authenticated users to upload checklist_frozen_product_dispatch" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload checklist_frozen_product_dispatch"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'checklist-frozen-product-dispatch');

DROP POLICY IF EXISTS "Allow authenticated users to read checklist_frozen_product_dispatch" ON storage.objects;
CREATE POLICY "Allow authenticated users to read checklist_frozen_product_dispatch"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'checklist-frozen-product-dispatch');

DROP POLICY IF EXISTS "Allow authenticated users to update checklist_frozen_product_dispatch" ON storage.objects;
CREATE POLICY "Allow authenticated users to update checklist_frozen_product_dispatch"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'checklist-frozen-product-dispatch');

-- Also add delete policy for storage
DROP POLICY IF EXISTS "Allow authenticated users to delete checklist_frozen_product_dispatch" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete checklist_frozen_product_dispatch"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'checklist-frozen-product-dispatch');

