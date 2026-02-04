import { useState } from 'react'
import { Modal, Button } from '@/components/ui'
import { useTheme } from '@/contexts/ThemeContext'
import { PRESET_COLORS, DEFAULT_ACCENT_COLOR } from '@/lib/colors'
import styles from './ThemeSettings.module.css'

interface ThemeSettingsProps {
  isOpen: boolean
  onClose: () => void
}

export function ThemeSettings({ isOpen, onClose }: ThemeSettingsProps) {
  const { accentColor, setAccentColor, resetToDefault } = useTheme()
  const [customColor, setCustomColor] = useState(accentColor)

  const handlePresetClick = (hex: string) => {
    setAccentColor(hex)
    setCustomColor(hex)
  }

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setCustomColor(color)
    setAccentColor(color)
  }

  const handleReset = () => {
    resetToDefault()
    setCustomColor(DEFAULT_ACCENT_COLOR)
  }

  const isDefault = accentColor === DEFAULT_ACCENT_COLOR

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Theme Settings">
      <div className={styles.content}>
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Accent Color</h4>
          <p className={styles.sectionDescription}>
            Choose a color for buttons and highlights throughout the app.
          </p>
        </div>

        <div className={styles.section}>
          <h5 className={styles.label}>Preset Colors</h5>
          <div className={styles.presetGrid}>
            {PRESET_COLORS.map((color) => (
              <button
                key={color.hex}
                className={`${styles.presetButton} ${
                  accentColor.toLowerCase() === color.hex.toLowerCase() ? styles.selected : ''
                }`}
                style={{ backgroundColor: color.hex }}
                onClick={() => handlePresetClick(color.hex)}
                aria-label={color.name}
                title={color.name}
              >
                {accentColor.toLowerCase() === color.hex.toLowerCase() && (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <h5 className={styles.label}>Custom Color</h5>
          <div className={styles.customColorRow}>
            <div className={styles.colorInputWrapper}>
              <input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className={styles.colorInput}
              />
              <span className={styles.colorPreview} style={{ backgroundColor: customColor }} />
            </div>
            <input
              type="text"
              value={customColor}
              onChange={(e) => {
                const value = e.target.value
                if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                  setCustomColor(value)
                  if (value.length === 7) {
                    setAccentColor(value)
                  }
                }
              }}
              className={styles.hexInput}
              placeholder="#000000"
              maxLength={7}
            />
          </div>
        </div>

        <div className={styles.preview}>
          <h5 className={styles.label}>Preview</h5>
          <div className={styles.previewBox}>
            <Button size="sm">Primary Button</Button>
            <Button size="sm" variant="secondary">Secondary</Button>
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={isDefault}
          >
            Reset to Default
          </Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  )
}
