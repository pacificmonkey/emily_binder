import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/types/database'

interface Permissions {
  // Role checks
  isJoey: boolean
  isEmily: boolean
  isSupport: boolean
  role: Role | null

  // Mission permissions
  canCreateMission: boolean
  canCreateRecurringMission: boolean
  canCompleteMission: boolean
  canEditAnyMission: boolean
  canDeleteAnyMission: boolean

  // Event permissions
  canCreateEvent: boolean
  canEditOwnEvent: boolean
  canEditAnyEvent: boolean
  canDeleteAnyEvent: boolean

  // Goal permissions
  canCreateDestiny: boolean
  canCreateQuest: boolean
  canUnmarkGoal: boolean

  // Mood permissions
  canSubmitMoodCheckin: boolean
  canViewMoodHistory: boolean

  // Health permissions
  canViewHealth: boolean
  canEditHealth: boolean
  canLogMedIntake: boolean
  canViewIntakeHistory: boolean

  // Admin permissions
  canApproveProposals: boolean
  canManageCategories: boolean
  canManageEconomyConfig: boolean
  canManageStickerCatalog: boolean
  canManageMoodVocabulary: boolean
  canViewJoeyTodos: boolean
  canRepairHistory: boolean
}

export function usePermissions(): Permissions {
  const { profile } = useAuth()

  return useMemo(() => {
    const role = profile?.role_global ?? null
    const isJoey = role === 'joey'
    const isEmily = role === 'emily'
    const isSupport = role === 'support'

    return {
      // Role checks
      isJoey,
      isEmily,
      isSupport,
      role,

      // Mission permissions
      canCreateMission: isEmily || isSupport || isJoey,
      canCreateRecurringMission: isEmily || isJoey, // Support can only propose
      canCompleteMission: isEmily || isJoey,
      canEditAnyMission: isJoey,
      canDeleteAnyMission: isJoey,

      // Event permissions
      canCreateEvent: isEmily || isSupport || isJoey,
      canEditOwnEvent: isEmily || isSupport || isJoey,
      canEditAnyEvent: isJoey,
      canDeleteAnyEvent: isJoey,

      // Goal permissions
      canCreateDestiny: isEmily || isJoey,
      canCreateQuest: isSupport || isJoey,
      canUnmarkGoal: isJoey,

      // Mood permissions
      canSubmitMoodCheckin: isEmily,
      canViewMoodHistory: isJoey,

      // Health permissions (base permissions, actual access may be config-dependent)
      canViewHealth: isEmily || isJoey, // Support depends on config
      canEditHealth: isJoey,
      canLogMedIntake: isEmily || isJoey, // Emily depends on config
      canViewIntakeHistory: isJoey, // Emily depends on config

      // Admin permissions
      canApproveProposals: isJoey,
      canManageCategories: isJoey,
      canManageEconomyConfig: isJoey,
      canManageStickerCatalog: isJoey,
      canManageMoodVocabulary: isJoey,
      canViewJoeyTodos: isJoey,
      canRepairHistory: isJoey,
    }
  }, [profile])
}
