import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import * as adminService from '@/services/admin'
import * as workspaceService from '@/services/workspaceConfig'
import type {
  Patient,
  CreateUserInput,
} from '@/services/admin'

/**
 * Query hook for fetching admin dashboard statistics
 */
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminService.getAdminDashboardStats(),
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

/**
 * Query hook for fetching patients available for impersonation
 */
export function usePatients() {
  return useQuery({
    queryKey: ['admin-patients'],
    queryFn: () => adminService.getPatientsForImpersonation(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Mutation hook for starting impersonation
 */
export function useStartImpersonation() {
  const queryClient = useQueryClient()
  const setImpersonation = useAuthStore((state) => state.setImpersonation)

  return useMutation({
    mutationFn: async ({ patientId, reason }: { patientId: string; reason?: string }) => {
      return adminService.startImpersonation(patientId, reason)
    },
    onSuccess: (data, _variables) => {
      // Get patient name from query cache if available
      const patients = queryClient.getQueryData<Patient[]>(['admin-patients'])
      const patientName = patients?.find((p) => p.patient_id === data.target_patient_id)?.full_name

      setImpersonation(data.target_patient_id, patientName || undefined)
      queryClient.invalidateQueries({ queryKey: ['impersonation-status'] })
    },
  })
}

/**
 * Mutation hook for stopping impersonation
 */
export function useStopImpersonation() {
  const queryClient = useQueryClient()
  const setImpersonation = useAuthStore((state) => state.setImpersonation)

  return useMutation({
    mutationFn: () => adminService.stopImpersonation(),
    onSuccess: () => {
      setImpersonation(null)
      queryClient.invalidateQueries({ queryKey: ['impersonation-status'] })
    },
  })
}

/**
 * Query hook for fetching feature modules
 */
export function useFeatureModules() {
  return useQuery({
    queryKey: ['feature-modules'],
    queryFn: () => adminService.getFeatureModules(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Mutation hook for toggling feature modules
 */
export function useToggleFeature() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ featureKey, enabled }: { featureKey: string; enabled: boolean }) => {
      return adminService.toggleFeatureModule(featureKey, enabled)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-modules'] })
    },
  })
}

/**
 * Query hook for fetching audit log entries with optional filters
 */
export function useAuditLog(
  limit = 25,
  offset = 0,
  objectType?: string,
  action?: string
) {
  return useQuery({
    queryKey: ['audit-log', limit, offset, objectType, action],
    queryFn: () => adminService.getAuditLog(limit, offset, objectType, action),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Query hook for fetching audit log count with optional filters
 */
export function useAuditLogCount(objectType?: string, action?: string) {
  return useQuery({
    queryKey: ['audit-log-count', objectType, action],
    queryFn: () => adminService.getAuditLogCount(objectType, action),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Query hook for fetching workspace configuration
 */
export function useWorkspaceConfig() {
  return useQuery({
    queryKey: ['workspace-config'],
    queryFn: () => workspaceService.getWorkspaceConfig(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Mutation hook for updating workspace configuration
 */
export function useUpdateWorkspaceConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Parameters<typeof workspaceService.updateWorkspaceConfig>[0]) => {
      return workspaceService.updateWorkspaceConfig(input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-config'] })
    },
  })
}

/**
 * Mutation hook for creating a new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateUserInput) => adminService.adminCreateUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-patients'] })
    },
  })
}
