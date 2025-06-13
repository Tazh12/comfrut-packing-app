import { ChecklistRecord } from './checklist'

export interface ChecklistContextType {
  records: ChecklistRecord[]
  loading: boolean
  error: string | null
  loadRecords: () => Promise<void>
  saveRecord: (record: ChecklistRecord) => Promise<void>
} 