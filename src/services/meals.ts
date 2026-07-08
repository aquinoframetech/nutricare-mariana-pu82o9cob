import pb from '@/lib/pocketbase/client'
import { Meal, MealPhoto } from '@/lib/types'

export const getMealsByPatient = async (patientId: string): Promise<Meal[]> =>
  (await pb.collection('meals').getFullList({
    filter: `patient_id = "${patientId}"`,
    sort: '-timestamp',
  })) as unknown as Meal[]

export const getTodayMeals = async (patientId: string): Promise<Meal[]> => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return (await pb.collection('meals').getFullList({
    filter: `patient_id = "${patientId}" && timestamp >= "${today.toISOString()}"`,
    sort: '-timestamp',
  })) as unknown as Meal[]
}

export const getMealsPaginated = async (
  patientId: string,
  page: number,
  perPage: number,
  startDate?: string,
  endDate?: string,
) => {
  let filter = `patient_id = "${patientId}"`
  if (startDate) filter += ` && timestamp >= "${startDate}"`
  if (endDate) filter += ` && timestamp <= "${endDate}"`
  return await pb.collection('meals').getList(page, perPage, { filter, sort: '-timestamp' })
}

export const createMeal = async (data: any) => await pb.collection('meals').create(data)

export const updateMeal = async (id: string, data: any) =>
  await pb.collection('meals').update(id, data)

export const deleteMeal = async (id: string) => await pb.collection('meals').delete(id)

export const createMealPhoto = async (mealId: string, file: File) => {
  const formData = new FormData()
  formData.append('meal_id', mealId)
  formData.append('image', file)
  return await pb.collection('meal_photos').create(formData)
}

export const getMealPhotos = async (mealId: string): Promise<MealPhoto[]> =>
  (await pb
    .collection('meal_photos')
    .getFullList({ filter: `meal_id = "${mealId}"` })) as unknown as MealPhoto[]

export const getMealPhotoUrl = (record: any, filename: string) => pb.files.getUrl(record, filename)

export const analyzeMealDescription = (description: string) =>
  pb.send('/backend/v1/analyze-meal', {
    method: 'POST',
    body: JSON.stringify({ description }),
    headers: { 'Content-Type': 'application/json' },
  })
