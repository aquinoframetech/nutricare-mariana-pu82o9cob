import pb from '@/lib/pocketbase/client'
import { Patient } from '@/lib/types'

export const getMyPatientProfile = async (): Promise<Patient> => {
  const userId = pb.authStore.record?.id
  if (!userId) throw new Error('Not authenticated')
  return (await pb
    .collection('patients')
    .getFirstListItem(`user_id = "${userId}"`)) as unknown as Patient
}

export const getPatient = async (id: string): Promise<Patient> =>
  (await pb.collection('patients').getOne(id, {
    expand: 'user_id,nutritionist_id',
  })) as unknown as Patient

export const getAllPatients = async (): Promise<Patient[]> =>
  (await pb.collection('patients').getFullList({
    filter: `nutritionist_id = "${pb.authStore.record?.id}"`,
    expand: 'user_id',
    sort: '-created',
  })) as unknown as Patient[]

export const createPatient = async (data: any) => await pb.collection('patients').create(data)

export const updatePatient = async (id: string, data: any) =>
  await pb.collection('patients').update(id, data)
