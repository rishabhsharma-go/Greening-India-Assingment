-- seed.sql
-- Idempotent seed data for local development and reviewer testing.
--
-- Credentials:
--   test@example.com  /  password123
--   jane@example.com  /  password123
--
-- pgcrypto's crypt() generates a real bcrypt hash on first run.
-- ON CONFLICT DO NOTHING makes every subsequent run a no-op.

-- ── Users ─────────────────────────────────────────────────────────────────────
INSERT INTO users (id, name, email, password_hash)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Test User',
    'test@example.com',
    crypt('password123', gen_salt('bf', 12))
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, name, email, password_hash)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Jane Smith',
    'jane@example.com',
    crypt('password123', gen_salt('bf', 12))
)
ON CONFLICT (id) DO NOTHING;

-- ── Project ───────────────────────────────────────────────────────────────────
INSERT INTO projects (id, name, description, owner_id)
VALUES (
    '00000000-0000-0000-0000-000000000010',
    'Website Redesign',
    'Complete overhaul of the marketing site for Q2 launch',
    '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

-- ── Tasks (one per status — exercises the full Kanban board) ──────────────────
INSERT INTO tasks (id, title, description, status, priority, project_id, assignee_id, due_date)
VALUES
    (
        '00000000-0000-0000-0000-000000000020',
        'Design new homepage',
        'Create wireframes and high-fidelity mockups for the main landing page',
        'done',
        'high',
        '00000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000001',
        '2026-04-10'
    ),
    (
        '00000000-0000-0000-0000-000000000021',
        'Implement responsive navigation',
        'Build a fully responsive nav bar that collapses to a hamburger menu on mobile',
        'in_progress',
        'medium',
        '00000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000002',
        '2026-04-20'
    ),
    (
        '00000000-0000-0000-0000-000000000022',
        'SEO audit and meta tags',
        'Review all pages for missing meta descriptions, OG tags, and structured data',
        'todo',
        'low',
        '00000000-0000-0000-0000-000000000010',
        NULL,
        '2026-04-30'
    )
ON CONFLICT (id) DO NOTHING;
