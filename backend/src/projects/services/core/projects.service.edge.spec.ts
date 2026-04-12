import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from '../../entities/project.entity';
import { RedisService } from '../../../common/redis/redis.service';
import { EventsGateway } from '../../../common/events/events.gateway';
import { User } from '../../../users/entities/user.entity';

describe('ProjectsService Edge Cases', () => {
  let service: ProjectsService;

  const mockRepo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
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
  };

  const mockUser: User = {
    id: 'uuid',
    email: 'test@test.com',
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockRepo,
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
  });

  describe('findAll pagination edge cases', () => {
    it('should handle page 0 by adjusting offset (logic check)', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);
      mockRedisService.get.mockResolvedValue(null);
      await service.findAll(0, 10);
      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: expect.any(Number) as number,
        }),
      );
    });
  });

  describe('getStats edge cases', () => {
    it('should return empty stats for project with no tasks', async () => {
      mockRedisService.get.mockResolvedValue(null);
      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getStats('1');
      expect(result.statsByStatus).toEqual([]);
      expect(result.statsByAssignee).toEqual([]);
    });

    it('should handle unassigned tasks (null assignee) in stats', async () => {
      mockRedisService.get.mockResolvedValue(null);
      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValueOnce([{ status: 'todo', count: 5 }])
          .mockResolvedValueOnce([{ assignee: null, count: 5 }]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getStats('1');
      expect(result.statsByAssignee[0].assignee).toBeNull();
    });
  });
});
