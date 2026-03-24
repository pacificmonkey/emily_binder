import { cn } from '@/lib/utils'

interface GoalProgressProps {
  completed: number
  total: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function GoalProgress({ completed, total, size = 'md', className }: GoalProgressProps) {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100)

  // Size configurations
  const sizeConfig = {
    sm: { radius: 24, circumference: 150.8, strokeWidth: 3, textSize: 'text-xs', labelSize: 'text-xs' },
    md: { radius: 36, circumference: 226.2, strokeWidth: 4, textSize: 'text-sm', labelSize: 'text-sm' },
    lg: { radius: 48, circumference: 301.6, strokeWidth: 5, textSize: 'text-base', labelSize: 'text-base' },
  }

  const config = sizeConfig[size]
  const strokeDashoffset = config.circumference - (percentage / 100) * config.circumference

  // Check for prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const svgSize = config.radius * 2 + config.strokeWidth * 2

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className="relative flex items-center justify-center" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="rotate-[-90deg]">
          {/* Background ring */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={config.radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-surface-sunken"
          />

          {/* Progress ring */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={config.radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            strokeDasharray={config.circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-accent transition-all"
            style={{
              transitionDuration: prefersReducedMotion ? '0ms' : '300ms',
              transitionTimingFunction: 'ease-out',
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={cn('font-semibold text-content', config.textSize)}>{percentage}%</div>
        </div>
      </div>
    </div>
  )
}
