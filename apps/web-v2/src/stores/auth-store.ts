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
        set({ user: session.user, session, loading: false })
      } else {
        set({ loading: false })
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ user: session?.user ?? null, session })
      })
    } catch {
      set({ loading: false })
    }
  },

  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
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
