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
    if (!admin) return;

    const themes = [
      'Eco',
      'Green',
      'Sustainable',
      'Renewable',
      'Bio',
      'Nature',
    ];
    const projectTypes = [
      'Reforestation',
      'Clean-up',
      'Audit',
      'Migration',
      'Deployment',
    ];

    process.stdout.write('Generating Thematic Environmental Projects...\n');

    for (let i = 0; i < 5; i++) {
      const prefix = faker.helpers.arrayElement(themes);
      const type = faker.helpers.arrayElement(projectTypes);

      await projectRepository.save(
        projectRepository.create({
          name: `${prefix}-${type}: Project ${faker.location.city()}`,
          description: `Mission to improve ${faker.word.adjective()} environmental integrity. ${faker.company.catchPhrase()}`,
          owner: admin,
        }),
      );
    }
  }
}
