
const { Client } = require('pg');

async function checkTaskData() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'taskflow',
  });

  try {
    await client.connect();
    const projects = await client.query('SELECT count(*) FROM projects');
    const tasks = await client.query('SELECT count(*) FROM tasks');
    console.log('Projects count:', projects.rows[0].count);
    console.log('Tasks count:', tasks.rows[0].count);
    
    if (tasks.rows[0].count > 0) {
      const sampleTasks = await client.query('SELECT title, status FROM tasks LIMIT 5');
      console.log('Sample Tasks:', JSON.stringify(sampleTasks.rows, null, 2));
    }
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await client.end();
  }
}

checkTaskData();
