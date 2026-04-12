import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ConflictException } from '@nestjs/common';
import { USER_MESSAGES } from './constants/user-messages';
import { CreateUserDto } from './dto/create-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let repo: Record<string, jest.Mock>;

  const mockUserRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ConflictException if user exists', async () => {
      repo.findOneBy.mockResolvedValue({ id: '1' });
      await expect(
        service.create({ email: 'test@test.com' } as CreateUserDto),
      ).rejects.toThrow(new ConflictException(USER_MESSAGES.CONFLICT));
    });

    it('should create and save a new user', async () => {
      repo.findOneBy.mockResolvedValue(null);
      const dto = {
        name: 'Test',
        email: 'test@test.com',
        password: 'pass',
      } as CreateUserDto;
      repo.create.mockReturnValue(dto);
      repo.save.mockResolvedValue({ id: '1', ...dto });

      const result = await service.create(dto);
      expect(result).toEqual({ id: '1', ...dto });
      expect(repo.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findByEmail', () => {
    it('should return user from repo', async () => {
      const user = { id: '1', email: 'test@test.com' };
      repo.findOneBy.mockResolvedValue(user);
      const result = await service.findByEmail('test@test.com');
      expect(result).toEqual(user);
    });
  });

  describe('findByEmailWithPassword', () => {
    it('should use query builder to select password', async () => {
      const user = { id: '1', password: 'secret' };
      const qb = mockUserRepo.createQueryBuilder();
      qb.getOne.mockResolvedValue(user);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByEmailWithPassword('test@test.com');
      expect(result).toEqual(user);
      expect(qb.addSelect).toHaveBeenCalledWith('user.password');
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const user = { id: '1' };
      repo.findOne.mockResolvedValue(user);
      const result = await service.findOne('1');
      expect(result).toEqual(user);
    });
  });
});
