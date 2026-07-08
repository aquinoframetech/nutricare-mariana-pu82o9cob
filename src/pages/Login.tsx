import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Activity } from 'lucide-react'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e?: React.FormEvent, demoEmail?: string, demoPass?: string) => {
    e?.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(demoEmail || email, demoPass || password)
    if (error) {
      setError(getErrorMessage(error))
      setLoading(false)
    } else {
      const role = (window as any).__userRole || 'patient'
      navigate(role === 'nutritionist' ? '/nutri' : '/patient')
    }
  }

  const handleDemoNutri = () => {
    setEmail('aquinobr@hotmail.com')
    setPassword('Skip@Pass')
    handleLogin(undefined, 'aquinobr@hotmail.com', 'Skip@Pass')
  }

  const handleDemoPatient = () => {
    setEmail('ana@example.com')
    setPassword('Skip@Pass')
    handleLogin(undefined, 'ana@example.com', 'Skip@Pass')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md space-y-8 animate-fade-in-up">
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
            <CardDescription>Entre com seu e-mail e senha.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="flex flex-col gap-2 pt-2">
              <Button variant="outline" onClick={handleDemoPatient} disabled={loading}>
                Entrar como Paciente (Demo)
              </Button>
              <Button variant="outline" onClick={handleDemoNutri} disabled={loading}>
                Entrar como Nutricionista (Demo)
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Não tem conta?{' '}
              <Link to="/signup" className="text-primary font-medium hover:underline">
                Cadastre-se
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
