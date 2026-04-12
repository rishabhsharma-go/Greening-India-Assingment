import pool from '../db';

export const createTask = async (data: { title: string; description?: string; project_id: string; assignee_id?: string; due_date?: string }) => {
  const { rows } = await pool.query(
    'INSERT INTO tasks (title, description, project_id, assignee_id, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [data.title, data.description, data.project_id, data.assignee_id, data.due_date]
  );
  return rows[0];
};

export const updateTask = async (taskId: string, data: any) => {
  const fields = Object.keys(data).filter(k => data[k] !== undefined);
  if (fields.length === 0) return null;

  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const values = fields.map(f => data[f]);
  values.push(taskId);

  const { rows } = await pool.query(
    `UPDATE tasks SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0];
};

export const deleteTask = async (taskId: string) => {
  await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
  return true;
};

export const checkProjectAccess = async (projectId: string, userId: string) => {
  const { rows } = await pool.query(`
    SELECT p.id FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    WHERE p.id = $1 AND (p.owner_id = $2 OR t.assignee_id = $2)
    LIMIT 1
  `, [projectId, userId]);
  return rows.length > 0;
};
