import pool from '../db';
import bcrypt from 'bcrypt';

export const findByEmail = async (email: string) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0];
};

export const createUser = async (name: string, email: string, passwordHash: string) => {
  const { rows } = await pool.query(
    'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
    [name, email, passwordHash]
  );
  return rows[0];
};

export const listUsers = async () => {
  const { rows } = await pool.query('SELECT id, name, email FROM users ORDER BY name ASC');
  return rows;
};
