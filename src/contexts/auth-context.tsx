import React, { createContext, useContext, useState } from 'react'
import { Role, User } from '@/lib/types'
import { mockPatients } from '@/lib/mock-data'

interface AuthContextType {
  user: User | null
  login: (role: Role) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const login = (role: Role) => {
    if (role === 'patient') {
      setUser(mockPatients[0]) // Log as Ana Souza
    } else {
      setUser({
        id: 'n1',
        name: 'Nutri Mariana',
        role: 'nutri',
        avatar: 'https://img.usecurling.com/ppl/thumbnail?gender=female&seed=9',
        email: 'mariana@nutricare.com',
      })
    }
  }

  const logout = () => setUser(null)

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
