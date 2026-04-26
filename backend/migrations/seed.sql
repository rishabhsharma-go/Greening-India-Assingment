INSERT INTO users (id, name, email, password, created_at)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Test User',
    'test@example.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VkuuGnzgi',
    NOW()
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO projects (id, name, description, owner_id, created_at)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Demo Project',
    'A seed project for testing',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW()
)
ON CONFLICT DO NOTHING;

INSERT INTO tasks (id, title, description, status, priority, project_id, created_at, updated_at)
VALUES
    ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'First task',  'Status: todo',        'todo',        'low',    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NOW(), NOW()),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Second task', 'Status: in_progress', 'in_progress', 'medium', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NOW(), NOW()),
    ('c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Third task',  'Status: done',        'done',        'high',   'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NOW(), NOW())
ON CONFLICT DO NOTHING;
