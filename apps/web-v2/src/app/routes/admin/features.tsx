import { useMemo } from 'react'
import { useFeatureModules, useToggleFeature } from '@/hooks/use-admin'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { Card } from '@/components/ui/card'
import { ToggleLeft, AlertCircle } from 'lucide-react'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled: boolean
}

function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        checked ? 'bg-success' : 'bg-surface-sunken'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-6' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

function DependencyWarning({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-warning-light rounded-soft border border-warning/20">
      <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
      <p className="text-xs text-warning">{message}</p>
    </div>
  )
}

export default function FeaturesPage() {
  const { data: modules, isLoading } = useFeatureModules()
  const { mutate: toggleFeature, isPending } = useToggleFeature()

  // Build dependency graph
  const dependencyMap = useMemo(() => {
    if (!modules) return new Map<string, string[]>()

    const map = new Map<string, string[]>()

    modules.forEach((module) => {
      map.set(module.key, module.depends_on_module_keys || [])
    })

    return map
  }, [modules])

  // Build reverse dependency map (what depends on each module)
  const reverseDependencyMap = useMemo(() => {
    if (!modules) return new Map<string, string[]>()

    const map = new Map<string, string[]>()

    modules.forEach((module) => {
      modules.forEach((otherModule) => {
        if (
          otherModule.depends_on_module_keys &&
          otherModule.depends_on_module_keys.includes(module.key)
        ) {
          if (!map.has(module.key)) {
            map.set(module.key, [])
          }
          map.get(module.key)!.push(otherModule.key)
        }
      })
    })

    return map
  }, [modules])

  const handleToggle = (feature: { key: string; is_enabled: boolean }) => {
    const newEnabled = !feature.is_enabled
    const dependencies = dependencyMap.get(feature.key) || []
    const dependents = reverseDependencyMap.get(feature.key) || []

    // Check if disabling and has dependents
    if (!newEnabled && dependents.length > 0) {
      const enabledDependents = dependents.filter((key) => {
        const mod = modules?.find((m) => m.key === key)
        return mod?.is_enabled
      })

      if (enabledDependents.length > 0) {
        toast({
          title: 'Cannot Disable',
          description: `Other features depend on this: ${enabledDependents.join(', ')}`,
          variant: 'error',
        })
        return
      }
    }

    // Check if enabling but dependencies are disabled
    if (newEnabled && dependencies.length > 0) {
      const disabledDependencies = dependencies.filter((key) => {
        const mod = modules?.find((m) => m.key === key)
        return !mod?.is_enabled
      })

      if (disabledDependencies.length > 0) {
        toast({
          title: 'Dependencies Not Enabled',
          description: `Please enable dependencies first: ${disabledDependencies.join(', ')}`,
          variant: 'error',
        })
        return
      }
    }

    toggleFeature(
      { featureKey: feature.key, enabled: newEnabled },
      {
        onError: (error) => {
          toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to toggle feature',
            variant: 'error',
          })
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface-sunken rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (!modules || modules.length === 0) {
    return (
      <div className="text-content-secondary py-8">
        No feature modules found
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent-light rounded-soft">
            <ToggleLeft className="h-5 w-5 text-accent" />
          </div>
          <h2 className="text-lg font-semibold text-content">Feature Toggles</h2>
        </div>

        <div className="space-y-4">
          {modules.map((module) => {
            const dependencies = dependencyMap.get(module.key) || []
            const dependents = reverseDependencyMap.get(module.key) || []
            const disabledDependencies = dependencies.filter((key) => {
              const mod = modules.find((m) => m.key === key)
              return !mod?.is_enabled
            })

            return (
              <div key={module.feature_module_id} className="space-y-2">
                <div className="flex items-start justify-between p-4 bg-surface rounded-soft border border-border">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-content uppercase tracking-wider">
                        {module.key}
                      </h3>
                      {module.default_enabled && (
                        <span className="text-xs px-2 py-0.5 bg-info-light text-info rounded-soft">
                          Default
                        </span>
                      )}
                    </div>
                    {module.description && (
                      <p className="text-xs text-content-secondary mt-1">
                        {module.description}
                      </p>
                    )}
                  </div>
                  <ToggleSwitch
                    checked={module.is_enabled}
                    onChange={() => handleToggle(module)}
                    disabled={isPending}
                  />
                </div>

                {disabledDependencies.length > 0 && module.is_enabled && (
                  <DependencyWarning
                    message={`Dependencies disabled: ${disabledDependencies.join(', ')}`}
                  />
                )}

                {dependents.length > 0 && !module.is_enabled && (
                  <DependencyWarning
                    message={`Features depending on this: ${dependents.join(', ')}`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
