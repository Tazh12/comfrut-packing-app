'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { UserPermissions, PermissionsContextType } from '@/types/permissions'
import { useAuth } from './AuthContext'

const PermissionsContext = createContext<PermissionsContextType | null>(null)

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.email) {
      setPermissions(null)
      setLoading(false)
      return
    }

    const fetchPermissions = async () => {
      try {
        const supabase = createClientComponentClient()
        const { data, error } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('email', user.email)
          .maybeSingle()

        if (error) {
          console.error('Error fetching permissions:', error)
          setPermissions(null)
        } else {
          setPermissions(data)
        }
      } catch (error) {
        console.error('Error fetching permissions:', error)
        setPermissions(null)
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [user?.email])

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    if (!permissions) return false
    // Skip non-permission fields
    if (['id', 'user_id', 'email', 'area', 'created_at', 'updated_at'].includes(permission)) {
      return false
    }
    return Boolean(permissions[permission])
  }

  const canAccessChecklist = (area: 'production' | 'quality' | 'logistic'): boolean => {
    if (!permissions) return false
    switch (area) {
      case 'production':
        return permissions.production_checklist
      case 'quality':
        return permissions.quality_checklist
      case 'logistic':
        return permissions.logistic_checklist
      default:
        return false
    }
  }

  const canAccessDashboard = (area: 'production' | 'quality' | 'logistic'): boolean => {
    if (!permissions) return false
    switch (area) {
      case 'production':
        return permissions.production_dashboard
      case 'quality':
        return permissions.quality_dashboard
      case 'logistic':
        return permissions.logistic_dashboard
      default:
        return false
    }
  }

  const canAccessMaintenance = (type: 'ticket' | 'gestion' | 'tecnicos'): boolean => {
    if (!permissions) return false
    switch (type) {
      case 'ticket':
        return permissions.maintenance_ticket
      case 'gestion':
        return permissions.maintenance_gestion
      case 'tecnicos':
        return permissions.maintenance_tecnicos
      default:
        return false
    }
  }

  const canAccessSAP = (type: 'ticket' | 'gestion' | 'encargados'): boolean => {
    if (!permissions) return false
    switch (type) {
      case 'ticket':
        return permissions.sap_ticket
      case 'gestion':
        return permissions.sap_gestion
      case 'encargados':
        return permissions.sap_encargados
      default:
        return false
    }
  }

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        loading,
        hasPermission,
        canAccessChecklist,
        canAccessDashboard,
        canAccessMaintenance,
        canAccessSAP,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  const context = useContext(PermissionsContext)
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider')
  }
  return context
}

