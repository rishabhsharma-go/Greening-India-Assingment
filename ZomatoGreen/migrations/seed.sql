-- Seed script — run after migrations and gateway startup (which seeds the test user).
-- Safe to re-run: all inserts use ON CONFLICT DO NOTHING.
DO $$
DECLARE
  v_user_id  UUID;
  v_proj_id  UUID := '20000000-0000-0000-0000-000000000001';
BEGIN
  -- Species seed data
  INSERT INTO species (id, name, wood_density_rho, agb_coefficient_a, agb_coefficient_b) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Bamboo',       0.6000, 0.1291, 2.4450),
    ('10000000-0000-0000-0000-000000000002', 'Seabuckthorn', 0.8200, 0.0899, 2.5600),
    ('10000000-0000-0000-0000-000000000003', 'Teak',         0.6300, 0.0824, 2.6710)
  ON CONFLICT (name) DO NOTHING;

  -- Project + task seed (requires test user to exist — created by gateway on first boot)
  SELECT id INTO v_user_id FROM users WHERE email = 'test@example.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'test user not found — skipping project/task seed. Start the gateway first, then re-run this script.';
    RETURN;
  END IF;

  INSERT INTO projects (id, name, description, owner_id) VALUES
    (v_proj_id, 'Demo Project', 'Sample project pre-loaded for evaluation', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO tasks (id, title, description, status, priority, project_id, assignee_id, creator_id) VALUES
    (
      '30000000-0000-0000-0000-000000000001',
      'Design the homepage',
      'Create wireframes and high-fidelity mockups for the landing page',
      'todo', 'high',
      v_proj_id, v_user_id, v_user_id
    ),
    (
      '30000000-0000-0000-0000-000000000002',
      'Set up CI/CD pipeline',
      'Configure GitHub Actions for automated build, test, and deploy',
      'in_progress', 'medium',
      v_proj_id, v_user_id, v_user_id
    ),
    (
      '30000000-0000-0000-0000-000000000003',
      'Write API documentation',
      'Document all REST endpoints with request/response examples',
      'done', 'low',
      v_proj_id, v_user_id, v_user_id
    )
  ON CONFLICT (id) DO NOTHING;
END $$;
