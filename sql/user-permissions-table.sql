-- =====================================================
-- User Permissions Table - Access Control Management
-- =====================================================
-- Stores user permissions for different modules and features
-- =====================================================

-- 1. Create the user_permissions table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    area VARCHAR(100),
    
    -- Production permissions
    production_checklist BOOLEAN DEFAULT FALSE,
    production_dashboard BOOLEAN DEFAULT FALSE,
    
    -- Quality permissions
    quality_checklist BOOLEAN DEFAULT FALSE,
    quality_dashboard BOOLEAN DEFAULT FALSE,
    
    -- Logistic permissions
    logistic_checklist BOOLEAN DEFAULT FALSE,
    logistic_dashboard BOOLEAN DEFAULT FALSE,
    
    -- Maintenance permissions
    maintenance_ticket BOOLEAN DEFAULT FALSE,
    maintenance_gestion BOOLEAN DEFAULT FALSE,
    maintenance_tecnicos BOOLEAN DEFAULT FALSE,
    
    -- SAP (Solicitud Acciones Preventivas) permissions
    sap_ticket BOOLEAN DEFAULT FALSE,
    sap_gestion BOOLEAN DEFAULT FALSE,
    sap_encargados BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id),
    UNIQUE(email)
);

-- 2. Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
-- =====================================================

-- Policy: Users can view their own permissions
CREATE POLICY "Users can view own permissions"
    ON public.user_permissions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Allow authenticated users to view all permissions (for admin/management purposes)
-- Note: You may want to restrict this further based on your needs
CREATE POLICY "Authenticated users can view all permissions"
    ON public.user_permissions
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Only service role can insert/update/delete (for admin operations)
-- Regular users cannot modify permissions directly
-- Note: In production, you may want to create admin functions or use service role

-- 4. Create indexes for better query performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_email ON public.user_permissions(email);

-- 5. Create function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_user_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically update updated_at
-- =====================================================
CREATE TRIGGER set_user_permissions_updated_at
    BEFORE UPDATE ON public.user_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_permissions_updated_at();

