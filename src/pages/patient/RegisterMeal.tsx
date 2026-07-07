import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { useData } from '@/contexts/data-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, Upload, CheckCircle2, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function RegisterMeal() {
  const [step, setStep] = useState(1)
  const { user } = useAuth()
  const { addMeal } = useData()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Mocked state for review
  const [calories, setCalories] = useState(420)
  const [protein, setProtein] = useState(28)
  const [carbs, setCarbs] = useState(45)
  const [fat, setFat] = useState(15)

  useEffect(() => {
    if (step === 2) {
      const timer = setTimeout(() => setStep(3), 2500)
      return () => clearTimeout(timer)
    }
  }, [step])

  const handleSave = () => {
    addMeal({
      patientId: user!.id,
      imageUrl: 'https://img.usecurling.com/p/400/300?q=healthy%20plate&color=green',
      timestamp: new Date().toISOString(),
      calories,
      macros: { protein, carbs, fat },
      items: ['Frango Grelhado - 150g', 'Arroz Integral - 100g', 'Salada Diversa'],
    })
    setStep(4)
    setTimeout(() => {
      toast({ title: 'Refeição registrada com sucesso!' })
      navigate('/patient')
    }, 1500)
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Registrar Refeição</h1>

      {step === 1 && (
        <div className="animate-fade-in space-y-4">
          <p className="text-muted-foreground text-sm">
            Tire uma foto do seu prato para a IA analisar.
          </p>
          <div
            onClick={() => setStep(2)}
            className="border-2 border-dashed border-primary/50 rounded-2xl h-80 flex flex-col items-center justify-center bg-primary/5 text-primary cursor-pointer active:scale-[0.98] transition-transform"
          >
            <Camera className="w-12 h-12 mb-4" />
            <span className="font-semibold">Tirar Foto</span>
          </div>
          <Button variant="outline" className="w-full py-6" onClick={() => setStep(2)}>
            <Upload className="w-5 h-5 mr-2" /> Escolher da Galeria
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="animate-fade-in space-y-6 flex flex-col items-center pt-8">
          <div className="relative w-64 h-64 rounded-2xl overflow-hidden shadow-2xl">
            <img
              src="https://img.usecurling.com/p/400/300?q=healthy%20plate"
              alt="Plate"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-primary/10" />
            <div className="scanner-line animate-scan" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="font-bold text-lg animate-pulse">Analisando imagem...</h3>
            <p className="text-sm text-muted-foreground">Identificando alimentos e porções</p>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-slide-up space-y-6">
          <Card className="border-none shadow-subtle">
            <CardContent className="p-4 flex gap-4">
              <img
                src="https://img.usecurling.com/p/400/300?q=healthy%20plate"
                alt="Plate"
                className="w-20 h-20 rounded-xl object-cover"
              />
              <div>
                <h3 className="font-semibold text-primary">Análise Concluída</h3>
                <ul className="text-sm text-muted-foreground list-disc list-inside mt-1">
                  <li>Frango Grelhado - ~150g</li>
                  <li>Arroz Integral - ~100g</li>
                  <li>Salada Diversa</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Confirmar Valores</h3>
              <span className="text-xs text-muted-foreground">Pode ajustar se necessário</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Calorias (kcal)</Label>
                <Input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Proteínas (g)</Label>
                <Input
                  type="number"
                  value={protein}
                  onChange={(e) => setProtein(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Carbos (g)</Label>
                <Input
                  type="number"
                  value={carbs}
                  onChange={(e) => setCarbs(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Gorduras (g)</Label>
                <Input type="number" value={fat} onChange={(e) => setFat(Number(e.target.value))} />
              </div>
            </div>
          </div>

          <Button size="lg" className="w-full" onClick={handleSave}>
            Confirmar Registro <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}

      {step === 4 && (
        <div className="animate-slide-up flex flex-col items-center justify-center py-20 text-center space-y-4">
          <CheckCircle2 className="w-20 h-20 text-primary animate-fade-in-up" />
          <h2 className="text-2xl font-bold">Excelente!</h2>
          <p className="text-muted-foreground">Refeição registrada com sucesso.</p>
        </div>
      )}
    </div>
  )
}
