import api from './client'
import type { Project, Task, ProjectStats, User } from '../types'

export const getUsers = () =>
  api.get<{ users: User[] }>('/users').then(r => r.data.users)

export const getProjects = () =>
  api.get<{ projects: Project[] }>('/projects').then(r => r.data.projects)

export const getProjectWithTasks = (id: string) =>
  api.get<{ project: Project; tasks: Task[] }>(`/projects/${id}`).then(r => r.data)

export const createProject = (data: { name: string; description?: string; project_type?: string; owner_id?: string }) =>
  api.post<Project>('/projects', data).then(r => r.data)

export const updateProject = (id: string, data: { name?: string; description?: string; project_type?: string }) =>
  api.patch<Project>(`/projects/${id}`, data).then(r => r.data)

export const deleteProject = (id: string) =>
  api.delete(`/projects/${id}`)

export const getProjectStats = (id: string) =>
  api.get<ProjectStats>(`/projects/${id}/stats`).then(r => r.data)

export const getProjectTasks = (
  projectId: string,
  filters?: { status?: string; assignee?: string }
) =>
  api
    .get<{ tasks: Task[] }>(`/projects/${projectId}/tasks`, { params: filters })
    .then(r => r.data.tasks)

export const createTask = (
  projectId: string,
  data: {
    title: string
    description?: string
    priority?: Task['priority']
    assignee_id?: string
    due_date?: string
  }
) => api.post<Task>(`/projects/${projectId}/tasks`, data).then(r => r.data)

export const updateTask = (id: string, data: Partial<Task>) =>
  api.patch<Task>(`/tasks/${id}`, data).then(r => r.data)

export const deleteTask = (id: string) =>
  api.delete(`/tasks/${id}`)
