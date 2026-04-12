exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createExtension('uuid-ossp', { ifNotExists: true });

  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    name: { type: 'varchar(255)', notNull: true },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    password: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });

  pgm.createTable('projects', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    owner_id: { type: 'uuid', references: 'users(id)', onDelete: 'cascade', notNull: true },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });

  pgm.createTable('tasks', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    title: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    status: { type: 'varchar(50)', notNull: true, default: 'todo' },
    priority: { type: 'varchar(50)', notNull: true, default: 'medium' },
    project_id: { type: 'uuid', references: 'projects(id)', onDelete: 'cascade', notNull: true },
    assignee_id: { type: 'uuid', references: 'users(id)', onDelete: 'set null' },
    due_date: { type: 'date' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
};

exports.down = (pgm) => {
  pgm.dropTable('tasks');
  pgm.dropTable('projects');
  pgm.dropTable('users');
  pgm.dropExtension('uuid-ossp');
};
