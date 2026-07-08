import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { PatientProfile, AppMeal, AppAlert } from '@/lib/types'

interface DataContextType {
  patients: PatientProfile[]
  meals: AppMeal[]
  alerts: AppAlert[]
  addMeal: (meal: Omit<AppMeal, 'id'>) => void
  markAlertRead: (id: string) => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

const initialPatients: PatientProfile[] = [
  {
    id: 'p1',
    name: 'Mariana Souza',
    avatar: 'https://img.usecurling.com/ppl/medium?gender=female&seed=1',
    clinicalCondition: 'Diabetes Tipo 2',
    status: 'green',
    dailyTarget: 1800,
    consumedToday: 1240,
    macros: { protein: 120, carbs: 200, fat: 60 },
    consumedMacros: { protein: 82, carbs: 140, fat: 38 },
  },
  {
    id: 'p2',
    name: 'Carlos Ferreira',
    avatar: 'https://img.usecurling.com/ppl/medium?gender=male&seed=2',
    clinicalCondition: 'Hipertensão',
    status: 'yellow',
    dailyTarget: 2200,
    consumedToday: 980,
    macros: { protein: 150, carbs: 250, fat: 70 },
    consumedMacros: { protein: 60, carbs: 110, fat: 30 },
  },
  {
    id: 'p3',
    name: 'Ana Oliveira',
    avatar: 'https://img.usecurling.com/ppl/medium?gender=female&seed=3',
    clinicalCondition: 'Obesidade',
    status: 'red',
    dailyTarget: 1500,
    consumedToday: 1620,
    macros: { protein: 100, carbs: 150, fat: 50 },
    consumedMacros: { protein: 70, carbs: 180, fat: 55 },
  },
]

const initialMeals: AppMeal[] = [
  {
    id: 'm1',
    patientId: 'p1',
    imageUrl: 'https://img.usecurling.com/p/400/300?q=grilled%20chicken&color=green',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    calories: 420,
    macros: { protein: 35, carbs: 40, fat: 12 },
    items: ['Frango Grelhado - 150g', 'Arroz Integral - 100g', 'Salada Mista'],
  },
  {
    id: 'm2',
    patientId: 'p1',
    imageUrl: 'https://img.usecurling.com/p/400/300?q=breakfast%20oats',
    timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
    calories: 320,
    macros: { protein: 12, carbs: 55, fat: 8 },
    items: ['Aveia - 50g', 'Banana - 1un', 'Mel - 1col'],
  },
  {
    id: 'm3',
    patientId: 'p2',
    imageUrl: 'https://img.usecurling.com/p/400/300?q=beef%20steak',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    calories: 580,
    macros: { protein: 42, carbs: 35, fat: 28 },
    items: ['Bife - 200g', 'Batata Doce - 150g', 'Brócolis'],
  },
  {
    id: 'm4',
    patientId: 'p3',
    imageUrl: 'https://img.usecurling.com/p/400/300?q=pasta%20dish',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    calories: 720,
    macros: { protein: 25, carbs: 95, fat: 22 },
    items: ['Macarrão - 200g', 'Molho Branco', 'Queijo Parmesão'],
  },
]

const initialAlerts: AppAlert[] = [
  {
    id: 'a1',
    patientId: 'p3',
    type: 'critical',
    message: 'Consumo calórico ultrapassou a meta diária em 8%.',
    read: false,
    date: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'a2',
    patientId: 'p2',
    type: 'warning',
    message: 'Baixo consumo de proteínas nas últimas 24h.',
    read: false,
    date: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'a3',
    patientId: 'p1',
    type: 'success',
    message: 'Meta de hidratação atingida com sucesso hoje!',
    read: true,
    date: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
]

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [patients, setPatients] = useState<PatientProfile[]>(initialPatients)
  const [meals, setMeals] = useState<AppMeal[]>(initialMeals)
  const [alerts, setAlerts] = useState<AppAlert[]>(initialAlerts)

  const addMeal = useCallback((meal: Omit<AppMeal, 'id'>) => {
    const newMeal: AppMeal = { ...meal, id: `m${Date.now()}` }
    setMeals((prev) => [newMeal, ...prev])
  }, [])

  const markAlertRead = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)))
  }, [])

  return (
    <DataContext.Provider value={{ patients, meals, alerts, addMeal, markAlertRead }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used within a DataProvider')
  return context
}
