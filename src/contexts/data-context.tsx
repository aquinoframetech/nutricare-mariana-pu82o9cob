import React, { createContext, useContext, useState } from 'react'
import { PatientProfile, MealRecord, Alert } from '@/lib/types'
import { mockPatients, mockMeals, mockAlerts } from '@/lib/mock-data'

interface DataContextType {
  patients: PatientProfile[]
  meals: MealRecord[]
  alerts: Alert[]
  addMeal: (meal: Omit<MealRecord, 'id'>) => void
  addAlert: (alert: Omit<Alert, 'id' | 'date' | 'read'>) => void
  markAlertRead: (id: string) => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<PatientProfile[]>(mockPatients)
  const [meals, setMeals] = useState<MealRecord[]>(mockMeals)
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts)

  const addMeal = (mealData: Omit<MealRecord, 'id'>) => {
    const newMeal = { ...mealData, id: `m${Date.now()}` }
    setMeals((prev) => [newMeal, ...prev])

    // Update patient progress
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === mealData.patientId) {
          return {
            ...p,
            consumedToday: p.consumedToday + mealData.calories,
            consumedMacros: {
              protein: p.consumedMacros.protein + mealData.macros.protein,
              carbs: p.consumedMacros.carbs + mealData.macros.carbs,
              fat: p.consumedMacros.fat + mealData.macros.fat,
            },
          }
        }
        return p
      }),
    )

    // Simple rule engine
    const patient = patients.find((p) => p.id === mealData.patientId)
    if (patient && mealData.calories > patient.dailyTarget * 0.5) {
      addAlert({
        patientId: patient.id,
        type: 'critical',
        message: 'Refeição excede 50% do limite calórico diário.',
      })
    }
  }

  const addAlert = (alertData: Omit<Alert, 'id' | 'date' | 'read'>) => {
    const newAlert: Alert = {
      ...alertData,
      id: `a${Date.now()}`,
      date: new Date().toISOString(),
      read: false,
    }
    setAlerts((prev) => [newAlert, ...prev])
  }

  const markAlertRead = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)))
  }

  return (
    <DataContext.Provider value={{ patients, meals, alerts, addMeal, addAlert, markAlertRead }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
