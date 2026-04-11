import { Pool } from "pg";

import { env } from "./env.js";

// Shared PostgreSQL connection pool used across all route handlers.
//
// The connection string is validated on startup in env.ts.
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});
