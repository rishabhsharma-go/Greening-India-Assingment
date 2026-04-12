import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

import { CreateUserDto } from './dto/create-user.dto';

describe('UsersService Edge Cases', () => {
  let service: UsersService;

  const mockRepo = {
    findOneBy: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto as User),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findByEmail with extreme inputs', () => {
    it('should handle extremely long email strings', async () => {
      const longEmail = 'a'.repeat(255) + '@test.com';
      mockRepo.findOneBy.mockResolvedValue(null);
      await service.findByEmail(longEmail);
      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ email: longEmail });
    });

    it('should handle empty email string', async () => {
      mockRepo.findOneBy.mockResolvedValue(null);
      await service.findByEmail('');
      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ email: '' });
    });
  });

  describe('create generic failures', () => {
    it('should propagate generic DB save errors', async () => {
      mockRepo.findOneBy.mockResolvedValue(null);
      mockRepo.save.mockRejectedValue(new Error('Constraint violation'));
      await expect(
        service.create({ email: 't@t.com' } as CreateUserDto),
      ).rejects.toThrow('Constraint violation');
    });
  });
});
