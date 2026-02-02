import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Use ref to track if initial auth has completed
  const initializedRef = useRef(false)
  // Track current profile to avoid unnecessary refetches (avoids closure issues)
  const profileRef = useRef<Profile | null>(null)

  // Fetch profile with timeout to prevent hanging
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    console.log('[Auth] Fetching profile for:', userId)

    // Create a timeout promise
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn('[Auth] Profile fetch timed out after 5s')
        resolve(null)
      }, 5000)
    })

    // Create the actual fetch promise
    const fetchPromise = (async (): Promise<Profile | null> => {
      try {
        console.log('[Auth] Starting Supabase query...')
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        console.log('[Auth] Supabase query completed:', { data: data?.role_global, error: error?.message })

        if (error) {
          console.error('[Auth] Profile query error:', error)
          return null
        }

        console.log('[Auth] Profile fetched successfully:', data?.role_global)
        return data as Profile
      } catch (err) {
        console.error('[Auth] Profile fetch exception:', err)
        return null
      }
    })()

    // Race between timeout and fetch
    return Promise.race([fetchPromise, timeoutPromise])
  }, [])

  // Keep profileRef in sync with profile state
  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  // Refresh profile manually (useful after profile updates or to recover from errors)
  const refreshProfile = useCallback(async () => {
    if (user) {
      const newProfile = await fetchProfile(user.id)
      if (newProfile) {
        setProfile(newProfile)
      }
    }
  }, [user, fetchProfile])

  // Initialize auth state
  useEffect(() => {
    console.log('[Auth] Initializing auth state...')

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      console.log('[Auth] Initial session:', initialSession ? 'exists' : 'null')

      setSession(initialSession)
      setUser(initialSession?.user ?? null)

      if (initialSession?.user) {
        const fetchedProfile = await fetchProfile(initialSession.user.id)
        setProfile(fetchedProfile)
      }

      initializedRef.current = true
      setIsLoading(false)
    }).catch((error) => {
      console.error('[Auth] Error getting initial session:', error)
      initializedRef.current = true
      setIsLoading(false)
    })

    // Listen for auth changes after initialization
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[Auth] Auth state changed:', event, newSession ? 'session exists' : 'no session')

        // Only process meaningful auth changes
        if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setProfile(null)
          if (!initializedRef.current) {
            initializedRef.current = true
            setIsLoading(false)
          }
          return
        }

        // For SIGNED_IN, TOKEN_REFRESHED, etc - update session but be careful with profile
        setSession(newSession)

        if (newSession?.user) {
          const newUserId = newSession.user.id
          setUser(newSession.user)

          // Only fetch profile if:
          // 1. We don't have a profile yet, OR
          // 2. The user ID changed (different user signed in)
          const currentProfile = profileRef.current
          const needsFetch = !currentProfile || currentProfile.id !== newUserId

          if (needsFetch) {
            console.log('[Auth] Fetching profile (needed):', { hasProfile: !!currentProfile, userId: newUserId })
            const fetchedProfile = await fetchProfile(newUserId)
            // Only update if we got a result - don't clear existing profile on timeout
            if (fetchedProfile) {
              setProfile(fetchedProfile)
            }
          } else {
            console.log('[Auth] Skipping profile fetch - already have valid profile')
          }

          if (!initializedRef.current) {
            initializedRef.current = true
            setIsLoading(false)
          }
        } else {
          setUser(null)
          setProfile(null)
          if (!initializedRef.current) {
            initializedRef.current = true
            setIsLoading(false)
          }
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error: error ? new Error(error.message) : null }
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    })
    return { error: error ? new Error(error.message) : null }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('[Auth] Error signing out:', err)
    }
    // Clear all auth state
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error: error ? new Error(error.message) : null }
  }

  // Debug log auth state
  console.log('[Auth State]', {
    user: user?.id ?? null,
    profile: profile?.role_global ?? null,
    session: session ? 'exists' : null,
    isLoading,
  })

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
