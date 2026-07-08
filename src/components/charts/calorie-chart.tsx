import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'

interface CalorieChartData {
  day: string
  calories: number
  target: number
}

export function CalorieChart({ data }: { data?: CalorieChartData[] }) {
  const chartData =
    data && data.length > 0
      ? data
      : [
          { day: 'Seg', calories: 0, target: 2000 },
          { day: 'Ter', calories: 0, target: 2000 },
          { day: 'Qua', calories: 0, target: 2000 },
          { day: 'Qui', calories: 0, target: 2000 },
          { day: 'Sex', calories: 0, target: 2000 },
          { day: 'Sab', calories: 0, target: 2000 },
          { day: 'Dom', calories: 0, target: 2000 },
        ]
  const config = {
    calories: { label: 'Consumo', color: 'hsl(var(--primary))' },
    target: { label: 'Meta', color: 'hsl(var(--muted-foreground))' },
  }

  return (
    <ChartContainer config={config} className="h-[300px] w-full">
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
