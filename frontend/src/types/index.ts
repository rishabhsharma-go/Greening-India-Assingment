export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high';

export const TaskStatus = {
  TODO: 'todo' as TaskStatus,
  IN_PROGRESS: 'in_progress' as TaskStatus,
  DONE: 'done' as TaskStatus,
} as const;

export const TaskPriority = {
  LOW: 'low' as TaskPriority,
  MEDIUM: 'medium' as TaskPriority,
  HIGH: 'high' as TaskPriority,
} as const;

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  tasks?: Task[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  creatorId: string;
  assigneeId?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  assignee?: User;
}

export interface ProjectStats {
  statsByStatus: Array<{ status: TaskStatus; count: string | number }>;
  statsByAssignee: Array<{ assignee: string | null; count: string | number }>;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
}
