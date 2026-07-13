import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { NutriSidebar } from '@/components/nutri/nutri-sidebar'
import { PatientNav } from '@/components/patient/patient-nav'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, isAuthenticated } = useAuth()
  const isNutri = location.pathname.startsWith('/nutri')
  const isPatient = location.pathname.startsWith('/patient')
  const isPublic = location.pathname === '/' || location.pathname === '/signup'

  const handleLogout = () => {
    try {
      signOut()
      navigate('/', { replace: true })
    } catch {
      toast.error('Erro ao sair. Tente novamente.')
    }
  }

  if (isNutri) {
    return (
      <SidebarProvider>
        <NutriSidebar />
        <SidebarInset>
          <header className="flex h-14 items-center gap-2 border-b px-4 lg:hidden">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground text-sm">
                N
              </div>
              <span className="font-bold tracking-tight">NutriCare</span>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (isPatient) {
    return (
      <div className="min-h-screen bg-background">
        {isAuthenticated && (
          <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
                  N
                </div>
                <span className="font-bold tracking-tight">NutriCare</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span className="ml-1">Sair</span>
              </Button>
            </div>
          </header>
        )}
        <main className="pb-20 max-w-md mx-auto">
          <Outlet />
        </main>
        <PatientNav />
      </div>
    )
  }

  if (isPublic) {
    return <Outlet />
  }

  return <Outlet />
}
