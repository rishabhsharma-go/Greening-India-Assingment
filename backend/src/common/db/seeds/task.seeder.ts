import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { faker } from '@faker-js/faker';
import { User } from '../../../users/entities/user.entity';
import { Task, TaskStatus, TaskPriority } from '../../../tasks/entities/task.entity';
import { Project } from '../../../projects/entities/project.entity';

export default class TaskSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const taskRepository = dataSource.getRepository(Task);
    const projectRepository = dataSource.getRepository(Project);
    const userRepository = dataSource.getRepository(User);

    const admin = await userRepository.findOneBy({ email: 'test@example.com' });
    const projects = await projectRepository.find();

    if (!admin || projects.length === 0) return;

    process.stdout.write('Cultivating Tasks with Precision Vitality mix...\n');

    for (const project of projects) {
      for (let j = 0; j < 4; j++) {
        const action = faker.helpers.arrayElement([
          'Analyze',
          'Setup',
          'Launch',
          'Monitor',
          'Audit',
        ]);

        const statuses = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE, TaskStatus.TODO];
        const status = statuses[j];

        await taskRepository.save(
          taskRepository.create({
            title: `${action} ${faker.word.noun()} protocol`,
            description: `Detailed task for the project ecosystem.`,
            status: status,
            priority: faker.helpers.arrayElement(Object.values(TaskPriority)),
            project: project,
            creator: admin,
            assignee: admin,
            dueDate: faker.date.future().toISOString().split('T')[0],
          }),
        );
      }
    }
  }
}
