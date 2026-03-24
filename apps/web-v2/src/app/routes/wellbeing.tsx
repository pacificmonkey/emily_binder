'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { SectionErrorBoundary } from '@/components/shared/error-boundary'
import { Skeleton } from '@/components/shared/loading-skeleton'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SymptomForm } from '@/components/wellbeing/symptom-form'
import { SymptomSparkline } from '@/components/wellbeing/symptom-sparkline'
import { DiscussionForm } from '@/components/wellbeing/discussion-form'
import { DiscussionItem } from '@/components/wellbeing/discussion-item'
import {
  useSymptomEntries,
  useDiscussionItems,
} from '@/hooks/use-wellbeing'
import type { SymptomDomain, DiscussionItemStatus } from '@/types/database'

type Tab = 'symptoms' | 'routines' | 'discussion'

const SYMPTOM_DOMAIN_LABELS: Record<SymptomDomain, string> = {
  physical: 'Physical',
  mental: 'Mental',
  sensory: 'Sensory',
  sleep: 'Sleep',
  other: 'Other',
}

const SYMPTOM_DOMAIN_COLORS: Record<SymptomDomain, string> = {
  physical: 'bg-red-50 text-red-700 border-red-300',
  mental: 'bg-purple-50 text-purple-700 border-purple-300',
  sensory: 'bg-yellow-50 text-yellow-700 border-yellow-300',
  sleep: 'bg-indigo-50 text-indigo-700 border-indigo-300',
  other: 'bg-gray-50 text-gray-700 border-gray-300',
}

export default function WellbeingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('symptoms')
  const [symptomDaysRange, setSymptomDaysRange] = useState<7 | 30>(7)
  const [discussionStatusFilter, setDiscussionStatusFilter] = useState<
    DiscussionItemStatus | 'all'
  >('open')
  const [refreshKey, setRefreshKey] = useState(0)

  const symptomsQuery = useSymptomEntries()
  const discussionQuery = useDiscussionItems(
    discussionStatusFilter === 'all' ? undefined : discussionStatusFilter
  )

  const symptomsByDomain = useMemo(() => {
    if (!symptomsQuery.data) return new Map<SymptomDomain, typeof symptomsQuery.data>()

    const grouped = new Map<SymptomDomain, typeof symptomsQuery.data>()
    symptomsQuery.data.forEach((symptom) => {
      if (!grouped.has(symptom.domain)) {
        grouped.set(symptom.domain, [])
      }
      grouped.get(symptom.domain)!.push(symptom)
    })

    // Sort each domain's symptoms by date descending
    grouped.forEach((symptoms) => {
      symptoms.sort(
        (a, b) =>
          new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      )
    })

    return grouped
  }, [symptomsQuery.data])

  const discussionsByProvider = useMemo(() => {
    if (!discussionQuery.data) return new Map<string, typeof discussionQuery.data>()

    const grouped = new Map<string, typeof discussionQuery.data>()
    const noneLinked: typeof discussionQuery.data = []

    discussionQuery.data.forEach((item) => {
      if (item.provider_name) {
        if (!grouped.has(item.provider_name)) {
          grouped.set(item.provider_name, [])
        }
        grouped.get(item.provider_name)!.push(item)
      } else {
        noneLinked.push(item)
      }
    })

    if (noneLinked.length > 0) {
      grouped.set('General', noneLinked)
    }

    return grouped
  }, [discussionQuery.data])

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <PageHeader
        title="Wellbeing"
        subtitle="Track your symptoms, routines, and discussion items with your healthcare team"
      />

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['symptoms', 'routines', 'discussion'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'rounded-t-soft px-4 py-2 font-medium transition-colors',
              activeTab === tab
                ? 'border-b-2 border-blue-500 bg-blue-50 text-blue-700'
                : 'text-text-content-secondary hover:text-content'
            )}
          >
            {tab.charAt(0).toUpperCase() +
              tab.slice(1).replace(/([A-Z])/g, ' $1').trim()}
          </button>
        ))}
      </div>

      {/* Symptoms Tab */}
      {activeTab === 'symptoms' && (
        <SectionErrorBoundary>
          <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <Button
                  variant={symptomDaysRange === 7 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSymptomDaysRange(7)}
                >
                  Last 7 days
                </Button>
                <Button
                  variant={symptomDaysRange === 30 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSymptomDaysRange(30)}
                >
                  Last 30 days
                </Button>
              </div>
              <SymptomForm key={refreshKey} onSuccess={handleRefresh} />
            </div>

            {/* Loading State */}
            {symptomsQuery.isLoading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))}
              </div>
            )}

            {/* Error State */}
            {symptomsQuery.isError && (
              <EmptyState
                icon="⚠️"
                message="Failed to load symptoms. There was a problem loading your symptom data. Please try again."
                actionLabel="Try Again"
                onAction={() => symptomsQuery.refetch()}
              />
            )}

            {/* Empty State */}
            {symptomsQuery.isSuccess &&
              symptomsQuery.data.length === 0 && (
                <EmptyState
                  icon="📋"
                  message="No symptoms logged yet. Start tracking your symptoms to get insights into your health patterns."
                  actionLabel="Add Symptom"
                  onAction={() => {}}
                />
              )}

            {/* Symptoms by Domain */}
            {symptomsQuery.isSuccess &&
              symptomsQuery.data.length > 0 && (
                <div className="space-y-8">
                  {[...symptomsByDomain.entries()].filter(([_, symptoms]) => symptoms).map(
                    ([domain, symptoms]) => {
                      const symptomList = symptoms!
                      return (
                      <div key={domain} className="space-y-4">
                        {/* Domain Header */}
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              'border-2 font-semibold',
                              SYMPTOM_DOMAIN_COLORS[domain]
                            )}
                          >
                            {SYMPTOM_DOMAIN_LABELS[domain]}
                          </Badge>
                          <span className="text-sm text-text-content-muted">
                            {symptomList.length}{' '}
                            {symptomList.length === 1 ? 'entry' : 'entries'}
                          </span>
                        </div>

                        {/* Symptoms in Domain */}
                        <div className="space-y-4">
                          {Array.from(
                            new Map(
                              symptomList.map((s) => [s.label, s])
                            ).entries()
                          ).map(([label, _symptom]) => {
                            const labelSymptoms = symptomList.filter(
                              (s) => s.label === label
                            )

                            return (
                              <Card
                                key={`${domain}-${label}`}
                                className="space-y-3 bg-surface p-4 shadow-soft"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-semibold text-content">
                                    {label}
                                  </h4>
                                  <Badge variant="secondary">
                                    {labelSymptoms[0].severity}
                                  </Badge>
                                </div>

                                {/* Sparkline */}
                                <SymptomSparkline
                                  entries={labelSymptoms}
                                  days={symptomDaysRange}
                                />

                                {/* Latest Entry Details */}
                                {labelSymptoms.length > 0 && (
                                  <div className="space-y-2 border-t border-gray-200 pt-3 text-xs text-text-content-secondary">
                                    {labelSymptoms[0].duration_minutes && (
                                      <p>
                                        <span className="font-medium text-content">
                                          Duration:
                                        </span>{' '}
                                        {labelSymptoms[0].duration_minutes} minutes
                                      </p>
                                    )}
                                    {labelSymptoms[0].possible_trigger && (
                                      <p>
                                        <span className="font-medium text-content">
                                          Trigger:
                                        </span>{' '}
                                        {labelSymptoms[0].possible_trigger}
                                      </p>
                                    )}
                                    {labelSymptoms[0].what_helped && (
                                      <p>
                                        <span className="font-medium text-content">
                                          What helped:
                                        </span>{' '}
                                        {labelSymptoms[0].what_helped}
                                      </p>
                                    )}
                                    {labelSymptoms[0].notes && (
                                      <p>
                                        <span className="font-medium text-content">
                                          Notes:
                                        </span>{' '}
                                        {labelSymptoms[0].notes}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </Card>
                            )
                          })}
                        </div>
                      </div>
                    )
                    }
                  )}
                </div>
              )}
          </div>
        </SectionErrorBoundary>
      )}

      {/* Routines Tab */}
      {activeTab === 'routines' && (
        <SectionErrorBoundary>
          <EmptyState
            icon="⏰"
            message="Routine tracking coming soon. We're building tools to help you track daily routines and habits. Check back soon!"
          />
        </SectionErrorBoundary>
      )}

      {/* Discussion Items Tab */}
      {activeTab === 'discussion' && (
        <SectionErrorBoundary>
          <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                {(['all', 'open', 'discussed', 'resolved', 'archived'] as const).map(
                  (status) => (
                    <Button
                      key={status}
                      variant={
                        discussionStatusFilter === status ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => setDiscussionStatusFilter(status)}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  )
                )}
              </div>
              <DiscussionForm onSuccess={handleRefresh} />
            </div>

            {/* Loading State */}
            {discussionQuery.isLoading && (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            )}

            {/* Error State */}
            {discussionQuery.isError && (
              <EmptyState
                icon="⚠️"
                message="Failed to load discussion items. There was a problem loading your discussion items. Please try again."
                actionLabel="Try Again"
                onAction={() => discussionQuery.refetch()}
              />
            )}

            {/* Empty State */}
            {discussionQuery.isSuccess &&
              discussionQuery.data.length === 0 && (
                <EmptyState
                  icon="💬"
                  message="No discussion items. Add topics you'd like to discuss with your healthcare team."
                  actionLabel="Add Topic"
                  onAction={() => {}}
                />
              )}

            {/* Discussion Items by Provider */}
            {discussionQuery.isSuccess &&
              discussionQuery.data.length > 0 && (
                <div className="space-y-8">
                  {[...discussionsByProvider.entries()].filter(([_, items]) => items).map(
                    ([providerName, items]) => {
                      const itemList = items!
                      return (
                      <div key={providerName} className="space-y-3">
                        {/* Provider Header */}
                        <h3 className="font-semibold text-content">
                          {providerName}
                        </h3>

                        {/* Items */}
                        <div className="space-y-3">
                          {itemList.map((item) => (
                            <DiscussionItem
                              key={item.discussion_item_id}
                              item={item}
                              onSuccess={handleRefresh}
                            />
                          ))}
                        </div>
                      </div>
                    )
                    }
                  )}
                </div>
              )}
          </div>
        </SectionErrorBoundary>
      )}
    </div>
  )
}
