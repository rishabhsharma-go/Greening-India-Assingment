export const SWAGGER_MESSAGES = {
  AUTH: {
    TAG: 'Authentication',
    REGISTER: 'Register a new guardian identity',
    LOGIN: 'Synchronize guardian access protocol',
    REGISTER_SUCCESS: 'Guardian identity successfully initialized',
    LOGIN_SUCCESS: 'Protocol synchronization successful',
  },
  PROJECTS: {
    TAG: 'Cultivation Layers (Projects)',
    CREATE: 'Initialize a new national cultivation layer',
    FIND_ALL: 'Aggregate all regional ecological projects',
    FIND_ONE: 'Retrieve specific cultivation layer specifications',
    UPDATE: 'Calibrate existing project parameters',
    DELETE: 'Safe-archive project from active oversight (Soft Delete)',
    STATS: 'Generate real-time ecological vitality metrics',
  },
  TASKS: {
    TAG: 'Ecosystem Pulses (Tasks)',
    CREATE: 'Dispatch a new ecological pulse',
    FIND_ALL: 'Monitor all pulses within a project node',
    FIND_ONE: 'Audit a specific task pulse',
    UPDATE: 'Adjust pulse parameters or status',
    DELETE: 'Safe-archive task from project cycle (Soft Delete)',
  },
  USERS: {
    TAG: 'Guardian Directory',
    FIND_ONE: 'Query specific guardian identity data',
    PROFILE: 'Access authorized guardian profile',
  },
};

export const SWAGGER_EXAMPLES = {
  AUTH: {
    NAME: 'Jan Doe',
    EMAIL: 'test@example.com',
    PASSWORD: 'password123',
  },
  PROJECTS: {
    NAME: 'Eco Platform',
    DESCRIPTION: 'A platform to track green initiatives',
  },
  TASKS: {
    TITLE: 'Implement login',
    DESCRIPTION: 'Detailed task description',
    DUE_DATE: '2024-12-31',
    ASSIGNEE_ID: 'user-uuid',
  },
};
