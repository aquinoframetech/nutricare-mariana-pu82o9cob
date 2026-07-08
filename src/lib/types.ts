export type Role = 'patient' | 'nutritionist'

export interface User {
  id: string
  name: string
  role: Role
  avatar: string
  email: string
}

export interface Patient {
  id: string
  user_id: string
  age: number
  weight: number
  height: number
  goal: string
  condition: string
  restrictions: string
  allergies: string
  medical_notes: string
  calorie_goal: number
  nutritionist_id: string
  created: string
  updated: string
  expand?: {
    user_id?: User
    nutritionist_id?: User
  }
}

export interface Meal {
  id: string
  patient_id: string
  name: string
  timestamp: string
  ai_description: string
  calories: number
  proteins: number
  carbs: number
  fats: number
  ai_food_identified: string
  ai_confidence: number
  calories_corrected: number
  location: string
  created: string
  updated: string
  expand?: {
    patient_id?: Patient
  }
}

export interface MealPhoto {
  id: string
  meal_id: string
  image: string
  created: string
  updated: string
}

export interface Alert {
  id: string
  patient_id: string
  type: string
  message: string
  is_read: boolean
  created: string
  updated: string
  expand?: {
    patient_id?: Patient
  }
}

export interface ProfessionalNote {
  id: string
  patient_id: string
  nutritionist_id: string
  note: string
  created: string
  updated: string
  expand?: {
    nutritionist_id?: User
  }
}

export interface Report {
  id: string
  patient_id: string
  period: string
  summary: string
  pdf_export: string
  created: string
  updated: string
}

export interface NutritionistProfile {
  id: string
  user_id: string
  bio: string
  specialty: string
  created: string
  updated: string
  expand?: {
    user_id?: User
  }
}

export interface AccessLog {
  id: string
  user_id: string
  target_patient_id: string
  action: string
  created: string
  updated: string
  expand?: {
    user_id?: User
    target_patient_id?: Patient
  }
}

export interface MealEditLog {
  id: string
  meal_id: string
  editor_id: string
  previous_values: string
  new_values: string
  created: string
  updated: string
  expand?: {
    meal_id?: Meal
    editor_id?: User
  }
}

export interface CalorieLog {
  id: string
  patient_id: string
  date: string
  calories: number
  created: string
  updated: string
}

export interface MacroLog {
  id: string
  patient_id: string
  date: string
  proteins: number
  carbs: number
  fats: number
  created: string
  updated: string
}
