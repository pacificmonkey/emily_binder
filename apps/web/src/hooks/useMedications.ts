import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPrescriptions,
  createMedicationPrescription,
  logIntake,
  getTodaysIntakes,
  deletePrescription,
  updateInventory,
} from '@/services/medications'
import type {
  CreateMedicationPrescriptionInput,
  LogIntakeInput,
} from '@/types/database'

// Query keys
export const medicationKeys = {
  all: ['medications'] as const,
  prescriptions: ['medications', 'prescriptions'] as const,
  intakes: ['medications', 'intakes'] as const,
  todaysIntakes: ['medications', 'intakes', 'today'] as const,
}

// Hook for all active prescriptions
export function usePrescriptions() {
  return useQuery({
    queryKey: medicationKeys.prescriptions,
    queryFn: getPrescriptions,
  })
}

// Hook for today's intake events
export function useTodaysIntakes() {
  return useQuery({
    queryKey: medicationKeys.todaysIntakes,
    queryFn: getTodaysIntakes,
  })
}

// Mutation: Create medication and prescription
export function useCreateMedicationPrescription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateMedicationPrescriptionInput) =>
      createMedicationPrescription(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicationKeys.all })
    },
  })
}

// Mutation: Log intake
export function useLogIntake() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: LogIntakeInput) => logIntake(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicationKeys.intakes })
      queryClient.invalidateQueries({ queryKey: medicationKeys.prescriptions })
    },
  })
}

// Mutation: Delete prescription (discontinue)
export function useDeletePrescription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (prescriptionId: string) => deletePrescription(prescriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicationKeys.prescriptions })
    },
  })
}

// Mutation: Update inventory
export function useUpdateInventory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ prescriptionId, count }: { prescriptionId: string; count: number }) =>
      updateInventory(prescriptionId, count),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicationKeys.prescriptions })
    },
  })
}
