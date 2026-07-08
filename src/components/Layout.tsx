import { Outlet, useLocation } from 'react-router-dom'
import { PatientNav } from '@/components/patient/patient-nav'
import { NutriSidebar } from '@/components/nutri/nutri-sidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'

export default function Layout() {
  const location = useLocation()
  const isNutri = location.pathname.startsWith('/nutri')

  if (isNutri) {
    return (
      <SidebarProvider>
        <NutriSidebar />
        <SidebarInset>
          <main className="p-6 overflow-auto">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Outlet />
      <PatientNav />
    </div>
  )
}
