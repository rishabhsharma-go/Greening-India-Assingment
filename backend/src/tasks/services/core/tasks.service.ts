import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { CreateTaskDto } from '../../dto/create-task.dto';
import { UpdateTaskDto } from '../../dto/update-task.dto';
import { User } from '../../../users/entities/user.entity';
import { RedisService } from '../../../common/redis/redis.service';
import { EventsGateway } from '../../../common/events/events.gateway';
import { TaskStatus } from '../../entities/task.entity';
import { TASK_MESSAGES } from '../../constants/task-messages';
import { ProjectsService } from '../../../projects/services/core/projects.service';
import { UserRole } from '../../../users/enums/user-role.enum';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    protected readonly tasksRepository: Repository<Task>,
    @InjectRepository(User)
    protected readonly userRepository: Repository<User>,
    protected readonly redisService: RedisService,
    protected readonly eventsGateway: EventsGateway,
    @Inject(forwardRef(() => ProjectsService))
    protected readonly projectsService: ProjectsService,
  ) {}

  private async getCommunityGuardianId(): Promise<string | undefined> {
    const guardian = await this.userRepository.findOne({
      where: { email: 'guardian@taskflow.com' },
    });
    return guardian?.id;
  }

  async create(projectId: string, createTaskDto: CreateTaskDto, user: User) {
    const existing = await this.tasksRepository.findOne({
      where: { title: createTaskDto.title, projectId },
    });
    if (existing) {
      throw new ConflictException(TASK_MESSAGES.ALREADY_EXISTS);
    }

    const taskData = {
      ...createTaskDto,
      projectId,
      creatorId: user.id
    };

    if (!taskData.assigneeId) {
      taskData.assigneeId = await this.getCommunityGuardianId();
    }

    const task = this.tasksRepository.create(taskData);
    const saved = await this.tasksRepository.save(task);
    
    await this.clearProjectCache(projectId);
    this.eventsGateway.emitTaskUpdate(projectId, saved);
    const stats = await this.projectsService.getStats(projectId);
    this.eventsGateway.emitStatsUpdate(projectId, stats);
    
    return saved;
  }

  async findAll(
    projectId: string,
    status?: TaskStatus,
    assignee?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const query = this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.creator', 'creator')
      .where('task.projectId = :projectId', { projectId });

    if (status) {
      query.andWhere('task.status = :status', { status });
    }

    if (assignee) {
      query.andWhere('assignee.id = :assignee', { assignee });
    }

    const [data, total] = await query
      .orderBy('task.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['assignee'],
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, user: User) {
    const task = await this.findOne(id);
    const project = await this.projectsService.findOne(task.projectId);
    const isCreator = task.creatorId === user.id;
    const isAssignee = task.assigneeId === user.id;
    const isUnassignedAndOwner = !task.assigneeId && project.ownerId === user.id;

    if (!isCreator && !isAssignee && !isUnassignedAndOwner) {
      throw new ForbiddenException(TASK_MESSAGES.FORBIDDEN_MUTATE);
    }

    if (!updateTaskDto.assigneeId) {
      updateTaskDto.assigneeId = await this.getCommunityGuardianId();
    }

    Object.assign(task, updateTaskDto);
    const saved = await this.tasksRepository.save(task);
    await this.clearProjectCache(task.projectId);
    this.eventsGateway.emitTaskUpdate(task.projectId, saved);
    const stats = await this.projectsService.getStats(task.projectId);
    this.eventsGateway.emitStatsUpdate(task.projectId, stats);
    
    return saved;
  }

  async remove(id: string, user: User) {
    const task = await this.findOne(id);
    const project = await this.projectsService.findOne(task.projectId);

    const isCreator = task.creatorId === user.id;
    const isAssignee = task.assigneeId === user.id;
    const isUnassignedAndOwner = !task.assigneeId && project.ownerId === user.id;

    if (!isCreator && !isAssignee && !isUnassignedAndOwner) {
      throw new ForbiddenException(TASK_MESSAGES.FORBIDDEN_DELETE);
    }

    const projectId = task.projectId;
    await this.tasksRepository.softDelete(id);
    await this.clearProjectCache(projectId);
    
    this.eventsGateway.emitTaskUpdate(projectId, { id, deleted: true });
    const stats = await this.projectsService.getStats(projectId);
    this.eventsGateway.emitStatsUpdate(projectId, stats);
  }

  protected async clearProjectCache(projectId: string) {
    await this.redisService.del(`projects:stats:${projectId}`);
    await this.redisService.delByPrefix(`projects:list:`);
    await this.redisService.del(`projects:system-stats`);
  }
}
