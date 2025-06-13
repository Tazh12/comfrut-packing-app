import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createStorageBucket() {
  try {
    const { error } = await supabase
      .storage
      .createBucket('checklist-photos', {
        public: false,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
      })

    if (error) {
      throw error
    }

    console.log('Storage bucket created successfully')
  } catch (error) {
    console.error('Error creating storage bucket:', error)
    throw error
  }
}

createStorageBucket() 