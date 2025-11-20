'use client'

import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()
  
  // Hide footer on login page (it has its own footer)
  if (pathname === '/login') {
    return null
  }

  return (
    <footer className="w-full py-4 px-4 mt-auto" style={{ backgroundColor: 'var(--page-bg)' }}>
      <div className="max-w-7xl mx-auto text-center">
        <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
          FACENIC inc
        </p>
      </div>
    </footer>
  )
}

