import { useAuth } from '@/contexts/auth-context'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Activity } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleDemoLogin = (role: 'patient' | 'nutri') => {
    login(role)
    navigate(role === 'patient' ? '/patient' : '/nutri')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Activity className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">NutriCare Mariana</h1>
          <p className="text-muted-foreground">Acompanhamento nutricional inteligente</p>
        </div>

        <Card className="border-none shadow-elevation">
          <CardHeader>
            <CardTitle>Acesse sua conta</CardTitle>
            <CardDescription>Para fins de demonstração, escolha o perfil abaixo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  placeholder="nome@exemplo.com"
                  disabled
                  value="demo@nutricare.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" disabled value="********" />
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Button onClick={() => handleDemoLogin('patient')} size="lg" className="w-full">
                Entrar como Paciente
              </Button>
              <Button
                onClick={() => handleDemoLogin('nutri')}
                variant="outline"
                size="lg"
                className="w-full"
              >
                Entrar como Nutricionista
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
