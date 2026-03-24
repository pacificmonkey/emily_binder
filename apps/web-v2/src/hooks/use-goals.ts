import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as goalsService from '@/services/goals'
import type { GoalType, CreateGoalInput } from '@/types/database'
import { toast } from '@/components/ui/toaster'

export function useGoals(type: GoalType) {
  return useQuery({
    queryKey: ['goals', type],
    queryFn: () => goalsService.getGoalsByType(type),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateGoalInput) => goalsService.createGoal(input),
    onSuccess: () => {
      toast({ title: 'Goal created!', variant: 'success' })
    },
    onError: () => {
      toast({ title: "Couldn't create that goal. Try again?", variant: 'error' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })
}

export function useDeleteGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (goalId: string) => goalsService.deleteGoal(goalId),
    onSuccess: () => {
      toast({ title: 'Goal deleted.', variant: 'success' })
    },
    onError: () => {
      toast({ title: "Couldn't delete that goal. Try again?", variant: 'error' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })
}
