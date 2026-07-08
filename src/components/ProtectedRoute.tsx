import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Role } from '@/lib/types'

export function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: Role }) {
  const { user, isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/" replace />
  if (role && user?.role !== role) {
    const redirect = user?.role === 'patient' ? '/patient' : '/nutri'
    return <Navigate to={redirect} replace />
  }

  return <>{children}</>
}
