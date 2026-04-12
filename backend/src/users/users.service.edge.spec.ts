import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

import { CreateUserDto } from './dto/create-user.dto';

import { Role } from './entities/role.entity';

describe('UsersService Edge Cases', () => {
  let service: UsersService;

  const mockRepo = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto as User),
    save: jest.fn(),
  };

  const mockRoleRepo = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
        { provide: getRepositoryToken(Role), useValue: mockRoleRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findByEmail with extreme inputs', () => {
    it('should handle extremely long email strings', async () => {
      const longEmail = 'a'.repeat(255) + '@test.com';
      await service.findByEmail(longEmail);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ 
        where: { email: longEmail },
        relations: ['role']
      });
    });

    it('should handle empty email string', async () => {
      await service.findByEmail('');
      expect(mockRepo.findOne).toHaveBeenCalledWith({ 
        where: { email: '' },
        relations: ['role']
      });
    });
  });

  describe('create generic failures', () => {
    it('should propagate generic DB save errors', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRoleRepo.findOneBy.mockResolvedValue({ id: 'r1', slug: 'user' });
      mockRepo.save.mockRejectedValue(new Error('Constraint violation'));
      await expect(
        service.create({ email: 't@t.com' } as CreateUserDto),
      ).rejects.toThrow('Constraint violation');
    });
  });
});
