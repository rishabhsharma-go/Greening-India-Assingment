import dotenv from 'dotenv';
dotenv.config();

const getEnv = (key: string, required = true): string => {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Environment variable ${key} is required but missing.`);
  }
  return value || '';
};

export const config = {
  port: process.env.PORT || 4000,
  jwtSecret: getEnv('JWT_SECRET'),
  databaseUrl: getEnv('DATABASE_URL'),
};
