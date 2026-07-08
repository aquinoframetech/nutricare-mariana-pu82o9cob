import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import { Role, User } from '@/lib/types'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  signUp: (name: string, email: string, password: string, role: Role) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

function toUser(record: any): User | null {
  if (!record) return null
  return {
    id: record.id,
    name: record.name || '',
    email: record.email || '',
    role: (record.role || 'patient') as Role,
    avatar: record.avatar ? pb.files.getUrl(record, record.avatar) : '',
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(toUser(pb.authStore.record))
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(toUser(pb.authStore.isValid ? record : null))
      setIsAuthenticated(pb.authStore.isValid)
    })
    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .catch(() => pb.authStore.clear())
        .finally(() => setLoading(false))
    } else {
      if (pb.authStore.record) pb.authStore.clear()
      setLoading(false)
    }
    return () => {
      unsubscribe()
    }
  }, [])

  const signUp = async (name: string, email: string, password: string, role: Role) => {
    try {
      await pb
        .collection('users')
        .create({ name, email, password, passwordConfirm: password, role })
      await pb.collection('users').authWithPassword(email, password)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      await pb.collection('users').authWithPassword(email, password)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signOut = () => {
    pb.authStore.clear()
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, signUp, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
