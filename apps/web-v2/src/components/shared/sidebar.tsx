import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import {
  Home,
  Calendar,
  Heart,
  DollarSign,
  Target,
  ShoppingBag,
  Palette,
  Leaf,
  BookOpen,
  ShoppingCart,
  User,
  Settings,
  Shield,
} from 'lucide-react'

const memberNav = [
  { to: '/', icon: Home, label: 'Today' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/health', icon: Heart, label: 'Health' },
  { to: '/budget', icon: DollarSign, label: 'Budget' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/shop', icon: ShoppingBag, label: 'Shop' },
  { to: '/sticker-wall', icon: Palette, label: 'Sticker Wall' },
  { to: '/wellbeing', icon: Leaf, label: 'Wellbeing' },
  { to: '/recipes', icon: BookOpen, label: 'Recipes' },
  { to: '/shopping', icon: ShoppingCart, label: 'Shopping' },
]

const bottomNav = [
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const role = useAuthStore((s) => s.role)
  const displayName = useAuthStore((s) => s.displayName)

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-border bg-surface-raised">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-content">Emily's Missions</h2>
      </div>

      <nav className="flex-1 space-y-1 px-2 overflow-y-auto" aria-label="Main navigation">
        {memberNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-soft px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-light text-accent'
                  : 'text-content-secondary hover:bg-surface-sunken hover:text-content'
              )
            }
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border px-2 py-2 space-y-1">
        {bottomNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-soft px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-light text-accent'
                  : 'text-content-secondary hover:bg-surface-sunken hover:text-content'
              )
            }
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}

        {role === 'admin' && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-soft px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-light text-accent'
                  : 'text-content-secondary hover:bg-surface-sunken hover:text-content'
              )
            }
          >
            <Shield className="h-5 w-5" aria-hidden="true" />
            Admin
          </NavLink>
        )}

        {role === 'support' && (
          <NavLink
            to="/support"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-soft px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-light text-accent'
                  : 'text-content-secondary hover:bg-surface-sunken hover:text-content'
              )
            }
          >
            <Shield className="h-5 w-5" aria-hidden="true" />
            Support
          </NavLink>
        )}
      </div>

      {displayName && (
        <div className="border-t border-border p-4">
          <p className="text-sm font-medium text-content">{displayName}</p>
        </div>
      )}
    </aside>
  )
}
