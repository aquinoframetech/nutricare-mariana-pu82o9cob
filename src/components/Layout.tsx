import { Outlet, useLocation } from 'react-router-dom'
import { NutriSidebar } from '@/components/nutri/nutri-sidebar'
import { PatientNav } from '@/components/patient/patient-nav'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'

export default function Layout() {
  const location = useLocation()
  const isNutri = location.pathname.startsWith('/nutri')
  const isPatient = location.pathname.startsWith('/patient')

  if (isNutri) {
    return (
      <SidebarProvider>
        <NutriSidebar />
        <SidebarInset>
          <main className="flex-1 p-6 overflow-y-auto">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (isPatient) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pb-20 max-w-md mx-auto">
          <Outlet />
        </main>
        <PatientNav />
      </div>
    )
  }

  return <Outlet />
}
