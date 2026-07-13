import { NavLink } from 'react-router-dom'
import { Home, Camera, Clock, MessageCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/patient', icon: Home, label: 'Início', end: true },
  { to: '/patient/register', icon: Camera, label: 'Registrar' },
  { to: '/patient/history', icon: Clock, label: 'Histórico' },
  { to: '/patient/assistant', icon: MessageCircle, label: 'Assistente' },
  { to: '/patient/profile', icon: User, label: 'Perfil' },
]

export function PatientNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className="flex flex-col items-center gap-1 px-2 py-1.5 transition-colors"
          >
            {({ isActive }) => (
              <div
                className={cn(
                  'flex flex-col items-center gap-1',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className={cn('text-xs', isActive && 'font-medium')}>{item.label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
