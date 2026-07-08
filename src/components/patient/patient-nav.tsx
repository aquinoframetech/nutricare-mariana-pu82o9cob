import { NavLink } from 'react-router-dom'
import { Home, History, Camera, User, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PatientNav() {
  const navItems = [
    { to: '/patient', icon: Home, label: 'Início', end: true },
    { to: '/patient/history', icon: History, label: 'Histórico' },
    { to: '/patient/register', icon: Camera, label: 'Registrar', primary: true },
    { to: '/patient/assistant', icon: MessageCircle, label: 'IA' },
    { to: '/patient/profile', icon: User, label: 'Perfil' },
  ]

  return (
    <nav className="fixed bottom-0 w-full bg-background border-t pb-safe z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center w-14 gap-1 transition-colors',
                item.primary
                  ? '-mt-6 bg-primary text-primary-foreground rounded-full h-14 w-14 shadow-lg active:scale-95'
                  : isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            <item.icon className={cn('w-5 h-5', item.primary && 'w-6 h-6')} />
            {!item.primary && <span className="text-[10px] font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
