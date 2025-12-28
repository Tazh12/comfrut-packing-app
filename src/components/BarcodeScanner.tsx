'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BarcodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (result: string) => void
  title?: string
}

export function BarcodeScanner({ isOpen, onClose, onScan, title = 'Escanear Código' }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerId = 'barcode-scanner-reader'

  useEffect(() => {
    if (!isOpen) {
      // Clean up when modal closes
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current.clear()
        scannerRef.current = null
      }
      setIsScanning(false)
      setError(null)
      return
    }

    // Start scanner when modal opens
    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerId)
        scannerRef.current = html5QrCode

        // Configure scanner for both QR codes and barcodes
        // The library supports multiple formats by default (QR, CODE_128, CODE_39, EAN_13, EAN_8, UPC_A, UPC_E, etc.)
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        }

        await html5QrCode.start(
          { facingMode: 'environment' }, // Use back camera on mobile
          config,
          (decodedText) => {
            // Success callback
            onScan(decodedText)
            stopScanner()
            onClose()
          },
          (errorMessage) => {
            // Error callback - ignore if it's just "not found" errors
            if (!errorMessage.includes('No QR code found') && !errorMessage.includes('NotFoundException')) {
              // Only show meaningful errors
              if (errorMessage.includes('Permission') || errorMessage.includes('NotAllowedError')) {
                setError('Permiso de cámara denegado. Por favor, permite el acceso a la cámara.')
              } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('DevicesNotFoundError')) {
                setError('No se encontró ninguna cámara disponible.')
              } else {
                // Don't show every scanning attempt error
                setError(null)
              }
            }
          }
        )

        setIsScanning(true)
        setError(null)
      } catch (err: any) {
        console.error('Error starting scanner:', err)
        if (err.message?.includes('Permission') || err.name === 'NotAllowedError') {
          setError('Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración del navegador.')
        } else if (err.message?.includes('NotFound') || err.name === 'NotFoundError') {
          setError('No se encontró ninguna cámara disponible.')
        } else {
          setError(err.message || 'Error al iniciar la cámara. Asegúrate de que el navegador tenga permiso para acceder a la cámara.')
        }
        setIsScanning(false)
      }
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      startScanner()
    }, 100)

    return () => {
      clearTimeout(timer)
      // Cleanup on unmount
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current.clear()
        scannerRef.current = null
      }
    }
  }, [isOpen, onScan, onClose, scannerId])

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
        setIsScanning(false)
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
    }
  }

  const handleClose = () => {
    stopScanner()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scanner */}
        <div className="p-4">
          <div id={scannerId} className="w-full rounded-lg overflow-hidden bg-black min-h-[300px]" />
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!isScanning && !error && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-600">Iniciando cámara...</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-4 bg-gray-50 border-t">
          <p className="text-sm text-gray-600 text-center">
            Apunta la cámara hacia el código de barras o QR
          </p>
          <p className="text-xs text-gray-500 text-center mt-1">
            El código se escaneará automáticamente
          </p>
        </div>
      </div>
    </div>
  )
}

