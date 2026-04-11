/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createType('task_status', ['todo', 'in_progress', 'done']);
  pgm.createType('task_priority', ['low', 'medium', 'high']);

  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'text', notNull: true },
    email: { type: 'text', notNull: true, unique: true },
    password_hash: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('projects', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'text', notNull: true },
    description: { type: 'text' },
    owner_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'cascade' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  
  pgm.createIndex('projects', 'owner_id');

  pgm.createTable('tasks', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    title: { type: 'text', notNull: true },
    description: { type: 'text' },
    status: { type: 'task_status', notNull: true, default: 'todo' },
    priority: { type: 'task_priority', notNull: true, default: 'medium' },
    project_id: { type: 'uuid', notNull: true, references: 'projects(id)', onDelete: 'cascade' },
    assignee_id: { type: 'uuid', references: 'users(id)', onDelete: 'set null' },
    due_date: { type: 'date' },
    creator_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'cascade' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('tasks', 'project_id');
  pgm.createIndex('tasks', 'assignee_id');
  pgm.createIndex('tasks', 'status');
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('tasks');
  pgm.dropTable('projects');
  pgm.dropTable('users');

  pgm.dropType('task_priority');
  pgm.dropType('task_status');
};
