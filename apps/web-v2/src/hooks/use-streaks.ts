import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/toaster'
import * as streaksService from '@/services/streaks'
import type { CreateStreakInput } from '@/types/database'

export function useStreaks() {
  return useQuery({
    queryKey: ['streaks'],
    queryFn: () => streaksService.getStreaks(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateStreak() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateStreakInput) => streaksService.createStreak(input),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Streak created successfully',
      })
      queryClient.invalidateQueries({ queryKey: ['streaks'] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create streak',
        variant: 'error',
      })
    },
  })
}
