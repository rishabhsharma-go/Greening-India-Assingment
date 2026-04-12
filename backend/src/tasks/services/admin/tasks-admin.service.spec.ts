import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TasksAdminService } from './tasks-admin.service';
import { Task } from '../../entities/task.entity';
import { TasksService } from '../core/tasks.service';
import { ProjectsService } from '../../../projects/services/core/projects.service';
import { RedisService } from '../../../common/redis/redis.service';
import { EventsGateway } from '../../../common/events/events.gateway';
import { User } from '../../../users/entities/user.entity';

describe('TasksAdminService', () => {
  let service: TasksAdminService;
  let repo: Record<string, jest.Mock>;

  const mockTaskRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockProjectsService = {
    findOne: jest.fn(),
    getStats: jest.fn(),
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

  const mockArchitect: User = { id: 'admin-1' } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksAdminService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
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

    service = module.get<TasksAdminService>(TasksAdminService);
    repo = module.get(getRepositoryToken(Task));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Administrative Overrides', () => {
    it('update() should bypass ownership check', async () => {
      const task = { id: 't1', creatorId: 'other-user', projectId: 'p1' };
      repo.findOne.mockResolvedValue(task);
      repo.save.mockResolvedValue({ ...task, title: 'Calibrated' });
      (mockProjectsService.getStats as jest.Mock).mockResolvedValue({});

      const result = await service.update('t1', { title: 'Calibrated' });
      expect(result.title).toBe('Calibrated');
      expect(repo.save).toHaveBeenCalled();
    });

    it('remove() should bypass ownership check', async () => {
      const task = { id: 't1', creatorId: 'other-user', projectId: 'p1' };
      repo.findOne.mockResolvedValue(task);
      (mockProjectsService.getStats as jest.Mock).mockResolvedValue({});

      await service.remove('t1');
      expect(repo.softDelete).toHaveBeenCalledWith('t1');
    });
  });

  describe('Inherited Logic', () => {
    it('should have access to TasksService members', () => {
      expect(service).toBeInstanceOf(TasksService);
    });
  });
});
