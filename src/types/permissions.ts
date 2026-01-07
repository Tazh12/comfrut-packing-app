export interface UserPermissions {
  id: string
  user_id: string
  email: string
  area: string | null
  production_checklist: boolean
  production_dashboard: boolean
  quality_checklist: boolean
  quality_dashboard: boolean
  logistic_checklist: boolean
  logistic_dashboard: boolean
  maintenance_ticket: boolean
  maintenance_gestion: boolean
  maintenance_tecnicos: boolean
  sap_ticket: boolean
  sap_gestion: boolean
  sap_encargados: boolean
}

export interface PermissionsContextType {
  permissions: UserPermissions | null
  loading: boolean
  hasPermission: (permission: keyof UserPermissions) => boolean
  canAccessChecklist: (area: 'production' | 'quality' | 'logistic') => boolean
  canAccessDashboard: (area: 'production' | 'quality' | 'logistic') => boolean
  canAccessMaintenance: (type: 'ticket' | 'gestion' | 'tecnicos') => boolean
  canAccessSAP: (type: 'ticket' | 'gestion' | 'encargados') => boolean
}

