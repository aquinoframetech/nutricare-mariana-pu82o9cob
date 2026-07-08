import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getErrorMessage, extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import {
  getAllNutritionistProfiles,
  createNutritionistProfile,
} from '@/services/nutritionist-profiles'
import { createPatient } from '@/services/patients'
import { Role, NutritionistProfile } from '@/lib/types'
import pb from '@/lib/pocketbase/client'

export default function Signup() {
  const { signUp, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('patient')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [age, setAge] = useState('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [goal, setGoal] = useState('')
  const [calorieGoal, setCalorieGoal] = useState('')
  const [nutriId, setNutriId] = useState('')
  const [bio, setBio] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [nutris, setNutris] = useState<NutritionistProfile[]>([])
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user) navigate(user.role === 'patient' ? '/patient' : '/nutri')
  }, [isAuthenticated, user, navigate])

  useEffect(() => {
    getAllNutritionistProfiles()
      .then(setNutris)
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setFieldErrors({})
    const { error } = await signUp(name, email, password, role)
    if (error) {
      setError(getErrorMessage(error))
      setFieldErrors(extractFieldErrors(error))
      setLoading(false)
      return
    }
    const userId = pb.authStore.record?.id || ''
    try {
      if (role === 'patient') {
        await createPatient({
          user_id: userId,
          age: Number(age) || 0,
          weight: Number(weight) || 0,
          height: Number(height) || 0,
          goal,
          calorie_goal: Number(calorieGoal) || 0,
          nutritionist_id: nutriId,
          condition: '',
          restrictions: '',
          allergies: '',
          medical_notes: '',
        } as any)
      } else {
        await createNutritionistProfile({ user_id: userId, bio, specialty })
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Cadastro</CardTitle>
          <CardDescription>Crie sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label>Tipo de conta</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Paciente</SelectItem>
                  <SelectItem value="nutritionist">Nutricionista</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
              {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              {fieldErrors.password && (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              )}
            </div>
            {role === 'patient' && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label>Idade</Label>
                    <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Peso (kg)</Label>
                    <Input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Altura (cm)</Label>
                    <Input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Objetivo</Label>
                  <Input
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="Ex: Perder peso"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta calórica (kcal/dia)</Label>
                  <Input
                    type="number"
                    value={calorieGoal}
                    onChange={(e) => setCalorieGoal(e.target.value)}
                  />
                </div>
                {nutris.length > 0 && (
                  <div className="space-y-2">
                    <Label>Nutricionista</Label>
                    <Select value={nutriId} onValueChange={setNutriId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {nutris.map((n) => (
                          <SelectItem key={n.id} value={n.user_id}>
                            {n.expand?.user_id?.name || 'Nutricionista'}
                            {n.specialty ? ` - ${n.specialty}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
            {role === 'nutritionist' && (
              <>
                <div className="space-y-2">
                  <Label>Especialidade</Label>
                  <Input
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="Ex: Nutrição Clínica"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Input
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Breve descrição"
                  />
                </div>
              </>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{' '}
              <Link to="/" className="text-primary font-medium hover:underline">
                Entrar
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
