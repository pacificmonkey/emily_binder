import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as supportService from '@/services/support'
import { toast } from '@/components/ui/toaster'

/**
 * Query hook for fetching the current user's role and assigned patients
 */
export function useUserRole() {
  return useQuery({
    queryKey: ['user-role'],
    queryFn: () => supportService.getUserRole(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Query hook for fetching the support dashboard data for the currently viewed patient
 */
export function useSupportDashboard() {
  return useQuery({
    queryKey: ['support-dashboard'],
    queryFn: () => supportService.getSupportDashboard(),
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

/**
 * Mutation hook for switching which patient the support user is viewing
 */
export function useSwitchPatient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (patientId: string) =>
      supportService.setSupportViewedPatient(patientId),
    onSuccess: () => {
      // Invalidate both dashboard and role queries to refresh patient context
      queryClient.invalidateQueries({ queryKey: ['support-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['user-role'] })
      toast({
        title: 'Patient switched',
        variant: 'success',
        duration: 2000,
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to switch patient',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'error',
      })
    },
  })
}
