import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import {
  generateAccentPalette,
  applyAccentColors,
  resetAccentColors,
  DEFAULT_ACCENT_COLOR,
} from '@/lib/colors'

const STORAGE_KEY = 'emily-accent-color'

interface ThemeContextValue {
  accentColor: string
  setAccentColor: (color: string) => void
  resetToDefault: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [accentColor, setAccentColorState] = useState<string>(() => {
    // Load from localStorage on init
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved || DEFAULT_ACCENT_COLOR
    }
    return DEFAULT_ACCENT_COLOR
  })

  // Apply colors on mount and when accent changes
  useEffect(() => {
    if (accentColor === DEFAULT_ACCENT_COLOR) {
      resetAccentColors()
    } else {
      const palette = generateAccentPalette(accentColor)
      applyAccentColors(palette)
    }
  }, [accentColor])

  const setAccentColor = (color: string) => {
    setAccentColorState(color)
    localStorage.setItem(STORAGE_KEY, color)
  }

  const resetToDefault = () => {
    setAccentColorState(DEFAULT_ACCENT_COLOR)
    localStorage.removeItem(STORAGE_KEY)
    resetAccentColors()
  }

  return (
    <ThemeContext.Provider
      value={{
        accentColor,
        setAccentColor,
        resetToDefault,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
