/**
 * Health hooks using React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  getMedications,
  getMedicationById,
  createMedication,
  updateMedication,
  archiveMedication,
  getProviders,
  createProvider,
  updateProvider,
  archiveProvider,
  getPharmacies,
  createPharmacy,
  updatePharmacy,
  archivePharmacy,
  logIntake,
  getIntakeLogs,
  logRefill,
  getRefillLogs,
  evaluateRefillRisks,
  getHealthAccessConfig,
  updateHealthAccessConfig,
  PROVIDER_TYPE_LABELS,
  PROVIDER_TYPE_ICONS,
} from '@/services/health'
import type { HealthMedication, HealthProvider, HealthPharmacy, HealthAccessLevel } from '@/types/database'

// Query keys
export const healthKeys = {
  all: ['health'] as const,
  medications: (userId: string) => [...healthKeys.all, 'medications', userId] as const,
  medication: (id: string) => [...healthKeys.all, 'medication', id] as const,
  providers: (userId: string) => [...healthKeys.all, 'providers', userId] as const,
  pharmacies: (userId: string) => [...healthKeys.all, 'pharmacies', userId] as const,
  intakeLogs: (medicationId: string) => [...healthKeys.all, 'intakeLogs', medicationId] as const,
  refillLogs: (medicationId: string) => [...healthKeys.all, 'refillLogs', medicationId] as const,
  refillRisks: (userId: string) => [...healthKeys.all, 'refillRisks', userId] as const,
  accessConfig: (userId: string) => [...healthKeys.all, 'accessConfig', userId] as const,
}

// =============================================================================
// MEDICATIONS
// =============================================================================

export function useMedications() {
  const { user } = useAuth()

  return useQuery({
    queryKey: healthKeys.medications(user?.id ?? ''),
    queryFn: () => getMedications(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minute
  })
}

export function useMedication(id: string) {
  return useQuery({
    queryKey: healthKeys.medication(id),
    queryFn: () => getMedicationById(id),
    enabled: !!id,
    staleTime: 1000 * 60,
  })
}

export function useCreateMedication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Omit<HealthMedication, 'id' | 'created_at' | 'updated_at' | 'pharmacy' | 'prescriber'>) =>
      createMedication(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.all })
    },
  })
}

export function useUpdateMedication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Omit<HealthMedication, 'id' | 'created_at' | 'updated_at' | 'owner_user_id' | 'pharmacy' | 'prescriber'>>
    }) => updateMedication(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.all })
    },
  })
}

export function useArchiveMedication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => archiveMedication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.all })
    },
  })
}

// =============================================================================
// PROVIDERS (Care Team)
// =============================================================================

export function useProviders() {
  const { user } = useAuth()

  return useQuery({
    queryKey: healthKeys.providers(user?.id ?? ''),
    queryFn: () => getProviders(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreateProvider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Omit<HealthProvider, 'id' | 'created_at'>) => createProvider(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.all })
    },
  })
}

export function useUpdateProvider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Omit<HealthProvider, 'id' | 'created_at' | 'owner_user_id'>>
    }) => updateProvider(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.all })
    },
  })
}

export function useArchiveProvider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => archiveProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.all })
    },
  })
}

// =============================================================================
// PHARMACIES
// =============================================================================

export function usePharmacies() {
  const { user } = useAuth()

  return useQuery({
    queryKey: healthKeys.pharmacies(user?.id ?? ''),
    queryFn: () => getPharmacies(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreatePharmacy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Omit<HealthPharmacy, 'id' | 'created_at'>) => createPharmacy(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.all })
    },
  })
}

export function useUpdatePharmacy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Omit<HealthPharmacy, 'id' | 'created_at' | 'owner_user_id'>>
    }) => updatePharmacy(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.all })
    },
  })
}

export function useArchivePharmacy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => archivePharmacy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.all })
    },
  })
}

// =============================================================================
// INTAKE & REFILL LOGGING
// =============================================================================

export function useLogIntake() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Parameters<typeof logIntake>[0]) => logIntake(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.all })
    },
  })
}

export function useIntakeLogs(medicationId: string, limit?: number) {
  return useQuery({
    queryKey: [...healthKeys.intakeLogs(medicationId), limit],
    queryFn: () => getIntakeLogs(medicationId, limit),
    enabled: !!medicationId,
    staleTime: 1000 * 60,
  })
}

export function useLogRefill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Parameters<typeof logRefill>[0]) => logRefill(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.all })
    },
  })
}

export function useRefillLogs(medicationId: string, limit?: number) {
  return useQuery({
    queryKey: [...healthKeys.refillLogs(medicationId), limit],
    queryFn: () => getRefillLogs(medicationId, limit),
    enabled: !!medicationId,
    staleTime: 1000 * 60,
  })
}

// =============================================================================
// REFILL RISKS
// =============================================================================

export function useRefillRisks() {
  const { user } = useAuth()

  return useQuery({
    queryKey: healthKeys.refillRisks(user?.id ?? ''),
    queryFn: () => evaluateRefillRisks(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minute
  })
}

// =============================================================================
// ACCESS CONFIG
// =============================================================================

export function useHealthAccessConfig() {
  const { user } = useAuth()

  return useQuery({
    queryKey: healthKeys.accessConfig(user?.id ?? ''),
    queryFn: () => getHealthAccessConfig(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateHealthAccessConfig() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (updates: {
      support_access?: HealthAccessLevel
      emily_can_log_intake?: boolean
      emily_can_view_intake_history?: boolean
    }) => updateHealthAccessConfig(user!.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthKeys.accessConfig(user!.id) })
    },
  })
}

// Re-export helpers
export { PROVIDER_TYPE_LABELS, PROVIDER_TYPE_ICONS }
