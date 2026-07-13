import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Disclaimer } from '@/components/shared/disclaimer'
import {
  LogOut,
  Bell,
  ChevronRight,
  User as UserIcon,
  Camera,
  Save,
  X,
  Settings,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getMyPatientProfile, updatePatient } from '@/services/patients'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import type { Patient } from '@/lib/types'

const emptyForm = {
  weight: '',
  height: '',
  goal: '',
  restrictions: '',
  allergies: '',
  medical_notes: '',
  calorie_goal: '',
}
const patientToForm = (p: Patient) => ({
  weight: String(p.weight || ''),
  height: String(p.height || ''),
  goal: p.goal || '',
  restrictions: p.restrictions || '',
  allergies: p.allergies || '',
  medical_notes: p.medical_notes || '',
  calorie_goal: String(p.calorie_goal || ''),
})

export default function Profile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    getMyPatientProfile()
      .then((p) => {
        setPatient(p)
        setForm(patientToForm(p))
      })
      .catch(() => {})
  }, [])

  const handleLogout = () => {
    signOut()
    navigate('/', { replace: true })
  }

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      await pb.collection('users').update(user.id, fd)
      await pb.collection('users').authRefresh()
      toast.success('Avatar atualizado com sucesso!')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!patient) return
    setLoading(true)
    try {
      await updatePatient(patient.id, {
        weight: Number(form.weight) || 0,
        height: Number(form.height) || 0,
        goal: form.goal,
        restrictions: form.restrictions,
        allergies: form.allergies,
        medical_notes: form.medical_notes,
        calorie_goal: Number(form.calorie_goal) || 0,
      } as any)
      toast.success('Perfil atualizado com sucesso!')
      setEditing(false)
      setPatient(await getMyPatientProfile())
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
    setLoading(false)
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Perfil</h1>
      <Card className="border-none shadow-subtle">
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
              aria-label="Upload avatar"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatar}
            />
          </div>
          <h2 className="text-xl font-bold">{user?.name}</h2>
          <p className="text-muted-foreground">{user?.email}</p>
        </CardContent>
      </Card>
      {editing ? (
        <Card className="border-none shadow-subtle">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="height">Altura (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={form.height}
                  onChange={(e) => setForm({ ...form, height: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="goal">Objetivo</Label>
              <Input
                id="goal"
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="calorie_goal">Meta de Calorias</Label>
              <Input
                id="calorie_goal"
                type="number"
                value={form.calorie_goal}
                onChange={(e) => setForm({ ...form, calorie_goal: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="restrictions">Restrições</Label>
              <Textarea
                id="restrictions"
                value={form.restrictions}
                onChange={(e) => setForm({ ...form, restrictions: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="allergies">Alergias</Label>
              <Textarea
                id="allergies"
                value={form.allergies}
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="medical_notes">Observações</Label>
              <Textarea
                id="medical_notes"
                value={form.medical_notes}
                onChange={(e) => setForm({ ...form, medical_notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={loading} className="flex-1">
                <Save className="w-4 h-4 mr-2" /> {loading ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button
                onClick={() => {
                  setEditing(false)
                  if (patient) setForm(patientToForm(patient))
                }}
                variant="outline"
                disabled={loading}
              >
                <X className="w-4 h-4 mr-2" /> Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {patient && (
            <Card className="border-none shadow-subtle">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Peso</span>
                  <span className="font-medium">{patient.weight || '-'} kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Altura</span>
                  <span className="font-medium">{patient.height || '-'} cm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Objetivo</span>
                  <span className="font-medium">{patient.goal || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Meta calórica</span>
                  <span className="font-medium">{patient.calorie_goal || '-'} kcal</span>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start h-14 text-base font-normal"
              onClick={() => (patient ? setEditing(true) : navigate('/patient/profile-setup'))}
            >
              <UserIcon className="w-5 h-5 mr-4 text-primary" />{' '}
              {patient ? 'Editar Dados Pessoais' : 'Configurar Perfil'}
              <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start h-14 text-base font-normal"
              onClick={() => toast.info('Notificações em breve!')}
            >
              <Bell className="w-5 h-5 mr-4 text-primary" /> Notificações
              <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start h-14 text-base font-normal"
              onClick={() => toast.info('Configurações em breve!')}
            >
              <Settings className="w-5 h-5 mr-4 text-primary" /> Configurações
              <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
            </Button>
          </div>
        </>
      )}
      <div className="pt-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 h-14 text-base"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-4" /> Sair da conta
        </Button>
      </div>
      <Disclaimer />
    </div>
  )
}
