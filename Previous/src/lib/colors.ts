/**
 * Color utilities for generating accent color palettes
 */

// Convert hex to HSL
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  hex = hex.replace(/^#/, '')

  // Parse RGB values
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

// Convert HSL to hex
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0

  if (0 <= h && h < 60) {
    r = c
    g = x
    b = 0
  } else if (60 <= h && h < 120) {
    r = x
    g = c
    b = 0
  } else if (120 <= h && h < 180) {
    r = 0
    g = c
    b = x
  } else if (180 <= h && h < 240) {
    r = 0
    g = x
    b = c
  } else if (240 <= h && h < 300) {
    r = x
    g = 0
    b = c
  } else if (300 <= h && h < 360) {
    r = c
    g = 0
    b = x
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Generate a color with adjusted lightness
function adjustLightness(h: number, s: number, targetL: number): string {
  return hslToHex(h, s, targetL)
}

// Generate a complete accent color palette from a base color
export interface AccentPalette {
  50: string
  100: string
  200: string
  300: string
  400: string
  500: string
  600: string
  700: string
  800: string
  900: string
}

export function generateAccentPalette(baseColor: string): AccentPalette {
  const { h, s } = hexToHsl(baseColor)

  // Generate palette with varying lightness
  // Lighter shades have higher L, darker shades have lower L
  return {
    50: adjustLightness(h, Math.min(s, 30), 97),
    100: adjustLightness(h, Math.min(s + 5, 60), 92),
    200: adjustLightness(h, Math.min(s + 10, 70), 84),
    300: adjustLightness(h, s, 72),
    400: adjustLightness(h, s, 58),
    500: adjustLightness(h, s, 48),
    600: adjustLightness(h, s + 5, 40),
    700: adjustLightness(h, s + 10, 32),
    800: adjustLightness(h, s + 10, 26),
    900: adjustLightness(h, s + 5, 22),
  }
}

// Apply accent palette to CSS variables
export function applyAccentColors(palette: AccentPalette): void {
  const root = document.documentElement

  root.style.setProperty('--color-accent-50', palette[50])
  root.style.setProperty('--color-accent-100', palette[100])
  root.style.setProperty('--color-accent-200', palette[200])
  root.style.setProperty('--color-accent-300', palette[300])
  root.style.setProperty('--color-accent-400', palette[400])
  root.style.setProperty('--color-accent-500', palette[500])
  root.style.setProperty('--color-accent-600', palette[600])
  root.style.setProperty('--color-accent-700', palette[700])
  root.style.setProperty('--color-accent-800', palette[800])
  root.style.setProperty('--color-accent-900', palette[900])
}

// Reset to default orange palette
export function resetAccentColors(): void {
  const root = document.documentElement

  root.style.setProperty('--color-accent-50', '#fef7ee')
  root.style.setProperty('--color-accent-100', '#fdedd3')
  root.style.setProperty('--color-accent-200', '#fad7a6')
  root.style.setProperty('--color-accent-300', '#f6bc6e')
  root.style.setProperty('--color-accent-400', '#f19735')
  root.style.setProperty('--color-accent-500', '#ee7b12')
  root.style.setProperty('--color-accent-600', '#df6108')
  root.style.setProperty('--color-accent-700', '#b94909')
  root.style.setProperty('--color-accent-800', '#933a0f')
  root.style.setProperty('--color-accent-900', '#773210')
}

// Default accent color (orange)
export const DEFAULT_ACCENT_COLOR = '#ee7b12'

// Preset color options
export const PRESET_COLORS = [
  { name: 'Orange', hex: '#ee7b12' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Indigo', hex: '#6366f1' },
]
