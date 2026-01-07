-- =====================================================
-- Insert Users and Permissions
-- =====================================================
-- This script inserts users into auth.users and creates their permissions
-- Note: You'll need to run this with service_role permissions or through Supabase Dashboard
-- =====================================================

-- IMPORTANT: Before running this script, you need to:
-- 1. Create users in Supabase Auth Dashboard OR use Supabase Admin API
-- 2. Get their user IDs from auth.users table
-- 3. Update the user_id values below with actual UUIDs from auth.users

-- =====================================================
-- Step 1: Create users in auth.users (if they don't exist)
-- =====================================================
-- Note: You can create users via Supabase Dashboard > Authentication > Users
-- Or use the Supabase Admin API. For now, we'll assume users exist and reference them by email.

-- =====================================================
-- Step 2: Insert permissions for each user
-- =====================================================
-- We'll use a function that gets user_id from email

-- First, create a helper function to get user_id from email (case-insensitive)
CREATE OR REPLACE FUNCTION get_user_id_by_email(user_email TEXT)
RETURNS UUID AS $$
DECLARE
    user_uuid UUID;
BEGIN
    SELECT id INTO user_uuid FROM auth.users WHERE LOWER(email) = LOWER(user_email) LIMIT 1;
    RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to insert permissions only if user exists
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

-- Now insert permissions for all users (case-insensitive email matching)

-- Insert permissions for Esteban Gutierrez (Manager - Full Access)
SELECT insert_user_permission_if_exists(
    'esteban.gutierrez@comfrut.com',
    'Manager',
    TRUE,  -- Production checklist
    TRUE,  -- Production Dashboard
    TRUE,  -- Quality Checklist
    TRUE,  -- Quality Dashboard
    TRUE,  -- Logistic Checklist
    TRUE,  -- Logistic Dashboard
    TRUE,  -- Maintenance ticket/Solicitudes
    TRUE,  -- Maintenance gestión
    TRUE,  -- Maintenance técnicos
    TRUE,  -- SAP Ticket/ Solicitudes
    TRUE,  -- SAP gestión
    FALSE  -- SAP encargados (empty in table)
);

-- Insert permissions for Esnirde Enriquez (Quality)
SELECT insert_user_permission_if_exists(
    'controlcalidadusa@comfrut.com',
    'Quality',
    FALSE, -- Production checklist
    FALSE, -- Production Dashboard
    TRUE,  -- Quality Checklist
    TRUE,  -- Quality Dashboard
    FALSE, -- Logistic Checklist
    FALSE, -- Logistic Dashboard
    TRUE,  -- Maintenance ticket/Solicitudes
    FALSE, -- Maintenance gestión
    FALSE, -- Maintenance técnicos
    FALSE, -- SAP Ticket/ Solicitudes
    FALSE, -- SAP gestión
    FALSE  -- SAP encargados
);

-- Insert permissions for Felix Hernandez (Production)
SELECT insert_user_permission_if_exists(
    'turnogestion.usa@comfrut.com',
    'Production',
    TRUE,  -- Production checklist
    TRUE,  -- Production Dashboard
    FALSE, -- Quality Checklist
    FALSE, -- Quality Dashboard
    FALSE, -- Logistic Checklist
    FALSE, -- Logistic Dashboard
    TRUE,  -- Maintenance ticket/Solicitudes
    FALSE, -- Maintenance gestión
    FALSE, -- Maintenance técnicos
    FALSE, -- SAP Ticket/ Solicitudes
    FALSE, -- SAP gestión
    FALSE  -- SAP encargados
);

-- Insert permissions for Patricia Heath (Quality + Admin)
SELECT insert_user_permission_if_exists(
    'patricia.heath@comfrut.com',
    'Quality + Admin',
    FALSE, -- Production checklist
    FALSE, -- Production Dashboard
    TRUE,  -- Quality Checklist
    TRUE,  -- Quality Dashboard
    FALSE, -- Logistic Checklist
    FALSE, -- Logistic Dashboard
    TRUE,  -- Maintenance ticket/Solicitudes
    FALSE, -- Maintenance gestión
    FALSE, -- Maintenance técnicos
    TRUE,  -- SAP Ticket/ Solicitudes
    TRUE,  -- SAP gestión
    FALSE  -- SAP encargados
);

-- Insert permissions for Gonzalo Ramirez (Maintenance supervisor)
SELECT insert_user_permission_if_exists(
    'Gonzalo.Ramirez@comfrut.com',
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

-- Insert permissions for Victor Sepulveda (Maintenance technician)
SELECT insert_user_permission_if_exists(
    'Victor.Sepulveda@comfrut.com',
    'Maintenance technician',
    FALSE, -- Production checklist
    FALSE, -- Production Dashboard
    FALSE, -- Quality Checklist
    FALSE, -- Quality Dashboard
    FALSE, -- Logistic Checklist
    FALSE, -- Logistic Dashboard
    TRUE,  -- Maintenance ticket/Solicitudes
    FALSE, -- Maintenance gestión
    TRUE,  -- Maintenance técnicos
    TRUE,  -- SAP Ticket/ Solicitudes
    FALSE, -- SAP gestión
    FALSE  -- SAP encargados
);

-- Insert permissions for Asmiria Anselmi (Quality Manager)
SELECT insert_user_permission_if_exists(
    'Asmiria.anselmi@comfrut.com',
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

-- Insert permissions for Ricardo Rebolledo (Administration Manager)
SELECT insert_user_permission_if_exists(
    'Ricardo.rebolledo@comfrut.com',
    'Administration Manager',
    FALSE, -- Production checklist
    FALSE, -- Production Dashboard
    FALSE, -- Quality Checklist
    FALSE, -- Quality Dashboard
    FALSE, -- Logistic Checklist
    FALSE, -- Logistic Dashboard
    FALSE, -- Maintenance ticket/Solicitudes
    FALSE, -- Maintenance gestión
    FALSE, -- Maintenance técnicos
    FALSE, -- SAP Ticket/ Solicitudes
    FALSE, -- SAP gestión
    TRUE   -- SAP encargados
);

-- Note: The script will skip users that don't exist in auth.users
-- You'll see NOTICE messages for any users that were skipped
-- After creating those users in Supabase Auth Dashboard, run this script again
-- to insert their permissions.

-- Clean up helper functions (optional - you can keep them if needed)
-- DROP FUNCTION IF EXISTS get_user_id_by_email(TEXT);
-- DROP FUNCTION IF EXISTS insert_user_permission_if_exists(...);

