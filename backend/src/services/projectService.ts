import pool from '../db';

export const getProjectsForUser = async (userId: string) => {
  const { rows } = await pool.query(`
    SELECT DISTINCT p.id, p.name, p.description, p.owner_id, p.created_at
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    WHERE p.owner_id = $1 OR t.assignee_id = $1
    ORDER BY p.created_at DESC
  `, [userId]);
  return rows;
};

export const createProject = async (name: string, description: string, ownerId: string) => {
  const { rows } = await pool.query(
    'INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
    [name, description, ownerId]
  );
  return rows[0];
};

export const getProjectWithTasks = async (projectId: string, userId: string) => {
  // Authorization check
  const authCheck = await pool.query(`
    SELECT p.id FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    WHERE p.id = $1 AND (p.owner_id = $2 OR t.assignee_id = $2)
    LIMIT 1
  `, [projectId, userId]);
  
  if (authCheck.rows.length === 0) {
    return null;
  }

  const { rows: projectRows } = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
  const { rows: taskRows } = await pool.query('SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at ASC', [projectId]);
  
  return { ...projectRows[0], tasks: taskRows };
};

export const updateProject = async (projectId: string, userId: string, data: { name?: string; description?: string }) => {
  const authCheck = await pool.query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
  if (authCheck.rows.length === 0) return { error: 'not_found' };
  if (authCheck.rows[0].owner_id !== userId) return { error: 'forbidden' };

  const { rows } = await pool.query(
    'UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 RETURNING *',
    [data.name, data.description, projectId]
  );
  return { project: rows[0] };
};

export const deleteProject = async (projectId: string, userId: string) => {
  const authCheck = await pool.query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
  if (authCheck.rows.length === 0) return { error: 'not_found' };
  if (authCheck.rows[0].owner_id !== userId) return { error: 'forbidden' };

  await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
  return { success: true };
};
