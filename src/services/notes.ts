import pb from '@/lib/pocketbase/client'
import { ProfessionalNote } from '@/lib/types'

export const getNotesByPatient = async (patientId: string): Promise<ProfessionalNote[]> =>
  (await pb.collection('professional_notes').getFullList({
    filter: `patient_id = "${patientId}"`,
    expand: 'nutritionist_id',
    sort: '-created',
  })) as unknown as ProfessionalNote[]

export const createNote = async (data: {
  patient_id: string
  nutritionist_id: string
  note: string
}) => await pb.collection('professional_notes').create(data)
