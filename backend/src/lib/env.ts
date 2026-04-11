import { z } from "zod";

// Centralized environment validation.
//
// The app fails fast on startup if required env vars are missing/invalid.
const schema = z.object({
  API_PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
});

export const env = schema.parse({
  API_PORT: process.env.API_PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
});
