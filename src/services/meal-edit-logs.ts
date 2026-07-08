import pb from '@/lib/pocketbase/client'
import { MealEditLog } from '@/lib/types'

export const getMealEditLogs = async (): Promise<MealEditLog[]> =>
  (await pb.collection('meal_edit_logs').getFullList({
    expand: 'meal_id,editor_id',
    sort: '-created',
  })) as unknown as MealEditLog[]

export const getMealEditLogsByMeal = async (mealId: string): Promise<MealEditLog[]> =>
  (await pb.collection('meal_edit_logs').getFullList({
    filter: `meal_id = "${mealId}"`,
    expand: 'editor_id',
    sort: '-created',
  })) as unknown as MealEditLog[]
