import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as medicationsService from '@/services/medications'
import { toast } from '@/components/ui/toaster'

export function usePrescriptions() {
  return useQuery({
    queryKey: ['medications', 'prescriptions'],
    queryFn: () => medicationsService.getPrescriptions(),
    staleTime: 10 * 60 * 1000,
  })
}

export function useTodaysIntakes() {
  return useQuery({
    queryKey: ['medications', 'intakes', 'today'],
    queryFn: () => medicationsService.getTodaysIntakes(),
    staleTime: 2 * 60 * 1000,
  })
}

export function useLogIntake() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: any) => medicationsService.logIntake(input),
    onSuccess: () => {
      toast({ title: 'Dose logged.', variant: 'success' })
    },
    onError: () => {
      toast({ title: "Couldn't log that dose. Try again?", variant: 'error' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] })
    },
  })
}

export function useMedicationAdherence(days: number = 30) {
  return useQuery({
    queryKey: ['medications', 'adherence', days],
    queryFn: () => medicationsService.getMedicationAdherence(days),
    staleTime: 10 * 60 * 1000,
  })
}
