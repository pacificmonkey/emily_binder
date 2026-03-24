import { Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { Sidebar } from '@/components/shared/sidebar'
import { BottomNavBar } from '@/components/shared/bottom-nav-bar'
import { ImpersonationBanner } from '@/components/shared/impersonation-banner'
import { useMediaQuery } from '@/hooks/use-media-query'

export function RootLayout() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const { isImpersonating } = useAuthStore()

  return (
    <div className="min-h-screen bg-surface">
      {isImpersonating && <ImpersonationBanner />}
      <div className="flex">
        {!isMobile && <Sidebar />}
        <main className={`flex-1 ${isMobile ? 'pb-20' : ''}`}>
          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
      {isMobile && <BottomNavBar />}
    </div>
  )
}
