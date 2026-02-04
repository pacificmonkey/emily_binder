import styles from './CompletionRing.module.css'

interface CompletionRingProps {
  percentage: number
  size?: number
  strokeWidth?: number
}

export function CompletionRing({
  percentage,
  size = 40,
  strokeWidth = 4,
}: CompletionRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference
  const isComplete = percentage >= 100

  return (
    <div className={styles.container} style={{ width: size, height: size }}>
      <svg
        className={styles.ring}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          className={styles.background}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          className={`${styles.progress} ${isComplete ? styles.complete : ''}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className={`${styles.label} ${isComplete ? styles.completeLabel : ''}`}>
        {Math.round(percentage)}%
      </span>
    </div>
  )
}
