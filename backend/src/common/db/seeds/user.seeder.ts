import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { User } from '../../../users/entities/user.entity';
import { UserRole } from '../../../users/enums/user-role.enum';
import * as bcrypt from 'bcrypt';

export default class UserSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('password123', 12);

    process.stdout.write('Seeding Primary Administrator...\n');

    await userRepository.save(
      userRepository.create({
        name: 'Test Administrator',
        email: 'test@example.com',
        password: hashedPassword,
        role: UserRole.ADMIN,
      }),
    );
  }
}
