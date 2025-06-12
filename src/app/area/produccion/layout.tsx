'use client'

import { ChecklistProvider } from '@/context/ChecklistContext'

export default function ProduccionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ChecklistProvider>
      {children}
    </ChecklistProvider>
  )
} 