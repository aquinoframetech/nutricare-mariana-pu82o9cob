import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Bell,
  LogOut,
  MessageCircle,
  Stethoscope,
  Activity,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function NutriSidebar() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { title: 'Visão Geral', url: '/nutri/dashboard', icon: LayoutDashboard, end: true },
    { title: 'Meus Pacientes', url: '/nutri/patients', icon: Users, end: false },
    { title: 'Alertas', url: '/nutri/alerts', icon: Bell, end: false },
    { title: 'Chat IA', url: '/nutri/chat', icon: MessageCircle, end: false },
  ]

  const diagnosticItems = [
    { title: 'Diagnóstico de IA', url: '/nutri/diagnostic', icon: Stethoscope, end: false },
    { title: 'Worker Status', url: '/nutri/worker-diagnostic', icon: Activity, end: false },
  ]

  const isActiveRoute = (url: string, end: boolean) => {
    if (url === '/nutri/dashboard') {
      return location.pathname === '/nutri' || location.pathname === '/nutri/dashboard'
    }
    return end ? location.pathname === url : location.pathname.startsWith(url)
  }

  const handleLogout = () => {
    try {
      signOut()
      navigate('/', { replace: true })
    } catch {
      toast.error('Erro ao sair. Tente novamente.')
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
            N
          </div>
          <span className="font-bold text-lg tracking-tight">NutriCare</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className={cn(
                        isActiveRoute(item.url, item.end) &&
                          'bg-primary/10 font-medium text-primary',
                      )}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {user?.role === 'nutritionist' && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>FERRAMENTAS</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {diagnosticItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.end}
                          className={cn(
                            isActiveRoute(item.url, item.end) &&
                              'bg-primary/10 font-medium text-primary',
                          )}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3 mb-4">
          <img
            src={user?.avatar || `https://img.usecurling.com/ppl/thumbnail`}
            alt={user?.name}
            className="w-10 h-10 rounded-full bg-muted object-cover"
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user?.name}</span>
            <span className="text-xs text-muted-foreground">Nutricionista</span>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="text-destructive hover:text-destructive"
            >
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
