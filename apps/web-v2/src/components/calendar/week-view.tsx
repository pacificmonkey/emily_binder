import { cn } from '@/lib/utils'
import { startOfWeek, addDays, format, isSameDay, isToday, differenceInMinutes, parseISO } from 'date-fns'

interface WeekViewProps {
  currentDate: Date
  events: any[]
  onSelectEvent: (event: any) => void
}

const HOUR_HEIGHT = 60 // px per hour
const START_HOUR = 7
const END_HOUR = 22

const EVENT_TYPE_COLORS: Record<string, string> = {
  appointment: 'bg-info/80 border-info',
  social: 'bg-success/80 border-success',
  therapy: 'bg-accent/80 border-accent',
  medication: 'bg-warning/80 border-warning',
  refill: 'bg-danger/80 border-danger',
  other: 'bg-surface-sunken border-border',
}

export function WeekView({ currentDate, events, onSelectEvent }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  const getEventPosition = (event: any) => {
    const start = parseISO(event.starts_at)
    const end = event.ends_at ? parseISO(event.ends_at) : addDays(start, 0) // default 30 min
    const topMinutes = (start.getHours() - START_HOUR) * 60 + start.getMinutes()
    const heightMinutes = differenceInMinutes(end, start) || 30
    return {
      top: (topMinutes / 60) * HOUR_HEIGHT,
      height: Math.max((heightMinutes / 60) * HOUR_HEIGHT, 24),
    }
  }

  return (
    <div className="flex overflow-x-auto">
      {/* Time gutter */}
      <div className="sticky left-0 z-10 w-16 flex-shrink-0 bg-surface">
        <div className="h-10" /> {/* Header spacer */}
        {hours.map((hour) => (
          <div key={hour} className="relative" style={{ height: HOUR_HEIGHT }}>
            <span className="absolute -top-2 right-2 text-xs text-content-muted">
              {format(new Date(2000, 0, 1, hour), 'h a')}
            </span>
          </div>
        ))}
      </div>

      {/* Day columns */}
      {weekDays.map((day) => {
        const dayEvents = events.filter((e: any) => isSameDay(parseISO(e.starts_at), day))

        return (
          <div key={day.toISOString()} className="flex-1 min-w-[120px] border-l border-border">
            {/* Day header */}
            <div className={cn(
              'sticky top-0 z-10 flex h-10 items-center justify-center bg-surface text-sm font-medium',
              isToday(day) ? 'text-accent' : 'text-content-secondary'
            )}>
              <span>{format(day, 'EEE d')}</span>
            </div>

            {/* Hour grid + events */}
            <div className="relative">
              {hours.map((hour) => (
                <div key={hour} className="border-t border-border/50" style={{ height: HOUR_HEIGHT }} />
              ))}

              {/* Event blocks */}
              {dayEvents.map((event: any) => {
                const pos = getEventPosition(event)
                const colors = EVENT_TYPE_COLORS[event.type] || EVENT_TYPE_COLORS.other

                return (
                  <button
                    key={event.event_id}
                    onClick={() => onSelectEvent(event)}
                    className={cn(
                      'absolute left-1 right-1 rounded-sm border-l-2 px-1.5 py-0.5 text-xs overflow-hidden',
                      colors,
                      'hover:shadow-raised focus-visible:ring-2 focus-visible:ring-accent'
                    )}
                    style={{ top: pos.top, height: pos.height }}
                    aria-label={`${event.title} at ${format(parseISO(event.starts_at), 'h:mm a')}`}
                  >
                    <div className="font-medium truncate">{event.title}</div>
                    <div className="text-[10px] opacity-80 truncate">
                      {format(parseISO(event.starts_at), 'h:mm a')}
                    </div>
                  </button>
                )
              })}

              {/* Transition buffers */}
              {dayEvents.filter((e: any) => e.prep_minutes || e.wind_down_minutes).map((event: any) => {
                if (!event.prep_minutes) return null
                const eventStart = parseISO(event.starts_at)
                const bufferStart = new Date(eventStart.getTime() - event.prep_minutes * 60000)
                const topMinutes = (bufferStart.getHours() - START_HOUR) * 60 + bufferStart.getMinutes()

                return (
                  <div
                    key={`buffer-${event.event_id}`}
                    className="absolute left-1 right-1 rounded-sm bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent"
                    style={{
                      top: (topMinutes / 60) * HOUR_HEIGHT,
                      height: (event.prep_minutes / 60) * HOUR_HEIGHT,
                    }}
                    aria-label={`Prep: ${event.prep_reason || `${event.prep_minutes} min before`}`}
                  >
                    {event.prep_reason || 'Prep time'}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
