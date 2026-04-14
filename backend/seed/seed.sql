-- Alex Morgan (password: password123)
INSERT INTO users (id, name, email, password) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Alex Morgan', 'test@example.com',
     '$2a$12$LJ3m4ys3Lgx/bQNBKFMR1.T3BRECPMpNL7mDgYBaSMp.Ev3IOTa5G')
ON CONFLICT (email) DO NOTHING;

-- Jane Doe (password: secret123)
INSERT INTO users (id, name, email, password) VALUES
    ('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Jane Doe', 'jane@example.com',
     '$2a$12$mHghbqIlsA3Dh8mRmNrIEu0ELL0hj3eb58lVplsvSp7uNdRbPZqSS')
ON CONFLICT (email) DO NOTHING;

-- Alex's project
INSERT INTO projects (id, name, description, owner_id) VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Website Redesign',
     'Q2 redesign of the marketing website', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
ON CONFLICT (id) DO NOTHING;

-- Jane's projects
INSERT INTO projects (id, name, description, owner_id) VALUES
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Mobile App Launch',
     'Ship v1.0 of the iOS and Android app by end of Q2', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Design System',
     'Build a shared component library and design tokens for all products', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
ON CONFLICT (id) DO NOTHING;

-- Tasks for Website Redesign (Alex's project)
INSERT INTO tasks (id, title, description, status, priority, project_id, assignee_id, creator_id, due_date) VALUES
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Design homepage mockup',
     'Create wireframes and high-fidelity mockup for the new homepage',
     'done', 'high',
     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     '2026-04-20'),
    ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Implement responsive nav',
     'Build the responsive navigation component with mobile hamburger menu',
     'in_progress', 'medium',
     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     '2026-04-25'),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Write API documentation',
     'Document all REST endpoints with request/response examples',
     'todo', 'low',
     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     '2026-05-01')
ON CONFLICT (id) DO NOTHING;

-- Tasks for Mobile App Launch (Jane's project)
INSERT INTO tasks (id, title, description, status, priority, project_id, assignee_id, creator_id, due_date) VALUES
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Set up React Native project',
     'Initialize the repo, configure ESLint, Prettier, and CI pipeline',
     'done', 'high',
     'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     '2026-04-10'),
    ('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Authentication screens',
     'Build login, register, and forgot password flows with form validation',
     'done', 'high',
     'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     '2026-04-15'),
    ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Dashboard and home feed',
     'Implement the main dashboard with project list and recent activity',
     'in_progress', 'high',
     'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     '2026-04-28'),
    ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Push notification service',
     'Integrate Firebase Cloud Messaging for iOS and Android push notifications',
     'in_progress', 'medium',
     'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     '2026-05-05'),
    ('d4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Offline mode support',
     'Add local caching with SQLite so core features work without internet',
     'todo', 'medium',
     'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     '2026-05-15'),
    ('d5eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'App Store submission',
     'Prepare screenshots, metadata, and submit to Apple App Store and Google Play',
     'todo', 'low',
     'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     NULL,
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     '2026-06-01'),
    ('d6eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Performance profiling',
     'Run Flipper and Reactotron to find and fix render bottlenecks',
     'todo', 'high',
     'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     '2026-05-20')
ON CONFLICT (id) DO NOTHING;

-- Tasks for Design System (Jane's project)
INSERT INTO tasks (id, title, description, status, priority, project_id, assignee_id, creator_id, due_date) VALUES
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Define color palette and tokens',
     'Establish primary, secondary, neutral, and semantic color scales with CSS custom properties',
     'done', 'high',
     'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     '2026-04-12'),
    ('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Typography system',
     'Set up font families, sizes, weights, and line heights as reusable tokens',
     'done', 'medium',
     'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     '2026-04-14'),
    ('e2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Button component variants',
     'Build primary, secondary, danger, ghost, and link button variants with sizes',
     'in_progress', 'high',
     'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     '2026-04-22'),
    ('e3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Form input components',
     'Text input, select, checkbox, radio, and textarea with consistent validation states',
     'in_progress', 'high',
     'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     '2026-04-28'),
    ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Modal and dialog patterns',
     'Create composable modal, confirm dialog, and sheet components',
     'todo', 'medium',
     'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     '2026-05-05'),
    ('e5eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Storybook documentation',
     'Set up Storybook and write stories for every component with interactive controls',
     'todo', 'low',
     'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     NULL,
     'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     '2026-05-20')
ON CONFLICT (id) DO NOTHING;
