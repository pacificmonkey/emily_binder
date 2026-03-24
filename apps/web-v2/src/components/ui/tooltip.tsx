import * as React from 'react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  return (
    <div className="group relative inline-flex">
      {children}
      <div
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 hidden whitespace-nowrap rounded-soft bg-content px-2 py-1 text-xs text-surface shadow-raised group-hover:block',
          side === 'top' && 'bottom-full left-1/2 mb-2 -translate-x-1/2',
          side === 'bottom' && 'top-full left-1/2 mt-2 -translate-x-1/2',
        )}
      >
        {content}
      </div>
    </div>
  )
}
