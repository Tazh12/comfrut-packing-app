'use client'

import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface SheetCloseButtonProps {
  onClose: () => void
}

interface SheetContentProps {
  side?: 'left' | 'right' | 'top' | 'bottom'
  className?: string
  children: React.ReactNode
}

interface SheetHeaderProps {
  children: React.ReactNode
}

interface SheetTitleProps {
  children: React.ReactNode
}

interface SheetFooterProps {
  className?: string
  children: React.ReactNode
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex"
      onClick={() => onOpenChange(false)}
    >
      <div className="fixed inset-0 bg-black/50" />
      {children}
    </div>
  )
}

export function SheetContent({ side = 'right', className = '', children }: SheetContentProps) {
  const sideClasses = {
    right: 'right-0 top-0 h-full',
    left: 'left-0 top-0 h-full',
    top: 'top-0 left-0 w-full',
    bottom: 'bottom-0 left-0 w-full'
  }

  return (
    <div
      className={`fixed ${sideClasses[side]} z-50 w-full sm:w-[420px] shadow-lg flex flex-col`}
      style={{
        backgroundColor: 'var(--card-bg)',
        borderLeft: side === 'right' ? '1px solid var(--card-border)' : 'none',
        borderRight: side === 'left' ? '1px solid var(--card-border)' : 'none',
        borderTop: side === 'bottom' ? '1px solid var(--card-border)' : 'none',
        borderBottom: side === 'top' ? '1px solid var(--card-border)' : 'none',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`flex-1 overflow-y-auto p-6 ${className}`}>
        {children}
      </div>
    </div>
  )
}

export function SheetHeader({ children }: SheetHeaderProps) {
  return (
    <div className="mb-6 relative">
      {children}
    </div>
  )
}

export function SheetCloseButton({ onClose }: SheetCloseButtonProps) {
  return (
    <button
      onClick={onClose}
      className="absolute top-0 right-0 p-1 rounded-md hover:bg-opacity-10 transition-colors"
      style={{ color: 'var(--muted-text)' }}
      aria-label="Cerrar"
    >
      <X className="h-5 w-5" />
    </button>
  )
}

export function SheetTitle({ children }: SheetTitleProps) {
  return (
    <h2 className="text-xl font-semibold" style={{ color: 'var(--title-text)' }}>
      {children}
    </h2>
  )
}

export function SheetFooter({ className = '', children }: SheetFooterProps) {
  return (
    <div className={`flex justify-end gap-3 pt-4 border-t ${className}`} style={{ borderColor: 'var(--card-border)' }}>
      {children}
    </div>
  )
}

