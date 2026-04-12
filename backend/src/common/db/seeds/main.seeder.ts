import { DataSource } from 'typeorm';
import { Seeder, runSeeder } from 'typeorm-extension';
import RoleSeeder from './role.seeder';
import UserSeeder from './user.seeder';
import ProjectSeeder from './project.seeder';
import TaskSeeder from './task.seeder';

export default class MainSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    process.stdout.write(
      'Initializing Global System Reset (Truncating ALL tables)...\n',
    );
    await dataSource.query(
      'TRUNCATE tasks, projects, users, roles RESTART IDENTITY CASCADE',
    );

    // Order: Roles -> Users -> Projects -> Tasks
    await runSeeder(dataSource, RoleSeeder);
    await runSeeder(dataSource, UserSeeder);
    await runSeeder(dataSource, ProjectSeeder);
    await runSeeder(dataSource, TaskSeeder);

    process.stdout.write('\nGlobal Reset & Seeding Complete.\n');
  }
}
