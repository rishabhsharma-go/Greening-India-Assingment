// Simple UUID v4 generator (no external dependency)
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Seeded users (use these credentials to log in)
const SEED_USERS = [
  { id: 'user-seed-1', name: 'Jane Doe', email: 'jane@example.com', password: 'secret123' },
  { id: 'user-seed-2', name: 'John Smith', email: 'john@example.com', password: 'secret123' },
  { id: 'user-seed-3', name: 'Alex Rivera', email: 'alex@example.com', password: 'secret123' },
];

const SEED_PROJECTS = [
  {
    id: 'proj-seed-1',
    name: 'Website Redesign',
    description: 'Q2 project — complete overhaul of the marketing site.',
    owner_id: 'user-seed-1',
    created_at: '2026-04-01T10:00:00Z',
  },
  {
    id: 'proj-seed-2',
    name: 'Mobile App MVP',
    description: 'iOS and Android release targeting Q3.',
    owner_id: 'user-seed-1',
    created_at: '2026-04-02T10:00:00Z',
  },
  {
    id: 'proj-seed-3',
    name: 'Data Pipeline',
    description: 'Real-time analytics ingestion pipeline.',
    owner_id: 'user-seed-2',
    created_at: '2026-04-05T10:00:00Z',
  },
];

const SEED_TASKS = [
  {
    id: 'task-seed-1',
    project_id: 'proj-seed-1',
    title: 'Design homepage wireframes',
    description: 'Create initial wireframes in Figma for stakeholder review.',
    status: 'in_progress',
    priority: 'high',
    assignee_id: 'user-seed-1',
    due_date: '2026-04-15',
    created_at: '2026-04-01T12:00:00Z',
    updated_at: '2026-04-01T12:00:00Z',
  },
  {
    id: 'task-seed-2',
    project_id: 'proj-seed-1',
    title: 'Set up CI/CD pipeline',
    description: 'Configure GitHub Actions with automatic deploy to Vercel.',
    status: 'todo',
    priority: 'medium',
    assignee_id: 'user-seed-2',
    due_date: '2026-04-20',
    created_at: '2026-04-02T12:00:00Z',
    updated_at: '2026-04-02T12:00:00Z',
  },
  {
    id: 'task-seed-3',
    project_id: 'proj-seed-1',
    title: 'Write unit tests for auth module',
    description: 'Target 80% code coverage using Vitest.',
    status: 'done',
    priority: 'low',
    assignee_id: 'user-seed-1',
    due_date: '2026-04-10',
    created_at: '2026-04-03T12:00:00Z',
    updated_at: '2026-04-10T12:00:00Z',
  },
  {
    id: 'task-seed-4',
    project_id: 'proj-seed-1',
    title: 'SEO audit and implementation',
    description: 'Run Lighthouse, fix issues, implement structured data.',
    status: 'todo',
    priority: 'medium',
    assignee_id: null,
    due_date: '2026-04-28',
    created_at: '2026-04-04T12:00:00Z',
    updated_at: '2026-04-04T12:00:00Z',
  },
  {
    id: 'task-seed-5',
    project_id: 'proj-seed-2',
    title: 'API integration layer',
    description: 'Connect mobile app to REST backend, handle auth token refresh.',
    status: 'todo',
    priority: 'high',
    assignee_id: null,
    due_date: '2026-04-25',
    created_at: '2026-04-03T12:00:00Z',
    updated_at: '2026-04-03T12:00:00Z',
  },
  {
    id: 'task-seed-6',
    project_id: 'proj-seed-2',
    title: 'Push notifications',
    description: 'Integrate Firebase Cloud Messaging for iOS and Android.',
    status: 'todo',
    priority: 'medium',
    assignee_id: 'user-seed-2',
    due_date: '2026-05-01',
    created_at: '2026-04-04T12:00:00Z',
    updated_at: '2026-04-04T12:00:00Z',
  },
  {
    id: 'task-seed-7',
    project_id: 'proj-seed-2',
    title: 'Onboarding flow screens',
    description: 'Design and implement the first-run onboarding experience.',
    status: 'in_progress',
    priority: 'high',
    assignee_id: 'user-seed-3',
    due_date: '2026-04-22',
    created_at: '2026-04-05T12:00:00Z',
    updated_at: '2026-04-05T12:00:00Z',
  },
  {
    id: 'task-seed-8',
    project_id: 'proj-seed-3',
    title: 'Kafka cluster setup',
    description: 'Provision and configure Kafka with 3-broker setup on AWS.',
    status: 'done',
    priority: 'high',
    assignee_id: 'user-seed-2',
    due_date: '2026-04-08',
    created_at: '2026-04-01T12:00:00Z',
    updated_at: '2026-04-08T12:00:00Z',
  },
  {
    id: 'task-seed-9',
    project_id: 'proj-seed-3',
    title: 'Schema registry integration',
    description: 'Connect Confluent Schema Registry for Avro serialization.',
    status: 'in_progress',
    priority: 'medium',
    assignee_id: 'user-seed-3',
    due_date: '2026-04-18',
    created_at: '2026-04-06T12:00:00Z',
    updated_at: '2026-04-06T12:00:00Z',
  },
];

// Mutable in-memory database
export const db = {
  users: [...SEED_USERS],
  projects: [...SEED_PROJECTS],
  tasks: [...SEED_TASKS],
};

export { uuid };
