exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createIndex('users', 'email');
  pgm.createIndex('projects', 'owner_id');
  pgm.createIndex('tasks', 'project_id');
  pgm.createIndex('tasks', 'assignee_id');
};

exports.down = (pgm) => {
  pgm.dropIndex('tasks', 'assignee_id');
  pgm.dropIndex('tasks', 'project_id');
  pgm.dropIndex('projects', 'owner_id');
  pgm.dropIndex('users', 'email');
};
