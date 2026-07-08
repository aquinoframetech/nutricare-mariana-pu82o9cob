import pb from '@/lib/pocketbase/client'
import { Alert } from '@/lib/types'

export const getAlertsByPatient = async (patientId: string): Promise<Alert[]> =>
  (await pb
    .collection('alerts')
    .getFullList({ filter: `patient_id = "${patientId}"`, sort: '-created' })) as unknown as Alert[]

export const getAllAlerts = async (): Promise<Alert[]> =>
  (await pb
    .collection('alerts')
    .getFullList({ expand: 'patient_id', sort: '-created' })) as unknown as Alert[]

export const markAlertRead = async (id: string) =>
  await pb.collection('alerts').update(id, { is_read: true })
