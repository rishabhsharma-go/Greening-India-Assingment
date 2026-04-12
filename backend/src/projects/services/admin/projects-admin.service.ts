import {
  Injectable,
} from '@nestjs/common';
import { ProjectsService } from '../core/projects.service';
import { ProjectStats } from '../../interfaces/project-stats.interface';
import { UpdateProjectDto } from '../../dto/update-project.dto';

@Injectable()
export class ProjectsAdminService extends ProjectsService {

  async getSystemStats(): Promise<ProjectStats> {
    const cacheKey = `${this.CACHE_PREFIX}system-stats`;
    const cachedStats = await this.redisService.get(cacheKey);

    if (cachedStats) {
      return JSON.parse(cachedStats);
    }

    const statsByStatus = await this.projectsRepository
      .createQueryBuilder('project')
      .leftJoin('project.tasks', 'task')
      .select('task.status', 'status')
      .addSelect('COUNT(task.id)', 'count')
      .groupBy('task.status')
      .getRawMany<{ status: string; count: string | number }>();

    const statsByAssignee = await this.projectsRepository
      .createQueryBuilder('project')
      .leftJoin('project.tasks', 'task')
      .leftJoin('task.assignee', 'assignee')
      .select('assignee.name', 'assignee')
      .addSelect('COUNT(task.id)', 'count')
      .groupBy('assignee.name')
      .getRawMany<{ assignee: string | null; count: string | number }>();

    const result: ProjectStats = {
      statsByStatus,
      statsByAssignee,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 3600);
    return result;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    const project = await this.findOne(id);
    Object.assign(project, updateProjectDto);
    const updated = await this.projectsRepository.save(project);
    
    await this.clearGlobalCache();
    await this.redisService.del(`${this.CACHE_PREFIX}stats:${id}`);
    
    const stats = await this.getStats(id);
    this.eventsGateway.emitStatsUpdate(id, stats);
    
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.projectsRepository.softDelete(id);
    await this.clearGlobalCache();
    await this.redisService.del(`${this.CACHE_PREFIX}stats:${id}`);
    this.eventsGateway.emitStatsUpdate(id, { id, deleted: true });
  }
}
