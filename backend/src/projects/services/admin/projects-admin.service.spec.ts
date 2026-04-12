import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectsAdminService } from './projects-admin.service';
import { Project } from '../../entities/project.entity';
import { ProjectsService } from '../core/projects.service';
import { RedisService } from '../../../common/redis/redis.service';
import { EventsGateway } from '../../../common/events/events.gateway';
import { User } from '../../../users/entities/user.entity';

describe('ProjectsAdminService', () => {
  let service: ProjectsAdminService;
  let repo: Record<string, jest.Mock>;

  const mockQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  const mockProjectRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delByPrefix: jest.fn(),
  };

  const mockEventsGateway = {
    emitProjectUpdate: jest.fn(),
    emitStatsUpdate: jest.fn(),
    emitTaskUpdate: jest.fn(),
  };

  const mockArchitect: User = { id: 'admin-1' } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsAdminService,
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

    service = module.get<ProjectsAdminService>(ProjectsAdminService);
    repo = module.get(getRepositoryToken(Project));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Administrative Overrides', () => {
    it('update() should bypass ownership check', async () => {
      const project = { id: 'p1', ownerId: 'other-user' };
      repo.findOne.mockResolvedValue(project);
      repo.save.mockResolvedValue({ ...project, name: 'Managed' });

      const result = await service.update('p1', { name: 'Managed' });
      expect(result.name).toBe('Managed');
      expect(repo.save).toHaveBeenCalled();
    });

    it('remove() should bypass ownership check', async () => {
      const project = { id: 'p1', ownerId: 'other-user' };
      repo.findOne.mockResolvedValue(project);

      await service.remove('p1');
      expect(repo.softDelete).toHaveBeenCalledWith('p1');
    });
  });

  describe('Inherited Logic', () => {
    it('should have access to ProjectsService members', () => {
      expect(service).toBeInstanceOf(ProjectsService);
    });
  });
  
  describe('getSystemStats()', () => {
    it('should return cached stats if available', async () => {
      (mockProjectRepository.createQueryBuilder as jest.Mock).mockClear();
      const cached = JSON.stringify({ statsByStatus: [], statsByAssignee: [] });
      mockRedisService.get.mockResolvedValue(cached);

      const result = await service.getSystemStats();
      expect(result).toEqual(JSON.parse(cached));
      expect(mockProjectRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should calculate and cache stats if not in redis', async () => {
      mockRedisService.get.mockResolvedValue(null);
      const stats = [{ status: 'todo', count: 1 }];
      
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce(stats)
        .mockResolvedValueOnce([]);

      const result = await service.getSystemStats();
      expect(result.statsByStatus).toEqual(stats);
      expect(mockRedisService.set).toHaveBeenCalled();
    });
  });
});
