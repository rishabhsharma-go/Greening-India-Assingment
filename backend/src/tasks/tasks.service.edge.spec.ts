import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { ProjectsService } from '../projects/projects.service';
import { EventsGateway } from '../common/events/events.gateway';
import { RedisService } from '../common/redis/redis.service';

describe('TasksService Edge Cases', () => {
  let service: TasksService;
  let projectsService: Partial<ProjectsService>;

  const mockRepo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    getStats: jest.fn(),
  };

  const mockEventsGateway = {
    emitTaskUpdate: jest.fn(),
    emitStatsUpdate: jest.fn(),
  };

  beforeEach(async () => {
    projectsService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: mockRepo },
        { provide: ProjectsService, useValue: projectsService },
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

    service = module.get<TasksService>(TasksService);
  });

  describe('findAll with missing associations', () => {
    it('should handle search for non-existent assignee without error', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);
      const result = await service.findAll(
        'p1',
        undefined,
        'non-existent-uuid',
        1,
        10,
      );
      expect(result.data).toEqual([]);
      const [callArgs] = mockRepo.findAndCount.mock.calls[0] as [
        { where: Record<string, any> },
      ];
      expect(callArgs.where).toEqual(
        expect.objectContaining({
          assignee: { id: 'non-existent-uuid' },
        }),
      );
    });
  });

  describe('findOne logic robustness', () => {
    it('should propagate repository errors (e.g., DB crash)', async () => {
      mockRepo.findOne.mockRejectedValue(new Error('DB connection lost'));
      await expect(service.findOne('1')).rejects.toThrow('DB connection lost');
    });
  });
});
