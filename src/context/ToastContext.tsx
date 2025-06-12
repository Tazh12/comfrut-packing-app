'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  message: string
  type: ToastType
  id: string
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void
  hideToast: (id: string) => void
  toasts: Toast[]
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    // Verificar si hay un toast pendiente en localStorage
    const pendingToast = localStorage.getItem('pendingToast')
    if (pendingToast) {
      const { message, type } = JSON.parse(pendingToast)
      showToast(message, type as ToastType)
      localStorage.removeItem('pendingToast')
    }
  }, [])

  const showToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { message, type, id }])

    // Eliminar el toast después de 3 segundos
    setTimeout(() => {
      hideToast(id)
    }, 3000)
  }

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast, hideToast, toasts }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out
              ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' :
                toast.type === 'error' ? 'bg-red-50 text-red-800 border border-red-100' :
                'bg-blue-50 text-blue-800 border border-blue-100'
              }`}
          >
            <div className="flex items-center">
              {toast.type === 'success' && (
                <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
              )}
              <p className="font-medium">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
} 