/**
 * Sticker settings store - persisted preferences for sticker canvas
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface StickerSettings {
  snapToGrid: boolean
  gridSize: number
  showGrid: boolean
  setSnapToGrid: (enabled: boolean) => void
  setGridSize: (size: number) => void
  setShowGrid: (show: boolean) => void
}

export const useStickerSettings = create<StickerSettings>()(
  persist(
    (set) => ({
      snapToGrid: false,
      gridSize: 20,
      showGrid: false,
      setSnapToGrid: (enabled) => set({ snapToGrid: enabled }),
      setGridSize: (size) => set({ gridSize: size }),
      setShowGrid: (show) => set({ showGrid: show }),
    }),
    {
      name: 'sticker-settings',
    }
  )
)
