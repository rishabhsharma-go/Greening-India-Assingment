export const SECURITY_MESSAGES = {
  FORBIDDEN_RESOURCE: (role: string) => `Access denied for role: ${role}`,
  OWNERSHIP_REQUIRED: (resource: string) => `Ownership required for this ${resource}`,
  OWNERSHIP_TASK_REQUIRED: 'Ownership required for this task (Creator or Project Owner)',
  RESOURCE_NOT_FOUND: (resource: string) => `${resource} not found`,
};

export const PUBLIC_KEY = 'isPublic';
export const CHECK_OWNERSHIP_KEY = 'checkOwnership';
