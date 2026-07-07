import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { PatientNav } from './patient/patient-nav'
import { NutriSidebar } from './nutri/nutri-sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Bell } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function Layout() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user && location.pathname !== '/') {
    return <Navigate to="/" replace />
  }

  if (user?.role === 'patient' && location.pathname.startsWith('/nutri')) {
    return <Navigate to="/patient" replace />
  }

  if (user?.role === 'nutri' && location.pathname.startsWith('/patient')) {
    return <Navigate to="/nutri" replace />
  }

  if (!user) {
    return <Outlet />
  }

  if (user.role === 'patient') {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-background">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
              N
            </div>
            <span className="font-bold text-lg tracking-tight">NutriCare</span>
          </div>
          <div className="relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background" />
          </div>
        </header>
        <main className="flex-1 pb-20 animate-fade-in">
          <Outlet />
        </main>
        <PatientNav />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/20">
        <NutriSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b bg-background flex items-center px-4 gap-4 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-4">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.avatar} />
                <AvatarFallback>NM</AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto animate-fade-in">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
