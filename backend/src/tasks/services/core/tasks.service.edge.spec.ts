import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task } from '../../entities/task.entity';
import { User } from '../../../users/entities/user.entity';
import { ProjectsService } from '../../../projects/services/core/projects.service';
import { EventsGateway } from '../../../common/events/events.gateway';
import { RedisService } from '../../../common/redis/redis.service';

describe('TasksService Edge Cases', () => {
  let service: TasksService;
  let projectsService: Partial<ProjectsService>;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockRepo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
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
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn() } },
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

  describe('findAll edge cases', () => {
    it('should handle repository errors gracefully', async () => {
      mockQueryBuilder.getManyAndCount.mockRejectedValue(new Error('DB Error'));
      await expect(service.findAll('p1')).rejects.toThrow('DB Error');
    });
  });

  describe('findOne logic robustness', () => {
    it('should propagate repository errors (e.g., DB crash)', async () => {
      mockRepo.findOne.mockRejectedValue(new Error('DB connection lost'));
      await expect(service.findOne('1')).rejects.toThrow('DB connection lost');
    });
  });
});
