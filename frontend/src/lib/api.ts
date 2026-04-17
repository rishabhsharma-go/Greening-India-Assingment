import { API_BASE_URL, ASSIGNEE_LOOKUP_TEMPLATE } from './constants';
import { clearToken, getToken } from './storage';
import type {
  LoginResponseDto,
  ProjectDetailsResponseDto,
  ProjectPatchDto,
  ProjectRequestDto,
  ProjectResponseDto,
  SignUpRequestDto,
  StandardResponseDto,
  TaskDetailDto,
  TaskRequestDto,
  TaskUpdateRequestDto,
  UserDto
} from './types';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

type RequestOptions = RequestInit & {
  auth?: boolean;
};

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (response.status === 204) return null;

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const finalHeaders = new Headers(headers ?? {});

  if (!finalHeaders.has('Content-Type') && rest.body && !(rest.body instanceof FormData)) {
    finalHeaders.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = getToken();
    if (token) {
      finalHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearToken();
      window.location.href = '/login';
    }
    const message =
      (data as Record<string, unknown> | null)?.message?.toString() ||
      (typeof data === 'string' ? data : '') ||
      response.statusText ||
      'Not Found';
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export function apiGetProjects(): Promise<ProjectDetailsResponseDto[]> {
  return request<ProjectDetailsResponseDto[]>('/projects');
}

export function apiCreateProject(payload: ProjectRequestDto): Promise<ProjectResponseDto> {
  return request<ProjectResponseDto>('/projects', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function apiGetProjectDetails(id: string): Promise<ProjectDetailsResponseDto> {
  return request<ProjectDetailsResponseDto>(`/projects/${encodeURIComponent(id)}`);
}

export function apiPatchProject(id: string, payload: ProjectPatchDto): Promise<StandardResponseDto> {
  return request<StandardResponseDto>(`/projects/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function apiDeleteProject(id: string): Promise<StandardResponseDto> {
  return request<StandardResponseDto>(`/projects/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

export function apiGetProjectTaskIds(
  projectId: string,
  filters: { status?: string; assignee?: string } = {}
): Promise<{ id: string }[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.assignee) params.set('assignee', filters.assignee);
  const query = params.toString() ? `?${params.toString()}` : '';
  return request<{ id: string }[]>(`/projects/${encodeURIComponent(projectId)}/tasks${query}`);
}

export function apiCreateTask(projectId: string, payload: TaskRequestDto): Promise<{ id: string }> {
  return request<{ id: string }>(`/projects/${encodeURIComponent(projectId)}/tasks`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function apiPatchTask(id: string, payload: TaskUpdateRequestDto): Promise<StandardResponseDto> {
  return request<StandardResponseDto>(`/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function apiDeleteTask(id: string): Promise<StandardResponseDto> {
  return request<StandardResponseDto>(`/tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

export function apiGetTask(id: string): Promise<TaskDetailDto> {
  return request<TaskDetailDto>(`/task/${encodeURIComponent(id)}`);
}

export function apiGetUserName(id: string): Promise<string> {
  return request<UserDto>(`/user/${encodeURIComponent(id)}`).then((res) => res.name);
}

export async function apiLookupUserIdByName(name: string): Promise<string> {
  const trimmed = name.trim();
  const url = ASSIGNEE_LOOKUP_TEMPLATE.replace('{name}', encodeURIComponent(trimmed));

  try {
    const data = await request<Record<string, unknown>>(url);
    const candidate =
      data?.id ?? data?.userId ?? data?.user_id ?? data?.assignee_id ?? data?.uid ?? data?.name;
    return typeof candidate === 'string' && candidate.trim() ? candidate : trimmed;
  } catch {
    return trimmed;
  }
}

export function apiRegister(payload: SignUpRequestDto): Promise<LoginResponseDto> {
  return request<LoginResponseDto>('/auth/register', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(payload)
  });
}

export function apiLogin(payload: SignUpRequestDto): Promise<LoginResponseDto> {
  return request<LoginResponseDto>('/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(payload)
  });
}