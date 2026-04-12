import { api } from './client.js';

export const tasksApi = {
  list: (projectId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.assignee) params.set('assignee', filters.assignee);
    const qs = params.toString();
    return api.get(`/projects/${projectId}/tasks${qs ? `?${qs}` : ''}`);
  },
  create: (projectId, data) => api.post(`/projects/${projectId}/tasks`, data),
  update: (id, data) => api.patch(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
};

export const usersApi = {
  list: () => api.get('/users'),
};
