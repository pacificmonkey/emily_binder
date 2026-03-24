import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { MapPin, Repeat, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface EventCardProps {
  event: any
  onTap?: (event: any) => void
}

const TYPE_COLORS: Record<string, string> = {
  appointment: 'border-l-info',
  social: 'border-l-success',
  therapy: 'border-l-[hsl(var(--accent))]',
  medication: 'border-l-warning',
  refill: 'border-l-danger',
  other: 'border-l-content-muted',
}

export function EventCard({ event, onTap }: EventCardProps) {
  return (
    <button
      onClick={() => onTap?.(event)}
      className={cn(
        'w-full text-left rounded-soft bg-surface shadow-soft p-4 border-l-4 transition-shadow hover:shadow-raised',
        'focus-visible:ring-2 focus-visible:ring-accent',
        TYPE_COLORS[event.type] || TYPE_COLORS.other
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-content">{event.title}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-content-secondary">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>
              {format(parseISO(event.starts_at), 'h:mm a')}
              {event.ends_at && ` – ${format(parseISO(event.ends_at), 'h:mm a')}`}
            </span>
          </div>
          {event.location && (
            <div className="mt-1 flex items-center gap-2 text-xs text-content-muted">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              <span>{event.location}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="secondary">{event.type}</Badge>
          {event.recurrence && event.recurrence !== 'none' && (
            <div className="flex items-center gap-1 text-[10px] text-content-muted">
              <Repeat className="h-3 w-3" aria-hidden="true" />
              {event.recurrence}
            </div>
          )}
        </div>
      </div>

      {/* Transition buffers */}
      {event.prep_minutes && (
        <div className="mt-2 rounded bg-accent/5 px-2 py-1 text-xs text-accent">
          Prep: {event.prep_minutes} min{event.prep_reason ? ` — ${event.prep_reason}` : ''}
        </div>
      )}
      {event.wind_down_minutes && (
        <div className="mt-1 rounded bg-accent/5 px-2 py-1 text-xs text-accent">
          Wind down: {event.wind_down_minutes} min
        </div>
      )}
    </button>
  )
}
