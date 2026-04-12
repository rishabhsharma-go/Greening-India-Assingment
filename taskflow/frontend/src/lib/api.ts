import type {
  AuthResponse,
  Project,
  Task,
  User,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateTaskRequest,
  UpdateTaskRequest,
  ProjectStats,
} from '../types'

const API_BASE = '/api'

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('token')
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'An error occurred' }))
      throw error
    }

    if (response.status === 204) {
      return {} as T
    }

    return response.json()
  }

  // Auth
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  // Projects
  async getProjects(): Promise<{ projects: Project[] }> {
    return this.request<{ projects: Project[] }>('/projects')
  }

  async getProject(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}`)
  }

  async createProject(data: CreateProjectRequest): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProject(id: string, data: UpdateProjectRequest): Promise<Project> {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteProject(id: string): Promise<void> {
    return this.request<void>(`/projects/${id}`, {
      method: 'DELETE',
    })
  }

  async getProjectStats(id: string): Promise<ProjectStats> {
    return this.request<ProjectStats>(`/projects/${id}/stats`)
  }

  // Tasks
  async getTasks(
    projectId: string,
    filters?: { status?: string; assignee?: string }
  ): Promise<{ tasks: Task[] }> {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.assignee) params.append('assignee', filters.assignee)
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request<{ tasks: Task[] }>(`/projects/${projectId}/tasks${query}`)
  }

  async createTask(projectId: string, data: CreateTaskRequest): Promise<Task> {
    return this.request<Task>(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTask(taskId: string, data: UpdateTaskRequest): Promise<Task> {
    return this.request<Task>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteTask(taskId: string): Promise<void> {
    return this.request<void>(`/tasks/${taskId}`, {
      method: 'DELETE',
    })
  }

  // Users
  async getUsers(): Promise<{ users: User[] }> {
    return this.request<{ users: User[] }>('/users')
  }
}

export const api = new ApiClient()
