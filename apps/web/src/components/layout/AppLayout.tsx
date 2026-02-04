import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdmin } from '@/hooks/useAdmin'
import { ImpersonationBanner, AdminPatientSelector } from '@/components/admin'
import { NotificationDropdown } from '@/components/notifications'
import styles from './AppLayout.module.css'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { signOut, user } = useAuth()
  const { data: isAdmin } = useIsAdmin()

  return (
    <div className={styles.layout}>
      <ImpersonationBanner />
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>✨</span>
            <span className={styles.logoText}>Emily's Missions</span>
          </div>
          <NotificationDropdown />
        </div>

        <nav className={styles.nav}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <span className={styles.navIcon}>🏠</span>
            <span>Today</span>
          </NavLink>
          <NavLink
            to="/tasks"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <span className={styles.navIcon}>✓</span>
            <span>Tasks</span>
          </NavLink>
          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <span className={styles.navIcon}>📅</span>
            <span>Calendar</span>
          </NavLink>
          <NavLink
            to="/health"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <span className={styles.navIcon}>💊</span>
            <span>Health</span>
          </NavLink>
          <NavLink
            to="/wellbeing"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <span className={styles.navIcon}>🧘</span>
            <span>Wellbeing</span>
          </NavLink>
          <NavLink
            to="/budget"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <span className={styles.navIcon}>💰</span>
            <span>Budget</span>
          </NavLink>
          <NavLink
            to="/recipes"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <span className={styles.navIcon}>📖</span>
            <span>Recipes</span>
          </NavLink>
          <NavLink
            to="/shopping"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <span className={styles.navIcon}>🛒</span>
            <span>Shopping</span>
          </NavLink>
          <NavLink
            to="/shop"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <span className={styles.navIcon}>🛍️</span>
            <span>Shop</span>
          </NavLink>
          <NavLink
            to="/sticker-wall"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <span className={styles.navIcon}>🖼️</span>
            <span>Sticker Wall</span>
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `${styles.navItem} ${styles.navItemAdmin} ${isActive ? styles.navItemActive : ''}`
              }
            >
              <span className={styles.navIcon}>⚙️</span>
              <span>Admin</span>
            </NavLink>
          )}
        </nav>

        <div className={styles.sidebarFooter}>
          <AdminPatientSelector />
          <div className={styles.userInfo}>
            <span className={styles.userEmail}>{user?.email}</span>
          </div>
          <button onClick={signOut} className={styles.signOutButton}>
            Sign Out
          </button>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  )
}
