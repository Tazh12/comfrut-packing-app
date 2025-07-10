'use client'

import { useToast } from '@/context/ToastContext'
import { CheckCircle, XCircle, Info } from 'lucide-react'

export default function ToastUI() {
  const { toast } = useToast()

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center space-x-2 p-4 rounded shadow-lg transition-opacity duration-300 ${
        toast.visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      } ${
        toast.type === 'success'
          ? 'bg-green-500 text-white'
          : toast.type === 'error'
          ? 'bg-red-500 text-white'
          : 'bg-blue-500 text-white'
      }`}
    >
      {toast.type === 'success' && <CheckCircle className="w-6 h-6" />}
      {toast.type === 'error' && <XCircle className="w-6 h-6" />}
      {toast.type === 'info' && <Info className="w-6 h-6" />}
      <span>{toast.message}</span>
    </div>
  )
} 