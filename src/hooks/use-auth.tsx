import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import { Role, User } from '@/lib/types'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { logAuthError, mapSignUpError } from '@/lib/auth-errors'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  signUp: (
    name: string,
    email: string,
    password: string,
    role: Role,
  ) => Promise<{ error: any; message: string | null; fieldErrors: FieldErrors }>
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
    let createdUserId: string | null = null

    // Step 1: Create user record in `users` collection
    try {
      const userRecord = await pb.collection('users').create({
        name,
        email,
        password,
        passwordConfirm: password,
        role,
      })
      createdUserId = userRecord.id
    } catch (error) {
      logAuthError('use-auth.tsx:signUp:Step1_CreateUser', error)
      return {
        error,
        message: mapSignUpError(error, 'createUser'),
        fieldErrors: extractFieldErrors(error),
      }
    }

    // Step 2: Auto-login with the newly created credentials
    try {
      await pb.collection('users').authWithPassword(email, password)
    } catch (error) {
      logAuthError('use-auth.tsx:signUp:Step2_AutoLogin', error)
      // Cleanup: attempt to delete the orphaned user record
      if (createdUserId) {
        try {
          await pb.collection('users').delete(createdUserId)
        } catch (cleanupErr) {
          logAuthError('use-auth.tsx:signUp:Step2_Cleanup', cleanupErr)
        }
      }
      pb.authStore.clear()
      return {
        error,
        message: 'Erro ao autenticar. Tente fazer login com seus dados.',
        fieldErrors: {},
      }
    }

    // Step 3: Create patient record linked via user_id
    try {
      await pb.collection('patients').create({
        user_id: createdUserId,
        age: 0,
        weight: 0,
        height: 0,
        goal: '',
        condition: '',
        restrictions: '',
        allergies: '',
        medical_notes: '',
        calorie_goal: 0,
      })
    } catch (error) {
      logAuthError('use-auth.tsx:signUp:Step3_CreatePatient', error)
      // Cleanup: delete the user record so the same email can be used on retry
      if (createdUserId) {
        try {
          await pb.collection('users').delete(createdUserId)
        } catch (cleanupErr) {
          logAuthError('use-auth.tsx:signUp:Step3_Cleanup', cleanupErr)
        }
      }
      pb.authStore.clear()
      return {
        error,
        message: mapSignUpError(error, 'createPatient'),
        fieldErrors: {},
      }
    }

    // Step 4: Success — redirect handled by caller via signedUp state
    return { error: null, message: null, fieldErrors: {} }
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
