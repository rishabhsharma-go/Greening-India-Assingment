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
    const ecologist = await userRepository.findOneBy({ email: 'user@taskflow.com' });
    const allProjects = await projectRepository.find();

    if (!admin || !ecologist || allProjects.length === 0) {
      console.error('Core entities missing for task seeding.');
      return;
    }

    process.stdout.write('Cultivating Tasks across the Project Ecosystem...\n');

    const participants = [admin, ecologist];

    for (const project of allProjects) {
      for (let j = 0; j < 4; j++) {
        const creator = faker.helpers.arrayElement(participants);
        const assignee = faker.helpers.arrayElement(participants);
        
        const action = faker.helpers.arrayElement(['Analyze', 'Setup', 'Launch', 'Monitor', 'Audit']);
        const status = faker.helpers.arrayElement(Object.values(TaskStatus));

        await taskRepository.save(
          taskRepository.create({
            title: `${action} ${faker.word.noun()} protocol`,
            description: `Detailed task for the project ecosystem: ${faker.company.catchPhrase()}`,
            status: status,
            priority: faker.helpers.arrayElement(Object.values(TaskPriority)),
            projectId: project.id,
            creatorId: creator.id,
            assigneeId: assignee.id,
            dueDate: faker.date.future().toISOString().split('T')[0],
          }),
        );
      }
    }
  }
}
