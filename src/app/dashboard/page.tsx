'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { 
  Package, 
  Truck, 
  FileText, 
  Settings, 
  LogOut,
  User,
  ChevronDown
} from 'lucide-react'
import { ChecklistStatusBadge } from '@/components/ChecklistStatusBadge'

const areas = [
  {
    name: 'Producción',
    description: 'Registra controles de producción y empaque',
    icon: Package,
    path: '/area/produccion',
    areaKey: 'produccion'
  },
  {
    name: 'Logística',
    description: 'Controla ingresos y salidas de producto',
    icon: Truck,
    path: '/area/logistica',
    areaKey: 'logistica'
  },
  {
    name: 'Calidad',
    description: 'Gestión de checklists e indicadores de calidad',
    icon: FileText,
    path: '/area/calidad',
    areaKey: 'calidad'
  },
  {
    name: 'Mantención',
    description: 'Ordenes de trabajo y mantenimientos programados',
    icon: Settings,
    path: '/area/mantencion',
    areaKey: 'mantencion'
  },
  {
    name: 'Historial Global',
    description: 'Consulta registros históricos por área',
    icon: FileText,
    path: '/area/historial',
    areaKey: 'historial'
  }
]

export default function DashboardPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [email, setEmail] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error checking session:', error)
          showToast('Error al verificar la sesión', 'error')
          return
        }

        if (!session) {
          return router.replace('/login')
        }

        setEmail(session.user.email || '')
      } catch (error) {
        console.error('Unexpected error:', error)
        showToast('Error inesperado al verificar la sesión', 'error')
      } finally {
        setIsLoading(false)
      }
    })()
  }, [router, showToast])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) {
      return 'Buenos días'
    } else if (hour >= 12 && hour < 20) {
      return 'Buenas tardes'
    } else {
      return 'Buenas noches'
    }
  }

  // Extract first name from email
  const getUserFirstName = () => {
    if (!email) return ''
    const namePart = email.split('@')[0]
    const firstName = namePart.split('.')[0]
    return firstName.charAt(0).toUpperCase() + firstName.slice(1)
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
        showToast('Error al cerrar sesión', 'error')
        return
      }
      router.replace('/login')
    } catch (error) {
      console.error('Unexpected error during sign out:', error)
      showToast('Error inesperado al cerrar sesión', 'error')
    }
  }

  const handleProfileClick = () => {
    setIsDropdownOpen(false)
    // TODO: Navigate to profile page when implemented
    showToast('Perfil - Próximamente', 'info')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1D6FE3] mx-auto"></div>
          <p className="mt-4 text-[#6B7280]">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-[#003C71]">Comfrut Packing Control app</h1>
              <p className="mt-1 text-sm text-[#6B7280]">
                {getGreeting()}, {getUserFirstName()}. ¿Qué área te gustaría ver hoy?
              </p>
            </div>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#BFDBFE] rounded-full"
              >
                <div className="w-10 h-10 rounded-full bg-[#003C71] flex items-center justify-center shadow-md hover:shadow-lg transition-shadow">
                  <span className="text-[#FFFFFF] text-sm font-semibold">
                    {getUserFirstName().charAt(0)}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 text-[#111827] transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#FFFFFF] rounded-md shadow-lg py-1 z-50 border border-[#E2E8F0]">
                  <button
                    onClick={handleProfileClick}
                    className="w-full text-left px-4 py-2 text-sm text-[#111827] hover:bg-[#F5F7FB] flex items-center"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Perfil
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-[#111827] hover:bg-[#F5F7FB] flex items-center"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <p className="text-lg text-[#6B7280] font-medium">
              Selecciona un área para comenzar 👇
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => {
  const Icon = area.icon
  return (
    <button
      key={area.name}
      onClick={() => router.push(area.path)}
      className="relative group bg-[#FFFFFF] border border-[#E2E8F0] p-6 rounded-lg shadow-sm hover:shadow-[0_8px_18px_rgba(15,23,42,0.08)] hover:border-[#BFDBFE] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE] transition-all duration-200 text-left cursor-pointer transform hover:scale-[1.01]"
    >
      {area.areaKey !== 'historial' && area.areaKey !== 'logistica' && (
        <ChecklistStatusBadge area={area.areaKey} />
      )}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Icon className="h-6 w-6 text-[#1D6FE3]" />
            <h3 className="ml-3 text-lg font-medium text-[#111827]">
              {area.name}
            </h3>
          </div>
          <div className="text-[#1D6FE3] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            →
          </div>
        </div>
        <p className="mt-2 text-sm text-[#6B7280]">
          {area.description}
        </p>
      </div>
    </button>
            )})}
          </div>
        </div>
      </div>
    </div>
  )
} 