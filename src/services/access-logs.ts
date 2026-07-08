import pb from '@/lib/pocketbase/client'
import { AccessLog } from '@/lib/types'

export const createAccessLog = (patientId: string, action: string = 'view_profile') =>
  pb.send('/backend/v1/access-logs', {
    method: 'POST',
    body: JSON.stringify({ patient_id: patientId, action }),
    headers: { 'Content-Type': 'application/json' },
  })

export const getAccessLogs = async (): Promise<AccessLog[]> =>
  (await pb.collection('access_logs').getFullList({
    expand: 'user_id,target_patient_id',
    sort: '-created',
  })) as unknown as AccessLog[]

export const getAccessLogsByPatient = async (patientId: string): Promise<AccessLog[]> =>
  (await pb.collection('access_logs').getFullList({
    filter: `target_patient_id = "${patientId}"`,
    expand: 'user_id',
    sort: '-created',
  })) as unknown as AccessLog[]
