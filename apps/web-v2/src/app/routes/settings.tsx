import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useSettingsStore } from '@/stores/settings-store'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'

const ACCENT_COLORS = [
  { name: 'Teal', value: 'teal', hex: '#14b8a6' },
  { name: 'Blue', value: 'blue', hex: '#0ea5e9' },
  { name: 'Purple', value: 'purple', hex: '#a855f7' },
  { name: 'Pink', value: 'pink', hex: '#ec4899' },
  { name: 'Orange', value: 'orange', hex: '#f97316' },
]

export default function SettingsPage() {
  const {
    themeMode,
    accentColor,
    contrastMode,
    textSize,
    motionPreference,
    privacyMode,
    decorationsPolicy,
    setThemeMode,
    setAccentColor,
    setContrastMode,
    setTextSize,
    setMotionPreference,
    setPrivacyMode,
    setDecorationsPolicy,
  } = useSettingsStore()

  const { user, role, signOut } = useAuthStore()

  const handleThemeModeChange = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode)
    toast({
      title: 'Settings updated',
      description: 'Theme preference saved.',
      variant: 'default',
    })
  }

  const handleAccentColorChange = (color: string) => {
    setAccentColor(color)
    toast({
      title: 'Settings updated',
      description: 'Accent color changed.',
      variant: 'default',
    })
  }

  const handleContrastModeChange = () => {
    const newMode = contrastMode === 'standard' ? 'high-contrast' : 'standard'
    setContrastMode(newMode)
    toast({
      title: 'Settings updated',
      description: `Contrast mode: ${newMode.replace('-', ' ')}`,
      variant: 'default',
    })
  }

  const handleTextSizeChange = (size: 'default' | 'large' | 'extra-large') => {
    setTextSize(size)
    toast({
      title: 'Settings updated',
      description: `Text size: ${size.replace('-', ' ')}`,
      variant: 'default',
    })
  }

  const handleMotionPreferenceChange = (pref: 'full' | 'reduced') => {
    setMotionPreference(pref)
    toast({
      title: 'Settings updated',
      description: `Motion: ${pref}`,
      variant: 'default',
    })
  }

  const handlePrivacyModeChange = () => {
    setPrivacyMode(!privacyMode)
    toast({
      title: 'Settings updated',
      description: `Privacy mode ${!privacyMode ? 'enabled' : 'disabled'}.`,
      variant: 'default',
    })
  }

  const handleDecorationsChange = (policy: 'enabled' | 'header-only' | 'disabled') => {
    setDecorationsPolicy(policy)
    toast({
      title: 'Settings updated',
      description: `Decorations: ${policy.replace('-', ' ')}`,
      variant: 'default',
    })
  }

  const handleDataExport = () => {
    toast({
      title: 'Export initiated',
      description: 'Your data export would be sent to your email shortly.',
      variant: 'default',
    })
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully.',
        variant: 'default',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'error',
      })
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHeader title="Settings" />

      {/* Appearance Section */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the app looks and feels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Mode */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-content">Theme Mode</Label>
            <div className="flex flex-wrap gap-2">
              {(['light', 'dark', 'system'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleThemeModeChange(mode)}
                  className={cn(
                    'px-4 py-2 rounded-soft text-sm font-medium transition-all',
                    themeMode === mode
                      ? 'bg-accent text-white shadow-raised'
                      : 'bg-surface-sunken text-content hover:bg-surface'
                  )}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Accent Color */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-content">Accent Color</Label>
            <div className="flex flex-wrap gap-3">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleAccentColorChange(color.value)}
                  className={cn(
                    'w-10 h-10 rounded-full transition-transform border-2',
                    accentColor === color.value
                      ? 'scale-110 border-content ring-2 ring-offset-2 ring-accent'
                      : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                  aria-label={`Select ${color.name} accent color`}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Contrast Mode */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold text-content">High Contrast Mode</Label>
              <p className="text-xs text-content-secondary mt-1">Improves visibility and readability</p>
            </div>
            <button
              onClick={handleContrastModeChange}
              className={cn(
                'relative inline-flex h-8 w-14 items-center rounded-pill transition-colors',
                contrastMode === 'high-contrast' ? 'bg-accent' : 'bg-surface-sunken'
              )}
              role="switch"
              aria-checked={contrastMode === 'high-contrast'}
            >
              <span
                className={cn(
                  'inline-block h-6 w-6 transform rounded-full bg-white transition-transform',
                  contrastMode === 'high-contrast' ? 'translate-x-7' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          <Separator />

          {/* Text Size */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-content">Text Size</Label>
            <div className="flex flex-wrap gap-2">
              {(['default', 'large', 'extra-large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => handleTextSizeChange(size)}
                  className={cn(
                    'px-4 py-2 rounded-soft font-medium transition-all',
                    textSize === size
                      ? 'bg-accent text-white shadow-raised'
                      : 'bg-surface-sunken text-content hover:bg-surface'
                  )}
                  style={{
                    fontSize: size === 'default' ? '0.875rem' : size === 'large' ? '1rem' : '1.125rem',
                  }}
                >
                  {size.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Motion Preference */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-content">Motion & Animation</Label>
            <div className="flex flex-wrap gap-2">
              {(['full', 'reduced'] as const).map((pref) => (
                <button
                  key={pref}
                  onClick={() => handleMotionPreferenceChange(pref)}
                  className={cn(
                    'px-4 py-2 rounded-soft text-sm font-medium transition-all',
                    motionPreference === pref
                      ? 'bg-accent text-white shadow-raised'
                      : 'bg-surface-sunken text-content hover:bg-surface'
                  )}
                >
                  {pref.charAt(0).toUpperCase() + pref.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Privacy Mode */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold text-content">Privacy Mode</Label>
              <p className="text-xs text-content-secondary mt-1">Hide sensitive information from view</p>
            </div>
            <button
              onClick={handlePrivacyModeChange}
              className={cn(
                'relative inline-flex h-8 w-14 items-center rounded-pill transition-colors',
                privacyMode ? 'bg-accent' : 'bg-surface-sunken'
              )}
              role="switch"
              aria-checked={privacyMode}
            >
              <span
                className={cn(
                  'inline-block h-6 w-6 transform rounded-full bg-white transition-transform',
                  privacyMode ? 'translate-x-7' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          <Separator />

          {/* Decorations Policy */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-content">Decorations</Label>
            <div className="flex flex-wrap gap-2">
              {(['enabled', 'header-only', 'disabled'] as const).map((policy) => (
                <button
                  key={policy}
                  onClick={() => handleDecorationsChange(policy)}
                  className={cn(
                    'px-4 py-2 rounded-soft text-sm font-medium transition-all',
                    decorationsPolicy === policy
                      ? 'bg-accent text-white shadow-raised'
                      : 'bg-surface-sunken text-content hover:bg-surface'
                  )}
                >
                  {policy.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Manage how you receive updates</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-content-secondary text-sm">
            Notification preferences coming soon. Push delivery not yet implemented.
          </p>
        </CardContent>
      </Card>

      {/* Data & Privacy Section */}
      <Card>
        <CardHeader>
          <CardTitle>Data & Privacy</CardTitle>
          <CardDescription>Manage your account and data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Account Info */}
          {user && (
            <div className="space-y-3 pb-4 border-b border-border">
              <div>
                <p className="text-xs text-content-secondary uppercase font-semibold">Email</p>
                <p className="text-sm text-content mt-1">{user.email}</p>
              </div>
              {role && (
                <div>
                  <p className="text-xs text-content-secondary uppercase font-semibold">Role</p>
                  <p className="text-sm text-content mt-1 capitalize">{role}</p>
                </div>
              )}
            </div>
          )}

          {/* Data Export */}
          <Button
            variant="outline"
            size="default"
            onClick={handleDataExport}
            className="w-full"
          >
            📥 Export My Data
          </Button>

          {/* Sign Out */}
          <Button
            variant="destructive"
            size="default"
            onClick={handleSignOut}
            className="w-full"
          >
            🚪 Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
