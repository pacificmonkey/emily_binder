import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
} from 'date-fns'

interface MonthViewProps {
  currentDate: Date
  events: any[]
  onSelectDay: (date: Date) => void
  selectedDay?: Date | null
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  appointment: 'bg-info',
  social: 'bg-success',
  therapy: 'bg-accent',
  medication: 'bg-warning',
  refill: 'bg-danger',
  other: 'bg-content-muted',
}

export function MonthView({ currentDate, events, onSelectDay, selectedDay }: MonthViewProps) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate))
    const end = endOfWeek(endOfMonth(currentDate))
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  const eventsByDay = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const event of events) {
      const dayKey = format(new Date(event.starts_at), 'yyyy-MM-dd')
      if (!map[dayKey]) map[dayKey] = []
      map[dayKey].push(event)
    }
    return map
  }, [events])

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-content-muted">
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px" role="grid" aria-label="Calendar">
        {days.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDay[dayKey] || []
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isSelected = selectedDay && isSameDay(day, selectedDay)

          return (
            <button
              key={dayKey}
              onClick={() => onSelectDay(day)}
              className={cn(
                'relative flex flex-col items-center rounded-soft p-2 text-sm transition-colors',
                'min-h-[44px] focus-visible:ring-2 focus-visible:ring-accent',
                !isCurrentMonth && 'text-content-muted',
                isCurrentMonth && 'text-content',
                isToday(day) && 'font-bold',
                isSelected && 'bg-accent-light ring-2 ring-accent',
                !isSelected && 'hover:bg-surface-sunken',
              )}
              aria-label={`${format(day, 'MMMM d')}${dayEvents.length ? `, ${dayEvents.length} events` : ''}`}
              role="gridcell"
            >
              <span className={cn(
                isToday(day) && 'flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-contrast'
              )}>
                {format(day, 'd')}
              </span>

              {/* Event dots */}
              {dayEvents.length > 0 && (
                <div className="mt-1 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((event: any, i: number) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        EVENT_TYPE_COLORS[event.type] || EVENT_TYPE_COLORS.other
                      )}
                      aria-hidden="true"
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[8px] text-content-muted">+{dayEvents.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
