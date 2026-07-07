import { cn } from '@/lib/utils'

interface CircularProgressProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  label?: string
  className?: string
}

export function CircularProgress({
  value,
  max,
  size = 160,
  strokeWidth = 12,
  label = 'kcal',
  className,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const percent = Math.min(value / max, 1)
  const dashoffset = circumference - percent * circumference

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          className="text-primary transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold tracking-tighter text-foreground">
          {Math.round(value)}
        </span>
        <span className="text-sm font-medium text-muted-foreground">/ {max}</span>
        <span className="text-xs text-muted-foreground mt-1">{label}</span>
      </div>
    </div>
  )
}
