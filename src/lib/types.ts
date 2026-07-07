export type Role = 'patient' | 'nutri'

export interface User {
  id: string
  name: string
  role: Role
  avatar: string
  email: string
}

export interface PatientProfile extends User {
  clinicalCondition: string
  dailyTarget: number
  macros: { protein: number; carbs: number; fat: number }
  status: 'green' | 'yellow' | 'red'
  consumedToday: number
  consumedMacros: { protein: number; carbs: number; fat: number }
}

export interface MealRecord {
  id: string
  patientId: string
  imageUrl: string
  timestamp: string
  calories: number
  macros: { protein: number; carbs: number; fat: number }
  items: string[]
}

export interface Alert {
  id: string
  patientId: string
  type: 'warning' | 'critical' | 'success' | 'info'
  message: string
  date: string
  read: boolean
}
