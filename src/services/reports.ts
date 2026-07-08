import pb from '@/lib/pocketbase/client'

export interface GenerateReportResult {
  summary: string
  id: string
}

export const generateReport = (patientId: string, period: string): Promise<GenerateReportResult> =>
  pb.send('/backend/v1/generate-report', {
    method: 'POST',
    body: JSON.stringify({ patient_id: patientId, period }),
    headers: { 'Content-Type': 'application/json' },
  })
