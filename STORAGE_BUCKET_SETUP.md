# Storage Bucket Setup for Staff Good Practices Control

## Problem
The storage bucket `checklist-staff-practices` doesn't exist, causing "Bucket not found" errors when trying to view PDFs.

## Solution: Create the Storage Bucket

### Method 1: Using Supabase Dashboard (Recommended - Easiest)

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"** button
4. Fill in the bucket details:
   - **Name**: `checklist-staff-practices`
   - **Public bucket**: ✅ **Check this** (set to Public)
   - **File size limit**: `10` MB
   - **Allowed MIME types**: `application/pdf`
5. Click **"Create bucket"**

### Method 2: Using SQL Editor

1. Go to Supabase Dashboard > **SQL Editor**
2. Run this SQL command:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'checklist-staff-practices',
    'checklist-staff-practices',
    true, -- Must be true (public) for getPublicUrl() to work
    10485760, -- 10MB in bytes
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf'];
```

**Note**: If you get a permission error, you may need to use the service_role key or create it via the Dashboard.

### Method 3: Using Supabase API (For automation)

If you have the service role key, you can create it programmatically:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const { data, error } = await supabase.storage.createBucket('checklist-staff-practices', {
  public: true,
  fileSizeLimit: 10485760, // 10MB
  allowedMimeTypes: ['application/pdf']
})
```

## Verify the Bucket Was Created

1. Go to Supabase Dashboard > **Storage**
2. You should see `checklist-staff-practices` in the list of buckets
3. Make sure it shows as **Public** ✅

## Important Notes

- The bucket **must be public** (`public: true`) because the code uses `getPublicUrl()` which only works with public buckets
- If you need private buckets, you would need to change the code to use `createSignedUrl()` instead
- After creating the bucket, existing PDFs should be accessible immediately
- New PDFs will be uploaded correctly once the bucket exists










