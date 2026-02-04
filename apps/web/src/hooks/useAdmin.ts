import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  isAdmin,
  getPatientsForImpersonation,
  getImpersonationStatus,
  startImpersonation,
  stopImpersonation,
  getFeatureModules,
  toggleFeatureModule,
  getAuditLog,
  getAuditLogCount,
} from '@/services/admin'
import { storeKeys } from './useStore'
import { streakKeys } from './useStreaks'

// Query keys
export const adminKeys = {
  all: ['admin'] as const,
  isAdmin: ['admin', 'isAdmin'] as const,
  patients: ['admin', 'patients'] as const,
  impersonationStatus: ['admin', 'impersonationStatus'] as const,
  featureModules: ['admin', 'featureModules'] as const,
  auditLog: ['admin', 'auditLog'] as const,
  auditLogCount: ['admin', 'auditLogCount'] as const,
}

// Hook to check if current user is admin
export function useIsAdmin() {
  return useQuery({
    queryKey: adminKeys.isAdmin,
    queryFn: isAdmin,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

// Hook to get patients for impersonation
export function usePatientsForImpersonation() {
  return useQuery({
    queryKey: adminKeys.patients,
    queryFn: getPatientsForImpersonation,
    enabled: false, // Only fetch when explicitly requested
  })
}

// Hook to get current impersonation status
export function useImpersonationStatus() {
  return useQuery({
    queryKey: adminKeys.impersonationStatus,
    queryFn: getImpersonationStatus,
    staleTime: 1000 * 60, // 1 minute
  })
}

// Mutation to start impersonation
export function useStartImpersonation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ targetPatientId, reason }: { targetPatientId: string; reason?: string }) =>
      startImpersonation(targetPatientId, reason),
    onSuccess: () => {
      // Invalidate all data queries since we're now viewing a different patient
      queryClient.invalidateQueries({ queryKey: adminKeys.impersonationStatus })
      queryClient.invalidateQueries({ queryKey: storeKeys.all })
      queryClient.invalidateQueries({ queryKey: streakKeys.all })
      // Invalidate any other patient-specific data
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['budget'] })
    },
  })
}

// Mutation to stop impersonation
export function useStopImpersonation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: stopImpersonation,
    onSuccess: () => {
      // Invalidate all data queries since we're back to own account
      queryClient.invalidateQueries({ queryKey: adminKeys.impersonationStatus })
      queryClient.invalidateQueries({ queryKey: storeKeys.all })
      queryClient.invalidateQueries({ queryKey: streakKeys.all })
      // Invalidate any other patient-specific data
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['budget'] })
    },
  })
}

// ============================================================================
// Feature Module Hooks
// ============================================================================

// Hook to get feature modules
export function useFeatureModules() {
  return useQuery({
    queryKey: adminKeys.featureModules,
    queryFn: getFeatureModules,
  })
}

// Mutation to toggle a feature module
export function useToggleFeatureModule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ featureKey, enabled }: { featureKey: string; enabled: boolean }) =>
      toggleFeatureModule(featureKey, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.featureModules })
    },
  })
}

// ============================================================================
// Audit Log Hooks
// ============================================================================

// Hook to get audit log
export function useAuditLog(
  limit = 100,
  offset = 0,
  objectType?: string,
  action?: string
) {
  return useQuery({
    queryKey: [...adminKeys.auditLog, { limit, offset, objectType, action }],
    queryFn: () => getAuditLog(limit, offset, objectType, action),
  })
}

// Hook to get audit log count
export function useAuditLogCount(objectType?: string, action?: string) {
  return useQuery({
    queryKey: [...adminKeys.auditLogCount, { objectType, action }],
    queryFn: () => getAuditLogCount(objectType, action),
  })
}
