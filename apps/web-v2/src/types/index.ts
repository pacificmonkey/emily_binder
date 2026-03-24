// Type definitions for Emily's Missions Web v2
// This file serves as the main types export point

export interface User {
  id: string
  email: string
  displayName: string
  createdAt: Date
}

export interface Task {
  id: string
  title: string
  description?: string
  completed: boolean
  createdAt: Date
  updatedAt: Date
}
