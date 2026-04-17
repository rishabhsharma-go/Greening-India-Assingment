export type LoginResponseDto = {
  jwt: string;
};

export type StandardResponseDto = {
  message?: string;
};

export type ProjectRequestDto = {
  name: string;
  description: string;
};

export type ProjectPatchDto = {
  name?: string;
  description?: string;
};

export type ProjectResponseDto = {
  project_id: string;
};

export type TaskRequestDto = {
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
};

export type TaskUpdateRequestDto = {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  due_date?: string;
};

export type SignUpRequestDto = {
  email?: string;
  name: string;
  password: string;
};

export type UserDto = {
  name: string;
};

export type TaskResponseDto = {
  id: string;
};

export type TaskDetailDto = {
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_id: string;
  due_date: string;
  createdAt: string;
  updated_at: string;
};

export type ProjectDetailsResponseDto = {
  id: string;
  name: string;
  description: string;
  tasks: TaskResponseDto[];
  created_at: string;
};
