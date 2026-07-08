import pb from '@/lib/pocketbase/client'
import { CalorieLog } from '@/lib/types'

export const getCalorieLogs = async (
  patientId: string,
  startDate?: string,
  endDate?: string,
): Promise<CalorieLog[]> => {
  let filter = `patient_id = "${patientId}"`
  if (startDate) filter += ` && date >= "${startDate}"`
  if (endDate) filter += ` && date <= "${endDate}"`
  return (await pb
    .collection('calorie_logs')
    .getFullList({ filter, sort: 'date' })) as unknown as CalorieLog[]
}

export const getTodayCalorieLog = async (patientId: string): Promise<CalorieLog | null> => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  try {
    return (await pb
      .collection('calorie_logs')
      .getFirstListItem(
        `patient_id = "${patientId}" && date >= "${start.toISOString()}" && date <= "${end.toISOString()}"`,
      )) as unknown as CalorieLog
  } catch {
    return null
  }
}
