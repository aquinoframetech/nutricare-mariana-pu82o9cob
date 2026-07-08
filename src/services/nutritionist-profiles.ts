import pb from '@/lib/pocketbase/client'
import { NutritionistProfile } from '@/lib/types'

export const getAllNutritionistProfiles = async (): Promise<NutritionistProfile[]> =>
  (await pb.collection('nutritionist_profiles').getFullList({
    expand: 'user_id',
    sort: '-created',
  })) as unknown as NutritionistProfile[]

export const createNutritionistProfile = async (data: {
  user_id: string
  bio: string
  specialty: string
}) => await pb.collection('nutritionist_profiles').create(data)
