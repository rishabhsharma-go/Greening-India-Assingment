import bcrypt from "bcrypt";
import { pool } from "../lib/db.js";

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "password123";

const SEED_USER_ID = "00000000-0000-0000-0000-000000000001";
const SEED_PROJECT_ID = "00000000-0000-0000-0000-000000000101";
const SEED_TASK_1_ID = "00000000-0000-0000-0000-000000000201";
const SEED_TASK_2_ID = "00000000-0000-0000-0000-000000000202";
const SEED_TASK_3_ID = "00000000-0000-0000-0000-000000000203";

async function main() {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

    const userRes = await client.query(
      `insert into users(name, email, password_hash)
       values($1, $2, $3)
       on conflict (email) do update set name = excluded.name, password_hash = excluded.password_hash
       returning id, email`,
      ["Test User", TEST_EMAIL, passwordHash],
    );

    const userId = (userRes.rows[0].id as string) || SEED_USER_ID;

    await client.query(
      `insert into projects(id, name, description, owner_id)
       values($1, $2, $3, $4)
       on conflict (id) do update set
         name = excluded.name,
         description = excluded.description,
         owner_id = excluded.owner_id`,
      [
        SEED_PROJECT_ID,
        "Seed Project",
        "Project created by seed script",
        userId,
      ],
    );

    const projectId = SEED_PROJECT_ID;

    await client.query(
      `insert into tasks(id, title, description, status, priority, project_id, assignee_id, due_date, creator_id)
       values
         ($1, $2, $3, 'todo', $4, $5, $6, $7, $8),
         ($9, $10, $11, 'in_progress', $12, $13, $14, $15, $16),
         ($17, $18, $19, 'done', $20, $21, $22, $23, $24)
       on conflict (id) do update set
         title = excluded.title,
         description = excluded.description,
         status = excluded.status,
         priority = excluded.priority,
         project_id = excluded.project_id,
         assignee_id = excluded.assignee_id,
         due_date = excluded.due_date,
         creator_id = excluded.creator_id,
         updated_at = now()`,
      [
        SEED_TASK_1_ID,
        "First task",
        "Todo task",
        "low",
        projectId,
        userId,
        null,
        userId,
        SEED_TASK_2_ID,
        "Second task",
        "In progress task",
        "high",
        projectId,
        userId,
        null,
        userId,
        SEED_TASK_3_ID,
        "Third task",
        "Done task",
        "medium",
        projectId,
        userId,
        null,
        userId,
      ],
    );

    await client.query("commit");
    console.log("Seed complete");
    console.log(`Email: ${TEST_EMAIL}`);
    console.log(`Password: ${TEST_PASSWORD}`);
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
