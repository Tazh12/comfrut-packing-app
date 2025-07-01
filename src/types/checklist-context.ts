import { ChecklistRegistro } from './checklist'

export interface ChecklistContextType {
  records: ChecklistRegistro[]
  loading: boolean
  error: string | null
  loadRecords: () => Promise<void>
  saveRecord: (record: ChecklistRegistro) => Promise<void>
} 