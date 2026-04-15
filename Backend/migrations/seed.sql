INSERT INTO users (id, name, email, password) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'Test User',
   'test@example.com',
   '$2a$12$oLoMbOmPE/JqxHkm.S7P7.qFhxUVmhMTq9s4UJMXv2h7zVzEEMqEe')
ON CONFLICT DO NOTHING;

INSERT INTO projects (id, name, description, owner_id) VALUES
  ('00000000-0000-0000-0000-000000000002',
   'Demo Project',
   'Seeded project',
   '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

INSERT INTO tasks (title, status, priority, project_id, creator_id) VALUES
  ('Set up CI pipeline',  'todo',        'high',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001'),
  ('Write API tests',     'in_progress', 'medium',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001'),
  ('Deploy to staging',   'done',        'low',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;