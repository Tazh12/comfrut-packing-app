'use client'

import { AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useIncompleteChecklistsForArea } from '@/lib/hooks/useIncompleteChecklists'

interface ChecklistStatusBadgeProps {
  area: string
  className?: string
}

export function ChecklistStatusBadge({ area, className = '' }: ChecklistStatusBadgeProps) {
  const incompleteChecklists = useIncompleteChecklistsForArea(area)

  if (incompleteChecklists.length === 0) {
    return null
  }

  return (
    <div className={`absolute top-2 right-2 ${className}`}>
      <Link
        href={incompleteChecklists[0].path}
        className="group relative inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors shadow-sm"
        title={`${incompleteChecklists.length} checklist(s) incompleto(s). Click para continuar.`}
      >
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <span className="text-xs font-medium text-amber-800">
          {incompleteChecklists.length} pendiente{incompleteChecklists.length > 1 ? 's' : ''}
        </span>
        {incompleteChecklists.length > 1 && (
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50">
            <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 shadow-lg min-w-[200px]">
              <div className="font-semibold mb-1">Checklists incompletos:</div>
              {incompleteChecklists.map((checklist) => (
                <div key={checklist.id} className="py-1 border-t border-gray-700 first:border-t-0">
                  {checklist.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </Link>
    </div>
  )
}

