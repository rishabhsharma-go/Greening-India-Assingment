import apiClient from './client';
import type { Project } from '../types';

export async function getProjects() {
  const { data } = await apiClient.get<{ projects: Project[]; total: number; page: number; limit: number }>('/projects');
  return data;
}

export async function getProject(id: string) {
  const { data } = await apiClient.get<Project>(`/projects/${id}`);
  return data;
}

export async function createProject(payload: { name: string; description: string }) {
  const { data } = await apiClient.post<Project>('/projects', payload);
  return data;
}

export async function updateProject(id: string, payload: { name?: string; description?: string }) {
  const { data } = await apiClient.patch<Project>(`/projects/${id}`, payload);
  return data;
}

export async function deleteProject(id: string) {
  await apiClient.delete(`/projects/${id}`);
}

export async function getProjectStats(id: string) {
  const { data } = await apiClient.get(`/projects/${id}/stats`);
  return data;
}

export async function getProjectMembers(id: string) {
  const { data } = await apiClient.get<{ members: { id: string; name: string }[] }>(`/projects/${id}/members`);
  return data;
}
