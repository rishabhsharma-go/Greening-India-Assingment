import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { User } from '../../../users/entities/user.entity';
import { Role } from '../../../users/entities/role.entity';
import * as bcrypt from 'bcrypt';

export default class UserSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const roleRepository = dataSource.getRepository(Role);

    const allRoles = await roleRepository.find();
    const adminRole = allRoles.find((r) => r.slug === 'admin');
    const userRole = allRoles.find((r) => r.slug === 'user');

    if (!adminRole || !userRole) {
      console.error('Roles not found. RoleSeeder must run first.');
      return;
    }

    const hashedPassword = await bcrypt.hash('password123', 12);
    const users = [
      {
        name: 'Community Guardian',
        email: 'guardian@taskflow.com',
        password: hashedPassword,
        role: userRole,
      },
      {
        name: 'Standard User',
        email: 'user@taskflow.com',
        password: hashedPassword,
        role: userRole,
      },
      {
        name: 'Production Admin',
        email: 'test@example.com',
        password: hashedPassword,
        role: adminRole,
      },
    ];

    process.stdout.write('Seeding Elite Ecosystem Users...\n');

    for (const userData of users) {
      const existing = await userRepository.findOneBy({ email: userData.email });
      if (!existing) {
        await userRepository.save(userRepository.create(userData));
      }
    }
  }
}
