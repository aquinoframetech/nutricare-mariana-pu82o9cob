import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'

interface EvolutionChartData {
  day: string
  value: number
  label?: string
}

export function EvolutionChart({ data }: { data: EvolutionChartData[] }) {
  const config = {
    value: { label: 'Proteínas (g)', color: 'hsl(var(--primary))' },
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
          dataKey="value"
          stroke="var(--color-value)"
          strokeWidth={3}
          dot={{ r: 4, strokeWidth: 2 }}
        />
      </LineChart>
    </ChartContainer>
  )
}
