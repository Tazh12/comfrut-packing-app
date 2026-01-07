# User Permissions System Setup Guide

This document explains how to set up and use the user permissions system in the application.

## Overview

The permissions system controls user access to different modules and features:
- **Production**: Checklists and dashboards
- **Quality**: Checklists and dashboards
- **Logistic**: Checklists and dashboards
- **Maintenance**: Tickets, gestión, and técnicos sections
- **SAP**: Tickets, gestión, and encargados sections

## Database Setup

### Step 1: Create the Permissions Table

Run the SQL script to create the `user_permissions` table:

```bash
# In Supabase SQL Editor, run:
sql/user-permissions-table.sql
```

This creates:
- The `user_permissions` table with all permission columns
- Row Level Security (RLS) policies
- Indexes for performance
- Triggers for automatic timestamp updates

### Step 2: Create Users in Supabase Auth

Before inserting permissions, you need to create users in Supabase Authentication:

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add User" for each user
3. Enter their email address
4. Set a temporary password (users can reset it later)
5. Note: Users will receive an email to confirm their account

**Users to create:**
- esteban.gutierrez@comfrut.com
- controlcalidadusa@comfrut.com
- turnogestion.usa@comfrut.com
- patricia.heath@comfrut.com
- Gonzalo.Ramirez@comfrut.com
- Victor.Sepulveda@comfrut.com
- Asmiria.anselmi@comfrut.com
- Ricardo.rebolledo@comfrut.com

### Step 3: Insert User Permissions

After creating users, run the permissions insertion script:

```bash
# In Supabase SQL Editor, run:
sql/insert-users-and-permissions.sql
```

This script:
- Uses a helper function to find user IDs by email
- Inserts permissions for all users based on the provided table
- Uses `ON CONFLICT` to update permissions if they already exist

## Permission Structure

Each user has the following boolean permissions:

### Production
- `production_checklist`: Can create/edit production checklists
- `production_dashboard`: Can view production dashboard and historial

### Quality
- `quality_checklist`: Can create/edit quality checklists
- `quality_dashboard`: Can view quality dashboard and historial

### Logistic
- `logistic_checklist`: Can create/edit logistic checklists
- `logistic_dashboard`: Can view logistic dashboard and historial

### Maintenance
- `maintenance_ticket`: Can create maintenance tickets (solicitudes)
- `maintenance_gestion`: Can access gestión section
- `maintenance_tecnicos`: Can access técnicos section

### SAP (Solicitud Acciones Preventivas)
- `sap_ticket`: Can create SAP tickets
- `sap_gestion`: Can access SAP gestión
- `sap_encargados`: Can access SAP encargados

## How It Works

### Frontend Implementation

1. **Permissions Context**: The `PermissionsContext` fetches user permissions on login
2. **Permission Checks**: Each area page checks permissions before showing/hiding features
3. **Disabled State**: Cards/buttons are disabled (not clickable) if user lacks permission

### Behavior Examples

**Example 1: Esnirde Enriquez (Quality)**
- ✅ Can access Quality Checklist (can create/edit)
- ✅ Can access Quality Dashboard and historial
- ✅ Can create Maintenance tickets
- ❌ Cannot access Production or Logistic checklists
- ❌ Cannot access Production or Logistic dashboards
- ❌ Cannot access Maintenance gestión or técnicos

**Example 2: Asmiria Anselmi (Quality Manager)**
- ❌ Cannot create Quality Checklists (no `quality_checklist` permission)
- ✅ Can view Production Dashboard and historial
- ✅ Can view Quality Dashboard and historial
- ✅ Can view Logistic Dashboard and historial
- ✅ Can create Maintenance tickets
- ✅ Can access SAP tickets and gestión

**Example 3: Felix Hernandez (Production)**
- ✅ Can access Production Checklist
- ✅ Can access Production Dashboard and historial
- ✅ Can create Maintenance tickets
- ❌ Cannot access Quality or Logistic features

## Updating Permissions

To update a user's permissions:

```sql
UPDATE public.user_permissions
SET 
  production_checklist = TRUE,
  quality_checklist = FALSE,
  -- ... other permissions
WHERE email = 'user@example.com';
```

## Adding New Users

1. Create the user in Supabase Auth Dashboard
2. Insert their permissions:

```sql
INSERT INTO public.user_permissions (
  user_id,
  email,
  area,
  production_checklist,
  quality_checklist,
  -- ... set all permissions
) VALUES (
  get_user_id_by_email('newuser@example.com'),
  'newuser@example.com',
  'Area Name',
  TRUE,  -- or FALSE for each permission
  FALSE,
  -- ...
);
```

## Troubleshooting

### Users can't see their permissions
- Check that the user exists in `auth.users`
- Verify permissions exist in `user_permissions` table
- Check that RLS policies allow the user to read their permissions

### Permissions not updating
- Clear browser cache
- Check that the user is logged in with the correct email
- Verify the `user_permissions` table has the correct email (case-sensitive)

### Cards are disabled when they shouldn't be
- Check the permission values in the database
- Verify the permission check logic in the component
- Check browser console for errors

## Security Notes

- Permissions are checked on the frontend for UX (showing/hiding UI)
- **Important**: Always validate permissions on the backend/API level for security
- RLS policies ensure users can only read their own permissions
- Only service role can insert/update permissions (for admin operations)

## Next Steps

Consider implementing:
1. Backend API endpoints that validate permissions before allowing actions
2. Admin panel to manage user permissions through the UI
3. Permission groups/roles for easier management
4. Audit logging for permission changes

