import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task, TaskStatus } from '../../entities/task.entity';
import { ProjectsService } from '../../../projects/services/core/projects.service';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { TASK_MESSAGES } from '../../constants/task-messages';
import { RedisService } from '../../../common/redis/redis.service';
import { CreateTaskDto } from '../../dto/create-task.dto';
import { User } from '../../../users/entities/user.entity';
import { Project } from '../../../projects/entities/project.entity';
import { EventsGateway } from '../../../common/events/events.gateway';
import { forwardRef } from '@nestjs/common';

describe('TasksService', () => {
  let service: TasksService;
  let repo: Record<string, jest.Mock>;
  let projectsService: jest.Mocked<Partial<ProjectsService>>;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockTaskRepo = {
    create: jest.fn(),
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
  };

  const mockUser: User = { id: 'user1' } as User;

  beforeEach(async () => {
    projectsService = {
      findOne: jest.fn(),
      getStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepo,
        },
        {
          provide: ProjectsService,
          useValue: projectsService,
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

    service = module.get<TasksService>(TasksService);
    repo = module.get(getRepositoryToken(Task));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a task', async () => {
      const dto = { title: 'New Task' } as CreateTaskDto;
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue({ ...dto, id: 'task1' });
      repo.save.mockResolvedValue({ ...dto, id: 'task1' });
      (projectsService.getStats as jest.Mock).mockResolvedValue({ statsByStatus: [], statsByAssignee: [] });

      const result = await service.create('proj1', dto, mockUser);
      expect(result.id).toBe('task1');
      expect(repo.save).toHaveBeenCalled();
      expect(mockEventsGateway.emitTaskUpdate).toHaveBeenCalled();
    });

    it('should throw ConflictException if task title exists in project', async () => {
      repo.findOne.mockResolvedValue({ id: 'existing' });
      await expect(service.create('p1', { title: 'T' } as any, mockUser)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return tasks with pagination using query builder', async () => {
      const tasks = [{ id: '1' }];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([tasks, 1]);

      const result = await service.findAll('proj1', undefined, undefined, 1, 10);
      expect(result.data).toEqual(tasks);
      expect(result.meta.total).toEqual(1);
      expect(mockTaskRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if task does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('none')).rejects.toThrow(NotFoundException);
    });

    it('should return the task if found', async () => {
      const task = { id: '1' };
      repo.findOne.mockResolvedValue(task);
      const result = await service.findOne('1');
      expect(result).toEqual(task);
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException if user has no rights', async () => {
      const task = { id: '1', creatorId: 'other', projectId: 'p1' };
      const project = { id: 'p1', ownerId: 'other' } as Project;
      repo.findOne.mockResolvedValue(task);
      (projectsService.findOne as jest.Mock).mockResolvedValue(project);

      await expect(service.update('1', { title: 'New' }, mockUser)).rejects.toThrow(ForbiddenException);
    });

    it('should update task if user is creator', async () => {
      const task = { id: '1', creatorId: mockUser.id, projectId: 'p1' };
      const project = { id: 'p1', ownerId: 'other' } as Project;
      repo.findOne.mockResolvedValue(task);
      (projectsService.findOne as jest.Mock).mockResolvedValue(project);
      repo.save.mockResolvedValue({ ...task, title: 'New' });
      (projectsService.getStats as jest.Mock).mockResolvedValue({} as any);

      const result = await service.update('1', { title: 'New' }, mockUser);
      expect(result.title).toBe('New');
    });
  });

  describe('remove', () => {
    it('should remove task if user is creator', async () => {
      const task = { id: '1', creatorId: mockUser.id, projectId: 'p1' };
      const project = { id: 'p1', ownerId: 'other' } as Project;
      repo.findOne.mockResolvedValue(task);
      (projectsService.findOne as jest.Mock).mockResolvedValue(project);
      (projectsService.getStats as jest.Mock).mockResolvedValue({} as any);

      await service.remove('1', mockUser);
      expect(repo.softDelete).toHaveBeenCalledWith('1');
    });
  });
});
