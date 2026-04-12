import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../users/enums/user-role.enum';
import { DataSource } from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let dataSource: any;

  beforeEach(async () => {
    dataSource = {
      getRepository: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn().mockImplementation((key) => {
              if (key === 'isPublic') return false;
              if (key === 'roles') return null;
              return null;
            }),
            get: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  const createMockContext = (userRole?: UserRole, userId: string = '1'): ExecutionContext => {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: userRole ? { id: userId, role: { slug: userRole } } : null,
          params: { id: 'resource-1' },
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if no roles are required', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === 'isPublic') return false;
      if (key === 'roles') return null;
      return null;
    });
    const context = createMockContext();
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has required role', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === 'isPublic') return false;
      if (key === 'roles') return [UserRole.ADMIN];
      return null;
    });
    const context = createMockContext(UserRole.ADMIN);
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user does not have required role', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === 'isPublic') return false;
      if (key === 'roles') return [UserRole.ADMIN];
      return null;
    });
    const context = createMockContext(UserRole.USER);
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should deny if no user in request', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === 'isPublic') return false;
      if (key === 'roles') return [UserRole.USER];
      return null;
    });
    const context = createMockContext();
    expect(await guard.canActivate(context)).toBe(false);
  });

  describe('Ownership Checks', () => {
    const mockRepo = { findOne: jest.fn() };

    beforeEach(() => {
      dataSource.getRepository.mockReturnValue(mockRepo);
      (reflector.get as jest.Mock).mockReturnValue({ name: 'Task' });
    });

    it('should throw NotFoundException if resource missing', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const context = createMockContext(UserRole.USER);
      await expect(guard.canActivate(context)).rejects.toThrow('Task not found');
    });

    it('should throw ForbiddenException if user not owner', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 't1', ownerId: 'other-user' });
      const context = createMockContext(UserRole.USER, 'user-1');
      await expect(guard.canActivate(context)).rejects.toThrow('Ownership required for this Task');
    });

    it('should allow access if user is owner', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 't1', ownerId: 'user-1' });
      const context = createMockContext(UserRole.USER, 'user-1');
      expect(await guard.canActivate(context)).toBe(true);
    });

    it('should allow access for Task project owner', async () => {
      (reflector.get as jest.Mock).mockReturnValue(Task);
      
      mockRepo.findOne.mockResolvedValue({ 
        id: 't1', 
        creatorId: 'other', 
        project: { ownerId: 'user-1' } 
      });
      const context = createMockContext(UserRole.USER, 'user-1');
      expect(await guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException if task has no project or wrong project owner', async () => {
      (reflector.get as jest.Mock).mockReturnValue(Task);
      mockRepo.findOne.mockResolvedValue({ 
        id: 't1', 
        creatorId: 'other', 
        project: null 
      });
      const context = createMockContext(UserRole.USER, 'user-1');
      await expect(guard.canActivate(context)).rejects.toThrow('Ownership required for this task (Creator or Project Owner)');
    });
  });
});
