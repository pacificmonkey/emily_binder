/**
 * ColorPalette - Styled color picker with preset colors
 */

import { useState } from 'react'
import styles from './ColorPalette.module.css'

// Preset colors for categories
const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
  '#92400e', // brown
]

interface ColorPaletteProps {
  value: string
  onChange: (color: string) => void
  label?: string
}

export function ColorPalette({ value, onChange, label }: ColorPaletteProps) {
  const [showCustom, setShowCustom] = useState(false)

  return (
    <div className={styles.container}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.palette}>
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`${styles.swatch} ${value === color ? styles.selected : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
            aria-label={`Select color ${color}`}
          />
        ))}
        <button
          type="button"
          className={`${styles.swatch} ${styles.customButton}`}
          onClick={() => setShowCustom(!showCustom)}
          aria-label="Custom color"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v8M8 12h8" />
          </svg>
        </button>
      </div>
      {showCustom && (
        <div className={styles.customPicker}>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={styles.colorInput}
          />
          <span className={styles.colorValue}>{value}</span>
        </div>
      )}
    </div>
  )
}
