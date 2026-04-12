export interface User {
  id: string
  name: string
  email: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface Project {
  id: string
  name: string
  description?: string
  owner_id: string
  created_at: string
  tasks?: Task[]
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  project_id: string
  assignee_id?: string
  creator_id: string
  due_date?: string
  created_at: string
  updated_at: string
}

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface CreateProjectRequest {
  name: string
  description?: string
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
}

export interface CreateTaskRequest {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assignee_id?: string
  due_date?: string
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assignee_id?: string
  due_date?: string
}

export interface ApiError {
  error: string
  fields?: Record<string, string>
}

export interface ProjectStats {
  project_id: string
  by_status: { status: string; count: number }[]
  by_assignee: { assignee_id: string | null; assignee_name: string | null; count: number }[]
}
