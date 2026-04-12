import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { Project } from '../../entities/project.entity';
import { User } from '../../../users/entities/user.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { RedisService } from '../../../common/redis/redis.service';
import { EventsGateway } from '../../../common/events/events.gateway';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let repo: Record<string, jest.Mock>;

  const mockQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  const mockProjectRepository = {
    create: jest.fn().mockImplementation((dto) => dto as Project),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delByPrefix: jest.fn(),
  };

  const mockEventsGateway = {
    emitTaskUpdate: jest.fn(),
    emitStatsUpdate: jest.fn(),
    emitProjectUpdate: jest.fn(),
  };

  const mockUser: User = {
    id: 'uuid',
    email: 'test@test.com',
    name: 'Test',
  } as Partial<User> as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    repo = module.get(getRepositoryToken(Project));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a project', async () => {
      const dto = { name: 'Test Project', description: 'Test Desc' };
      repo.findOne.mockResolvedValue(null);
      repo.save.mockResolvedValue({ id: 'uuid', ...dto, ownerId: mockUser.id });

      const result = await service.create(dto, mockUser);

      expect(result.id).toBe('uuid');
      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated projects', async () => {
      const projects = [{ id: '1', name: 'P1' }];
      repo.findAndCount.mockResolvedValue([projects, 1]);
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.findAll(1, 10);

      expect(result.data).toEqual(projects);
      expect(result.meta.total).toEqual(1);
    });

    it('should return cached projects on hit', async () => {
      const cached = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, lastPage: 0 },
      };
      mockRedisService.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.findAll();
      expect(result).toEqual(cached);
      expect(repo.findAndCount).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if project not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });

    it('should return project if found', async () => {
      const project = { id: '1' };
      repo.findOne.mockResolvedValue(project);
      const result = await service.findOne('1');
      expect(result).toBe(project);
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException if user is not owner', async () => {
      repo.findOne.mockResolvedValue({ id: '1', ownerId: 'other' });
      await expect(service.update('1', {}, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should update project if user is owner', async () => {
      const project = { id: '1', ownerId: mockUser.id };
      repo.findOne.mockResolvedValue(project);
      repo.save.mockResolvedValue({ ...project, name: 'New' });

      const result = await service.update('1', { name: 'New' }, mockUser);
      expect(result.name).toBe('New');
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException if user is not owner', async () => {
      repo.findOne.mockResolvedValue({ id: '1', ownerId: 'other' });
      await expect(service.remove('1', mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should remove project if user is owner', async () => {
      const project = { id: '1', ownerId: mockUser.id };
      repo.findOne.mockResolvedValue(project);
      await service.remove('1', mockUser);
      expect(repo.softDelete).toHaveBeenCalledWith('1');
    });
  });

  describe('getStats', () => {
    it('should return project stats', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([
        { status: 'done', count: 1 },
      ]);
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([
        { assignee: 'user', count: 1 },
      ]);

      const result = await service.getStats('1');
      expect(result.statsByStatus).toBeDefined();
      expect(result.statsByAssignee).toBeDefined();
    });

    it('should return cached stats on hit', async () => {
      const cached = { statsByStatus: [], statsByAssignee: [] };
      mockRedisService.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.getStats('1');
      expect(result).toEqual(cached);
    });
  });
});
