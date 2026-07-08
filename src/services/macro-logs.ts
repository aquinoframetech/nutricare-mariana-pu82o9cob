import pb from '@/lib/pocketbase/client'
import { MacroLog } from '@/lib/types'

export const getMacroLogs = async (
  patientId: string,
  startDate?: string,
  endDate?: string,
): Promise<MacroLog[]> => {
  let filter = `patient_id = "${patientId}"`
  if (startDate) filter += ` && date >= "${startDate}"`
  if (endDate) filter += ` && date <= "${endDate}"`
  return (await pb
    .collection('macro_logs')
    .getFullList({ filter, sort: 'date' })) as unknown as MacroLog[]
}

export const getTodayMacroLog = async (patientId: string): Promise<MacroLog | null> => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  try {
    return (await pb
      .collection('macro_logs')
      .getFirstListItem(
        `patient_id = "${patientId}" && date >= "${start.toISOString()}" && date <= "${end.toISOString()}"`,
      )) as unknown as MacroLog
  } catch {
    return null
  }
}
