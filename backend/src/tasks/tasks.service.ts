import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ProjectsService } from '../projects/projects.service';
import { User } from '../users/entities/user.entity';
import { TASK_MESSAGES } from './constants/task-messages';
import { EventsGateway } from '../common/events/events.gateway';
import { RedisService } from '../common/redis/redis.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    private projectsService: ProjectsService,
    private redisService: RedisService,
    private eventsGateway: EventsGateway,
  ) {}

  async create(projectId: string, createTaskDto: CreateTaskDto, user: User) {
    const project = await this.projectsService.findOne(projectId);
    const task = this.tasksRepository.create({
      ...createTaskDto,
      project,
      creatorId: user.id,
    });
    const saved = await this.tasksRepository.save(task);
    await this.redisService.del(`projects:stats:${projectId}`);
    this.eventsGateway.emitTaskUpdate(projectId, saved);
    const stats = await this.projectsService.getStats(projectId);
    this.eventsGateway.emitStatsUpdate(projectId, stats);
    return saved;
  }

  async findAll(
    projectId: string,
    status?: TaskStatus,
    assigneeId?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const where: FindOptionsWhere<Task> = { project: { id: projectId } };
    if (status) where.status = status;
    if (assigneeId) where.assignee = { id: assigneeId };

    const [data, total] = await this.tasksRepository.findAndCount({
      where,
      relations: ['assignee', 'creator'],
      take: limit,
      skip: (page - 1) * limit,
      order: { createdAt: 'DESC' },
    });

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
      relations: ['project', 'assignee', 'creator'],
    });
    if (!task) {
      throw new NotFoundException(TASK_MESSAGES.NOT_FOUND);
    }
    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    const task = await this.findOne(id);
    Object.assign(task, updateTaskDto);
    const saved = await this.tasksRepository.save(task);
    await this.redisService.del(`projects:stats:${task.projectId}`);
    this.eventsGateway.emitTaskUpdate(task.projectId, saved);
    const stats = await this.projectsService.getStats(task.projectId);
    this.eventsGateway.emitStatsUpdate(task.projectId, stats);
    return saved;
  }

  async remove(id: string, user: User) {
    const task = await this.findOne(id);
    const project = await this.projectsService.findOne(task.projectId);

    if (task.creatorId !== user.id && project.ownerId !== user.id) {
      throw new ForbiddenException(TASK_MESSAGES.FORBIDDEN_DELETE);
    }

    await this.tasksRepository.softRemove(task);
    await this.redisService.del(`projects:stats:${task.projectId}`);
    this.eventsGateway.emitTaskUpdate(task.projectId, { id, deleted: true });
    const stats = await this.projectsService.getStats(task.projectId);
    this.eventsGateway.emitStatsUpdate(task.projectId, stats);
  }
}
