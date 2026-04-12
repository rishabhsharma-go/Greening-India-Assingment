import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { Role } from '../../../users/entities/role.entity';
import { UserRole } from '../../../users/enums/user-role.enum';

export default class RoleSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const roleRepository = dataSource.getRepository(Role);

    const roles = [
      { name: 'Administrator', slug: UserRole.ADMIN },
      { name: 'Standard User', slug: UserRole.USER },
    ];

    for (const roleData of roles) {
      const existing = await roleRepository.findOneBy({ slug: roleData.slug });
      if (!existing) {
        await roleRepository.save(roleRepository.create(roleData));
      }
    }
  }
}
