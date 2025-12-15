// Date utility functions to avoid timezone conversion issues
// These functions parse date strings directly without timezone conversion

const MONTH_NAMES_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const MONTH_NAMES_FULL = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']

/**
 * Format date as MMM-DD-YYYY (e.g., "DEC-15-2025")
 * Parses date string directly without timezone conversion
 */
export const formatDateMMMDDYYYY = (dateStr: string): string => {
  if (!dateStr) return ''
  try {
    // Expected format: YYYY-MM-DD
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const [year, month, day] = parts
      const monthIndex = parseInt(month) - 1
      if (monthIndex >= 0 && monthIndex < 12) {
        const monthName = MONTH_NAMES_SHORT[monthIndex]
        return `${monthName}-${day.padStart(2, '0')}-${year}`
      }
    }
    return dateStr
  } catch {
    return dateStr
  }
}

/**
 * Format date for filename: YYYY-MMM-DD or YYYY-MMMM-DD
 * Parses date string directly without timezone conversion
 */
export const formatDateForFilename = (dateStr: string, useFullMonth: boolean = false): string => {
  if (!dateStr) return ''
  try {
    // Expected format: YYYY-MM-DD
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const [year, month, day] = parts
      const monthIndex = parseInt(month) - 1
      if (monthIndex >= 0 && monthIndex < 12) {
        const monthName = useFullMonth 
          ? MONTH_NAMES_FULL[monthIndex]
          : MONTH_NAMES_SHORT[monthIndex]
        return `${year}-${monthName}-${day.padStart(2, '0')}`
      }
    }
    return dateStr
  } catch {
    return dateStr
  }
}

