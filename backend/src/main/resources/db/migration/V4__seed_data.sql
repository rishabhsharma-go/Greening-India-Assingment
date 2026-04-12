-- V4: Seed data
-- Password is bcrypt hash of 'password123' with cost 12
INSERT INTO users (id, name, email, password, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Test User',
    'test@example.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCMRh1oTKJ4L.2VQXQ8OzS6',
    NOW()
);

INSERT INTO projects (id, name, description, owner_id, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000010',
    'Sample Project',
    'A demo project created by seed data',
    '00000000-0000-0000-0000-000000000001',
    NOW()
);

INSERT INTO tasks (id, title, description, status, priority, project_id, assignee_id, due_date, created_at, updated_at)
VALUES
(
    '00000000-0000-0000-0000-000000000100',
    'Set up project repository',
    'Initialize the git repo and set up CI/CD pipelines',
    'done',
    'high',
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    '2026-04-05',
    NOW(),
    NOW()
),
(
    '00000000-0000-0000-0000-000000000101',
    'Design database schema',
    'Create ERD and write migration scripts',
    'in_progress',
    'high',
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    '2026-04-15',
    NOW(),
    NOW()
),
(
    '00000000-0000-0000-0000-000000000102',
    'Implement authentication',
    'JWT-based login and registration endpoints',
    'todo',
    'medium',
    '00000000-0000-0000-0000-000000000010',
    NULL,
    '2026-04-20',
    NOW(),
    NOW()
);

