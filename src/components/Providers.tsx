'use client'

import { PropsWithChildren } from 'react'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { supabase } from '@/lib/supabase'

export default function Providers({ children }: PropsWithChildren) {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      {children}
    </SessionContextProvider>
  )
} 