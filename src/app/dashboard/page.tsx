'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { 
  Package, 
  Truck, 
  FileText, 
  Settings, 
  LogOut,
  User,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
  Palette
} from 'lucide-react'
import { ChecklistStatusBadge } from '@/components/ChecklistStatusBadge'
import { useTheme } from '@/context/ThemeContext'
import { ProfileSheet } from '@/components/ProfileSheet'
import { createClient } from '@/lib/supabase-config'

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
  const { theme, setTheme } = useTheme()
  const { user, loading: authLoading } = useAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isThemeSubmenuOpen, setIsThemeSubmenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Redirect to login if not authenticated (middleware should handle this, but this is a safety check)
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  // Get email from user
  const email = user?.email || ''

  // Fetch display name from profiles
  useEffect(() => {
    if (!user?.id) return

    const fetchDisplayName = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()
      
      setDisplayName(data?.full_name || null)
    }

    fetchDisplayName()
  }, [user?.id])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
        setIsThemeSubmenuOpen(false)
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

  // Get display name: profiles.full_name ?? fallback(email)
  const getUserDisplayName = () => {
    if (displayName) return displayName
    if (!email) return ''
    const namePart = email.split('@')[0]
    const firstName = namePart.split('.')[0]
    return firstName.charAt(0).toUpperCase() + firstName.slice(1)
  }

  // Get first name for avatar initial
  const getUserFirstName = () => {
    const name = getUserDisplayName()
    return name.charAt(0).toUpperCase()
  }

  const handleSignOut = async () => {
    setIsDropdownOpen(false)
    
    try {
      // Create a fresh client instance for logout
      const supabase = createClientComponentClient()
      
      // First, call server-side logout route to properly handle cookies
      // This must happen first to clear server-side session
      try {
        const response = await fetch('/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })
        
        // Wait for response to ensure cookies are cleared
        if (!response.ok) {
          console.warn('Server logout response not OK:', response.status)
        }
      } catch (fetchError) {
        console.warn('Server logout request failed:', fetchError)
      }
      
      // Then sign out client-side
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' })
      
      if (signOutError) {
        console.warn('Sign out error:', signOutError.message)
      }
      
      // Clear any local storage items that might be related to auth
      try {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
            localStorage.removeItem(key)
          }
        })
      } catch (e) {
        // Ignore localStorage errors
      }
      
      // Clear session storage
      try {
        sessionStorage.clear()
      } catch (e) {
        // Ignore sessionStorage errors
      }
      
      // Redirect with logout flag to prevent middleware redirect loop
      // The flag tells middleware to allow access to login page even if cookies aren't fully cleared yet
      window.location.href = '/login?logout=true'
    } catch (error) {
      console.error('Unexpected error during sign out:', error)
      // Still redirect even on error with logout flag
      window.location.href = '/login?logout=true'
    }
  }

  const handleProfileClick = () => {
    setIsDropdownOpen(false)
    setProfileOpen(true)
  }

  const handleProfileClose = (open: boolean) => {
    setProfileOpen(open)
    // Refresh display name after profile sheet closes (in case it was updated)
    if (!open && user?.id) {
      const supabase = createClient()
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          setDisplayName(data?.full_name || null)
        })
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--page-bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: 'var(--primary-bg)' }}></div>
          <p className="mt-4" style={{ color: 'var(--muted-text)' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: 'var(--app-title)' }}>Comfrut Packing Control app</h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--muted-text)' }}>
                {getGreeting()}, {getUserDisplayName()}. ¿Qué área te gustaría ver hoy?
              </p>
            </div>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-full"
                style={{ '--tw-ring-color': 'var(--card-hover-border)' } as React.CSSProperties}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow" style={{ backgroundColor: 'var(--avatar-bg)' }}>
                  <span className="text-sm font-semibold" style={{ color: 'var(--primary-text)' }}>
                    {getUserFirstName()}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`} style={{ color: 'var(--chevron-color)' }} />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-50 border" style={{ backgroundColor: 'var(--dropdown-bg)', borderColor: 'var(--dropdown-border)' }}>
                  <button
                    onClick={handleProfileClick}
                    className="w-full text-left px-4 py-2 text-sm flex items-center transition-colors"
                    style={{ color: 'var(--dropdown-text)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--dropdown-hover)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Perfil
                  </button>
                  
                  {/* Theme Menu Item */}
                  <div className="relative">
                    <button
                      onClick={() => setIsThemeSubmenuOpen(!isThemeSubmenuOpen)}
                      className="w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors"
                      style={{ color: 'var(--dropdown-text)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--dropdown-hover)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                      <div className="flex items-center">
                        <Palette className="h-4 w-4 mr-2" />
                        Tema
                      </div>
                      <ChevronDown className={`h-3 w-3 transition-transform ${isThemeSubmenuOpen ? 'transform rotate-180' : ''}`} />
                    </button>
                    
                    {isThemeSubmenuOpen && (
                      <div className="ml-4 mt-1 border-l-2 pl-2" style={{ borderColor: 'var(--dropdown-border)' }}>
                        <button
                          onClick={() => {
                            setTheme('light')
                            setIsThemeSubmenuOpen(false)
                          }}
                          className="w-full text-left px-4 py-2 text-sm flex items-center transition-colors"
                          style={{ 
                            color: theme === 'light' ? 'var(--dropdown-active)' : 'var(--dropdown-text)',
                            fontWeight: theme === 'light' ? '500' : '400'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--dropdown-hover)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                          <Sun className="h-4 w-4 mr-2" />
                          Claro
                        </button>
                        <button
                          onClick={() => {
                            setTheme('dark')
                            setIsThemeSubmenuOpen(false)
                          }}
                          className="w-full text-left px-4 py-2 text-sm flex items-center transition-colors"
                          style={{ 
                            color: theme === 'dark' ? 'var(--dropdown-active)' : 'var(--dropdown-text)',
                            fontWeight: theme === 'dark' ? '500' : '400'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--dropdown-hover)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                          <Moon className="h-4 w-4 mr-2" />
                          Oscuro
                        </button>
                        <button
                          onClick={() => {
                            setTheme('system')
                            setIsThemeSubmenuOpen(false)
                          }}
                          className="w-full text-left px-4 py-2 text-sm flex items-center transition-colors"
                          style={{ 
                            color: theme === 'system' ? 'var(--dropdown-active)' : 'var(--dropdown-text)',
                            fontWeight: theme === 'system' ? '500' : '400'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--dropdown-hover)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                          <Monitor className="h-4 w-4 mr-2" />
                          Sistema
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t my-1" style={{ borderColor: 'var(--dropdown-border)' }}></div>
                  
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm flex items-center transition-colors"
                    style={{ color: 'var(--dropdown-text)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--dropdown-hover)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <p className="text-lg font-medium" style={{ color: 'var(--muted-text)' }}>
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
      className="relative group p-6 rounded-lg shadow-sm transition-all duration-200 text-left cursor-pointer transform hover:scale-[1.01] focus:outline-none focus:ring-2"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        boxShadow: '0 1px 2px var(--card-shadow)',
        '--tw-ring-color': 'var(--card-hover-border)'
      } as React.CSSProperties}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 18px var(--card-shadow-hover)'
        e.currentTarget.style.borderColor = 'var(--card-hover-border)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 2px var(--card-shadow)'
        e.currentTarget.style.borderColor = 'var(--card-border)'
      }}
    >
      {area.areaKey !== 'historial' && area.areaKey !== 'logistica' && (
        <ChecklistStatusBadge area={area.areaKey} />
      )}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Icon className="h-6 w-6" style={{ color: 'var(--icon-primary)' }} />
            <h3 className="ml-3 text-lg font-medium" style={{ color: 'var(--title-text)' }}>
              {area.name}
            </h3>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ color: 'var(--icon-primary)' }}>
            →
          </div>
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted-text)' }}>
          {area.description}
        </p>
      </div>
    </button>
            )})}
          </div>
        </div>
      </div>
      <ProfileSheet open={profileOpen} onOpenChange={handleProfileClose} />
    </div>
  )
} 