import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ThemeMode = 'light' | 'dark' | 'system'
type TextSize = 'default' | 'large' | 'extra-large'
type MotionPreference = 'full' | 'reduced'
type DecorationsPolicy = 'enabled' | 'header-only' | 'disabled'

interface SettingsState {
  themeMode: ThemeMode
  accentColor: string
  contrastMode: 'standard' | 'high-contrast'
  textSize: TextSize
  motionPreference: MotionPreference
  privacyMode: boolean
  decorationsPolicy: DecorationsPolicy

  setThemeMode: (mode: ThemeMode) => void
  setAccentColor: (color: string) => void
  setContrastMode: (mode: 'standard' | 'high-contrast') => void
  setTextSize: (size: TextSize) => void
  setMotionPreference: (pref: MotionPreference) => void
  setPrivacyMode: (enabled: boolean) => void
  setDecorationsPolicy: (policy: DecorationsPolicy) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      accentColor: 'teal',
      contrastMode: 'standard',
      textSize: 'default',
      motionPreference: 'full',
      privacyMode: false,
      decorationsPolicy: 'enabled',

      setThemeMode: (mode) => set({ themeMode: mode }),
      setAccentColor: (color) => set({ accentColor: color }),
      setContrastMode: (mode) => set({ contrastMode: mode }),
      setTextSize: (size) => set({ textSize: size }),
      setMotionPreference: (pref) => set({ motionPreference: pref }),
      setPrivacyMode: (enabled) => set({ privacyMode: enabled }),
      setDecorationsPolicy: (policy) => set({ decorationsPolicy: policy }),
    }),
    { name: 'emilys-missions-settings' }
  )
)
