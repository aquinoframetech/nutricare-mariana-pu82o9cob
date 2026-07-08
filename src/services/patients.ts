import pb from '@/lib/pocketbase/client'
import { Patient } from '@/lib/types'

export const getMyPatientProfile = async (): Promise<Patient | null> => {
  try {
    return (await pb
      .collection('patients')
      .getFirstListItem(`user_id = "${pb.authStore.record?.id}"`, {
        expand: 'user_id,nutritionist_id',
      })) as unknown as Patient
  } catch {
    return null
  }
}

export const getPatient = async (id: string): Promise<Patient> =>
  (await pb
    .collection('patients')
    .getOne(id, { expand: 'user_id,nutritionist_id' })) as unknown as Patient

export const getAllPatients = async (search?: string): Promise<Patient[]> => {
  const params: any = { expand: 'user_id,nutritionist_id', sort: '-created' }
  if (search) {
    params.filter = `user_id.name ~ "${search}"`
  }
  return (await pb.collection('patients').getFullList(params)) as unknown as Patient[]
}

export const createPatient = async (data: Partial<Patient>) =>
  await pb.collection('patients').create(data)

export const updatePatient = async (id: string, data: Partial<Patient>) =>
  await pb.collection('patients').update(id, data)
