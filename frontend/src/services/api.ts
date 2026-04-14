import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

const client = axios.create({
  baseURL: API_BASE_URL,
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common['Authorization'];
  }
};

// Auth endpoints
export const authAPI = {
  register: (name: string, email: string, password: string) =>
    client.post('/auth/register', { name, email, password }),
  login: (email: string, password: string) =>
    client.post('/auth/login', { email, password }),
};

// Project endpoints
export const projectAPI = {
  getProjects: () => client.get('/projects'),
  getProject: (id: string) => client.get(`/projects/${id}`),
  createProject: (name: string, description?: string) =>
    client.post('/projects', { name, description }),
  updateProject: (id: string, name?: string, description?: string) =>
    client.patch(`/projects/${id}`, { name, description }),
  deleteProject: (id: string) => client.delete(`/projects/${id}`),
};

// Task endpoints
export const taskAPI = {
  getTasks: (projectId: string, status?: string, assignee?: string) =>
    client.get(`/projects/${projectId}/tasks`, { params: { status, assignee } }),
  createTask: (
    projectId: string,
    title: string,
    description?: string,
    priority?: string,
    assignee_id?: string,
    due_date?: string
  ) =>
    client.post(`/projects/${projectId}/tasks`, {
      title,
      description,
      priority,
      assignee_id,
      due_date,
    }),
  updateTask: (id: string, updates: Record<string, any>) =>
    client.patch(`/tasks/${id}`, updates),
  deleteTask: (id: string) => client.delete(`/tasks/${id}`),
};

export default client;
