import { useData } from '@/contexts/data-context'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function PatientsList() {
  const { patients } = useData()
  const navigate = useNavigate()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green':
        return 'bg-emerald-500'
      case 'yellow':
        return 'bg-amber-500'
      case 'red':
        return 'bg-rose-500'
      default:
        return 'bg-slate-500'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meus Pacientes</h1>
          <p className="text-muted-foreground">Gerencie seus pacientes e acompanhe a adesão.</p>
        </div>
        <Button>Novo Paciente</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar paciente..." className="pl-9 bg-background" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {patients.map((patient) => (
          <Card
            key={patient.id}
            className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
            onClick={() => navigate(`/nutri/patients/${patient.id}`)}
          >
            <div className={`h-2 w-full ${getStatusColor(patient.status)}`} />
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border">
                  <AvatarImage src={patient.avatar} />
                  <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg leading-none mb-1">{patient.name}</h3>
                  <Badge variant="secondary" className="font-normal text-xs">
                    {patient.clinicalCondition}
                  </Badge>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
