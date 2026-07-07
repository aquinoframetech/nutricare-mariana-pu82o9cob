import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'

export function CalorieChart() {
  // Mock data for 7 days
  const data = [
    { day: 'Seg', calories: 1200, target: 1200 },
    { day: 'Ter', calories: 1350, target: 1200 },
    { day: 'Qua', calories: 1100, target: 1200 },
    { day: 'Qui', calories: 1250, target: 1200 },
    { day: 'Sex', calories: 1600, target: 1200 },
    { day: 'Sáb', calories: 1400, target: 1200 },
    { day: 'Dom', calories: 850, target: 1200 }, // Under-eating
  ]

  const config = {
    calories: { label: 'Consumo', color: 'hsl(var(--primary))' },
    target: { label: 'Meta', color: 'hsl(var(--muted-foreground))' },
  }

  return (
    <ChartContainer config={config} className="h-[300px] w-full">
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="calories"
          stroke="var(--color-calories)"
          strokeWidth={3}
          dot={{ r: 4, strokeWidth: 2 }}
        />
        <Line
          type="dashed"
          dataKey="target"
          stroke="var(--color-target)"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
}
