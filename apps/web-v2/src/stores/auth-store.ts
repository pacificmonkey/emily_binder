import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

type RoleKey = 'admin' | 'member' | 'support'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  role: RoleKey | null
  workspaceId: string | null
  patientId: string | null
  displayName: string | null
  isImpersonating: boolean
  impersonatedPatientId: string | null
  impersonatedPatientName: string | null

  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  setImpersonation: (patientId: string | null, patientName?: string | null) => void
  setRole: (role: RoleKey) => void
  setPatientInfo: (info: { workspaceId: string; patientId: string; displayName: string; role: RoleKey }) => void
}

/**
 * After authentication, load the user's workspace membership, patient profile,
 * and role so that route guards and data-fetching hooks work correctly.
 */
async function loadUserContext(
  userId: string,
  set: (state: Partial<AuthState>) => void,
) {
  try {
    // Get workspace membership (role + workspace)
    const { data: membership } = await supabase
      .from('workspace_membership')
      .select('workspace_id, role_key')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .single()

    if (!membership) return // not onboarded yet

    // Get patient profile
    const { data: patient } = await supabase
      .from('patient_profile')
      .select('patient_id, full_name')
      .eq('workspace_id', membership.workspace_id)
      .limit(1)
      .single()

    // Get user display name
    const { data: userRecord } = await supabase
      .from('user')
      .select('display_name')
      .eq('user_id', userId)
      .single()

    set({
      role: membership.role_key as RoleKey,
      workspaceId: membership.workspace_id,
      patientId: patient?.patient_id ?? userId,
      displayName: userRecord?.display_name ?? null,
    })
  } catch {
    // If queries fail (e.g. RLS), leave role as null — user will see empty state
  }
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  user: null,
  session: null,
  loading: true,
  role: null,
  workspaceId: null,
  patientId: null,
  displayName: null,
  isImpersonating: false,
  impersonatedPatientId: null,
  impersonatedPatientName: null,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        set({ user: session.user, session })
        // Load workspace context for the authenticated user
        await loadUserContext(session.user.id, set)
      }
      set({ loading: false })

      supabase.auth.onAuthStateChange(async (_event, session) => {
        set({ user: session?.user ?? null, session })
        if (session?.user) {
          await loadUserContext(session.user.id, set)
        }
      })
    } catch {
      set({ loading: false })
    }
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // Eagerly load workspace context so it's ready before navigation
    if (data.user) {
      set({ user: data.user, session: data.session })
      await loadUserContext(data.user.id, set)
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({
      user: null,
      session: null,
      role: null,
      workspaceId: null,
      patientId: null,
      displayName: null,
      isImpersonating: false,
      impersonatedPatientId: null,
      impersonatedPatientName: null,
    })
  },

  setImpersonation: (patientId, patientName = null) => {
    set({
      isImpersonating: patientId !== null,
      impersonatedPatientId: patientId,
      impersonatedPatientName: patientName,
    })
  },

  setRole: (role) => set({ role }),

  setPatientInfo: (info) => set({
    workspaceId: info.workspaceId,
    patientId: info.patientId,
    displayName: info.displayName,
    role: info.role,
  }),
}))
