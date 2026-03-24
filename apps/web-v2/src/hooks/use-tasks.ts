import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as tasksService from '@/services/tasks'
import { getDailyWinStatus } from '@/services/workspaceConfig'
import { toast } from '@/components/ui/toaster'

export function useTodaysTasks() {
  return useQuery({
    queryKey: ['tasks', 'today'],
    queryFn: () => tasksService.getTodaysTasks(),
    staleTime: 2 * 60 * 1000,
  })
}

export function useAllTasks() {
  return useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: () => tasksService.getAllTasks(),
    staleTime: 2 * 60 * 1000,
  })
}

export function useCompleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskInstanceId: string) => tasksService.completeTask(taskInstanceId),
    onMutate: async (taskInstanceId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', 'today'] })
      const previous = queryClient.getQueryData(['tasks', 'today'])
      queryClient.setQueryData(['tasks', 'today'], (old: any[]) =>
        old?.map((t: any) =>
          t.task_instance_id === taskInstanceId ? { ...t, status: 'completed', completed_at: new Date().toISOString() } : t
        )
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(['tasks', 'today'], context?.previous)
      toast({ title: "Couldn't mark that done. Try again?", variant: 'error' })
    },
    onSuccess: (data) => {
      if (data && typeof data === 'object' && 'points_awarded' in data) {
        toast({ title: `+${(data as any).points_awarded} points!`, variant: 'success' })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'today'] })
      queryClient.invalidateQueries({ queryKey: ['daily-win'] })
      queryClient.invalidateQueries({ queryKey: ['streaks'] })
      queryClient.invalidateQueries({ queryKey: ['user-progress'] })
    },
  })
}

export function useUncompleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskInstanceId: string) => tasksService.uncompleteTask(taskInstanceId),
    onMutate: async (taskInstanceId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', 'today'] })
      const previous = queryClient.getQueryData(['tasks', 'today'])
      queryClient.setQueryData(['tasks', 'today'], (old: any[]) =>
        old?.map((t: any) =>
          t.task_instance_id === taskInstanceId ? { ...t, status: 'pending', completed_at: null } : t
        )
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(['tasks', 'today'], context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'today'] })
      queryClient.invalidateQueries({ queryKey: ['daily-win'] })
      queryClient.invalidateQueries({ queryKey: ['user-progress'] })
    },
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: any) => tasksService.createTask(input),
    onSuccess: () => {
      toast({ title: 'Task added.', variant: 'success' })
    },
    onError: () => {
      toast({ title: "Couldn't create that task. Try again?", variant: 'error' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDailyWin() {
  return useQuery({
    queryKey: ['daily-win'],
    queryFn: () => getDailyWinStatus(),
    staleTime: 60 * 1000,
  })
}
