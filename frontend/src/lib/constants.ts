export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';
export const ASSIGNEE_LOOKUP_TEMPLATE =
  import.meta.env.VITE_ASSIGNEE_LOOKUP_TEMPLATE ?? '/user/by-name/{name}';

export const STATUS_OPTIONS = ['todo', 'in_progress', 'done'] as const;
export const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const;

export const AUTH_TOKEN_KEY = 'taskflow_jwt';

export const EMPTY_TEXT = 'No data available';
