import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Disclaimer } from '@/components/shared/disclaimer'
import { LogOut, Settings, Bell, ChevronRight, User as UserIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function Profile() {
  const { user, logout } = useAuth()

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Perfil</h1>

      <Card className="border-none shadow-subtle">
        <CardContent className="p-6 flex flex-col items-center text-center">
          <Avatar className="w-24 h-24 mb-4 border-4 border-background shadow-lg">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold">{user?.name}</h2>
          <p className="text-muted-foreground">{user?.email}</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Button variant="ghost" className="w-full justify-start h-14 text-base font-normal">
          <UserIcon className="w-5 h-5 mr-4 text-primary" /> Dados Pessoais
          <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
        </Button>
        <Button variant="ghost" className="w-full justify-start h-14 text-base font-normal">
          <Bell className="w-5 h-5 mr-4 text-primary" /> Notificações
          <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
        </Button>
        <Button variant="ghost" className="w-full justify-start h-14 text-base font-normal">
          <Settings className="w-5 h-5 mr-4 text-primary" /> Configurações
          <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
        </Button>
      </div>

      <div className="pt-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 h-14 text-base"
          onClick={logout}
        >
          <LogOut className="w-5 h-5 mr-4" /> Sair da conta
        </Button>
      </div>

      <Disclaimer />
    </div>
  )
}
