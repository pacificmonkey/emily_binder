import { useState, useMemo } from 'react'
import { addMonths, subMonths, format, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEvents } from '@/hooks/use-events'
import { MonthView } from '@/components/calendar/month-view'
import { WeekView } from '@/components/calendar/week-view'
import { EventCard } from '@/components/calendar/event-card'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { ListSkeleton } from '@/components/shared/loading-skeleton'
import { SectionErrorBoundary } from '@/components/shared/error-boundary'

type CalendarView = 'month' | 'week'

export default function CalendarPage() {
  const [view, setView] = useState<CalendarView>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())

  const startDate = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), 'yyyy-MM-dd')
  const endDate = format(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), 'yyyy-MM-dd')
  const { data: events, isLoading, error, refetch } = useEvents(startDate, endDate)

  const selectedDayEvents = useMemo(() => {
    if (!events || !selectedDay) return []
    return (events as any[]).filter((e: any) =>
      isSameDay(new Date(e.starts_at), selectedDay)
    )
  }, [events, selectedDay])

  return (
    <div className="space-y-6">
      <PageHeader title="Calendar" />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="rounded-soft p-2 hover:bg-surface-sunken"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-content min-w-[160px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="rounded-soft p-2 hover:bg-surface-sunken"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentDate(new Date())
              setSelectedDay(new Date())
            }}
          >
            Today
          </Button>
        </div>

        <div className="flex gap-1 rounded-soft bg-surface-sunken p-1">
          <button
            onClick={() => setView('month')}
            className={cn(
              'rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
              view === 'month' ? 'bg-surface text-content shadow-soft' : 'text-content-muted'
            )}
          >
            Month
          </button>
          <button
            onClick={() => setView('week')}
            className={cn(
              'rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
              view === 'week' ? 'bg-surface text-content shadow-soft' : 'text-content-muted'
            )}
          >
            Week
          </button>
        </div>
      </div>

      <SectionErrorBoundary section="calendar">
        {isLoading ? (
          <ListSkeleton count={5} />
        ) : error ? (
          <div role="alert" className="rounded-soft bg-danger-light p-4 text-center">
            <p className="text-sm text-danger-dark">Couldn't load your calendar. Check your connection.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
              Try again
            </Button>
          </div>
        ) : (
          <>
            {view === 'month' ? (
              <MonthView
                currentDate={currentDate}
                events={events as any[] ?? []}
                onSelectDay={setSelectedDay}
                selectedDay={selectedDay}
              />
            ) : (
              <WeekView
                currentDate={currentDate}
                events={events as any[] ?? []}
                onSelectEvent={() => {/* TODO: open event detail */}}
              />
            )}

            {/* Selected day events */}
            {view === 'month' && selectedDay && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-content-secondary">
                  {format(selectedDay, 'MMMM d')}
                </h3>
                {selectedDayEvents.length === 0 ? (
                  <p className="text-sm text-content-muted py-4 text-center">No events this day.</p>
                ) : (
                  selectedDayEvents.map((event: any) => (
                    <EventCard key={event.event_id} event={event} />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </SectionErrorBoundary>

      {/* FAB */}
      <button
        className="fixed bottom-24 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-contrast shadow-raised hover:bg-accent-hover sm:bottom-8"
        aria-label="Add event"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  )
}
