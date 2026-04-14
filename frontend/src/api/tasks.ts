import apiClient from './client';
import type { Task } from '../types';

interface TaskFilters {
  status?: string;
  priority?: string;
  assignee_id?: string;
}

export async function getTasks(projectId: string, filters?: TaskFilters) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.priority) params.set('priority', filters.priority);
  if (filters?.assignee_id) params.set('assignee', filters.assignee_id);

  const { data } = await apiClient.get<{ tasks: Task[]; total: number; page: number; limit: number }>(
    `/projects/${projectId}/tasks`,
    { params }
  );
  return data;
}

export async function createTask(projectId: string, payload: Partial<Task>) {
  const { data } = await apiClient.post<Task>(`/projects/${projectId}/tasks`, payload);
  return data;
}

export async function updateTask(id: string, payload: Partial<Task>) {
  const { data } = await apiClient.patch<Task>(`/tasks/${id}`, payload);
  return data;
}

export async function deleteTask(id: string) {
  await apiClient.delete(`/tasks/${id}`);
}
