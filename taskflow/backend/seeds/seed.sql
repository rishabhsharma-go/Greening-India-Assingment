-- Seed data for TaskFlow
-- Test user password: password123 (bcrypt hashed with cost 12)

-- Insert test user
INSERT INTO users (id, name, email, password, created_at)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Test User',
    'test@example.com',
    '$2a$12$qh9KO.RYcdWdiO0orKnCKeq0EjonaTYEYHc1yE28pNTWlXSxGmUqi',
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password = EXCLUDED.password;

-- Insert a second test user for assignment testing
INSERT INTO users (id, name, email, password, created_at)
VALUES (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Jane Doe',
    'jane@example.com',
    '$2a$12$qh9KO.RYcdWdiO0orKnCKeq0EjonaTYEYHc1yE28pNTWlXSxGmUqi',
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password = EXCLUDED.password;

-- Insert test project
INSERT INTO projects (id, name, description, owner_id, created_at)
VALUES (
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'Website Redesign',
    'Q2 project to redesign the company website',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    owner_id = EXCLUDED.owner_id;

-- Insert test tasks with different statuses
INSERT INTO tasks (id, title, description, status, priority, project_id, assignee_id, creator_id, due_date, created_at, updated_at)
VALUES 
(
    'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    'Design homepage mockups',
    'Create initial design mockups for the homepage',
    'todo',
    'high',
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '2026-04-20',
    NOW(),
    NOW()
),
(
    'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    'Implement responsive navigation',
    'Build responsive navigation component with mobile menu',
    'in_progress',
    'medium',
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '2026-04-25',
    NOW(),
    NOW()
),
(
    'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
    'Setup CI/CD pipeline',
    'Configure GitHub Actions for automated testing and deployment',
    'done',
    'low',
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '2026-04-10',
    NOW(),
    NOW()
)
ON CONFLICT DO NOTHING;
