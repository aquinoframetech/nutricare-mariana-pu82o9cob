import pb from '@/lib/pocketbase/client'
import { Report } from '@/lib/types'

export const getReportsByPatient = async (patientId: string): Promise<Report[]> =>
  (await pb
    .collection('reports')
    .getFullList({
      filter: `patient_id = "${patientId}"`,
      sort: '-created',
    })) as unknown as Report[]

export const generateReport = (patientId: string, period: string) =>
  pb.send('/backend/v1/generate-report', {
    method: 'POST',
    body: JSON.stringify({ patient_id: patientId, period }),
    headers: { 'Content-Type': 'application/json' },
  })
