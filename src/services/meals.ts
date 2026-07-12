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

export const getAllMeals = async (): Promise<Meal[]> =>
  (await pb.collection('meals').getFullList({
    sort: '-timestamp',
    expand: 'patient_id',
  })) as unknown as Meal[]

export const getMealDelta = (meal: Meal): number =>
  (meal.calories_corrected || 0) - (meal.calories || 0)

export const analyzeMealDescription = (description: string) =>
  pb.send('/backend/v1/analyze-meal', {
    method: 'POST',
    body: JSON.stringify({ description }),
    headers: { 'Content-Type': 'application/json' },
  })

export const submitMealAnalysis = async (
  file: File,
  name: string,
  clientRequestId: string,
): Promise<{ request_id: string; meal_id: string; job_id: string; status: string }> => {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('name', name)
  formData.append('client_request_id', clientRequestId)
  return await pb.send('/backend/v1/meals/analyze', {
    method: 'POST',
    body: formData,
  })
}

export const getMeal = async (id: string): Promise<Meal> =>
  (await pb.collection('meals').getOne(id)) as unknown as Meal

export const retryMealAnalysis = async (
  mealId: string,
): Promise<{ meal_id: string; status: string }> =>
  pb.send(`/backend/v1/meals/${mealId}/retry`, { method: 'POST' })

export type MealWithPhoto = Meal & { photoUrl: string }

export const getMealsWithPhotos = async (patientId: string): Promise<MealWithPhoto[]> => {
  const meals = await getMealsByPatient(patientId)
  const result: MealWithPhoto[] = []
  for (const meal of meals) {
    const photos = await getMealPhotos(meal.id)
    const photoUrl =
      photos.length > 0 ? getMealPhotoUrl(photos[0] as any, (photos[0] as any).image) : ''
    result.push({ ...meal, photoUrl })
  }
  return result
}
