import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { ProjectsService } from '../projects/projects.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TASK_MESSAGES } from './constants/task-messages';
import { RedisService } from '../common/redis/redis.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { User } from '../users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { EventsGateway } from '../common/events/events.gateway';

describe('TasksService', () => {
  let service: TasksService;
  let repo: Record<string, jest.Mock>;
  let projectsService: jest.Mocked<Partial<ProjectsService>>;

  const mockTaskRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    softRemove: jest.fn(),
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a task if project is found', async () => {
      const user = { id: 'user1' } as User;
      const dto = { title: 'New Task' } as CreateTaskDto;
      (projectsService.findOne as jest.Mock).mockResolvedValue({
        id: 'proj1',
      } as Project);
      repo.create.mockReturnValue({ ...dto, id: 'task1' });
      repo.save.mockResolvedValue({ ...dto, id: 'task1' });

      const result = await service.create('proj1', dto, user);
      expect(result.id).toBe('task1');
      expect(projectsService.findOne).toHaveBeenCalledWith('proj1');
    });
  });

  describe('findAll', () => {
    it('should return tasks with pagination', async () => {
      const tasks = [{ id: '1' }, { id: '2' }];
      repo.findAndCount.mockResolvedValue([tasks, 2]);

      const result = await service.findAll(
        'proj1',
        undefined,
        undefined,
        1,
        10,
      );
      expect(result.data).toEqual(tasks);
      expect(result.meta.total).toEqual(2);
    });

    it('should apply status filter', async () => {
      mockTaskRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll('p1', TaskStatus.IN_PROGRESS);
      expect(mockTaskRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: TaskStatus.IN_PROGRESS,
          }) as unknown,
        }),
      );
    });

    it('should apply assignee filter', async () => {
      mockTaskRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll('p1', undefined, 'u1');
      expect(mockTaskRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignee: { id: 'u1' },
          }) as unknown,
        }),
      );
    });

    it('should apply filters', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll('proj1', TaskStatus.DONE, 'assignee1', 1, 5);
      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            project: { id: 'proj1' },
            status: TaskStatus.DONE,
            assignee: { id: 'assignee1' },
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if task does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('none')).rejects.toThrow(
        new NotFoundException(TASK_MESSAGES.NOT_FOUND),
      );
    });

    it('should return the task if found', async () => {
      const task = { id: '1' };
      repo.findOne.mockResolvedValue(task);
      const result = await service.findOne('1');
      expect(result).toEqual(task);
    });
  });

  describe('update', () => {
    it('should update and save task', async () => {
      const task = { id: '1', title: 'Old', projectId: 'p1' };
      repo.findOne.mockResolvedValue(task);
      repo.save.mockResolvedValue({ ...task, title: 'New' });

      const result = await service.update('1', { title: 'New' });
      expect(result.title).toBe('New');
    });
  });

  describe('remove', () => {
    it('should remove task if user is creator', async () => {
      const user = { id: 'user1' } as User;
      const task = { id: '1', creatorId: 'user1', projectId: 'p1' };
      const project = { id: 'p1', ownerId: 'other' } as Project;

      repo.findOne.mockResolvedValue(task);
      (projectsService.findOne as jest.Mock).mockResolvedValue(project);

      await service.remove('1', user);
      expect(repo.softRemove).toHaveBeenCalledWith(task);
    });

    it('should remove task if user is project owner', async () => {
      const user = { id: 'owner1' } as User;
      const task = { id: '1', creatorId: 'other', projectId: 'p1' };
      const project = { id: 'p1', ownerId: 'owner1' } as Project;

      repo.findOne.mockResolvedValue(task);
      (projectsService.findOne as jest.Mock).mockResolvedValue(project);

      await service.remove('1', user);
      expect(repo.softRemove).toHaveBeenCalledWith(task);
    });

    it('should throw ForbiddenException if user has no rights', async () => {
      const user = { id: 'stranger' } as User;
      const task = { id: '1', creatorId: 'c1', projectId: 'p1' };
      const project = { id: 'p1', ownerId: 'o1' } as Project;

      repo.findOne.mockResolvedValue(task);
      (projectsService.findOne as jest.Mock).mockResolvedValue(project);

      await expect(service.remove('1', user)).rejects.toThrow(
        new ForbiddenException(TASK_MESSAGES.FORBIDDEN_DELETE),
      );
    });
  });
});
