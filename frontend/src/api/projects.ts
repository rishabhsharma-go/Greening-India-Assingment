import client from './client';
import { Project, ProjectStats } from './types';

export const getProjects = () =>
  client.get<{ projects: Project[] }>('/projects').then((r) => r.data.projects);

export const getProject = (id: string) =>
  client.get<Project>(`/projects/${id}`).then((r) => r.data);

export const createProject = (name: string, description?: string) =>
  client.post<Project>('/projects', { name, description }).then((r) => r.data);

export const updateProject = (id: string, data: { name?: string; description?: string }) =>
  client.patch<Project>(`/projects/${id}`, data).then((r) => r.data);

export const deleteProject = (id: string) =>
  client.delete(`/projects/${id}`);

export const getProjectStats = (id: string) =>
  client.get<ProjectStats>(`/projects/${id}/stats`).then((r) => r.data);

