'use client'

import { useMemo } from 'react'
import type { SymptomEntry } from '@/types/database'

const SEVERITY_MAP = {
  none: 0,
  mild: 1,
  moderate: 2,
  severe: 3,
} as const

interface SymptomSparklineProps {
  entries: SymptomEntry[]
  days: 7 | 30
}

export const SymptomSparkline = ({ entries, days }: SymptomSparklineProps) => {
  const { points, maxSeverity, count } = useMemo(() => {
    const now = new Date()
    const cutoffDate = new Date(now)
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const filteredEntries = entries.filter((entry) => {
      const entryDate = new Date(entry.occurred_at)
      return entryDate >= cutoffDate && entryDate <= now
    })

    if (filteredEntries.length === 0) {
      return { points: [], maxSeverity: 3, count: 0 }
    }

    // Create a bucket for each day
    const dayBuckets = new Map<string, number>()

    for (let i = 0; i < days; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split('T')[0]
      dayBuckets.set(dateKey, 0)
    }

    // Max severity for each day
    filteredEntries.forEach((entry) => {
      const dateKey = entry.occurred_at.split('T')[0]
      const severity = SEVERITY_MAP[entry.severity]
      const existing = dayBuckets.get(dateKey) || 0
      dayBuckets.set(dateKey, Math.max(existing, severity))
    })

    // Convert to array and sort by date
    const points = Array.from(dayBuckets.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([, severity]) => severity)

    const maxSeverity = Math.max(...points, 3)

    return {
      points,
      maxSeverity,
      count: filteredEntries.length,
    }
  }, [entries, days])

  if (points.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2">
        <div className="h-[60px] w-full rounded-soft bg-gray-50" />
        <p className="text-sm text-gray-600">No data yet</p>
      </div>
    )
  }

  // SVG dimensions
  const width = 300
  const height = 60
  const padding = 8
  const innerWidth = width - 2 * padding
  const innerHeight = height - 2 * padding

  // Calculate points for polyline
  const xStep = innerWidth / (points.length - 1 || 1)
  const yScale = innerHeight / Math.max(maxSeverity, 1)

  const polylinePoints = points
    .map((severity, index) => {
      const x = padding + index * xStep
      const y = padding + innerHeight - severity * yScale
      return `${x},${y}`
    })
    .join(' ')

  const dotPoints = points.map((severity, index) => ({
    x: padding + index * xStep,
    y: padding + innerHeight - severity * yScale,
    severity,
  }))

  const dayLabel = days === 7 ? '7 days' : '30 days'

  return (
    <div className="flex flex-col items-start gap-2">
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Polyline */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-blue-500"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {dotPoints.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="3"
            fill="currentColor"
            className="text-blue-500"
          />
        ))}
      </svg>
      <p className="text-sm text-text-content-secondary">
        {count} {count === 1 ? 'entry' : 'entries'} in last {dayLabel}
      </p>
    </div>
  )
}
