import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import {
  Home,
  Calendar,
  Heart,
  DollarSign,
  MoreHorizontal,
  Target,
  ShoppingBag,
  Palette,
  Leaf,
  BookOpen,
  ShoppingCart,
  User,
  Settings,
  Shield,
  Bell,
  X,
} from 'lucide-react'

const mainTabs = [
  { to: '/', icon: Home, label: 'Today' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/health', icon: Heart, label: 'Health' },
  { to: '/budget', icon: DollarSign, label: 'Budget' },
]

const moreItems = [
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/shop', icon: ShoppingBag, label: 'Shop' },
  { to: '/sticker-wall', icon: Palette, label: 'Sticker Wall' },
  { to: '/wellbeing', icon: Leaf, label: 'Wellbeing' },
  { to: '/recipes', icon: BookOpen, label: 'Recipes' },
  { to: '/shopping', icon: ShoppingCart, label: 'Shopping' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function BottomNavBar() {
  const [moreOpen, setMoreOpen] = useState(false)
  const role = useAuthStore((s) => s.role)

  return (
    <>
      {/* More sheet overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-16 left-0 right-0 z-50 rounded-t-2xl bg-surface p-4 shadow-raised animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-content">More</h2>
              <button
                onClick={() => setMoreOpen(false)}
                className="rounded-full p-2 hover:bg-surface-sunken"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="grid grid-cols-3 gap-2" aria-label="More navigation">
              {moreItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center gap-1 rounded-soft p-3 text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-accent-light text-accent'
                        : 'text-content-secondary hover:bg-surface-sunken'
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
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center gap-1 rounded-soft p-3 text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-accent-light text-accent'
                        : 'text-content-secondary hover:bg-surface-sunken'
                    )
                  }
                >
                  <Shield className="h-5 w-5" aria-hidden="true" />
                  Admin
                </NavLink>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-border bg-surface px-2 py-1"
        aria-label="Main navigation"
      >
        {mainTabs.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-soft px-3 py-1 text-[10px] font-medium transition-colors',
                isActive ? 'text-accent' : 'text-content-muted'
              )
            }
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={cn(
            'flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-soft px-3 py-1 text-[10px] font-medium transition-colors',
            moreOpen ? 'text-accent' : 'text-content-muted'
          )}
          aria-label="More options"
          aria-expanded={moreOpen}
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          More
        </button>
      </nav>
    </>
  )
}
