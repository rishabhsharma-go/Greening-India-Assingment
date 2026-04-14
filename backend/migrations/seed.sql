-- seed.sql
-- Insert test user with bcrypt hashed password: password123
INSERT INTO users (name, email, password) 
VALUES ('Test User', 'test@example.com', '$2b$12$wC9Cn8ZFyraajIugB3I5he3fWrb.Nor/G472P.F2/VNfSYRAJjm3a')
ON CONFLICT (email) DO NOTHING;

-- Insert test project
INSERT INTO projects (name, description, owner_id)
SELECT 'Website Redesign', 'Q2 project redesign', id FROM users WHERE email = 'test@example.com'
ON CONFLICT DO NOTHING;

-- Insert test tasks
INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, due_date)
SELECT 
  'Design homepage',
  'Create wireframes and mockups',
  'in_progress',
  'high',
  p.id,
  u.id,
  '2026-04-20'
FROM projects p
JOIN users u ON u.email = 'test@example.com'
WHERE p.name = 'Website Redesign'
ON CONFLICT DO NOTHING;

INSERT INTO tasks (title, description, status, priority, project_id, due_date)
SELECT 
  'Setup database',
  'Initialize PostgreSQL with schema',
  'done',
  'high',
  p.id,
  '2026-04-10'
FROM projects p
WHERE p.name = 'Website Redesign'
ON CONFLICT DO NOTHING;

INSERT INTO tasks (title, description, status, priority, project_id)
SELECT 
  'Write API documentation',
  'Document all endpoints',
  'todo',
  'medium',
  p.id
FROM projects p
WHERE p.name = 'Website Redesign'
ON CONFLICT DO NOTHING;
