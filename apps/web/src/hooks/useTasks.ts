import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTodaysTasks,
  getAllTasks,
  createTask,
  updateTask,
  archiveTask,
  completeTask,
  uncompleteTask,
  getUserProgress,
} from '@/services/tasks'
import type { CreateTaskInput, UpdateTaskInput, CompleteTaskInput } from '@/types/database'

// Query keys
export const taskKeys = {
  all: ['tasks'] as const,
  today: ['tasks', 'today'] as const,
  list: () => [...taskKeys.all, 'list'] as const,
  progress: ['user-progress'] as const,
}

// Hook for today's tasks
export function useTodaysTasks() {
  return useQuery({
    queryKey: taskKeys.today,
    queryFn: getTodaysTasks,
  })
}

// Hook for all tasks
export function useAllTasks() {
  return useQuery({
    queryKey: taskKeys.list(),
    queryFn: getAllTasks,
  })
}

// Hook for user progress
export function useUserProgress() {
  return useQuery({
    queryKey: taskKeys.progress,
    queryFn: getUserProgress,
  })
}

// Mutation: Create task
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

// Mutation: Update task
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) =>
      updateTask(taskId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

// Mutation: Archive task
export function useArchiveTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskId: string) => archiveTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

// Mutation: Complete task
export function useCompleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input?: CompleteTaskInput }) =>
      completeTask(taskId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      queryClient.invalidateQueries({ queryKey: taskKeys.progress })
    },
  })
}

// Mutation: Uncomplete task
export function useUncompleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskId: string) => uncompleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      queryClient.invalidateQueries({ queryKey: taskKeys.progress })
    },
  })
}
