import { NavLink, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingScreen } from '@/components/shared/loading-screen'
import {
  BarChart3,
  Coins,
  Sticker,
  Flame,
  Users,
  ToggleLeft,
  Palette,
  Settings,
  ScrollText,
  Award,
  FileText,
  Bell,
  UserCheck,
} from 'lucide-react'
import Dashboard from './dashboard'
import CoinsPage from './coins'
import PatientsPage from './patients'
import FeaturesPage from './features'
import WorkspaceSettingsPage from './workspace-settings'
import AuditLogPage from './audit'

// Lazy load admin pages
const StickersAdmin = lazy(() => import('./stickers'))
const StreaksAdmin = lazy(() => import('./streaks'))
const CategoriesAdmin = lazy(() => import('./categories'))
const TemplatesAdmin = lazy(() => import('./templates'))
const BadgesAdmin = lazy(() => import('./badges'))
const SendNotificationAdmin = lazy(() => import('./send-notification'))
const SupportAssignmentsAdmin = lazy(() => import('./support-assignments'))

const adminTabs = [
  { to: '/admin', icon: BarChart3, label: 'Dashboard', end: true },
  { to: '/admin/coins', icon: Coins, label: 'Coins' },
  { to: '/admin/stickers', icon: Sticker, label: 'Stickers' },
  { to: '/admin/streaks', icon: Flame, label: 'Streaks' },
  { to: '/admin/patients', icon: Users, label: 'Patients' },
  { to: '/admin/features', icon: ToggleLeft, label: 'Features' },
  { to: '/admin/categories', icon: Palette, label: 'Categories' },
  { to: '/admin/templates', icon: FileText, label: 'Templates' },
  { to: '/admin/badges', icon: Award, label: 'Badges' },
  { to: '/admin/support', icon: UserCheck, label: 'Support' },
  { to: '/admin/notifications', icon: Bell, label: 'Send Alert' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
  { to: '/admin/audit', icon: ScrollText, label: 'Audit Log' },
]


function LoadingSuspense() {
  return <LoadingScreen />
}

export default function AdminLayout() {
  return (
    <div className="space-y-6">
      <PageHeader title="Admin Panel" />

      <nav className="flex overflow-x-auto gap-1 pb-2 -mx-1" aria-label="Admin navigation">
        {adminTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-1.5 whitespace-nowrap rounded-soft px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-light text-accent'
                  : 'text-content-secondary hover:bg-surface-sunken hover:text-content'
              )
            }
          >
            <tab.icon className="h-4 w-4" aria-hidden="true" />
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Suspense fallback={<LoadingSuspense />}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="coins" element={<CoinsPage />} />
          <Route path="stickers" element={<StickersAdmin />} />
          <Route path="streaks" element={<StreaksAdmin />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="features" element={<FeaturesPage />} />
          <Route path="categories" element={<CategoriesAdmin />} />
          <Route path="templates" element={<TemplatesAdmin />} />
          <Route path="badges" element={<BadgesAdmin />} />
          <Route path="support" element={<SupportAssignmentsAdmin />} />
          <Route path="notifications" element={<SendNotificationAdmin />} />
          <Route path="settings" element={<WorkspaceSettingsPage />} />
          <Route path="audit" element={<AuditLogPage />} />
        </Routes>
      </Suspense>
    </div>
  )
}
