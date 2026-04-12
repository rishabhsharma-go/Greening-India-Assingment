export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'field_worker'
  created_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  owner_id: string
  project_type: string | null
  created_at: string
  tasks?: Task[]
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  project_id: string
  assignee_id: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}


export interface AuthResponse {
  token: string
  user: User
}

export interface ProjectStats {
  total_tasks: number
  todo: number
  in_progress: number
  done: number
  completion_rate: number
}
