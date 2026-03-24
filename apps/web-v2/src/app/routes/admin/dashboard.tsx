import { useAdminStats } from '@/hooks/use-admin'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import {
  BarChart3,
  Coins,
  CheckCircle2,
  Flame,
} from 'lucide-react'

function StatCardSkeleton() {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 w-20 bg-surface-sunken rounded animate-pulse" />
          <div className="h-8 w-32 bg-surface-sunken rounded animate-pulse" />
        </div>
        <div className="h-12 w-12 bg-surface-sunken rounded-soft animate-pulse" />
      </div>
    </Card>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  accentColor: 'accent' | 'success' | 'warning' | 'info'
}

function StatCard({ icon, label, value, accentColor }: StatCardProps) {
  const colorClasses = {
    accent: 'bg-accent-light text-accent',
    success: 'bg-success-light text-success',
    warning: 'bg-warning-light text-warning',
    info: 'bg-info-light text-info',
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-content-secondary">{label}</p>
          <p className="text-3xl font-bold text-content">{value}</p>
        </div>
        <div className={cn('p-3 rounded-soft', colorClasses[accentColor])}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminStats()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-content-secondary py-8">
        Unable to load dashboard statistics
      </div>
    )
  }

  const tasksCompleted = stats.tasks_completed_today
  const tasksTotal = stats.tasks_total_today
  const tasksText = `${tasksCompleted}/${tasksTotal}`

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<CheckCircle2 className="h-6 w-6" />}
          label="Tasks Completed"
          value={tasksText}
          accentColor="success"
        />
        <StatCard
          icon={<BarChart3 className="h-6 w-6" />}
          label="VP Earned Today"
          value={0}
          accentColor="info"
        />
        <StatCard
          icon={<Coins className="h-6 w-6" />}
          label="Coins This Week"
          value={stats.coins_awarded_this_week}
          accentColor="warning"
        />
        <StatCard
          icon={<Flame className="h-6 w-6" />}
          label="Active Streaks"
          value={stats.active_streak_count}
          accentColor="accent"
        />
      </div>
    </div>
  )
}
