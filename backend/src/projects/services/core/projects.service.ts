import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../entities/project.entity';
import { CreateProjectDto } from '../../dto/create-project.dto';
import { UpdateProjectDto } from '../../dto/update-project.dto';
import { PROJECT_MESSAGES } from '../../constants/project-messages';
import { User } from '../../../users/entities/user.entity';
import { UserRole } from '../../../users/enums/user-role.enum';
import { ProjectStats } from '../../interfaces/project-stats.interface';
import { EventsGateway } from '../../../common/events/events.gateway';
import { RedisService } from '../../../common/redis/redis.service';

@Injectable()
export class ProjectsService {
  protected readonly CACHE_PREFIX = 'projects:';

  constructor(
    @InjectRepository(Project)
    protected readonly projectsRepository: Repository<Project>,
    protected readonly redisService: RedisService,
    protected readonly eventsGateway: EventsGateway,
  ) {}

  async create(createProjectDto: CreateProjectDto, user: User) {
    const existing = await this.projectsRepository.findOne({
      where: { name: createProjectDto.name, ownerId: user.id },
    });
    if (existing) {
      throw new ConflictException(PROJECT_MESSAGES.ALREADY_EXISTS);
    }

    const project = this.projectsRepository.create({
      ...createProjectDto,
      ownerId: user.id,
    });
    const savedProject = await this.projectsRepository.save(project);
    await this.clearGlobalCache();
    return savedProject;
  }

  async findAll(page: number = 1, limit: number = 10) {
    const cacheKey = `${this.CACHE_PREFIX}list:global:${page}:${limit}`;
    const cachedData = await this.redisService.get(cacheKey);

    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const [data, total] = await this.projectsRepository.findAndCount({
      relations: ['owner'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    const result = {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 3600);
    return result;
  }

  async findOne(id: string) {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: ['owner', 'tasks', 'tasks.assignee'],
    });
    if (!project) {
      throw new NotFoundException(PROJECT_MESSAGES.NOT_FOUND);
    }
    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, user: User) {
    const project = await this.findOne(id);
    if (project.ownerId !== user.id) {
      throw new ForbiddenException(PROJECT_MESSAGES.FORBIDDEN_UPDATE);
    }
    Object.assign(project, updateProjectDto);
    const updated = await this.projectsRepository.save(project);
    await this.clearGlobalCache();
    await this.redisService.del(`${this.CACHE_PREFIX}stats:${id}`);
    const stats = await this.getStats(id);
    this.eventsGateway.emitStatsUpdate(id, stats);
    return updated;
  }

  async remove(id: string, user: User) {
    const project = await this.findOne(id);
    if (project.ownerId !== user.id) {
      throw new ForbiddenException(PROJECT_MESSAGES.FORBIDDEN_DELETE);
    }
    await this.projectsRepository.softDelete(id);
    await this.clearGlobalCache();
    await this.redisService.del(`${this.CACHE_PREFIX}stats:${id}`);
    this.eventsGateway.emitStatsUpdate(id, { id, deleted: true });
  }

  async getStats(id: string): Promise<ProjectStats> {
    const cacheKey = `${this.CACHE_PREFIX}stats:${id}`;
    const cachedStats = await this.redisService.get(cacheKey);

    if (cachedStats) {
      return JSON.parse(cachedStats);
    }

    const statsByStatus = await this.projectsRepository
      .createQueryBuilder('project')
      .leftJoin('project.tasks', 'task')
      .select('task.status', 'status')
      .addSelect('COUNT(task.id)', 'count')
      .where('project.id = :id', { id })
      .groupBy('task.status')
      .getRawMany<{ status: string; count: string | number }>();

    const statsByAssignee = await this.projectsRepository
      .createQueryBuilder('project')
      .leftJoin('project.tasks', 'task')
      .leftJoin('task.assignee', 'assignee')
      .select('assignee.name', 'assignee')
      .addSelect('COUNT(task.id)', 'count')
      .where('project.id = :id', { id })
      .groupBy('assignee.name')
      .getRawMany<{ assignee: string | null; count: string | number }>();

    const result: ProjectStats = {
      statsByStatus,
      statsByAssignee,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 3600);
    return result;
  }

  protected async clearGlobalCache() {
    await this.redisService.delByPrefix(`${this.CACHE_PREFIX}list:global`);
  }
}
