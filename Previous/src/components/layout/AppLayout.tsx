import { type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { BottomNav } from './BottomNav'
import styles from './AppLayout.module.css'

export interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { signOut, profile } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.headerTitle}>
          {profile?.display_name || 'Emily Mission Log'}
        </span>
        <button
          onClick={handleLogout}
          className={styles.logoutButton}
          aria-label="Sign out"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </header>
      <main className={styles.main}>{children}</main>
      <BottomNav />
    </div>
  )
}
