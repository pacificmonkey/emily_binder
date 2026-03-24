import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000, // 2 min default
    },
    mutations: {
      retry: 0,
    },
  },
})
