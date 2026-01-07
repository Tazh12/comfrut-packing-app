-- =====================================================
-- Insert Missing Permissions for Existing Users
-- =====================================================
-- This script inserts permissions for users that exist in auth.users
-- but don't have entries in user_permissions yet
-- =====================================================

-- Make sure the helper function exists (case-insensitive)
CREATE OR REPLACE FUNCTION insert_user_permission_if_exists(
    user_email TEXT,
    user_area TEXT,
    prod_checklist BOOLEAN,
    prod_dashboard BOOLEAN,
    qual_checklist BOOLEAN,
    qual_dashboard BOOLEAN,
    log_checklist BOOLEAN,
    log_dashboard BOOLEAN,
    maint_ticket BOOLEAN,
    maint_gestion BOOLEAN,
    maint_tecnicos BOOLEAN,
    sap_ticket_val BOOLEAN,
    sap_gestion_val BOOLEAN,
    sap_encargados_val BOOLEAN
)
RETURNS VOID AS $$
DECLARE
    user_uuid UUID;
    actual_email TEXT;
BEGIN
    -- Get user_id from email (case-insensitive match)
    SELECT id, email INTO user_uuid, actual_email 
    FROM auth.users 
    WHERE LOWER(email) = LOWER(user_email) 
    LIMIT 1;
    
    -- Only insert if user exists
    IF user_uuid IS NOT NULL THEN
        INSERT INTO public.user_permissions (
            user_id,
            email,
            area,
            production_checklist,
            production_dashboard,
            quality_checklist,
            quality_dashboard,
            logistic_checklist,
            logistic_dashboard,
            maintenance_ticket,
            maintenance_gestion,
            maintenance_tecnicos,
            sap_ticket,
            sap_gestion,
            sap_encargados
        ) VALUES (
            user_uuid,
            actual_email,  -- Use the actual email from auth.users (preserves case)
            user_area,
            prod_checklist,
            prod_dashboard,
            qual_checklist,
            qual_dashboard,
            log_checklist,
            log_dashboard,
            maint_ticket,
            maint_gestion,
            maint_tecnicos,
            sap_ticket_val,
            sap_gestion_val,
            sap_encargados_val
        )
        ON CONFLICT (email) DO UPDATE SET
            area = EXCLUDED.area,
            production_checklist = EXCLUDED.production_checklist,
            production_dashboard = EXCLUDED.production_dashboard,
            quality_checklist = EXCLUDED.quality_checklist,
            quality_dashboard = EXCLUDED.quality_dashboard,
            logistic_checklist = EXCLUDED.logistic_checklist,
            logistic_dashboard = EXCLUDED.logistic_dashboard,
            maintenance_ticket = EXCLUDED.maintenance_ticket,
            maintenance_gestion = EXCLUDED.maintenance_gestion,
            maintenance_tecnicos = EXCLUDED.maintenance_tecnicos,
            sap_ticket = EXCLUDED.sap_ticket,
            sap_gestion = EXCLUDED.sap_gestion,
            sap_encargados = EXCLUDED.sap_encargados,
            updated_at = NOW();
    ELSE
        RAISE NOTICE 'User with email % does not exist in auth.users. Skipping permission insertion.', user_email;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert permissions for Asmiria Anselmi (Quality Manager)
-- Email in auth.users: asmiria.anselmi@comfrut.com
SELECT insert_user_permission_if_exists(
    'Asmiria.anselmi@comfrut.com',  -- Will match asmiria.anselmi@comfrut.com
    'Quality Manager',
    FALSE, -- Production checklist
    TRUE,  -- Production Dashboard
    FALSE, -- Quality Checklist
    TRUE,  -- Quality Dashboard
    FALSE, -- Logistic Checklist
    TRUE,  -- Logistic Dashboard
    TRUE,  -- Maintenance ticket/Solicitudes
    FALSE, -- Maintenance gestión
    FALSE, -- Maintenance técnicos
    TRUE,  -- SAP Ticket/ Solicitudes
    TRUE,  -- SAP gestión
    FALSE  -- SAP encargados
);

-- Insert permissions for Gonzalo Ramirez (Maintenance supervisor)
-- Email in auth.users: gonzalo.ramirez@comfrut.com
SELECT insert_user_permission_if_exists(
    'Gonzalo.Ramirez@comfrut.com',  -- Will match gonzalo.ramirez@comfrut.com
    'Maintenance supervisor',
    FALSE, -- Production checklist
    FALSE, -- Production Dashboard
    FALSE, -- Quality Checklist
    FALSE, -- Quality Dashboard
    FALSE, -- Logistic Checklist
    FALSE, -- Logistic Dashboard
    TRUE,  -- Maintenance ticket/Solicitudes
    TRUE,  -- Maintenance gestión
    TRUE,  -- Maintenance técnicos
    TRUE,  -- SAP Ticket/ Solicitudes
    FALSE, -- SAP gestión
    FALSE  -- SAP encargados
);

