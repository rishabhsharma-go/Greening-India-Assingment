import pool from './db';
import bcrypt from 'bcrypt';

const seed = async () => {
  try {
    const email = 'test@example.com';
    const password = 'password123';
    
    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      console.log('Seed data already exists.');
      return;
    }

    // Insert User
    const hashedPassword = await bcrypt.hash(password, 12);
    const userRes = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
      ['Test User', email, hashedPassword]
    );
    const userId = userRes.rows[0].id;

    // Insert Project
    const projRes = await pool.query(
      'INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING id',
      ['Demo Project', 'A seed project for testing', userId]
    );
    const projId = projRes.rows[0].id;

    // Insert Tasks
    await pool.query(
      'INSERT INTO tasks (title, status, project_id, assignee_id, priority) VALUES ($1, $2, $3, $4, $5)',
      ['Task 1 - To Do', 'todo', projId, userId, 'high']
    );
    await pool.query(
      'INSERT INTO tasks (title, status, project_id, assignee_id, priority) VALUES ($1, $2, $3, $4, $5)',
      ['Task 2 - In Progress', 'in-progress', projId, userId, 'medium']
    );
    await pool.query(
      'INSERT INTO tasks (title, status, project_id, assignee_id, priority) VALUES ($1, $2, $3, $4, $5)',
      ['Task 3 - Done', 'done', projId, userId, 'low']
    );

    console.log('Database seeded successfully.');
  } catch (err) {
    console.error('Seed failed', err);
  } finally {
    process.exit(0);
  }
};

seed();
