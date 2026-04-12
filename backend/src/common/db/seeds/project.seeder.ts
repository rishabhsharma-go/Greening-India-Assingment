import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { faker } from '@faker-js/faker';
import { User } from '../../../users/entities/user.entity';
import { Project } from '../../../projects/entities/project.entity';

export default class ProjectSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const projectRepository = dataSource.getRepository(Project);
    const userRepository = dataSource.getRepository(User);

    const admin = await userRepository.findOneBy({ email: 'test@example.com' });
    const ecologist = await userRepository.findOneBy({ email: 'user@taskflow.com' });

    if (!admin || !ecologist) {
      console.error('Users not found for project seeding.');
      return;
    }

    const adminDatasets = {
      themes: ['Core', 'System', 'Audit', 'Legacy', 'Global'],
      types: ['Migration', 'Compliance', 'Initialization', 'Security'],
    };

    const ecologistDatasets = {
      themes: ['Eco', 'Nature', 'Wild', 'Green', 'Bio'],
      types: ['Reforestation', 'Clean-up', 'Preservation', 'Sanctuary'],
    };

    process.stdout.write('Cultivating a Diverse Project Ecosystem...\n');

    // Admin Perspective
    for (let i = 0; i < 3; i++) {
      const theme = faker.helpers.arrayElement(adminDatasets.themes);
      const type = faker.helpers.arrayElement(adminDatasets.types);
      await projectRepository.save(
        projectRepository.create({
          name: `${theme}-${type}: Infrastructure ${faker.location.city()}`,
          description: `Internal administrative initiative: ${faker.company.catchPhrase()}`,
          ownerId: admin.id,
        }),
      );
    }

    // Ecologist Perspective
    for (let i = 0; i < 3; i++) {
      const theme = faker.helpers.arrayElement(ecologistDatasets.themes);
      const type = faker.helpers.arrayElement(ecologistDatasets.types);
      await projectRepository.save(
        projectRepository.create({
          name: `${theme}-${type}: Project ${faker.location.city()}`,
          description: `Field environmental initiative: ${faker.company.catchPhrase()}`,
          ownerId: ecologist.id,
        }),
      );
    }
  }
}
