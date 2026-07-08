import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Activity } from 'lucide-react'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import pb from '@/lib/pocketbase/client'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'patient' | 'nutritionist'>('patient')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signUp(name, email, password, role)
    if (error) {
      setError(getErrorMessage(error))
      setLoading(false)
    } else {
      const userRole = pb.authStore.record?.['role'] || 'patient'
      navigate(userRole === 'nutritionist' ? '/nutri' : '/patient')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md space-y-8 animate-fade-in-up">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Activity className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">NutriCare Mariana</h1>
          <p className="text-muted-foreground">Crie sua conta</p>
        </div>
        <Card className="border-none shadow-elevation">
          <CardHeader>
            <CardTitle>Cadastro</CardTitle>
            <CardDescription>Preencha seus dados para começar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
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
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de conta</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={role === 'patient' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setRole('patient')}
                  >
                    Paciente
                  </Button>
                  <Button
                    type="button"
                    variant={role === 'nutritionist' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setRole('nutritionist')}
                  >
                    Nutricionista
                  </Button>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Cadastrando...' : 'Cadastrar'}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{' '}
              <Link to="/" className="text-primary font-medium hover:underline">
                Entrar
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
