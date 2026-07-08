import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { createPatient, getMyPatientProfile, updatePatient } from '@/services/patients'
import { getAllNutritionistProfiles } from '@/services/nutritionist-profiles'
import { NutritionistProfile } from '@/lib/types'
import { Utensils, User as UserIcon, Mail } from 'lucide-react'

export default function ProfileSetup() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [goal, setGoal] = useState('')
  const [restrictions, setRestrictions] = useState('')
  const [allergies, setAllergies] = useState('')
  const [observations, setObservations] = useState('')
  const [nutriId, setNutriId] = useState('')
  const [nutris, setNutris] = useState<NutritionistProfile[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getMyPatientProfile()
      .then((profile) => {
        if (profile.weight > 0 || profile.birth_date) {
          navigate('/patient')
        }
      })
      .catch(() => {})

    getAllNutritionistProfiles()
      .then(setNutris)
      .catch(() => {})
  }, [navigate])

  const calculateAge = (dateStr: string): number => {
    const today = new Date()
    const birth = new Date(dateStr)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const userId = user?.id
      if (!userId) {
        setError('Usuário não autenticado.')
        setLoading(false)
        return
      }

      let patientId: string
      try {
        const existing = await getMyPatientProfile()
        patientId = existing.id
      } catch {
        const created = await createPatient({
          user_id: userId,
          age: 0,
          weight: 0,
          height: 0,
          goal: '',
          condition: '',
          restrictions: '',
          allergies: '',
          medical_notes: '',
          calorie_goal: 0,
        } as any)
        patientId = (created as any).id
      }

      await updatePatient(patientId, {
        birth_date: birthDate || undefined,
        gender: gender || undefined,
        age: birthDate ? calculateAge(birthDate) : 0,
        weight: Number(weight) || 0,
        height: Number(height) || 0,
        goal,
        restrictions,
        allergies,
        medical_notes: observations,
        nutritionist_id: nutriId || undefined,
      } as any)

      navigate('/patient')
    } catch (err) {
      setError(getErrorMessage(err))
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-3">
            <Utensils className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Configure seu Perfil</CardTitle>
          <CardDescription>Complete seus dados nutricionais</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-3 space-y-2 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <UserIcon className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{user?.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>{user?.email}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de Nascimento</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Sexo</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                  placeholder="70"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Altura (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  required
                  placeholder="170"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal">Objetivo Nutricional</Label>
              <Input
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                required
                placeholder="Ex: Perder peso, Ganhar massa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="restrictions">Restrições Alimentares</Label>
              <Textarea
                id="restrictions"
                value={restrictions}
                onChange={(e) => setRestrictions(e.target.value)}
                placeholder="Ex: Vegetariano, Sem glúten"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Alergias</Label>
              <Textarea
                id="allergies"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="Ex: Lactose, Amendoim"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observações Adicionais</Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Outras informações relevantes"
              />
            </div>

            {nutris.length > 0 && (
              <div className="space-y-2">
                <Label>Nutricionista (opcional)</Label>
                <Select value={nutriId} onValueChange={setNutriId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu nutricionista" />
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

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar e Continuar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
