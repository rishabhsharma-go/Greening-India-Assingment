-- 001_init_schema.down.sql

DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

DROP TYPE IF EXISTS task_status;
DROP TYPE IF EXISTS task_priority;

DROP EXTENSION IF EXISTS "uuid-ossp";
