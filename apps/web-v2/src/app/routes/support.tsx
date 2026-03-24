import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  CheckSquare,
  Zap,
  Pill,
  TrendingUp,
  MessageSquare,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { CardSkeleton } from '@/components/shared/loading-skeleton'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useUserRole, useSupportDashboard, useSwitchPatient } from '@/hooks/use-support'

interface PatientDropdownProps {
  assignedPatients: Array<{
    patient_id: string
    full_name: string
    is_currently_viewing: boolean
  }>
  currentPatientId: string | null
  isLoading: boolean
  onSelectPatient: (patientId: string) => void
}

function PatientSwitcher({
  assignedPatients,
  isLoading,
  onSelectPatient,
}: PatientDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const currentPatient = assignedPatients.find((p) => p.is_currently_viewing)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-soft bg-surface px-4 py-2 text-sm font-medium text-content',
          'border border-border shadow-soft hover:bg-surface-sunken transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none'
        )}
        disabled={isLoading || assignedPatients.length === 0}
      >
        <Users className="h-4 w-4" />
        <span>{currentPatient?.full_name || 'Select patient'}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && assignedPatients.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full z-40 mt-1 w-48 rounded-soft border border-border bg-surface shadow-raised">
            {assignedPatients.map((patient) => (
              <button
                key={patient.patient_id}
                onClick={() => {
                  onSelectPatient(patient.patient_id)
                  setIsOpen(false)
                }}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm transition-colors',
                  'hover:bg-surface-sunken',
                  patient.is_currently_viewing &&
                    'bg-accent-light text-accent font-medium'
                )}
              >
                {patient.full_name}
                {patient.is_currently_viewing && (
                  <span className="ml-2 text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface DashboardCardProps {
  icon: React.ReactNode
  title: string
  value: string | number
  description?: string
  progress?: { current: number; max: number }
  loading?: boolean
}

function DashboardCard({
  icon,
  title,
  value,
  description,
  progress,
  loading = false,
}: DashboardCardProps) {
  return (
    <Card className="border-t-4 border-t-accent">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="text-accent">{icon}</div>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            <div className="h-6 w-12 rounded bg-surface-sunken animate-pulse" />
            <div className="h-4 w-24 rounded bg-surface-sunken animate-pulse" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold text-content">{value}</div>
            {description && (
              <CardDescription className="text-xs">
                {description}
              </CardDescription>
            )}
            {progress && (
              <div className="space-y-2 pt-2">
                <Progress
                  value={progress.current}
                  max={progress.max}
                  label={title}
                />
                <p className="text-xs text-content-muted">
                  {progress.current} / {progress.max}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function SupportDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <CardSkeleton className="h-40" />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <CardSkeleton key={i} className="h-40" />
        ))}
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2].map((i) => (
          <CardSkeleton key={i} className="h-40" />
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-6 w-32 rounded bg-surface-sunken animate-pulse" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-32 rounded-soft bg-surface-sunken animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

function SupportDashboardContent() {
  const navigate = useNavigate()
  const { data: roleData, isLoading: roleLoading } = useUserRole()
  const { data: dashboardData, isLoading: dashboardLoading } = useSupportDashboard()
  const switchPatient = useSwitchPatient()

  const assignedPatients = roleData?.assigned_patients || []
  const currentPatientId = dashboardData?.patient_id
  const isLoading = roleLoading || dashboardLoading

  // Error state: no patients assigned
  if (!roleLoading && assignedPatients.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Support Dashboard"
          action={
            <PatientSwitcher
              assignedPatients={assignedPatients}
              currentPatientId={currentPatientId || null}
              isLoading={switchPatient.isPending}
              onSelectPatient={(patientId) =>
                switchPatient.mutate(patientId)
              }
            />
          }
        />
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          message="No patients assigned. Ask an admin to assign you."
        />
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Support Dashboard"
          action={
            <PatientSwitcher
              assignedPatients={assignedPatients}
              currentPatientId={currentPatientId || null}
              isLoading={switchPatient.isPending}
              onSelectPatient={(patientId) =>
                switchPatient.mutate(patientId)
              }
            />
          }
        />
        <SupportDashboardSkeleton />
      </div>
    )
  }

  // Error state: dashboard data not available
  if (!dashboardData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Support Dashboard"
          action={
            <PatientSwitcher
              assignedPatients={assignedPatients}
              currentPatientId={currentPatientId || null}
              isLoading={switchPatient.isPending}
              onSelectPatient={(patientId) =>
                switchPatient.mutate(patientId)
              }
            />
          }
        />
        <EmptyState message="Unable to load dashboard data. Please try again." />
      </div>
    )
  }

  const tasksProgress = {
    current: dashboardData.tasks_completed,
    max: dashboardData.tasks_today,
  }

  const vpProgress = {
    current: dashboardData.vp_earned_today,
    max: dashboardData.daily_win_target,
  }

  const medAdherencePercent =
    dashboardData.med_adherence_7d !== null
      ? Math.round(dashboardData.med_adherence_7d)
      : null

  return (
    <div className="space-y-6 pb-12">
      {/* Header with Patient Switcher */}
      <PageHeader
        title="Support Dashboard"
        action={
          <PatientSwitcher
            assignedPatients={assignedPatients}
            currentPatientId={currentPatientId || null}
            isLoading={switchPatient.isPending}
            onSelectPatient={(patientId) =>
              switchPatient.mutate(patientId)
            }
          />
        }
      />

      {/* Support Mode Indicator */}
      <div className="rounded-soft bg-accent-light/10 border-l-4 border-l-accent px-4 py-3">
        <p className="text-sm text-accent font-medium">
          Viewing {dashboardData.patient_name}'s data as support
        </p>
      </div>

      {/* Main Dashboard Cards Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tasks Card */}
        <DashboardCard
          icon={<CheckSquare className="h-5 w-5" />}
          title="Tasks"
          value={`${tasksProgress.current}/${tasksProgress.max}`}
          description="Completed today"
          progress={tasksProgress}
        />

        {/* Victory Points Card */}
        {dashboardData.daily_win_enabled && (
          <DashboardCard
            icon={<Zap className="h-5 w-5" />}
            title="Victory Points"
            value={`${vpProgress.current}/${vpProgress.max}`}
            description="Daily target"
            progress={vpProgress}
          />
        )}

        {/* Medication Adherence Card */}
        <DashboardCard
          icon={<Pill className="h-5 w-5" />}
          title="Med Adherence"
          value={medAdherencePercent !== null ? `${medAdherencePercent}%` : 'No data'}
          description="7-day average"
        />

        {/* Recent Symptoms Card */}
        <DashboardCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="Recent Symptoms"
          value={dashboardData.recent_symptoms_7d}
          description="Last 7 days"
        />

        {/* Active Streaks Card */}
        <DashboardCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="Active Streaks"
          value={dashboardData.active_streaks}
          description="Ongoing achievements"
        />

        {/* Open Discussions Card */}
        <DashboardCard
          icon={<MessageSquare className="h-5 w-5" />}
          title="Open Discussions"
          value={dashboardData.open_discussions}
          description="Pending items"
        />
      </div>

      {/* Quick Action Buttons */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-content">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="flex-1 sm:flex-auto"
          >
            View Tasks
          </Button>
          <Button
            onClick={() => navigate('/health')}
            variant="outline"
            className="flex-1 sm:flex-auto"
          >
            View Medications
          </Button>
          <Button
            onClick={() => navigate('/calendar')}
            variant="outline"
            className="flex-1 sm:flex-auto"
          >
            View Calendar
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function SupportPage() {
  return <SupportDashboardContent />
}
