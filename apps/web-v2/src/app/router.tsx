import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ProtectedRoute, AdminRoute, MemberRoute, SupportRoute } from './route-guards'
import { RootLayout } from './layout'
import { LoadingScreen } from '@/components/shared/loading-screen'

// Eager: auth pages
import { LoginPage } from '@/app/routes/login'
import { OnboardingPage } from '@/app/routes/onboarding'

// Lazy: all other pages
const TodayPage = lazy(() => import('@/app/routes/today'))
const CalendarPage = lazy(() => import('@/app/routes/calendar'))
const HealthPage = lazy(() => import('@/app/routes/health'))
const BudgetPage = lazy(() => import('@/app/routes/budget'))
const GoalsPage = lazy(() => import('@/app/routes/goals'))
const StorePage = lazy(() => import('@/app/routes/store'))
const StickerWallPage = lazy(() => import('@/app/routes/sticker-wall'))
const WellbeingPage = lazy(() => import('@/app/routes/wellbeing'))
const RecipesPage = lazy(() => import('@/app/routes/recipes'))
const ShoppingPage = lazy(() => import('@/app/routes/shopping'))
const SettingsPage = lazy(() => import('@/app/routes/settings'))
const ProfilePage = lazy(() => import('@/app/routes/profile'))
const SupportDashboardPage = lazy(() => import('@/app/routes/support'))
const NotificationsPage = lazy(() => import('@/app/routes/notifications'))
const AdminLayout = lazy(() => import('@/app/routes/admin/layout'))

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/onboarding',
    element: <OnboardingPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <RootLayout />,
        children: [
          // Member routes
          {
            element: <MemberRoute />,
            children: [
              { index: true, element: <LazyPage><TodayPage /></LazyPage> },
              { path: 'calendar', element: <LazyPage><CalendarPage /></LazyPage> },
              { path: 'health', element: <LazyPage><HealthPage /></LazyPage> },
              { path: 'budget', element: <LazyPage><BudgetPage /></LazyPage> },
              { path: 'goals', element: <LazyPage><GoalsPage /></LazyPage> },
              { path: 'shop', element: <LazyPage><StorePage /></LazyPage> },
              { path: 'sticker-wall', element: <LazyPage><StickerWallPage /></LazyPage> },
              { path: 'wellbeing', element: <LazyPage><WellbeingPage /></LazyPage> },
              { path: 'recipes', element: <LazyPage><RecipesPage /></LazyPage> },
              { path: 'shopping', element: <LazyPage><ShoppingPage /></LazyPage> },
              { path: 'settings', element: <LazyPage><SettingsPage /></LazyPage> },
              { path: 'profile', element: <LazyPage><ProfilePage /></LazyPage> },
              { path: 'notifications', element: <LazyPage><NotificationsPage /></LazyPage> },
            ],
          },
          // Support routes
          {
            element: <SupportRoute />,
            children: [
              { path: 'support', element: <LazyPage><SupportDashboardPage /></LazyPage> },
            ],
          },
          // Admin routes
          {
            element: <AdminRoute />,
            children: [
              { path: 'admin/*', element: <LazyPage><AdminLayout /></LazyPage> },
            ],
          },
        ],
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
