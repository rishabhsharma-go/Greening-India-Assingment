module.exports = {
  databaseUrl: process.env.DATABASE_URL,
  migrationsTable: 'schema_migrations',
  dir: 'migrations',
  direction: 'up',
  count: Infinity,
  verbose: true,
  schema: 'public'
};
