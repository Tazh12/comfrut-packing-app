export interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void
  toast: {
    message: string
    type: 'success' | 'error' | 'info'
    visible: boolean
    duration: number
  }
} 