import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'

interface MacroChartData {
  day: string
  proteins: number
  carbs: number
  fats: number
}

export function MacroChart({ data }: { data?: MacroChartData[] }) {
  const chartData = data && data.length > 0 ? data : []
  const config = {
    proteins: { label: 'Proteínas (g)', color: 'hsl(349, 89%, 60%)' },
    carbs: { label: 'Carboidratos (g)', color: 'hsl(38, 92%, 50%)' },
    fats: { label: 'Gorduras (g)', color: 'hsl(217, 91%, 60%)' },
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
          dataKey="proteins"
          stroke="var(--color-proteins)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="carbs"
          stroke="var(--color-carbs)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="fats"
          stroke="var(--color-fats)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ChartContainer>
  )
}
