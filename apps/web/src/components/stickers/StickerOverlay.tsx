import { useHomeDecorations } from '@/hooks/useStore'
import type { HomeDecoration } from '@/types/database'
import styles from './StickerOverlay.module.css'

function PlacedSticker({ decoration }: { decoration: HomeDecoration }) {
  const style = {
    left: `${decoration.position.x}%`,
    top: `${decoration.position.y}%`,
    transform: `scale(${decoration.scale || 1}) rotate(${decoration.rotation || 0}deg)`,
  }

  return (
    <div className={styles.sticker} style={style}>
      <span className={styles.stickerImage}>
        {decoration.asset_key || decoration.sticker_name || '🌟'}
      </span>
    </div>
  )
}

export function StickerOverlay() {
  const { data: decorations = [], isLoading } = useHomeDecorations()

  if (isLoading || decorations.length === 0) {
    return null
  }

  return (
    <div className={styles.overlay}>
      {decorations.map((decoration) => (
        <PlacedSticker key={decoration.home_decoration_id} decoration={decoration} />
      ))}
    </div>
  )
}
